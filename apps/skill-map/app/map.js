/*
  THE MAP: a network of skills, drawn on a canvas
  -----------------------------------------------
  No libraries. One centre (Claude), one hub for each group, one dot for each skill. A dot's size
  grows with how often the skill was used in the last 90 days. Links between skills show when you
  turn Links on, or when you select a skill. Small pulses travel out to the skills you actually use.

  The layout is worked out when the map is built: hubs are spaced round a ring, skills sit in a
  tidy spiral round their hub, then a short simulation nudges them apart and draws related skills
  a little closer. It is the same every time for the same skills, so the map doesn't jump about.

  Colours come from the theme (light and dark), so nothing here has a colour of its own. With
  "reduce motion" switched on in the computer's settings, nothing moves: no growing, no pulses.

  create(canvas, handlers) returns the controls:
    build(model, { animate })   draw a new set of nodes and links (model comes from model.graph)
    setFilter(idSet | null)     dim everything not in the set
    setSelected(id | null)      ring a skill (or hub) and light up what it connects to
    setShowLinks(boolean)       draw every link between skills
    fit(), flyTo(id), zoomBy(factor)
  handlers: onSelect(node | null), onHover(node | null, clientX, clientY)
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui;
  const TAU = Math.PI * 2;
  const GOLDEN = 2.399963;

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  // "#RRGGBB" or "rgb(r, g, b)" into a colour with an alpha
  function alpha(colour, a) {
    let r = 128, g = 128, b = 128;
    const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(colour);
    const rgb = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(colour);
    if (hex) { r = parseInt(hex[1], 16); g = parseInt(hex[2], 16); b = parseInt(hex[3], 16); }
    else if (rgb) { r = +rgb[1]; g = +rgb[2]; b = +rgb[3]; }
    return "rgba(" + r + "," + g + "," + b + "," + Math.max(0, Math.min(1, a)) + ")";
  }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function back(t) { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  // A small steady number from a word, so every skill has its own phase and the same one each time
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

  function create(canvas, handlers) {
    const ctx = canvas.getContext("2d");
    const reduce = function () { return ui.prefersReducedMotion(); };
    let W = 0, H = 0, dpr = 1;
    let nodes = [], byId = {}, links = [], groups = [], adj = {};
    let T = { x: 0, y: 0, k: 1 };
    let tween = null;
    let col = readColours();
    let filter = null, selected = null, hover = null, showLinks = false;
    let builtAt = 0, animateIn = true, dirty = true, fitted = false, autoFit = true;
    let particles = [], nextSpawn = 0, spawnPool = [];

    function readColours() {
      return {
        ink: css("--color-ink"), muted: css("--color-muted"), faint: css("--color-faint"), bg: css("--color-bg"), surface: css("--color-surface"),
        line: css("--color-line-strong"), accent: css("--color-accent"), danger: css("--color-danger"), info: css("--color-info"), warning: css("--color-warning"),
        onAccent: css("--color-on-accent"), font: css("--font-ui") || "sans-serif"
      };
    }
    // The theme gives 9 group colours. A tenth group and beyond take the same colours turned round the colour wheel, so no two groups match
    function groupColour(i) {
      const list = window.SM.model.GROUP_COLOURS;
      const base = css(list[i % list.length]);
      const round = Math.floor(i / list.length);
      return round ? turn(base, round) : base;
    }
    function turn(colour, round) {
      const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(colour);
      if (!m) return colour;
      const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
      let h = 0, s = 0;
      if (d) {
        s = d / (1 - Math.abs(2 * l - 1));
        h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h *= 60;
      }
      h = (h + 38 * round + 360) % 360;
      const l2 = Math.min(0.72, Math.max(0.32, l + (round % 2 ? 0.07 : -0.07)));
      const c = (1 - Math.abs(2 * l2 - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), mm = l2 - c / 2;
      const rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
      return "rgb(" + rgb.map(function (v) { return Math.round((v + mm) * 255); }).join(",") + ")";
    }

    // ---------- Building ----------
    function build(model, options) {
      const first = !nodes.length;
      animateIn = !!(options && options.animate) && !reduce();
      builtAt = performance.now();
      col = readColours();
      groups = model.groups.map(function (g, i) { return Object.assign({}, g, { css: groupColour(i) }); });
      nodes = model.nodes.map(function (n) { return Object.assign({ x: 0, y: 0, vx: 0, vy: 0, ph: hash(n.id) * TAU, born: 0 }, n); });
      links = model.links;
      byId = {}; adj = {};
      nodes.forEach(function (n) { byId[n.id] = n; adj[n.id] = []; });
      links = links.filter(function (l) { return byId[l.s] && byId[l.t]; });
      links.forEach(function (l) { adj[l.s].push(l); adj[l.t].push(l); });
      layout();
      if (first || !fitted) { fit(false); fitted = true; }
      autoFit = true;
      spawnPool = nodes.filter(function (n) { return n.kind === "skill" && n.uses > 0; });
      particles = [];
      dirty = true;
    }

    function layout() {
      const hubs = nodes.filter(function (n) { return n.kind === "hub"; });
      const core = byId.core;
      core.x = 0; core.y = 0;
      const members = {};
      nodes.forEach(function (n) { if (n.kind === "skill") (members[n.hub] = members[n.hub] || []).push(n); });
      // How big each cluster is, then the ring that fits them all
      const spacing = 10.2;
      hubs.forEach(function (h) { const m = members[h.id] || []; h.cluster = h.r + 10 + spacing * Math.sqrt(m.length + 1); });
      const arc = hubs.reduce(function (s, h) { return s + 2 * (h.cluster + 16); }, 0);
      const widest = hubs.reduce(function (m, h) { return Math.max(m, h.cluster); }, 0);
      const ring = Math.max(arc / TAU, widest + core.r + 70, 120);
      let angle = -Math.PI / 2;
      hubs.forEach(function (h, i) {
        const share = (2 * (h.cluster + 16)) / arc * TAU;
        const a = angle + share / 2;
        angle += share;
        h.x = Math.cos(a) * ring; h.y = Math.sin(a) * ring; h.home = { x: h.x, y: h.y };
        (members[h.id] || []).forEach(function (n, k) {
          const r = h.r + 10 + spacing * Math.sqrt(k + 0.5);
          const t = k * GOLDEN + i * 1.3;
          n.x = h.x + Math.cos(t) * r; n.y = h.y + Math.sin(t) * r;
          n.rest = r;
        });
      });
      // A short settling: skills keep their distance from the hub, never overlap, and related skills draw closer
      const refs = links.filter(function (l) { return l.type === "ref" || l.type === "dup"; });
      const skills = nodes.filter(function (n) { return n.kind === "skill"; });
      for (let tick = 0; tick < 90; tick++) {
        const a = 1 - tick / 90;
        skills.forEach(function (n) {
          const h = byId[n.hub];
          const dx = n.x - h.x, dy = n.y - h.y, d = Math.hypot(dx, dy) || 1;
          const pull = (d - n.rest) * 0.08;
          n.vx -= dx / d * pull; n.vy -= dy / d * pull;
        });
        refs.forEach(function (l) {
          const s = byId[l.s], t = byId[l.t];
          const dx = t.x - s.x, dy = t.y - s.y, d = Math.hypot(dx, dy) || 1;
          const f = (d - 90) * 0.0016 * a;
          s.vx += dx / d * f; s.vy += dy / d * f; t.vx -= dx / d * f; t.vy -= dy / d * f;
        });
        collide(nodes);
        nodes.forEach(function (n) {
          if (n.kind === "core") return;
          if (n.kind === "hub") { n.vx += (n.home.x - n.x) * 0.05; n.vy += (n.home.y - n.y) * 0.05; }
          n.x += n.vx; n.y += n.vy; n.vx *= 0.6; n.vy *= 0.6;
        });
      }
      // Hubs sit at the middle of their cluster's skills' spiral, so they were pinned; stagger the grow-in
      let i = 0;
      nodes.forEach(function (n) {
        n.born = n.kind === "core" ? 0 : n.kind === "hub" ? 120 + groupIndex(n) * 90 : 380 + groupIndex(n) * 90 + (i++ % 40) * 14;
      });
    }
    function groupIndex(n) { return Math.max(0, n.group); }

    // Push overlapping dots apart (a grid keeps it quick with hundreds of skills)
    function collide(list) {
      const cell = 34, grid = {};
      list.forEach(function (n) { const key = Math.floor(n.x / cell) + "," + Math.floor(n.y / cell); (grid[key] = grid[key] || []).push(n); });
      list.forEach(function (n) {
        const cx = Math.floor(n.x / cell), cy = Math.floor(n.y / cell);
        for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
          const bucket = grid[gx + "," + gy];
          if (!bucket) continue;
          bucket.forEach(function (m) {
            if (m === n || m.id < n.id) return;
            const dx = m.x - n.x, dy = m.y - n.y, d = Math.hypot(dx, dy) || 0.01;
            const min = n.r + m.r + 2.5;
            if (d >= min) return;
            const push = (min - d) / 2 / d;
            const pinN = n.kind === "core", pinM = m.kind === "core";
            if (!pinN) { n.x -= dx * push; n.y -= dy * push; }
            if (!pinM) { m.x += dx * push; m.y += dy * push; }
          });
        }
      });
    }

    // ---------- Looking at it ----------
    function size() {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
      const ratio = window.devicePixelRatio || 1;
      if (w === W && h === H && ratio === dpr) return;
      W = w; H = h; dpr = ratio;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      dirty = true;
      // Until the person moves the map themselves, it keeps itself fitted to whatever room it has
      if (autoFit && nodes.length) fitNow(false);
    }
    function bounds() {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      nodes.forEach(function (n) {
        const m = n.kind === "hub" ? n.r + 28 : n.r + 4;
        x0 = Math.min(x0, n.x - m); y0 = Math.min(y0, n.y - m); x1 = Math.max(x1, n.x + m); y1 = Math.max(y1, n.y + m);
      });
      return { x0: x0, y0: y0, x1: x1, y1: y1 };
    }
    function fit(animated) {
      size();
      autoFit = true;
      fitNow(animated);
    }
    function fitNow(animated) {
      if (!nodes.length) return;
      const b = bounds(), pad = 28;
      const k = Math.max(0.15, Math.min((W - pad * 2) / (b.x1 - b.x0), (H - pad * 2) / (b.y1 - b.y0), 1.5));
      moveTo({ k: k, x: W / 2 - (b.x0 + b.x1) / 2 * k, y: H / 2 - (b.y0 + b.y1) / 2 * k }, animated === false ? 0 : 450);
    }
    function moveTo(target, ms) {
      if (!ms || reduce()) { T = target; tween = null; dirty = true; return; }
      tween = { from: Object.assign({}, T), to: target, at: performance.now(), ms: ms };
    }
    function flyTo(id, zoom) {
      const n = byId[id];
      if (!n) return;
      size();
      autoFit = false;
      const k = Math.max(T.k, zoom || 1.9);
      moveTo({ k: k, x: W / 2 - n.x * k, y: H / 2 - n.y * k }, 500);
    }
    function zoomBy(factor, sx, sy) {
      autoFit = false;
      const k = Math.max(0.12, Math.min(5, T.k * factor));
      const cx = sx == null ? W / 2 : sx, cy = sy == null ? H / 2 : sy;
      const wx = (cx - T.x) / T.k, wy = (cy - T.y) / T.k;
      T = { k: k, x: cx - wx * k, y: cy - wy * k };
      tween = null; dirty = true;
    }

    // How much of a dot's growing-in has happened (0 to 1.15)
    function grown(n, now) {
      if (!animateIn) return 1;
      const t = (now - builtAt - n.born) / 520;
      return t <= 0 ? 0 : t >= 1 ? 1 : back(t);
    }
    function passes(n) {
      if (!filter) return true;
      if (n.kind === "core") return true;
      if (n.kind === "hub") return (adj[n.id] || []).some(function (l) { return l.type === "spoke" && l.s === n.id && filter.has(l.t); });
      return filter.has(n.id);
    }
    // The ids lit up around the selected (or hovered) dot
    function lit(id) {
      const set = new Set([id]);
      const n = byId[id];
      if (!n) return set;
      (adj[id] || []).forEach(function (l) { set.add(l.s); set.add(l.t); });
      if (n.kind === "skill") set.add("core");
      return set;
    }

    function pos(n, now) {
      if (reduce() || n.kind === "core") return { x: n.x, y: n.y };
      const m = n.kind === "hub" ? 0.5 : 1.3;
      return { x: n.x + Math.sin(now / 1900 + n.ph) * m, y: n.y + Math.cos(now / 2300 + n.ph * 1.3) * m };
    }

    function draw(now) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (!nodes.length) return;
      const focus = selected && byId[selected] ? lit(selected) : null;
      const hoverSet = !focus && hover && byId[hover] ? lit(hover) : null;
      const P = {};
      nodes.forEach(function (n) { P[n.id] = pos(n, now); });
      function dimmed(n) { return !passes(n) || (focus && !focus.has(n.id)); }

      ctx.save();
      ctx.translate(T.x, T.y); ctx.scale(T.k, T.k);
      ctx.lineCap = "round";

      // Spokes, then the links from the centre
      ctx.lineWidth = 1 / Math.max(T.k, 0.6);
      [false, true].forEach(function (dim) {
        ctx.beginPath();
        links.forEach(function (l) {
          if (l.type !== "spoke") return;
          const s = byId[l.s], t = byId[l.t];
          if (dimmed(t) !== dim) return;
          const g = Math.min(grown(s, now), grown(t, now));
          if (g <= 0) return;
          ctx.moveTo(P[s.id].x, P[s.id].y);
          ctx.lineTo(P[s.id].x + (P[t.id].x - P[s.id].x) * Math.min(1, g), P[s.id].y + (P[t.id].y - P[s.id].y) * Math.min(1, g));
        });
        ctx.strokeStyle = alpha(col.line, dim ? 0.12 : 0.55);
        ctx.stroke();
      });
      links.forEach(function (l) {
        if (l.type !== "hub") return;
        const s = byId[l.s], t = byId[l.t];
        const g = Math.min(1, grown(t, now));
        if (g <= 0) return;
        const dm = dimmed(t);
        ctx.beginPath(); ctx.moveTo(P[s.id].x, P[s.id].y);
        ctx.lineTo(P[s.id].x + (P[t.id].x - P[s.id].x) * g, P[s.id].y + (P[t.id].y - P[s.id].y) * g);
        ctx.lineWidth = 1.6 / Math.max(T.k, 0.6);
        ctx.strokeStyle = alpha(groups[t.group] ? groups[t.group].css : col.line, dm ? 0.1 : 0.45);
        ctx.stroke();
      });

      // Links between skills: all of them with Links on, otherwise only around the selected or hovered dot
      const around = focus ? selected : hover && hoverSet ? hover : null;
      links.forEach(function (l) {
        if (l.type !== "ref" && l.type !== "dup") return;
        const touching = around && (l.s === around || l.t === around);
        if (!showLinks && !touching) return;
        const s = byId[l.s], t = byId[l.t];
        if (grown(s, now) < 1 || grown(t, now) < 1) return;
        const a = P[s.id], b = P[t.id];
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
        const bend = 0.18;
        ctx.beginPath(); ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx - dy * bend, my + dx * bend, b.x, b.y);
        ctx.lineWidth = (touching ? 1.6 : 0.9) / Math.max(T.k, 0.7);
        const dim = !touching && (dimmed(s) || dimmed(t));
        if (l.type === "dup") { ctx.setLineDash([4 / T.k, 3 / T.k]); ctx.strokeStyle = alpha(col.danger, dim ? 0.1 : touching ? 0.9 : 0.5); }
        else { ctx.setLineDash([]); ctx.strokeStyle = alpha(col.info, dim ? 0.08 : touching ? 0.9 : 0.3); }
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Pulses travelling out to the skills that are used
      if (!reduce() && !document.hidden && spawnPool.length) {
        if (now > nextSpawn && particles.length < Math.min(40, 6 + spawnPool.length)) {
          let total = 0; spawnPool.forEach(function (n) { total += n.uses; });
          let pick = Math.random() * total, target = spawnPool[0];
          for (let i = 0; i < spawnPool.length; i++) { pick -= spawnPool[i].uses; if (pick <= 0) { target = spawnPool[i]; break; } }
          particles.push({ to: target, at: now, ms: 1500 + Math.random() * 900 });
          nextSpawn = now + 140 + Math.random() * 260;
        }
        particles = particles.filter(function (p) { return now - p.at < p.ms; });
        particles.forEach(function (p) {
          const t = (now - p.at) / p.ms;
          const hub = byId[p.to.hub];
          if (!hub || grown(p.to, now) < 1 || dimmed(p.to)) return;
          let x, y;
          if (t < 0.5) { const u = ease(t / 0.5); x = P.core.x + (P[hub.id].x - P.core.x) * u; y = P.core.y + (P[hub.id].y - P.core.y) * u; }
          else { const u = ease((t - 0.5) / 0.5); x = P[hub.id].x + (P[p.to.id].x - P[hub.id].x) * u; y = P[hub.id].y + (P[p.to.id].y - P[hub.id].y) * u; }
          const c = groups[p.to.group] ? groups[p.to.group].css : col.accent;
          const fade = Math.sin(Math.min(1, t) * Math.PI);
          ctx.beginPath(); ctx.arc(x, y, 5.5, 0, TAU); ctx.fillStyle = alpha(c, 0.16 * fade); ctx.fill();
          ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fillStyle = alpha(c, 0.95 * fade); ctx.fill();
        });
      }

      // The dots
      nodes.forEach(function (n) {
        const g = grown(n, now);
        if (g <= 0) return;
        const p = P[n.id], dm = dimmed(n);
        const c = n.kind === "core" ? col.accent : groups[n.group] ? groups[n.group].css : col.accent;
        const r = n.r * g;
        const isSel = selected === n.id;
        if (n.kind === "core") {
          const pulse = reduce() ? 0 : Math.sin(now / 900) * 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, r + 8 + pulse, 0, TAU); ctx.fillStyle = alpha(col.accent, 0.12); ctx.fill();
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fillStyle = col.accent; ctx.fill();
          sparkle(p.x, p.y, r * 0.55, col.onAccent);
          return;
        }
        if (n.kind === "hub") {
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU);
          ctx.fillStyle = alpha(c, dm ? 0.06 : 0.16); ctx.fill();
          ctx.lineWidth = isSel ? 3 : 1.6; ctx.strokeStyle = alpha(c, dm ? 0.25 : 0.95); ctx.stroke();
          return;
        }
        const recent = n.uses > 0 && !reduce();
        if (recent && !dm) {
          const breathe = 0.5 + 0.5 * Math.sin(now / 1100 + n.ph);
          ctx.beginPath(); ctx.arc(p.x, p.y, r + 3 + breathe * 4, 0, TAU); ctx.fillStyle = alpha(c, 0.1 + breathe * 0.1); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU);
        if (n.uses > 0) { ctx.fillStyle = alpha(c, dm ? 0.15 : 1); ctx.fill(); }
        else { ctx.fillStyle = alpha(col.bg, dm ? 0.4 : 1); ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = alpha(c, dm ? 0.18 : 0.85); ctx.stroke(); }
        if (n.skillKind === "command") { ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.9, r * 0.32), 0, TAU); ctx.fillStyle = alpha(col.bg, dm ? 0.3 : 0.9); ctx.fill(); }
        if (isSel || hover === n.id) {
          ctx.beginPath(); ctx.arc(p.x, p.y, r + 3.5, 0, TAU); ctx.lineWidth = isSel ? 2 : 1.4; ctx.strokeStyle = isSel ? col.ink : alpha(col.ink, 0.5); ctx.stroke();
        }
      });
      ctx.restore();

      // Words, drawn at screen size so they stay crisp
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      nodes.forEach(function (n) {
        const g = grown(n, now);
        if (g < 0.9) return;
        const p = P[n.id], sx = T.x + p.x * T.k, sy = T.y + p.y * T.k;
        if (sx < -80 || sy < -40 || sx > W + 80 || sy > H + 40) return;
        const dm = dimmed(n);
        if (n.kind === "hub") {
          const r = n.r * T.k;
          ctx.font = "700 " + Math.max(10, Math.min(13, 12 * Math.sqrt(T.k) + 1)) + "px " + col.font;
          ctx.fillStyle = dm ? alpha(col.ink, 0.3) : col.ink;
          if (r > 11) ctx.fillText(String(n.count), sx, sy);
          label(n.label, sx, sy + r + 12, dm ? 0.35 : 1, true);
        } else if (n.kind === "skill") {
          const sel = selected === n.id || hover === n.id;
          const show = sel || (focus && focus.has(n.id) && T.k > 0.9) || (T.k >= 2.4) || (T.k >= 1.5 && n.r > 4.8 && !dm);
          if (show && !(dm && !sel)) label(n.label, sx, sy + (n.r * T.k) + 10, 1, sel);
        }
      });
    }
    function label(text, x, y, a, strong) {
      ctx.font = (strong ? "650 " : "500 ") + "11.5px " + col.font;
      ctx.lineWidth = 3.5; ctx.lineJoin = "round";
      ctx.strokeStyle = alpha(col.bg, 0.92 * a); ctx.strokeText(text, x, y);
      ctx.fillStyle = alpha(strong ? col.ink : col.muted, a); ctx.fillText(text, x, y);
    }
    function sparkle(x, y, r, colour) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * 0.34 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fillStyle = colour; ctx.fill();
    }

    // ---------- The loop ----------
    let raf = 0, timer = 0, alive = true;
    function frame(now) {
      raf = 0;
      if (!alive) return;
      if (!canvas.isConnected) { timer = setTimeout(function () { timer = 0; schedule(); }, 400); return; }
      size();
      if (tween) {
        const t = Math.min(1, (now - tween.at) / tween.ms), e = ease(t);
        T = { k: tween.from.k + (tween.to.k - tween.from.k) * e, x: tween.from.x + (tween.to.x - tween.from.x) * e, y: tween.from.y + (tween.to.y - tween.from.y) * e };
        if (t >= 1) tween = null;
        dirty = true;
      }
      const growing = animateIn && now - builtAt < 3200;
      if (dirty || growing || !reduce()) { draw(now); dirty = false; }
      schedule();
    }
    function schedule() { if (alive && !raf && !timer) raf = requestAnimationFrame(frame); }

    // ---------- Pointing at it ----------
    function worldAt(ev) { const r = canvas.getBoundingClientRect(); return { x: (ev.clientX - r.left - T.x) / T.k, y: (ev.clientY - r.top - T.y) / T.k }; }
    function hit(ev) {
      // The nearest skill under the pointer wins; only if there is none, a hub or the centre
      const w = worldAt(ev), slack = 4 / T.k;
      let skill = null, skillD = Infinity, other = null, otherD = Infinity;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const d = Math.hypot(n.x - w.x, n.y - w.y);
        if (d > Math.max(n.r, 5 / T.k) + slack) continue;
        if (n.kind === "skill") { if (d < skillD) { skill = n; skillD = d; } }
        else if (d < otherD) { other = n; otherD = d; }
      }
      return skill || other;
    }
    const pointers = new Map();
    let pan = null, pinch = null;
    canvas.addEventListener("pointerdown", function (ev) {
      canvas.setPointerCapture(ev.pointerId);
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      tween = null;
      if (pointers.size === 1) pan = { x: ev.clientX, y: ev.clientY, tx: T.x, ty: T.y, moved: false };
      if (pointers.size === 2) { const a = Array.from(pointers.values()); pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), k: T.k }; pan = null; }
    });
    canvas.addEventListener("pointermove", function (ev) {
      if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pinch && pointers.size === 2) {
        const a = Array.from(pointers.values()), d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        const r = canvas.getBoundingClientRect();
        zoomBy(pinch.k * (d / pinch.d) / T.k, (a[0].x + a[1].x) / 2 - r.left, (a[0].y + a[1].y) / 2 - r.top);
        return;
      }
      if (pan) {
        const dx = ev.clientX - pan.x, dy = ev.clientY - pan.y;
        if (!pan.moved && Math.hypot(dx, dy) > 4) { pan.moved = true; autoFit = false; }
        if (pan.moved) { T = { k: T.k, x: pan.tx + dx, y: pan.ty + dy }; dirty = true; canvas.style.cursor = "grabbing"; handlers.onHover(null); return; }
      }
      const n = hit(ev);
      const id = n ? n.id : null;
      if (id !== hover) { hover = id; dirty = true; canvas.style.cursor = n ? "pointer" : "grab"; }
      handlers.onHover(n, ev.clientX, ev.clientY);
    });
    function release(ev) {
      const was = pan;
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) pinch = null;
      pan = null;
      canvas.style.cursor = hover ? "pointer" : "grab";
      if (ev.type === "pointerup" && was && !was.moved) { const n = hit(ev); handlers.onSelect(n); }
    }
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("pointerleave", function () { if (hover) { hover = null; dirty = true; } handlers.onHover(null); });
    canvas.addEventListener("wheel", function (ev) {
      ev.preventDefault();
      const r = canvas.getBoundingClientRect();
      zoomBy(Math.exp(-ev.deltaY * (ev.ctrlKey ? 0.01 : 0.0016)), ev.clientX - r.left, ev.clientY - r.top);
    }, { passive: false });
    canvas.addEventListener("dblclick", function (ev) { const n = hit(ev); if (n && n.kind === "hub") flyTo(n.id, 1.6); });
    canvas.addEventListener("keydown", function (ev) {
      if (ev.key === "+" || ev.key === "=") zoomBy(1.25);
      else if (ev.key === "-") zoomBy(0.8);
      else if (ev.key === "0") fit();
      else return;
      ev.preventDefault();
    });

    // Light or dark changes the colours; a new size changes the picture
    const themeWatch = new MutationObserver(function () { col = readColours(); groups.forEach(function (g, i) { g.css = groupColour(i); }); dirty = true; });
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style", "class"] });
    const sizeWatch = typeof ResizeObserver === "function" ? new ResizeObserver(function () { size(); dirty = true; }) : null;
    if (sizeWatch) sizeWatch.observe(canvas);
    if (window.matchMedia) {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.addEventListener) mq.addEventListener("change", function () { dirty = true; });
    }
    schedule();

    return {
      build: build,
      setFilter: function (set) { filter = set; dirty = true; },
      setSelected: function (id) { selected = id; dirty = true; },
      setShowLinks: function (on) { showLinks = !!on; dirty = true; },
      fit: function () { fit(true); },
      flyTo: flyTo,
      zoomBy: function (f) { zoomBy(f); },
      resize: function () { size(); dirty = true; },
      repaint: function () { col = readColours(); groups.forEach(function (g, i) { g.css = groupColour(i); }); dirty = true; },
      groupColours: function () { return groups.map(function (g) { return { key: g.key, label: g.label, count: g.count, css: g.css }; }); },
      has: function (id) { return !!byId[id]; },
      destroy: function () { alive = false; cancelAnimationFrame(raf); clearTimeout(timer); themeWatch.disconnect(); if (sizeWatch) sizeWatch.disconnect(); }
    };
  }

  window.SM = window.SM || {};
  window.SM.map = { create: create };
})();

/*
  THE MAP PAGE: the skills drawn as a network, with filters over the top
  ----------------------------------------------------------------------
  The canvas and its controls live in map.js. This page builds the toolbar, the legend and the
  hover note, and keeps one map alive between redraws (the page redraws whenever the data changes,
  and the map shouldn't start again each time).
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.SM.model, C = window.SM.c;
  const V = (window.SM.views = window.SM.views || {});

  let engine = null, canvas = null, signature = "";
  let current = null;       // the latest ctx, so the map's handlers always see fresh data

  // Which group the map shows: what skills are for, or where they come from
  function mode(c) { return c.state.mapMode || (M.hasAreas(c.d) ? "area" : "source"); }

  function filtersOn(s) { return !!(s.origins.length || s.used !== "all" || s.attention || s.tag); }
  // The ids that pass every filter, or null when no filter is on
  function passSet(d, s) {
    if (!filtersOn(s)) return null;
    const set = new Set();
    d.nodes.forEach(function (n) {
      if (s.origins.length && s.origins.indexOf(n.origin) === -1) return;
      if (s.used === "used" && !n.uses.last90) return;
      if (s.used === "unused" && !M.isUnused(d, n)) return;
      if (s.attention && !M.needsLook(d, n)) return;
      if (s.tag && n.tags.indexOf(s.tag) === -1) return;
      set.add(n.id);
    });
    return set;
  }

  function chip(label, action, data, on, n) {
    return '<button type="button" class="filter' + (on ? " is-active" : "") + '" data-action="' + action + '" ' + data + ' aria-pressed="' + (on ? "true" : "false") + '">' + esc(label) + (n != null ? ' <span class="filter__n">' + n + "</span>" : "") + "</button>";
  }

  function render(c) {
    const d = c.d, s = c.state;
    if (M.notSetUp(d)) return '<div class="page page--narrow">' + C.scanCard(c) + "</div>";
    const n = M.numbers(d);
    const m = mode(c);
    const counts = {};
    d.nodes.forEach(function (x) { counts[x.origin] = (counts[x.origin] || 0) + 1; });
    const originChips = M.ORIGINS.filter(function (o) { return counts[o.key]; }).map(function (o) { return chip(o.plural, "map-origin", 'data-origin="' + o.key + '"', s.origins.indexOf(o.key) > -1, counts[o.key]); }).join("");
    const tagChips = d.tags.filter(function (t) { return d.nodes.some(function (x) { return x.tags.indexOf(t.id) > -1; }); }).map(function (t) { return chip("#" + t.label, "map-tag", 'data-tag="' + esc(t.id) + '"', s.tag === t.id); }).join("");
    const grouped = M.hasAreas(d);
    const approvalBanner = grouped && !d.settings.areasApproved
      ? '<div class="map-note">' + icon("sparkle") + "<span><strong>Claude has grouped your skills.</strong> Have a look, change any that are wrong, then say it looks right.</span>" +
        '<button type="button" class="btn btn--sm" data-action="approve-areas">It looks right</button></div>' : "";
    const groupNote = !grouped
      ? '<div class="map-note">' + icon("info") + "<span>The map is grouped by where each skill comes from. Claude can group them by what they do for your business instead.</span>" +
        '<button type="button" class="btn btn--sm" data-action="group">' + icon("sparkle") + "Group by what they do</button></div>" : "";

    return '<div class="map-page">' +
      '<div class="map-bar">' +
        '<div class="map-bar__row">' +
          '<div class="segmented" role="group" aria-label="Group the map by">' +
            '<button type="button" data-action="map-mode" data-mode="area" aria-pressed="' + (m === "area") + '"' + (grouped ? "" : ' disabled title="Ask Claude to group your skills first"') + ">What it’s for</button>" +
            '<button type="button" data-action="map-mode" data-mode="source" aria-pressed="' + (m === "source") + '">Where it’s from</button>' +
          "</div>" +
          '<div class="map-bar__stats" aria-live="polite"><strong class="num">' + n.total + "</strong> " + (n.total === 1 ? "skill" : "skills") + "<span>, </span><strong class=\"num\">" + n.used90 + "</strong> used lately" + (n.unused90 ? '<span>, </span><strong class="num">' + n.unused90 + "</strong> not" : "") + "</div>" +
          '<div class="map-bar__right">' +
            '<button type="button" class="btn btn--sm" data-action="map-links" aria-pressed="' + (s.links ? "true" : "false") + '" title="Show every link between skills">' + icon("zap") + "Links</button>" +
            '<button type="button" class="btn btn--sm" data-action="map-fit" title="Fit the whole map on screen (0)">' + icon("target") + "Fit</button>" +
          "</div>" +
        "</div>" +
        '<div class="filters map-bar__filters" role="group" aria-label="Filters">' +
          originChips +
          '<span class="map-bar__sep" aria-hidden="true"></span>' +
          chip("Used lately", "map-used", 'data-used="used"', s.used === "used") +
          chip("Not used lately", "map-used", 'data-used="unused"', s.used === "unused", n.unused90) +
          chip("Needs a look", "map-attention", "", s.attention, n.attention) +
          tagChips +
          (filtersOn(s) ? '<button type="button" class="link-btn" data-action="map-clear">Clear filters</button>' : "") +
        "</div>" +
      "</div>" +
      approvalBanner + groupNote +
      '<div class="map-stage" id="mapStage">' +
        '<aside class="map-legend" id="mapLegend" aria-label="Groups and key"></aside>' +
        '<div class="map-view" id="mapView">' +
          '<div class="map-tip" id="mapTip" hidden></div>' +
          '<div class="map-hint" aria-hidden="true">Scroll to zoom, drag to move, click a skill</div>' +
        "</div>" +
      "</div>" +
    "</div>";
  }

  function handlers() {
    return {
      onSelect: function (node) {
        if (!current) return;
        if (!node) return current.actions.closeDrawer();
        if (node.kind === "skill") current.actions.openNode(node.id);
        else if (node.kind === "hub") current.actions.openGroup(node.key);
      },
      onHover: function (node, x, y) {
        const tip = document.getElementById("mapTip");
        if (!tip) return;
        if (!node || node.kind === "core" || !current) { tip.hidden = true; return; }
        const d = current.d;
        let html;
        if (node.kind === "hub") html = "<strong>" + esc(node.label) + "</strong><span>" + node.count + (node.count === 1 ? " skill" : " skills") + "</span>";
        else {
          const sk = M.nodeById(d, node.id);
          if (!sk) { tip.hidden = true; return; }
          html = "<strong>" + esc(sk.name) + "</strong><span>" + esc(C.usesText(sk)) + (sk.uses.lastUsed ? ", last " + esc(M.usedLabel(sk.uses.lastUsed).toLowerCase()) : "") + "</span>";
        }
        const stage = document.getElementById("mapView");
        const r = stage.getBoundingClientRect();
        tip.innerHTML = html; tip.hidden = false;
        tip.style.left = Math.min(Math.max(8, x - r.left + 14), r.width - tip.offsetWidth - 8) + "px";
        tip.style.top = Math.min(Math.max(8, y - r.top + 14), r.height - tip.offsetHeight - 8) + "px";
      }
    };
  }

  function signatureOf(c) {
    const d = c.d;
    return mode(c) + "|" + d.areas.map(function (a) { return a.key + a.label; }).join(",") + "|" + d.nodes.map(function (n) { return n.id + ":" + (n.area || "") + ":" + n.uses.last90 + n.origin + n.source; }).join(",") + "|" + d.edges.length;
  }

  function bind(root, c) {
    current = c;
    const stage = root.querySelector("#mapView");
    if (!stage) return;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "map-canvas";
      canvas.tabIndex = 0;
      canvas.setAttribute("role", "img");
      engine = window.SM.map.create(canvas, handlers());
    }
    canvas.setAttribute("aria-label", "A map of your " + c.d.nodes.length + " skills, grouped into " + M.groups(c.d, mode(c)).length + " groups. The All skills page lists the same skills as a table. Press plus or minus to zoom and 0 to fit.");
    stage.insertBefore(canvas, stage.firstChild);
    const sig = signatureOf(c);
    if (sig !== signature) {
      const first = !signature || signature.split("|")[0] !== sig.split("|")[0];
      signature = sig;
      engine.build(M.graph(c.d, mode(c)), { animate: first || !engine.has("core") });
    }
    engine.resize();
    engine.setFilter(passSet(c.d, c.state));
    engine.setShowLinks(c.state.links);
    const sel = c.state.drawer;
    engine.setSelected(sel ? (sel.kind === "group" ? "hub:" + sel.id : sel.id) : null);
    renderLegend(root);
    if (c.state.flyTo && engine.has(c.state.flyTo)) { engine.flyTo(c.state.flyTo); c.state.flyTo = null; }
  }

  function renderLegend(root) {
    const el = root.querySelector("#mapLegend");
    if (!el || !engine) return;
    const groups = engine.groupColours();
    el.innerHTML = '<ul class="map-legend__groups" role="list">' + groups.map(function (g) {
      return '<li><button type="button" class="map-legend__item" data-action="map-group" data-group="' + esc(g.key) + '"><span class="map-legend__dot" style="background:' + esc(g.css) + '"></span><span class="map-legend__name">' + esc(g.label) + '</span><span class="map-legend__n num">' + g.count + "</span></button></li>";
    }).join("") + "</ul>" +
      '<ul class="map-legend__key" role="list"><li><span class="key key--big"></span>Big dot: used a lot lately</li><li><span class="key key--hollow"></span>Hollow: not used lately</li><li><span class="key key--link"></span>One skill names another</li><li><span class="key key--dup"></span>Same name twice</li></ul>';
  }

  V.map = {
    render: render, bind: bind, passSet: passSet, filtersOn: filtersOn, mode: mode,
    title: function () { return "Map"; },
    sub: function (c) { return M.notSetUp(c.d) ? "" : M.scanLabel(c.d); },
    controls: function () { return engine; }
  };
})();

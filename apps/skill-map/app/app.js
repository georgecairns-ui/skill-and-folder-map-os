/*
  SKILL MAP OS: the app
  ---------------------
  Ties everything together:
  1. Connects to data/skillmap.json through the shared store.
  2. Shows the welcome screen until the helper is running, then the app.
  3. Moves between pages (Map, All skills, Overview, Gaps, Review, Preferences) using the address
     bar, so Back and Forward work.
  4. Handles every button, form and keyboard shortcut. Every change goes through change(), which
     saves it into the map file for Claude to read.
  5. Asks Claude, through the helper, to do its 3 jobs (claude-jobs.json): scan the skills, group
     them by what they do, and review them. The scan itself is a plain script that only reads.

  The rule throughout: Claude suggests, the person decides. Nothing here edits, moves or deletes a
  skill, and nothing is sent anywhere.
*/
(function () {
  "use strict";

  const ui = window.TaskListOS.ui, esc = ui.esc, icon = ui.icon;
  const M = window.SM.model, C = window.SM.c, V = window.SM.views, Drawer = window.SM.drawer;
  const mut = M.mut;
  const $ = function (sel, root) { return (root || document).querySelector(sel); };

  // Number keys 1 to 5 follow the sidebar
  const VIEW_ORDER = ["map", "skills", "overview", "gaps", "review"];

  function remembered(key, allowed) {
    try { const v = localStorage.getItem(key); return allowed.indexOf(v) > -1 ? v : null; } catch (e) { return null; }
  }
  function remember(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* not remembered, fine */ }
  }

  // ---------- Screen state (not saved to the file) ----------
  const state = {
    view: "map",
    mapMode: remembered("smos-map-mode", ["area", "source"]),
    origins: [], used: "all", attention: false, tag: "", links: remembered("smos-links", ["on", "off"]) === "on",
    skillsQuery: "", skillsOrigin: "all", skillsAttention: false, skillsSort: { key: "name", dir: "asc" },
    drawer: null, flyTo: null
  };
  const claude = { jobs: [], timer: null, before: null };

  let data = null;
  let status = "checking";
  let statusDetail = {};
  const toolkit = { tools: [], installed: {}, booking: null };

  // ============================================================
  // 1. The store
  // ============================================================

  const store = window.TaskListOS.createStore({
    moduleId: "skill-map",
    fileName: "skillmap.json",
    dataPaths: ["data", "", "apps/skill-map/data"],
    api: "/api/data/skill-map/skillmap.json",
    validate: M.validate,
    onStatus: function (s, detail) {
      const previous = status;
      status = s;
      statusDetail = detail || {};
      renderChrome();
      if (!(data && (s === "ready" || s === "error")) || previous !== s) render();
    },
    onData: function (d, reason) {
      data = M.normalise(d);
      if (reason === "load") state.drawer = null;
      render();
      if (reason === "external" && !claude.jobs.length) ui.toast("Your map was updated", { icon: "sparkle" });
    }
  });

  function change(fn) {
    return store.update(function (d) { M.normalise(d); fn(d); }).catch(function (err) {
      ui.toast(friendlyError(err).short, { icon: "alert", duration: 6000 });
      render();
      err.shownToPerson = true;
      throw err;
    });
  }
  window.addEventListener("unhandledrejection", function (e) { if (e.reason && e.reason.shownToPerson) e.preventDefault(); });

  function friendlyError(err) {
    const kind = err && err.kind;
    if (kind === "bad-file") return { title: "Your skill map file has a small mistake in it.", body: "Nothing new can show or save until it's fixed. Claude can sort it in a few seconds, and the last good version is kept in skillmap.backup.json next to it.", say: "Please check my skillmap.json file and fix it", short: "Your skill map file needs a quick fix" };
    if (kind === "missing") return { title: "Your skill map file has gone missing.", body: "It may have been moved or renamed. Ask Claude to check.", say: "My skill map file seems to be missing, please check it", short: "Your skill map file can't be found" };
    if (kind === "needs-permission") return { title: "Chrome needs your permission again.", body: "Click Try again and allow access to your folder.", short: "Chrome needs your permission again" };
    if (kind === "helper-stopped") return { title: "Your skill map has stopped running.", body: "Everything is saved. In Claude, say “open my skill map” and it starts again. This page reconnects by itself.", say: "Open my skill map", short: "Your skill map has stopped running" };
    return { title: "That change didn't save.", body: "Nothing is lost. Try again in a moment.", short: "That change didn't save. Please try again" };
  }

  // ============================================================
  // 2. Before the map is running: welcome, loading, problems
  // ============================================================

  function showGate(html) {
    $("#shell").hidden = true;
    const gate = $("#gate");
    gate.hidden = false;
    gate.innerHTML = html;
  }
  function gateCard(art, eyebrow, title, body, actions, small) {
    return '<div class="gate__card">' +
      '<div class="gate__text"><div class="gate__brand"><img src="../shared/images/claude-icon.png" alt="" width="28" height="28"><span>Skill Map OS</span></div>' +
      (eyebrow ? '<span class="label">' + esc(eyebrow) + "</span>" : "") + "<h1>" + title + "</h1>" + body +
      '<div class="gate__actions">' + actions + "</div>" + (small ? '<p class="gate__small">' + small + "</p>" : "") + "</div>" +
      '<div class="gate__art"><img src="' + C.ART[art] + '" alt="" width="440" height="440"></div></div>';
  }
  function renderGate(message) {
    if (status === "checking" || (status === "ready" && !data)) {
      return showGate('<div class="gate__loading" aria-busy="true" aria-label="Opening your skill map"><div class="skeleton" style="width:220px;height:14px"></div><div class="skeleton" style="width:320px;height:28px"></div><div class="skeleton" style="width:260px;height:14px"></div></div>');
    }
    if (status === "needs-helper") {
      return showGate(gateCard("welcome", "", "Your skill map opens from Claude.",
        "<p>Claude runs your skill map on this computer and gives you a link to it. In Claude Code, in your Skill Map OS folder, just say:</p>" + C.say("Open my skill map") +
        '<p class="gate__note">Not set up yet? Say <strong>/setup</strong> instead. Claude scans your skills and draws the map for you.</p>',
        "",
        '<button type="button" class="link-btn" data-action="connect">Or connect the folder yourself in Chrome</button>'));
    }
    if (status === "unsupported") {
      return showGate(gateCard("shrug", "One small thing", "This works in Chrome or Microsoft Edge.", "<p>Open this same page in Google Chrome or Microsoft Edge and it will work. Both are free.</p>", ""));
    }
    if (status === "needs-permission") {
      return showGate(gateCard("welcome", "Welcome back", "Pick up where you left off.", "<p>Chrome asks for one click each visit before this page can open your files.</p>",
        '<button type="button" class="btn btn--primary btn--lg" data-action="reconnect">' + icon("folder") + "Open my skill map</button>", "Folder: " + esc(statusDetail.folderName || "")));
    }
    if (status === "error" && !data) {
      const f = friendlyError(statusDetail.error);
      return showGate(gateCard("shrug", "Something needs a look", esc(f.title), "<p>" + esc(f.body) + "</p>" + (f.say ? C.say(f.say) : ""),
        '<button type="button" class="btn btn--primary btn--lg" data-action="retry">' + icon("refresh") + "Try again</button>"));
    }
    showGate(gateCard("welcome", "One-time setup", "See every skill Claude has. <span class=\"accent\">At a glance.</span>",
      "<p>Skill Map OS finds the skills on your computer, shows which ones you use, and which parts of your business have none yet. It only reads. It all lives in a file on your own computer.</p>" +
      '<ol class="gate__steps"><li><span>Click <strong>Connect your skill map</strong>.</span></li><li><span>Choose your <strong>Skill Map OS</strong> folder, the one with START-HERE.md in it.</span></li><li><span>When Chrome asks to let this page edit files, click <strong>Allow</strong>.</span></li></ol>' +
      (message ? '<p class="gate__error" role="alert">' + icon("alert") + esc(message) + "</p>" : ""),
      '<button type="button" class="btn btn--primary btn--lg" data-action="connect">' + icon("folder") + "Connect your skill map</button>",
      "No account, nothing to install. Your skills never leave your computer."));
  }

  // ============================================================
  // 3. The app
  // ============================================================

  function inApp() { return !!data && (status === "ready" || status === "error"); }

  function render() {
    if (!inApp()) { renderChrome(); return renderGate(); }
    $("#gate").hidden = true;
    $("#shell").hidden = false;
    renderChrome();
    renderView();
    renderDrawer();
  }

  const actions = {
    openNode: function (id) { openDrawer("skill", id); },
    openGroup: function (key) { openDrawer("group", key); },
    closeDrawer: function () { closeDrawer(); }
  };
  function ctx() { return { d: data, state: state, actions: actions, toolkit: toolkit, canScan: store.isHelper() }; }

  function renderChrome() {
    const pill = $("#saveStatus");
    if (status === "ready") {
      const just = statusDetail.savedAt && Date.now() - statusDetail.savedAt < 3000;
      pill.hidden = false;
      pill.className = "save-status" + (just ? " is-saving" : "");
      pill.innerHTML = '<span class="save-status__dot"></span><span class="save-status__text">' + (just ? "Saved" : "All changes saved") + "</span>";
      if (just) setTimeout(function () { if (status === "ready") renderChrome(); }, 3100);
    } else if (status === "error" && data) {
      pill.hidden = false; pill.className = "save-status is-error";
      pill.innerHTML = '<span class="save-status__dot"></span><span class="save-status__text">Not saved</span>';
    } else pill.hidden = true;

    const banner = $("#banner");
    if (status === "error" && data) {
      const f = friendlyError(statusDetail.error);
      banner.innerHTML = '<div class="banner banner--error">' + icon("alert") + "<span><strong>" + esc(f.title) + "</strong> " + esc(f.body) + "</span>" +
        '<button type="button" class="btn btn--sm" data-action="retry">Try again</button></div>';
    } else banner.innerHTML = "";

    if (!data) return;
    $("#businessName").textContent = data.settings.businessName || (data.settings.yourName ? data.settings.yourName + "'s workspace" : "Your workspace");
    const n = M.numbers(data);
    const counts = { skills: data.nodes.length || "", gaps: M.hasAreas(data) ? n.areasEmpty || "" : "", review: M.reviewCount(data) || "" };
    document.querySelectorAll("[data-count]").forEach(function (el) { const v = counts[el.getAttribute("data-count")]; el.textContent = v ? v : ""; });
    document.querySelectorAll(".nav__item").forEach(function (a) {
      const on = a.getAttribute("data-view") === state.view;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    $("#savedMini").innerHTML = M.notSetUp(data) ? "" : '<span class="saved-mini__value num">' + n.total + '</span><span class="saved-mini__label">' + (n.total === 1 ? "skill" : "skills") + " mapped</span>";
    $("#scanBtn").disabled = claude.jobs.length > 0;
    const scanLabel = M.notSetUp(data) ? "Scan my skills" : "Scan again";
    $("#scanBtn .topbar__new-label").textContent = scanLabel;
    $("#scanBtn").setAttribute("aria-label", scanLabel);
  }

  function renderView() {
    const view = V[state.view] || V.map;
    const root = $("#view");
    const c = ctx();
    const scroll = root.scrollTop;
    root.innerHTML = view.render(c);
    root.setAttribute("data-view", state.view);
    if (view.bind) view.bind(root, c);
    C.countUp(root);
    root.scrollTop = scroll;
    $("#viewTitle").textContent = view.title(c);
    $("#viewSub").textContent = view.sub ? view.sub(c) : "";
    document.title = view.title(c) + " · Skill Map OS";
  }

  // The panel
  let drawerKey = null;
  function renderDrawer() {
    const el = $("#drawer");
    if (!state.drawer) { el.hidden = true; document.body.classList.remove("has-drawer"); drawerKey = null; syncMapSelection(); return; }
    const key = state.drawer.kind + ":" + state.drawer.id;
    const active = document.activeElement;
    // Don't redraw under someone's fingers while they type in the panel
    if (key === drawerKey && active && el.contains(active) && (active.tagName === "TEXTAREA" || (active.tagName === "INPUT" && /text|search/.test(active.type)))) return;
    const html = Drawer.render(ctx(), state.drawer);
    if (!html) { state.drawer = null; return renderDrawer(); }
    el.innerHTML = html;
    Drawer.bind(el, ctx(), state.drawer);
    const opening = el.hidden;
    el.hidden = false;
    document.body.classList.add("has-drawer");
    if (opening) { el.classList.remove("is-open"); void el.offsetWidth; el.classList.add("is-open"); }
    drawerKey = key;
    syncMapSelection();
  }
  function syncMapSelection() {
    const map = V.map.controls();
    if (!map || state.view !== "map") return;
    map.setSelected(state.drawer ? (state.drawer.kind === "group" ? "hub:" + state.drawer.id : state.drawer.id) : null);
  }
  function openDrawer(kind, id) {
    if (!id) return;
    state.drawer = { kind: kind, id: id };
    drawerKey = null;
    renderDrawer();
    setTimeout(function () { const b = $("#drawer [data-action='close-drawer']"); if (b) b.focus({ preventScroll: true }); }, 40);
  }
  function closeDrawer() { state.drawer = null; renderDrawer(); }

  // ============================================================
  // 4. Moving between pages
  // ============================================================

  function go(view) {
    if (!V[view]) view = "map";
    state.view = view;
    remember("smos-view", view);
    if (location.hash !== "#" + view) history.replaceState(null, "", "#" + view);
    document.body.classList.remove("sidebar-open");
    if (inApp()) { renderChrome(); renderView(); $("#view").scrollTop = 0; syncMapSelection(); }
  }
  window.addEventListener("hashchange", function () { const v = location.hash.slice(1); if (v && v !== state.view) go(v); });

  // Show a skill on the map: switch to the map page, then fly to it
  function showOnMap(id) {
    state.flyTo = id;
    if (state.view !== "map") go("map"); else { renderView(); }
  }

  // ============================================================
  // 5. Asking Claude (scan, group, review)
  // ============================================================

  function setClaudeStatus(text) {
    const el = $("#claudeStatus");
    if (!text) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;
    el.innerHTML = icon("loader", "claude-status__spin") + '<span class="claude-status__text">' + esc(text) + "</span>";
  }
  const JOBS = {
    scan: { name: "scan-my-skills", doing: "Claude is scanning your skills", say: "Scan my skills" },
    group: { name: "group-my-skills", doing: "Claude is grouping your skills", say: "Group my skills" },
    review: { name: "review-my-skills", doing: "Claude is reviewing your skills", say: "Review my skills" }
  };
  // Resolves true if Claude was started (or queued)
  function askClaude(kind) {
    if (!store.isHelper()) return Promise.resolve(false);
    return fetch("/api/claude/run/skill-map/" + JOBS[kind].name, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then(function (r) {
        if (r.status !== 202) return false;
        if (claude.jobs.indexOf(kind) === -1) claude.jobs.push(kind);
        claude.before = claude.before || { scanAt: data && data.scan ? data.scan.at : null, recs: data ? data.recommendations.length : 0 };
        watchClaude();
        return true;
      })
      .catch(function () { return false; });
  }
  function startJob(kind) {
    if (claude.jobs.indexOf(kind) > -1) return;
    askClaude(kind).then(function (started) {
      if (started) return;
      $("#genericBody").innerHTML = '<div class="modal__head"><h2>Ask Claude to do it</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>" +
        '<div class="modal__body"><p>Claude can’t be started from this page on this computer. In Claude Code, in your Skill Map OS folder, say:</p>' + C.say(JOBS[kind].say) +
        '<p class="muted">Claude does it straight away and this page updates by itself.</p></div>';
      $("#genericDialog").showModal();
    });
  }
  function watchClaude() {
    setClaudeStatus(JOBS[claude.jobs[0]] ? JOBS[claude.jobs[0]].doing : "Claude is working");
    renderChrome();
    clearInterval(claude.timer);
    claude.timer = setInterval(function () {
      fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) {
        if (st.running || st.queued) { setClaudeStatus(JOBS[claude.jobs[0]] ? JOBS[claude.jobs[0]].doing : "Claude is working"); return; }
        clearInterval(claude.timer);
        setTimeout(function () { finishedClaude(st.lastResult); }, 2000);
      }).catch(function () { /* helper briefly unavailable; keep watching */ });
    }, 3000);
  }
  // Read the file fresh to say how it went (the app's own refresh pauses while its tab is hidden)
  function finishedClaude(result) {
    fetch("/api/data/skill-map/skillmap.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (fresh) { reportClaude(fresh ? M.normalise(fresh) : data, result); }, function () { reportClaude(data, result); });
  }
  function reportClaude(now, result) {
    const kinds = claude.jobs.splice(0), before = claude.before || {};
    claude.before = null;
    setClaudeStatus("");
    if (now && now !== data) { data = now; render(); }
    renderChrome();
    if (result === "failed") { ui.toast("Claude couldn’t finish. Say “" + JOBS[kinds[0] || "scan"].say + "” to Claude in Claude Code and it will tell you why.", { icon: "alert", duration: 9000 }); return; }
    if (kinds.indexOf("scan") > -1) {
      const s = now && now.scan, scanned = s && s.at && s.at !== before.scanAt;
      if (!scanned) ui.toast("The scan didn’t save anything new. Say “Scan my skills” to Claude to see why.", { icon: "alert", duration: 9000 });
      else ui.toast("Found " + now.nodes.length + (now.nodes.length === 1 ? " skill" : " skills") + (s.changes && s.changes.added ? ", " + s.changes.added + " new" : "") + (s.changes && s.changes.removed && s.changes.removed.length ? ", " + s.changes.removed.length + " gone" : ""), { icon: "sparkle", duration: 6000 });
    }
    if (kinds.indexOf("group") > -1) {
      if (now && M.hasAreas(now)) { state.mapMode = "area"; ui.toast("Claude grouped your skills. Check the groups, then say it looks right", { icon: "sparkle", duration: 7000 }); go("gaps"); }
      else ui.toast("Claude didn’t group anything. Say “Group my skills” to Claude to see why.", { icon: "alert", duration: 9000 });
    }
    if (kinds.indexOf("review") > -1) {
      const gained = now ? now.recommendations.length - (before.recs || 0) : 0;
      ui.toast(gained > 0 ? "Claude left " + gained + (gained === 1 ? " suggestion" : " suggestions") + " for you" : "Claude has nothing new to suggest", { icon: "sparkle", duration: 6000 });
      if (gained > 0) go("review");
    }
  }

  // ============================================================
  // 6. Buttons and forms
  // ============================================================

  const generic = $("#genericDialog");
  function openGeneric(html) { $("#genericBody").innerHTML = html; generic.showModal(); }

  function openAddManual() {
    openGeneric('<form data-form="add-manual" class="modal__form">' +
      '<div class="modal__head"><h2>Add a skill I use on claude.ai</h2><button type="button" class="icon-btn" data-close aria-label="Close">' + icon("x") + "</button></div>" +
      '<div class="modal__body stack"><p class="muted">The scan can only see skills on this computer. Add the ones you use on claude.ai or in Cowork by hand so the map is complete. They don’t get use counts.</p>' +
      '<label class="field"><span class="field__label">Name</span><input class="input" name="name" required maxlength="80" autocomplete="off"></label>' +
      '<label class="field"><span class="field__label">What it does</span><textarea class="textarea" name="description" rows="3" maxlength="500"></textarea></label>' +
      '<div class="field-row"><label class="field"><span class="field__label">Where it lives</span><input class="input" name="where" value="claude.ai" maxlength="80"></label>' +
      '<label class="field"><span class="field__label">Group</span><select class="select" name="area"><option value="">Not grouped yet</option>' + data.areas.map(function (a) { return '<option value="' + esc(a.key) + '">' + esc(a.label) + "</option>"; }).join("") + "</select></label></div></div>" +
      '<div class="modal__foot"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn btn--primary">Add to the map</button></div></form>');
    setTimeout(function () { const i = $("#genericBody [name=name]"); if (i) i.focus(); }, 30);
  }

  document.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    switch (action) {
      // connecting
      case "connect": store.connect().catch(function (err) { renderGate(err && err.kind === "wrong-folder" ? "That folder doesn't have a skill map in it. Choose the Skill Map OS folder." : ""); }); break;
      case "reconnect": store.reconnect(); break;
      case "retry": store.retry(); break;
      // Claude's jobs
      case "scan": startJob("scan"); break;
      case "group": startJob("group"); break;
      case "review": startJob("review"); break;
      // the map
      case "map-mode": state.mapMode = btn.getAttribute("data-mode"); remember("smos-map-mode", state.mapMode); renderView(); break;
      case "map-links": state.links = !state.links; remember("smos-links", state.links ? "on" : "off"); renderView(); break;
      case "map-fit": { const m = V.map.controls(); if (m) m.fit(); break; }
      case "map-origin": { const o = btn.getAttribute("data-origin"); const i = state.origins.indexOf(o); if (i > -1) state.origins.splice(i, 1); else state.origins.push(o); renderView(); break; }
      case "map-used": { const u = btn.getAttribute("data-used"); state.used = state.used === u ? "all" : u; renderView(); break; }
      case "map-attention": state.attention = !state.attention; renderView(); break;
      case "map-tag": { const t = btn.getAttribute("data-tag"); state.tag = state.tag === t ? "" : t; renderView(); break; }
      case "map-clear": state.origins = []; state.used = "all"; state.attention = false; state.tag = ""; renderView(); break;
      case "map-group": {
        const key = btn.getAttribute("data-group");
        const wantsArea = /^area:/.test(key);
        if (state.view !== "map" || (wantsArea && V.map.mode(ctx()) !== "area") || (!wantsArea && V.map.mode(ctx()) !== "source")) { state.mapMode = wantsArea ? "area" : "source"; }
        state.flyTo = "hub:" + key;
        if (state.view !== "map") go("map"); else renderView();
        openDrawer("group", key);
        break;
      }
      case "show-unused": state.used = "unused"; state.origins = []; state.attention = false; state.tag = ""; go("map"); break;
      case "show-on-map": showOnMap(id); break;
      case "show-group-on-map": state.flyTo = "hub:" + btn.getAttribute("data-group"); if (state.view !== "map") go("map"); else renderView(); break;
      case "locked-tool": { const t = document.querySelector('[data-locked-tool="' + btn.getAttribute("data-tool") + '"]'); if (t) t.click(); break; }
      // opening and closing the panel
      case "open-node": openDrawer("skill", id); break;
      case "close-drawer": closeDrawer(); break;
      // the table
      case "skills-sort": { const k = btn.getAttribute("data-key"); state.skillsSort = { key: k, dir: state.skillsSort.key === k && state.skillsSort.dir === "asc" ? "desc" : "asc" }; renderView(); break; }
      case "skills-attention": state.skillsAttention = !state.skillsAttention; renderView(); break;
      // changing things
      case "approve-areas": change(function (d) { mut.approveAreas(d); }).then(function () { ui.toast("Thanks. Your groups are saved"); }); break;
      case "rec-done": change(function (d) { mut.decideRec(d, id, "done"); }).then(function () { ui.toast("Marked done", { actionLabel: "Undo", onAction: function () { change(function (d) { mut.decideRec(d, id, "open"); }); } }); }); break;
      case "rec-skip": change(function (d) { mut.decideRec(d, id, "skipped"); }).then(function () { ui.toast("Not now", { actionLabel: "Undo", onAction: function () { change(function (d) { mut.decideRec(d, id, "open"); }); } }); }); break;
      case "remove-tag": change(function (d) { mut.removeTag(d, id, btn.getAttribute("data-tag")); }); break;
      case "add-manual": openAddManual(); break;
      case "remove-manual": {
        const n = M.nodeById(data, id);
        closeDrawer();
        change(function (d) { mut.removeManual(d, id); }).then(function () { ui.toast("Removed " + (n ? n.name : "the skill") + " from the map"); });
        break;
      }
      // everything else
      case "settings": go("preferences"); break;
      case "pref-add-area": V.preferences.addAreaRow($("#prefAreas")); break;
      case "pref-remove-area": btn.closest(".pref-cat").remove(); break;
      case "shortcuts": $("#shortcutsDialog").showModal(); break;
      case "open-sidebar": document.body.classList.add("sidebar-open"); break;
      case "close-sidebar": document.body.classList.remove("sidebar-open"); break;
      case "copy":
        ui.copyText(btn.getAttribute("data-text")).then(function (ok) { ui.toast(ok ? "Copied. Paste it to Claude" : "Couldn't copy. Type it to Claude instead", { icon: ok ? "check" : "info" }); });
        break;
    }
  });

  // Moving between pages from the sidebar
  document.addEventListener("click", function (e) {
    const link = e.target.closest(".nav__item, a[href^='#']");
    if (!link) return;
    const v = link.getAttribute("href").slice(1);
    if (V[v]) { e.preventDefault(); go(v); }
  });

  // The table's filter box changes only the rows, so typing never loses its place
  document.addEventListener("input", function (e) {
    if (!e.target.matches || !e.target.matches("[data-skills-q]")) return;
    state.skillsQuery = e.target.value;
    const rows = $("#skillRows"), count = $("#skillCount");
    if (rows) { rows.innerHTML = V.skills.rows(ctx()); if (count) count.textContent = V.skills.countText(ctx()); }
  });
  document.addEventListener("change", function (e) {
    const t = e.target;
    if (t.matches && t.matches("[data-skills-origin]")) { state.skillsOrigin = t.value; renderView(); }
    if (t.matches && t.matches("[data-skill-area]")) {
      const id = t.getAttribute("data-id"), area = t.value;
      change(function (d) { mut.setArea(d, id, area); }).then(function () { ui.toast("Moved to " + (area ? M.areaByKey(data, area).label : "not grouped")); });
    }
  });

  document.addEventListener("submit", function (e) {
    const form = e.target.closest("[data-form]");
    if (!form) return;
    e.preventDefault();
    const kind = form.getAttribute("data-form");
    const f = form.elements;
    if (kind === "preferences") {
      const got = V.preferences.collect(form);
      if (got.error) return ui.toast(got.error, { icon: "alert", duration: 6000 });
      change(function (d) { mut.setSettings(d, got.values, got.areas); }).then(function () { ui.toast("Preferences saved"); renderChrome(); });
      return;
    }
    if (kind === "add-tag") {
      const id = form.getAttribute("data-id"), text = f.tag.value.trim();
      if (!text) return;
      change(function (d) { mut.addTag(d, id, text); });
      return;
    }
    if (kind === "add-manual") {
      const name = f.name.value.trim();
      if (!name) return f.name.focus();
      let made = null;
      generic.close();
      change(function (d) { made = mut.addManual(d, { name: name, description: f.description.value, where: f.where.value, area: f.area.value }); }).then(function () {
        ui.toast("Added " + name);
        if (made) openDrawer("skill", made.id);
      });
      return;
    }
    if (kind === "edit-manual") {
      const id = form.getAttribute("data-id");
      change(function (d) { mut.updateManual(d, id, { name: f.name.value, description: f.description.value, where: f.where.value }); }).then(function () { ui.toast("Saved"); });
    }
  });

  document.querySelectorAll("dialog.modal").forEach(function (dlg) {
    dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); });
  });

  // ============================================================
  // 7. Search
  // ============================================================

  const searchInput = $("#searchInput"), results = $("#searchResults");
  function renderResults() {
    if (!searchInput.value.trim()) { results.hidden = true; return; }
    const r = M.search(data, searchInput.value);
    results.innerHTML = r.length ? r.map(function (n) {
      return '<button type="button" class="menu-item" role="option" data-result="' + esc(n.id) + '">' + icon("sparkle") + '<span class="menu-item__text">' + esc(n.name) + '</span><span class="menu-item__sub">' + esc(n.source) + "</span></button>";
    }).join("") : '<p class="search-results__none">Nothing matches “' + esc(searchInput.value.trim()) + "”</p>";
    results.hidden = false;
  }
  searchInput.addEventListener("input", function () { if (data) renderResults(); });
  searchInput.addEventListener("focus", function () { if (data && searchInput.value) renderResults(); });
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { searchInput.value = ""; results.hidden = true; searchInput.blur(); }
    if (e.key === "Enter") { e.preventDefault(); const first = results.querySelector(".menu-item"); if (first) first.click(); }
    if (e.key === "ArrowDown") { const first = results.querySelector(".menu-item"); if (first) { e.preventDefault(); first.focus(); } }
  });
  results.addEventListener("keydown", function (e) {
    const items = Array.prototype.slice.call(results.querySelectorAll(".menu-item"));
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" && i < items.length - 1) { e.preventDefault(); items[i + 1].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); if (i > 0) items[i - 1].focus(); else searchInput.focus(); }
  });
  results.addEventListener("click", function (e) {
    const b = e.target.closest(".menu-item");
    if (!b) return;
    results.hidden = true;
    searchInput.value = "";
    state.flyTo = b.dataset.result;
    if (state.view === "map") { renderView(); }
    openDrawer("skill", b.dataset.result);
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".topbar__search")) results.hidden = true; });

  // ============================================================
  // 8. Keyboard shortcuts
  // ============================================================

  document.addEventListener("keydown", function (e) {
    if (!inApp()) return;
    const el = document.activeElement;
    const typing = /INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable;
    if (e.key === "Escape") {
      if (document.querySelector("dialog[open]")) return;
      if (state.drawer) { closeDrawer(); return; }
      document.body.classList.remove("sidebar-open");
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]")) return;
    if (e.key === "/") { e.preventDefault(); searchInput.focus(); }
    else if (e.key === "f" || e.key === "F") { const m = V.map.controls(); if (m && state.view === "map") { e.preventDefault(); m.fit(); } }
    else if (e.key === "s" || e.key === "S") { e.preventDefault(); startJob("scan"); }
    else if (/^[1-9]$/.test(e.key)) { const v = VIEW_ORDER[Number(e.key) - 1]; if (v) go(v); }
  });

  // ============================================================
  // Start
  // ============================================================

  document.querySelectorAll("[data-icon]").forEach(function (el) {
    const tmp = document.createElement("span");
    tmp.innerHTML = icon(el.getAttribute("data-icon"), el.className || "");
    el.replaceWith(tmp.firstChild);
  });

  const fromHash = location.hash.slice(1);
  let lastView = null;
  try { lastView = localStorage.getItem("smos-view"); } catch (e) { lastView = null; }
  state.view = V[fromHash] ? fromHash : V[lastView] ? lastView : "map";
  if (location.hash !== "#" + state.view) history.replaceState(null, "", "#" + state.view);

  // Which toolkit tools exist and which are in this folder (for the Gaps page)
  function loadToolkit() {
    Promise.all([
      fetch("../shared/catalogue.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : { tools: [] }; }),
      fetch("../installed.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : { tools: [] }; })
    ]).then(function (both) {
      toolkit.tools = Array.isArray(both[0].tools) ? both[0].tools : [];
      toolkit.installed = {};
      (both[1].tools || []).forEach(function (t) { if (t && t.id) toolkit.installed[t.id] = true; });
      if (inApp() && state.view === "gaps") renderView();
    }).catch(function () { /* opened without the helper: the Gaps page just leaves the tool hints out */ });
  }

  renderGate();
  store.start().then(function () {
    loadToolkit();
    if (store.isHelper()) fetch("/api/claude/status", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (st) { if ((st.running || st.queued) && /^skill-map:/.test(st.job || "")) { claude.jobs.push(/scan/.test(st.job) ? "scan" : /group/.test(st.job) ? "group" : "review"); watchClaude(); } }).catch(function () {});
    if (/^https?:$/.test(location.protocol)) fetch("/api/info", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (info) { C.setFolder(info.folder); }).catch(function () {});
  });
})();

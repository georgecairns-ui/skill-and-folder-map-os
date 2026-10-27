/*
  Checks the safety rules of the tidy-up scripts (apps/skill-map/tidy/tidy.js and tidy.py) against a temporary
  folder, so nothing real is ever touched. Both scripts get the same fixture and must give the same answers.
  Folder names contain spaces, apostrophes and double quotes on purpose.

  Run: node maintainers/test-tidy-safety.js
  Exits 1 if any check fails.
*/
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const KITSRC = path.join(__dirname, "..");
const SCRIPTS = [
  { name: "tidy.js", cmd: "node", file: path.join(KITSRC, "apps", "skill-map", "tidy", "tidy.js") },
  { name: "tidy.py", cmd: "python3", file: path.join(KITSRC, "apps", "skill-map", "tidy", "tidy.py") }
];

function mk(p, text) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text === undefined ? "x" : text); }
function tree(root) {
  const out = [];
  (function walk(d) {
    fs.readdirSync(d).sort().forEach(function (n) {
      const p = path.join(d, n), st = fs.lstatSync(p);
      out.push(path.relative(root, p) + (st.isSymbolicLink() ? " -> link" : st.isDirectory() ? "/" : ""));
      if (st.isDirectory()) walk(p);
    });
  })(root);
  return out;
}

// Builds a fresh fixture under base and returns where things are
function build(base) {
  const home = path.join(base, "home folder");
  const kit = path.join(base, "the kit");
  const outside = path.join(base, "outside");
  const root = path.join(home, "Client's \"Files\"");         // the chosen folder
  mk(path.join(root, "Big Old", "a.txt"));
  mk(path.join(root, "Big Old", "b.txt"));
  mk(path.join(root, "Invoice (1).pdf"));
  mk(path.join(root, "Notes copy.txt"));
  mk(path.join(root, "Crowded", "one.jpg"));
  mk(path.join(root, "Crowded", "two.jpg"));
  mk(path.join(root, "Crowded", "three.doc"));
  mk(path.join(root, "same.txt"), "first");
  fs.mkdirSync(path.join(root, "v1.2"));
  fs.mkdirSync(path.join(root, "Tidied by Claude", "2026-01-01", "v1.2"), { recursive: true });
  mk(path.join(root, "Tidied by Claude", "2026-01-01", "same.txt"), "already there");
  mk(path.join(root, "x.txt"));
  mk(path.join(root, "y.txt"));
  mk(path.join(root, "z.txt"));
  fs.mkdirSync(path.join(outside, "Tidied"), { recursive: true });
  fs.mkdirSync(path.join(root, "Linked"));
  fs.symlinkSync(path.join(outside, "Tidied"), path.join(root, "Linked", "Tidied by Claude"));
  mk(path.join(root, "Linked", "q.txt"));
  mk(path.join(outside, "keep.txt"));
  fs.mkdirSync(path.join(root, "elsewhere"));
  // skills
  const skills = path.join(home, ".claude", "skills");
  mk(path.join(skills, "my skill", "SKILL.md"));
  mk(path.join(skills, "it's \"v1.2\"", "SKILL.md"));
  mk(path.join(skills, "group", "nested skill", "SKILL.md"));
  mk(path.join(skills + "-archive", "2026-01-01", "it's \"v1.2\"", "SKILL.md"), "older copy");
  mk(path.join(kit, ".claude", "skills", "tidy-up", "SKILL.md"));
  mk(path.join(kit, ".claude", "skills", "other kit skill", "SKILL.md"));
  mk(path.join(kit, ".claude", "skills-archive", "keep.txt"));
  // the kit's own data
  fs.mkdirSync(path.join(kit, "apps", "skill-map", "data"), { recursive: true });
  fs.writeFileSync(path.join(kit, "apps", "skill-map", "data", "filemap.json"), JSON.stringify({ settings: { roots: [root] } }));
  fs.writeFileSync(path.join(kit, "apps", "skill-map", "data", "skillmap.json"),
    JSON.stringify({ settings: { extraFolders: [path.join(kit, ".claude", "skills"), path.join(kit, ".claude")] } }));
  return { home: home, kit: kit, root: root, outside: outside, skills: skills, tidied: path.join(root, "Tidied by Claude", "2026-02-02") };
}

function cases(f) {
  const R = f.root, T = f.tidied, S = f.skills, K = path.join(f.kit, ".claude", "skills");
  const m = function (from, to, extra) { return Object.assign({ from: from, to: to, type: "file" }, extra || {}); };
  const list = [
    // files: moves into Tidied by Claude
    ["files", "archive", "archive ok", m(path.join(R, "Invoice (1).pdf"), path.join(T, "Invoice (1).pdf"), { bytes: 1 }), "moved"],
    ["files", "archive", "archive to elsewhere in the folder", m(path.join(R, "x.txt"), path.join(R, "elsewhere", "x.txt")), "refused"],
    ["files", "archive", "archive to the folder's top level", m(path.join(R, "y.txt"), path.join(R, "y2.txt")), "refused"],
    ["files", "archive", "archive with .. to escape", m(path.join(R, "z.txt"), path.join(R, "Tidied by Claude", "..", "..", "z.txt")), "refused"],
    ["files", "archive", "archive to outside the folder", m(path.join(R, "z.txt"), path.join(f.outside, "z.txt")), "refused"],
    ["files", "keep-one", "name taken: arrives as (2)", m(path.join(R, "same.txt"), path.join(R, "Tidied by Claude", "2026-01-01", "same.txt"), { bytes: 5 }), "moved"],
    ["files", "empty", "folder with a dot: v1.2 becomes v1.2 (2)", { from: path.join(R, "v1.2"), to: path.join(R, "Tidied by Claude", "2026-01-01", "v1.2"), type: "folder" }, "moved"],
    ["files", "archive", "Tidied by Claude is a link out", m(path.join(R, "Linked", "q.txt"), path.join(R, "Linked", "Tidied by Claude", "q.txt")), "refused"],
    ["files", "archive", "from outside the chosen folder", m(path.join(f.outside, "keep.txt"), path.join(R, "Tidied by Claude", "k.txt")), "refused"],
    ["files", "archive", "a skill folder as a file move (toolkit)", m(path.join(K, "tidy-up", "SKILL.md"), path.join(R, "Tidied by Claude", "s.md")), "refused"],
    // files: rename must stay in the same folder
    ["files", "rename", "rename ok", m(path.join(R, "Notes copy.txt"), path.join(R, "Notes.txt")), "moved"],
    ["files", "rename", "rename into another folder", m(path.join(R, "Big Old", "a.txt"), path.join(R, "elsewhere", "a.txt")), "refused"],
    ["files", "rename", "rename into Tidied by Claude", m(path.join(R, "Big Old", "b.txt"), path.join(T, "b.txt")), "refused"],
    // files: sort goes into a sub-folder of the folder it is in
    ["files", "sort", "sort ok", m(path.join(R, "Crowded", "one.jpg"), path.join(R, "Crowded", "Images", "one.jpg")), "moved"],
    ["files", "sort", "sort into a different folder", m(path.join(R, "Crowded", "two.jpg"), path.join(R, "elsewhere", "Images", "two.jpg")), "refused"],
    ["files", "sort", "sort that is really a rename", m(path.join(R, "Crowded", "three.doc"), path.join(R, "Crowded", "3.doc")), "refused"],
    // skills
    ["skills", "retire", "retire ok", { from: path.join(S, "my skill"), to: path.join(S + "-archive", "2026-02-02", "my skill"), type: "skill" }, "moved"],
    ["skills", "retire", "retire: v1.2 folder name taken", { from: path.join(S, "it's \"v1.2\""), to: path.join(S + "-archive", "2026-01-01", "it's \"v1.2\""), type: "skill" }, "moved"],
    ["skills", "retire", "retire to somewhere other than the archive", { from: path.join(S, "group"), to: path.join(S, "moved group"), type: "skill" }, "refused"],
    ["skills", "retire", "retire a skill inside another folder", { from: path.join(S, "group", "nested skill"), to: path.join(S + "-archive", "2026-02-02", "nested skill"), type: "skill" }, "refused"],
    ["skills", "retire", "toolkit skill, even when listed as an extra folder", { from: path.join(K, "tidy-up"), to: path.join(K + "-archive", "2026-02-02", "tidy-up"), type: "skill" }, "refused"],
    ["skills", "retire", "toolkit skill reached through .claude as an extra folder", { from: path.join(f.kit, ".claude", "skills"), to: path.join(f.kit, ".claude-archive", "2026-02-02", "skills"), type: "skill" }, "refused"],
    ["skills", "retire", "toolkit skill moved out to the user's skills", { from: path.join(K, "other kit skill"), to: path.join(S + "-archive", "2026-02-02", "other kit skill"), type: "skill" }, "refused"],
    ["skills", "retire", "from inside the archive", { from: path.join(S + "-archive", "2026-01-01", "it's \"v1.2\""), to: path.join(S + "-archive", "2026-03-03", "it's \"v1.2\""), type: "skill" }, "refused"]
  ];
  return list;
}

function runOne(script, base) {
  const f = build(base);
  const list = cases(f);
  const actions = list.map(function (c, i) {
    return { id: "t" + i, lens: c[0], kind: c[1], title: c[2], status: "queued", plan: [c[3]] };
  });
  const data = path.join(f.kit, "apps", "skill-map", "data", "tidy.json");
  fs.writeFileSync(data, JSON.stringify({ version: 1, actions: actions }, null, 2));
  const env = Object.assign({}, process.env, { SKILLMAP_HOME: f.home, SKILLMAP_KIT: f.kit, SKILLMAP_NOW: "2026-02-02T10:00:00Z" });
  const r = spawnSync(script.cmd, [script.file], { env: env, encoding: "utf8" });
  assert.strictEqual(r.status, 0, script.name + " exited with " + r.status + ": " + r.stderr);
  const done = JSON.parse(fs.readFileSync(data, "utf8"));
  const out = {};
  done.actions.forEach(function (a, i) {
    const row = a.results && a.results[0];
    out[list[i][2]] = { status: row ? row.status : a.status, to: row && row.to ? path.relative(base, row.to) : null, expected: list[i][4] };
  });
  return { f: f, out: out, done: done, env: env, tree: tree(base) };
}

let failed = 0;
function check(label, fn) {
  try { fn(); console.log("ok   " + label); } catch (e) { failed++; console.log("FAIL " + label + "\n     " + String(e.message).split("\n").join("\n     ")); }
}

const results = {};
SCRIPTS.forEach(function (s) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tidy-safety-" + s.name.replace(/\W/g, "") + "-")));
  let r;
  try { r = runOne(s, base); } catch (e) { failed++; console.log("FAIL " + s.name + " would not run\n     " + e.message); return; }
  results[s.name] = r;
  Object.keys(r.out).forEach(function (title) {
    check(s.name + ": " + title + " is " + r.out[title].expected, function () { assert.strictEqual(r.out[title].status, r.out[title].expected); });
  });
  check(s.name + ": the folder outside the chosen one is untouched", function () {
    assert.deepStrictEqual(fs.readdirSync(r.f.outside).sort(), ["Tidied", "keep.txt"]);
    assert.deepStrictEqual(fs.readdirSync(path.join(r.f.outside, "Tidied")), []);
  });
  check(s.name + ": the toolkit's own skills are all still there", function () {
    assert.ok(fs.existsSync(path.join(r.f.kit, ".claude", "skills", "tidy-up", "SKILL.md")));
    assert.ok(fs.existsSync(path.join(r.f.kit, ".claude", "skills", "other kit skill", "SKILL.md")));
    assert.ok(fs.existsSync(path.join(r.f.kit, ".claude", "skills-archive", "keep.txt")));
  });
  check(s.name + ": nothing was overwritten or lost", function () {
    assert.strictEqual(fs.readFileSync(path.join(r.f.root, "Tidied by Claude", "2026-01-01", "same.txt"), "utf8"), "already there");
    assert.strictEqual(fs.readFileSync(path.join(r.f.root, "Tidied by Claude", "2026-01-01", "same (2).txt"), "utf8"), "first");
    assert.ok(fs.statSync(path.join(r.f.root, "Tidied by Claude", "2026-01-01", "v1.2 (2)")).isDirectory(), "v1.2 (2) is missing");
    assert.ok(!fs.existsSync(path.join(r.f.root, "Tidied by Claude", "2026-01-01", "v1 (2).2")), "an extension was added to a folder");
    assert.strictEqual(fs.readFileSync(path.join(r.f.skills + "-archive", "2026-01-01", "it's \"v1.2\" (2)", "SKILL.md"), "utf8"), "x");
    assert.strictEqual(fs.readFileSync(path.join(r.f.skills + "-archive", "2026-01-01", "it's \"v1.2\"", "SKILL.md"), "utf8"), "older copy");
  });
  check(s.name + ": a rename stays in its folder and a sort lands in a sub-folder", function () {
    assert.ok(fs.existsSync(path.join(r.f.root, "Notes.txt")));
    assert.ok(fs.existsSync(path.join(r.f.root, "Crowded", "Images", "one.jpg")));
  });
  // Undo puts back everything that moved
  check(s.name + ": undo puts the moves back", function () {
    const before = r.tree.slice();
    const data = path.join(r.f.kit, "apps", "skill-map", "data", "tidy.json");
    const d = JSON.parse(fs.readFileSync(data, "utf8"));
    const movedIds = d.actions.filter(function (a) { return a.status === "done"; });
    movedIds.forEach(function (a, i) { d.actions.push({ id: "u" + i, lens: a.lens, kind: "undo", of: a.id, status: "queued" }); });
    fs.writeFileSync(data, JSON.stringify(d, null, 2));
    const run = spawnSync(s.cmd, [s.file], { env: r.env, encoding: "utf8" });
    assert.strictEqual(run.status, 0, run.stderr);
    const d2 = JSON.parse(fs.readFileSync(data, "utf8"));
    movedIds.forEach(function (a) {
      const orig = d2.actions.filter(function (x) { return x.id === a.id; })[0];
      assert.strictEqual(orig.status, "undone", a.title + " was not undone");
    });
    assert.notDeepStrictEqual(tree(path.dirname(r.f.home)), before);
    assert.ok(fs.existsSync(path.join(r.f.root, "Invoice (1).pdf")));
    assert.ok(fs.existsSync(path.join(r.f.root, "Notes copy.txt")));
    assert.ok(fs.existsSync(path.join(r.f.root, "Crowded", "one.jpg")));
    assert.ok(fs.existsSync(path.join(r.f.skills, "my skill", "SKILL.md")));
  });
});

check("tidy.js and tidy.py give the same answer to every case", function () {
  const a = results["tidy.js"], b = results["tidy.py"];
  assert.ok(a && b, "one of the scripts did not run");
  assert.deepStrictEqual(a.out, b.out);
});

if (failed) { console.log("\n" + failed + " check(s) failed"); process.exit(1); }
console.log("\nAll tidy safety checks passed");

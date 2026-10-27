#!/bin/bash
#
# MAKE RELEASE
# ------------
# Builds dist/skill-and-folder-map-os.zip: a clean copy of the kit for customers to download.
#
# Run it from the skill-and-folder-map-os folder with:   bash maintainers/make-release.sh
#
# What it does:
#   1. Checks the files that ship are still blank templates, so nobody's real skill map,
#      folder map, business notes or setup progress can go out by mistake. Stops if not.
#   2. Copies the kit into a temporary folder called "Skill and Folder Map OS", leaving out this
#      maintainers folder, git history, old builds, backups and computer clutter.
#   3. Checks the copy is complete and both data files are valid, and syntax-checks all 4 scan scripts.
#   4. Zips it as dist/skill-and-folder-map-os.zip, replacing any older one.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/skill-and-folder-map-os-build.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
NAME="Skill and Folder Map OS"
OUT="$STAGE/$NAME"

fail() { echo "RELEASE STOPPED: $1" >&2; exit 1; }

# ---------- 1. Is everything that ships still a blank template? ----------
python3 - "$ROOT" <<'PYEOF' || fail "the files above contain real data. Restore them with: git checkout -- apps/skill-map/data context setup/progress.md CLAUDE.md
  (apps/skill-map/data covers skillmap.json, filemap.json and tidy.json)"
import json, sys, pathlib, re
root = pathlib.Path(sys.argv[1])
problems = []
data = json.loads((root / "apps/skill-map/data/skillmap.json").read_text())
if data.get("nodes"):
    problems.append("apps/skill-map/data/skillmap.json has nodes in it")
if data.get("edges"):
    problems.append("apps/skill-map/data/skillmap.json has edges in it")
if data.get("tags"):
    problems.append("apps/skill-map/data/skillmap.json has tags in it")
if data.get("recommendations"):
    problems.append("apps/skill-map/data/skillmap.json has recommendations in it")
if data.get("scan") is not None:
    problems.append("apps/skill-map/data/skillmap.json has a scan in it")
settings = data.get("settings", {})
if settings.get("setUp"):
    problems.append("apps/skill-map/data/skillmap.json says setup is done")
if settings.get("areasApproved"):
    problems.append("apps/skill-map/data/skillmap.json says the areas are approved")
if any(settings.get(k) for k in ("yourName", "businessName")):
    problems.append("apps/skill-map/data/skillmap.json has a name in its settings")
if settings.get("extraFolders"):
    problems.append("apps/skill-map/data/skillmap.json has extra folders in its settings")

fdata = json.loads((root / "apps/skill-map/data/filemap.json").read_text())
if fdata.get("folders"):
    problems.append("apps/skill-map/data/filemap.json has folders in it")
if fdata.get("files"):
    problems.append("apps/skill-map/data/filemap.json has files in it")
if fdata.get("scan") is not None:
    problems.append("apps/skill-map/data/filemap.json has a scan in it")
if fdata.get("recommendations"):
    problems.append("apps/skill-map/data/filemap.json has recommendations in it")
findings = fdata.get("findings") or {}
if any(findings.get(k) for k in findings):
    problems.append("apps/skill-map/data/filemap.json has findings in it")
fsettings = fdata.get("settings", {})
if fsettings.get("roots"):
    problems.append("apps/skill-map/data/filemap.json has folders listed in settings.roots")
if fsettings.get("setUp"):
    problems.append("apps/skill-map/data/filemap.json says setup is done")
tdata = json.loads((root / "apps/skill-map/data/tidy.json").read_text())
if tdata.get("actions"):
    problems.append("apps/skill-map/data/tidy.json has tidy-up actions in it")
# No demo mode and no sample files ship
for f in list((root / "apps").rglob("*.js")) + list((root / "apps").rglob("*.html")) + list((root / "apps").rglob("menu.json")):
    txt = f.read_text(errors="ignore")
    if re.search(r"makeDemoData|setDemo|isDemo|demo-data\.js|demo-mode|data-action=\"demo|data-change=\"demo|Demo mode", txt):
        problems.append(f"{f.relative_to(root)} still has demo mode in it")
if (root / "apps/skill-map/app/demo-data.js").exists():
    problems.append("apps/skill-map/app/demo-data.js is back: no tool ships a demo")
for f in sorted((root / "context").glob("*.md")):
    if f.name != "README.md" and "Status: not filled in yet" not in f.read_text():
        problems.append(f"{f.relative_to(root)} has been filled in")
if "Setup status: not started" not in (root / "setup/progress.md").read_text():
    problems.append("setup/progress.md is not blank")
# The shipped permissions never include a tool that sends, deletes or posts
perms = json.loads((root / ".claude/settings.json").read_text()).get("permissions", {}).get("allow", [])
if any(re.search(r"send|delete|trash|post|forward|reply", p, re.I) and p.startswith("mcp__") for p in perms):
    problems.append(".claude/settings.json pre-approves a tool that sends, deletes or posts")
if "Setup: not done yet" not in (root / "CLAUDE.md").read_text():
    problems.append("CLAUDE.md says setup is done")
# A person's own photos and videos never ship: apps/<tool>/data/media may hold nothing but a .gitkeep
for f in sorted((root / "apps").glob("*/data/media/**/*")):
    if f.is_file() and f.name != ".gitkeep":
        problems.append(f"{f.relative_to(root)} is a person's own photo or video and must not ship")
# A customer's saved download never ships: setup/as-installed/ holds only its README
for f in sorted((root / "setup/as-installed").rglob("*")):
    if f.is_file() and f.name not in ("README.md", ".DS_Store"):
        problems.append(f"{f.relative_to(root)} is a customer's saved download and must not ship")
# The shared version in toolkit.json must be the one in apps/shared/VERSION
shared_version = (root / "apps/shared/VERSION").read_text().split()[0]
toolkit_shared_version = json.loads((root / "toolkit.json").read_text()).get("sharedVersion")
if str(toolkit_shared_version) != shared_version:
    problems.append(f"toolkit.json sharedVersion is {toolkit_shared_version!r} but apps/shared/VERSION says {shared_version}: change them together")
# Shared parts are identical in every tool, so they must not name one. No file may use the old start-up names,
# and no message in the scripts, the helper or the shared page code may say "Skill and Folder Map OS" (they read the tool's name from toolkit.json)
skip_dirs = {".git", "dist", "maintainers", "node_modules"}
for f in sorted(root.rglob("*")):
    if not f.is_file() or skip_dirs & set(f.relative_to(root).parts) or f.suffix in (".png", ".jpg", ".woff2", ".zip", ".gz", ".ico"):
        continue
    txt = f.read_text(errors="ignore")
    rel = str(f.relative_to(root))
    for old in ("open-task-list", "start-task-list"):
        if old in txt:
            problems.append(f"{rel} uses the old name {old} (it is now open-the-app / start-app, the same in every tool)")
    if re.match(r"setup/scripts/|apps/server/|apps/shared/js/", rel) and re.search(r"Skill and Folder Map OS|(?<!window\.)TaskListOS", txt):
        problems.append(f"{rel} names a tool (Skill and Folder Map OS): shared parts read the name from toolkit.json")
for p in problems:
    print("  - " + p, file=sys.stderr)
sys.exit(1 if problems else 0)
PYEOF

# ---------- 2. Copy, leaving out what customers don't need ----------
mkdir -p "$OUT" "$DIST"
rsync -a \
  --include 'setup/as-installed/README.md' --exclude 'setup/as-installed/*' \
  --exclude '.git' --exclude '.gitignore' --exclude 'dist' --exclude 'maintainers' \
  --exclude '.claude/launch.json' --exclude '.claude/settings.local.json' --exclude '.claude/.cc-writes' \
  --exclude '*.backup.json' --exclude '*.tmp-*' --exclude 'apps/home/data' --exclude '.DS_Store' --exclude '._*' --exclude 'Thumbs.db' --exclude 'desktop.ini' \
  --exclude '__pycache__' --exclude '*.pyc' \
  "$ROOT/" "$OUT/"
# Claude Code can leave empty .claude folders around the kit while it works; only the top one ships
find "$OUT" -mindepth 2 -type d -name .claude -empty -prune -exec rm -rf {} +

# ---------- 3. Checks ----------
for f in "START-HERE.md" "CLAUDE.md" "Open Skill and Folder Map.html" "apps/skill-map/index.html" "apps/skill-map/data/skillmap.json" "apps/skill-map/data/filemap.json" "apps/skill-map/menu.json" "apps/skill-map/home-boxes.js" "apps/skill-map/claude-jobs.json" "apps/skill-map/areas-default.json" "apps/skill-map/scan/scan.js" "apps/skill-map/scan/scan.py" "apps/skill-map/tidy/tidy.js" "apps/skill-map/tidy/tidy.py" "apps/skill-map/data/tidy.json" ".claude/skills/tidy-up/SKILL.md" "apps/skill-map/app/tidy-model.js" "apps/skill-map/scan/scan-files.js" "apps/skill-map/scan/scan-files.py" "apps/skill-map/app/app.js" "apps/skill-map/app/map.js" "apps/skill-map/app/model.js" "apps/skill-map/app/files-model.js" "apps/skill-map/app/view-files.js" "apps/skill-map/app/drawer-files.js" "setup/progress.md" "setup/skill-map-01-first-scan.md" "setup/skill-map-02-group-by-business.md" "setup/skill-map-03-map-your-folders.md" ".claude/skills/README.md" ".claude/settings.json" ".claude/skills/scan-my-skills/SKILL.md" ".claude/skills/group-my-skills/SKILL.md" ".claude/skills/review-my-skills/SKILL.md" ".claude/skills/scan-my-folders/SKILL.md" ".claude/skills/review-my-folders/SKILL.md" "setup/scripts/save-key.sh" "setup/scripts/start-app.sh" "apps/server/server.js" "apps/server/server.py" "setup/connections/README.md" "toolkit.json" "ATTACHING.md" "apps/installed.json" "apps/shared/catalogue.json" "apps/shared/VERSION" "apps/shared/sidebar.css" "apps/shared/js/sidebar.js" "apps/shared/js/theme.js" "apps/shared/js/braindump.js" ".claude/skills/sort-brain-dump/SKILL.md" "apps/shared/images/claude-icon.png" "apps/home/index.html" "apps/home/home.js" "apps/home/home.css" "apps/shared/fonts/Figtree-Variable.woff2" "setup/09-check-and-hand-over.md" ".claude/skills/get-updates/SKILL.md" "setup/as-installed/README.md"; do
  [ -e "$OUT/$f" ] || fail "missing $f"
done
for f in apps/skill-map/data/skillmap.json apps/skill-map/data/filemap.json apps/skill-map/data/tidy.json apps/skill-map/menu.json apps/skill-map/claude-jobs.json apps/skill-map/areas-default.json toolkit.json apps/installed.json apps/shared/catalogue.json; do
  python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$OUT/$f" || fail "$f is not valid"
done
# A fresh download lists only Skill and Folder Map OS, and no test tool ever ships
python3 -c 'import json,sys; t=json.load(open(sys.argv[1]))["tools"]; sys.exit(0 if [x["id"] for x in t]==["skill-map"] else 1)' "$OUT/apps/installed.json" || fail "apps/installed.json must list only Skill and Folder Map OS"
python3 -c 'import json,sys; t=json.load(open(sys.argv[1])); sys.exit(0 if t.get("id")=="skill-map" else 1)' "$OUT/toolkit.json" || fail "toolkit.json must have id skill-map"
[ ! -e "$OUT/apps/test-tool" ] || fail "the test tool is in the release"
# Both data files must be listed, in both places that track them
for f in apps/installed.json toolkit.json; do
  python3 -c '
import json, sys
want = {"apps/skill-map/data/skillmap.json", "apps/skill-map/data/filemap.json", "apps/skill-map/data/tidy.json"}
d = json.load(open(sys.argv[1]))
entries = d["tools"] if "tools" in d else [d]
for t in entries:
    if t.get("id") == "skill-map":
        got = set(t.get("dataFiles") or [])
        sys.exit(0 if want <= got else 1)
sys.exit(1)
' "$OUT/$f" || fail "$f must list all 3 data files: skillmap.json, filemap.json and tidy.json"
done

# Syntax-check both scan pairs, without leaving a __pycache__ behind in the kit
PYCHECK="$(mktemp -d "${TMPDIR:-/tmp}/skill-map-pycheck.XXXXXX")"
node --check "$OUT/apps/skill-map/scan/scan.js" || fail "apps/skill-map/scan/scan.js has a syntax error"
node --check "$OUT/apps/skill-map/tidy/tidy.js" || fail "apps/skill-map/tidy/tidy.js has a syntax error"
node --check "$OUT/apps/skill-map/scan/scan-files.js" || fail "apps/skill-map/scan/scan-files.js has a syntax error"
PYTHONPYCACHEPREFIX="$PYCHECK" python3 -m py_compile "$OUT/apps/skill-map/scan/scan.py" || fail "apps/skill-map/scan/scan.py has a syntax error"
PYTHONPYCACHEPREFIX="$PYCHECK" python3 -m py_compile "$OUT/apps/skill-map/scan/scan-files.py" || fail "apps/skill-map/scan/scan-files.py has a syntax error"
PYTHONPYCACHEPREFIX="$PYCHECK" python3 -m py_compile "$OUT/apps/skill-map/tidy/tidy.py" || fail "apps/skill-map/tidy/tidy.py has a syntax error"
rm -rf "$PYCHECK"
if find "$OUT" -name '__pycache__' | grep -q .; then fail "a __pycache__ folder was left in the kit"; fi
# No stray backup or in-progress scan files
if find "$OUT" -name '*.backup.json' -o -name '*.tmp-*' | grep -q .; then
  fail "a backup or in-progress scan file was left in the kit: $(find "$OUT" -name '*.backup.json' -o -name '*.tmp-*' | head -3)"
fi

# No em dash anywhere shipped, except the vendored shared fonts licence
if grep -rIl $'\xe2\x80\x94' "$OUT" --exclude='OFL.txt' >/dev/null 2>&1; then
  fail "an em dash slipped in: $(grep -rIl $'\xe2\x80\x94' "$OUT" --exclude='OFL.txt' | head -3)"
fi
# No customer-banned words in README.md and START-HERE.md
BANNED='leverage|synergy|game-changer|seamless|cutting-edge|streamline|empower|unlock|robust|holistic|transformative|AI-powered|going forward|touch base|circle back|to be fair|at the end of the day|GAIP'
if grep -EinH "$BANNED" "$OUT/README.md" "$OUT/START-HERE.md" >/dev/null 2>&1; then
  fail "a banned word is in README.md or START-HERE.md: $(grep -EinH "$BANNED" "$OUT/README.md" "$OUT/START-HERE.md" | head -3)"
fi
# The old name must not linger anywhere a customer reads first
if grep -inH 'Skill Map OS' "$OUT/README.md" "$OUT/START-HERE.md" >/dev/null 2>&1; then
  fail "the old name 'Skill Map OS' is still in README.md or START-HERE.md: $(grep -inH 'Skill Map OS' "$OUT/README.md" "$OUT/START-HERE.md" | head -3)"
fi

SKILLS=$(find "$OUT/.claude/skills" -name SKILL.md | wc -l | tr -d ' ')

# ---------- 4. Zip (COPYFILE_DISABLE stops macOS adding hidden ._ files) ----------
rm -f "$DIST/skill-and-folder-map-os.zip"
(cd "$STAGE" && COPYFILE_DISABLE=1 zip -rqX "$DIST/skill-and-folder-map-os.zip" "$NAME")
echo "Built dist/skill-and-folder-map-os.zip ($(du -h "$DIST/skill-and-folder-map-os.zip" | cut -f1 | tr -d ' '), $SKILLS skills)"

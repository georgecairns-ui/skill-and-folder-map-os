# Testing Skill Map OS

How to test the whole thing as a customer would, without touching the repo. Also follow section 5 of `SHARED-V3-CHANGES.md` and the testing sections of `SHARED-V4-CHANGES.md`, `SHARED-V5-CHANGES.md` and `SHARED-V6-CHANGES.md` for the shared parts.

## 1. Make a fresh copy

Never test inside the repo: setup and scanning write real details into it. Build the release zip and unzip it somewhere else:

```bash
bash maintainers/make-release.sh
```

Then unzip `dist/skill-map-os.zip` into a test location, for example `Documents/Skill Map OS test`. Each test run starts from a fresh unzip.

## 2. Parity test: scan.js and scan.py must write byte-identical files

This is the most important test in this file. Build a fake home folder and a fake kit folder, run both scanners against them with the same fixed time, and compare.

### Build the fixture

```bash
FIX="$TMPDIR/skillmap-fixture"
rm -rf "$FIX"; mkdir -p "$FIX/home/.claude/skills" "$FIX/home/.claude/commands" "$FIX/home/.claude/plugins" "$FIX/home/.claude/projects/proj1" "$FIX/kit/.claude/skills" "$FIX/kit/apps/skill-map/data"
```

The fixture must contain, so the test actually exercises the rules both scripts share:

- **A folded `>` description** in a `SKILL.md` frontmatter (a YAML folded block scalar that wraps onto indented following lines), to prove both parsers join it the same way.
- **A quoted description** (wrapped in `"` or `'`), to prove both strip the quotes the same way.
- **A broken symlink** inside a skills folder (`ln -s /nowhere "$FIX/home/.claude/skills/broken"`), to prove both report it as a warning and skip it rather than failing.
- **A duplicate name across the person's own skills and a plugin**: 2 `SKILL.md` files with the same `name:` frontmatter, one under `$FIX/home/.claude/skills/`, one under a fake plugin's `skills/` folder, to prove the `dup` edge and the "own beats plugin" ranking match.
- **A plugin**, registered in `$FIX/home/.claude/plugins/installed_plugins.json` with a real `installPath` pointing at a folder with its own `skills/` and `commands/`.
- **An extra folder**, added to the existing data file's `settings.extraFolders` before the first scan, pointing at another folder with its own skill in it.
- **Repeated transcript lines with the same id**: 2 identical `Skill` tool-call lines (same `id`) in one `.jsonl` file under `$FIX/home/.claude/projects/proj1/`, to prove both scripts count the use once, not twice.
- **A user line with a slash command**: a `type: "user"` record whose content includes `<command-name>/some-command</command-name>`, matching a command file's name.
- **An existing data file** (write `$FIX/kit/apps/skill-map/data/skillmap.json` before the first scan) holding a hand-added skill (`origin: "manual"`), a tag, an area chosen by the person (`areaBy: "you"`) on one of the skills the scan will also find, and an open recommendation. All of these must still be there, unchanged, after both scans.

### Run both scanners

```bash
export SKILLMAP_HOME="$FIX/home" SKILLMAP_KIT="$FIX/kit" SKILLMAP_NOW="2026-10-17T09:00:00.000Z"
node apps/skill-map/scan/scan.js --out "$TMPDIR/out-js.json"
python3 apps/skill-map/scan/scan.py --out "$TMPDIR/out-py.json"
```

### Compare

`scan.at` and `by` are expected to differ (timestamp formatting between the languages, and the script's own name), so normalise both before comparing:

```bash
python3 -c "
import json, sys
for name in ('out-js.json', 'out-py.json'):
    p = '$TMPDIR/' + name
    d = json.load(open(p))
    d['scan']['at'] = 'NORMALISED'
    d['scan']['by'] = 'NORMALISED'
    json.dump(d, open(p, 'w'), indent=2, sort_keys=True)
"
cmp "$TMPDIR/out-js.json" "$TMPDIR/out-py.json"
```

`cmp` must print nothing (no difference). If it fails, diff the 2 files to find which field drifted, and check whether the Node and Python logic for that rule have drifted apart.

Check by hand in the output: the hand-added skill, the tag, the person-chosen area and the recommendation from the existing file are all still present and unchanged in both outputs; the broken symlink produced a warning in `scan.warnings` in both; the duplicate name produced exactly one `dup` edge in both, pointing at the own-skill copy; the repeated transcript line produced a use count of 1, not 2, in both.

## 3. Page checks

Run the app (`node apps/server/server.js` or `python3 apps/server/server.py`), open http://localhost:4747, go into Skill Map OS, and check:

- **Fresh install** (empty `data/skillmap.json`, `scan: null`): the Map page and the first Home box show the "Let's map your skills" card with "Scan my skills now" and the phrase to say to Claude instead. Nothing mentions a demo.
- **First scan**: press Scan my skills now (or ask Claude), wait for it to finish, and the Map page draws.
- **Map**:
  - Group by "What it's for" and "Where it's from" both work; "What it's for" is disabled with a tooltip until the areas are grouped.
  - Filters: each origin chip, Used lately, Not used lately, Needs a look, and a tag chip, singly and combined; Clear filters resets them.
  - Click a dot: the side panel opens with that skill's details. Click a hub: the side panel shows that group.
  - Search (`/`): finds a skill by name and opens it.
  - Links (toggles every link between skills) and Fit (`F`, also the 0 key) both work.
  - Light and dark (the switch in the top bar): every colour on the map comes from the theme, nothing looks wrong in either.
  - Phone width 320 and 375: the sidebar opens from the menu button, nothing scrolls sideways, the map stage still fits.
- **All skills**: the sortable, filterable table shows the same skills as the map; sorting by each column works both ways.
- **Overview**: the counts (skills, used lately, uses, not used lately, names used twice), most used, use by month, where skills come from, and the last scan's summary all match what's in the data file.
- **Gaps**: an area with no skills shows "Nothing here yet" and 3 ideas from `areas-default.json`; an area with skills shows its chips and the "used lately" count; the page ends with "Want these built for you?" and a getaipowers.com button. Where a toolkit tool already covers an area (sales, marketing, money) and it's installed, its callout links straight to it; where it isn't installed, the callout opens the locked-tool panel.
- **Review**: "Review my skills" adds suggestions from Claude; "Spotted by the app" shows duplicate names and the unused list without needing Claude; Done and Not now work on a suggestion; a done list collapses under "Done".
- **Preferences**: change the person's name and business name, add and remove an extra folder, rename an area, add and remove an area (its skills become ungrouped), save and reload: all kept.
- **Adding a skill by hand** (Add a skill, top bar): add one with a name and a note; it appears on the map with `origin: "manual"`, and a re-scan doesn't remove it (see below). Add a tag to a skill from its side panel; it appears as a filter chip on the Map page.
- **Re-scan keeps everything**: after adding a tag, an area, a hand-added skill and a Claude recommendation, press Scan again (`S`) and confirm all 4 are still there afterwards, and the hand-added skill's use counts reset to zero (it was never really scanned).

## 4. The 3 jobs, with a stand-in `claude`

Point `TLOS_CLAUDE` at a stand-in script that follows the job prompts without using real Claude (see Task List OS's own stand-in for the pattern). For each job, trigger it from the app (Scan, "Group by what they do", "Review my skills") and check:

- **`scan-my-skills`**: the stand-in runs the scan script once and nothing else; the app shows "Claude is scanning your skills" while it runs and the result afterwards.
- **`group-my-skills`**: the stand-in sets `area` and `areaBy: "claude"` only on skills with no area and `areaBy` not `"you"`; a skill the person already placed by hand is untouched; the approval banner and "It looks right" button appear once there's at least one Claude-grouped skill.
- **`review-my-skills`**: the stand-in adds up to 8 new recommendations, never duplicating an open or skipped one; with Task List OS attached (see section 6), each new recommendation also appears there as a suggested task with `source.tool` set to `skill-map` and `source.id` matching the recommendation's id; without it attached, nothing else happens.

## 5. Menu and locked-tool panel

As `SHARED-V3-CHANGES.md` section 5 describes: on a scratch copy, the sidebar shows Home, Skill Map OS as an open dropdown with its 5 pages, and the other 8 tools locked under "More tools" in catalogue order. Folding the dropdown shows the total waiting and the choice is remembered. Each locked tool opens the panel with the right tracking on its button link; Escape and a click outside close it; it works by keyboard and at phone width. `showMoreTools: false` in `catalogue.json` hides the locked tools completely.

## 6. Attach to a scratch Task List OS

Follow `ATTACHING.md` on a scratch copy of Task List OS, then check:

- Both tools show as dropdowns in the sidebar; Home offers both tools' boxes (Skill Map OS's start off, in the hidden list, per the shared rule); nothing in Task List OS broke.
- `review-my-skills` adds its suggestions to Task List OS as described in section 4 above.
- One check-in, if scheduled, runs both tools' steps.

## 7. Helper: Node and Python behave the same

Run the app once with `node apps/server/server.js` and once with `python3 apps/server/server.py` and repeat the page checks in section 3 for each: saving the data file, the job endpoints, and the backup file (`skillmap.backup.json`) all behave the same in both.

## 8. Reduced motion

With the OS's reduce-motion setting on, open the Map page: nothing animates. No dots growing in, no pulses travelling along links, no eased zoom or pan. The map still draws, still fits, and clicking and dragging still work.

## What can't be tested without real Claude and a real computer

- A real `/setup` run: everything above uses the stand-in `claude`, so the actual wording Claude uses when talking to a person, and how it handles an ambiguous answer, needs a run with real Claude.
- Real use counts: the fixture proves the counting logic is correct, but only a real computer with real Claude Code history in `~/.claude/projects` shows whether the numbers feel right to an actual user, and whether 90 days is the right window for how people actually use skills day to day.
- Real plugins: the fixture's fake plugin proves the mechanics; only a computer with real plugins installed (and real naming clashes between them) shows whether the duplicate-name and ranking rules hold up in practice.

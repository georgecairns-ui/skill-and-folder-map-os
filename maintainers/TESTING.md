# Testing Skill and Folder Map OS

How to test the whole thing as a customer would, without touching the repo. Also follow section 5 of `SHARED-V3-CHANGES.md` and the testing sections of `SHARED-V4-CHANGES.md`, `SHARED-V5-CHANGES.md` and `SHARED-V6-CHANGES.md` for the shared parts.

## 1. Make a fresh copy

Never test inside the repo: setup and scanning write real details into it. Build the release zip and unzip it somewhere else:

```bash
bash maintainers/make-release.sh
```

Then unzip `dist/skill-and-folder-map-os.zip` into a test location, for example `Documents/Skill and Folder Map OS test`. Each test run starts from a fresh unzip.

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

## 3. Parity test: scan-files.js and scan-files.py must write byte-identical files

The same idea as section 2, for the folder scan. Build a fake home folder with a deliberately awkward mix of folders and files, run both scanners with the same fixed time, and compare.

### Build the fixture

```bash
FFIX="$TMPDIR/filemap-fixture"
rm -rf "$FFIX"; mkdir -p "$FFIX/home/Documents/Reports/Old/2022" "$FFIX/home/Documents/Reports/.hidden-folder" "$FFIX/home/Documents/node_modules/pkg" "$FFIX/home/Documents/Crowded" "$FFIX/home/Documents/Empty" "$FFIX/home/Documents/Deep/l1/l2/l3/l4/l5/l6/l7" "$FFIX/home/Desktop/Copies" "$FFIX/home/Downloads" "$FFIX/home/Library/Application Support" "$FFIX/home/Something.app/Contents" "$FFIX/outside" "$FFIX/kit/apps/skill-map/data"
```

The fixture must contain, so the test exercises every rule both scripts share:

- **Nested folders**, at least 3 levels deep under `Documents/Reports/Old/2022`, to prove `depth`, `parent` and the rolled-up `total` figures match.
- **A duplicate name and size in 2 folders**: the same file name and byte count under both `Documents/Reports` and `Desktop/Copies` (for example `copy.txt`, 10 identical bytes in each), to prove the `dups` finding matches.
- **A file over 100 MB**, made as a sparse file so the fixture stays small: `truncate -s 105M "$FFIX/home/Documents/Reports/big-video.mov"`.
- **A file untouched for over 730 days**: create it, then set its modified date with `touch -t` (or, in the Python half of the check, `os.utime`) to a date comfortably over 2 years before `SKILLMAP_NOW`, and make it over 10 MB (`truncate -s 11M`) so it also counts as "stale".
- **An old file in Downloads**: a file in `$FFIX/home/Downloads`, its modified date set over 90 days before `SKILLMAP_NOW`.
- **An installer**: a file named `Setup.dmg` (zero bytes is fine; only the extension matters).
- **Untidy names**: files named `Report final final.docx`, `Notes copy.txt`, `Invoice (1).pdf`, `Untitled.pages` and `Screenshot 2026-03-04 at 10.11.12.png`.
- **An empty folder**: `Documents/Empty`, left with nothing in it.
- **A folder with 120 loose files**: `Documents/Crowded`, filled with 120 small files directly inside it (a short loop when building the fixture).
- **A folder 8 levels deep**: `Documents/Deep/l1/.../l7` (7 nested levels below `Documents/Deep`, so the deepest folder sits at depth 8 counting `Documents` itself as depth 1), with one small file inside it, to prove the "buried folder" finding and the depth limit agree.
- **A hidden file and a hidden folder**: `.DS_Store`-style file directly under `Documents`, and `Documents/Reports/.hidden-folder` with a file inside it, to prove both are skipped entirely.
- **`node_modules`**: `Documents/node_modules/pkg/index.js`, to prove it is skipped.
- **A `Library` folder at the top of the fake home**: `$FFIX/home/Library/Application Support/`, with a file inside it, to prove only the home folder's own top-level `Library` is skipped (not a `Library` folder found elsewhere).
- **An app bundle folder**: `$FFIX/home/Something.app/Contents/Info.plist` and other files inside it, to prove the whole bundle shows up as a single item, not walked.
- **A symlink out of a chosen folder and one into it**: `ln -s "$FFIX/outside" "$FFIX/home/Documents/link-out"` and `ln -s "$FFIX/home/Documents/Reports" "$FFIX/outside/link-in"` (with `link-in` never itself inside a scanned root), to prove neither is followed.
- **A filename with an emoji and an accented letter**: for example `Café menu 🍰.pdf`, to prove both scripts handle non-ASCII names identically.

### Run both scanners

```bash
export SKILLMAP_HOME="$FFIX/home" SKILLMAP_KIT="$FFIX/kit" SKILLMAP_NOW="2026-10-20T09:00:00.000Z"
echo '{"settings":{"roots":["~/Documents","~/Desktop","~/Downloads"],"setUp":true,"ignore":[]}}' > "$FFIX/kit/apps/skill-map/data/filemap.json"
node apps/skill-map/scan/scan-files.js --out "$TMPDIR/fout-js.json"
python3 apps/skill-map/scan/scan-files.py --out "$TMPDIR/fout-py.json"
```

### Compare

`scan.at` and `scan.by` are expected to differ, so normalise both before comparing, the same way as section 2:

```bash
python3 -c "
import json
for name in ('fout-js.json', 'fout-py.json'):
    p = '$TMPDIR/' + name
    d = json.load(open(p))
    d['scan']['at'] = 'NORMALISED'
    d['scan']['by'] = 'NORMALISED'
    json.dump(d, open(p, 'w'), indent=2, sort_keys=True)
"
cmp "$TMPDIR/fout-js.json" "$TMPDIR/fout-py.json"
```

`cmp` must print nothing. If it fails, diff the 2 files to find which field drifted, and check whether the Node and Python finding logic for that rule have drifted apart.

Check by hand in the output: the duplicate pair appears once in `findings.dups.groups` in both; the over-100 MB file is in `findings.big` in both; the 2-year-old 11 MB file is in `findings.stale` in both; the old Downloads file is in `findings.oldDownloads`; the installer is in `findings.installers`; all 5 untidy names are in `findings.messy`; the empty folder is in `findings.emptyFolders`; the crowded folder is in `findings.looseFolders`; the 8-level-deep folder is in `findings.deepFolders`; nothing from the hidden file, the hidden folder, `node_modules`, the home folder's `Library`, or either symlink appears anywhere in `folders` or `files`; the app bundle appears as a single file-like item, never as a folder with its own contents; the emoji and accented filename round-trips identically in both outputs.

## 4. Page checks, Skills lens

Run the app (`node apps/server/server.js` or `python3 apps/server/server.py`), open http://localhost:4747, go into Skill and Folder Map OS, and check:

- **Fresh install** (empty `data/skillmap.json`, `scan: null`): the Map page and the first Home box show the "Let's map your skills" card with "Scan my skills now" and the phrase to say to Claude instead. Nothing mentions a demo.
- **First scan**: press Scan my skills now (or ask Claude), wait for it to finish, and the Map page draws.
- **Map**:
  - Group by "What it's for" and "Where it's from" both work; "What it's for" is disabled with a tooltip until the areas are grouped.
  - Filters: each origin chip, Used lately, Not used lately, Needs a look, and a tag chip, singly and combined; Clear filters resets them.
  - Click a dot: the side panel opens with that skill's details. Click a hub: the side panel shows that group.
  - Search (`/`): finds a skill by name and opens it.
  - Links (toggles every link between skills) and Fit (`F`, also the 0 key) both work.
- **All skills**: the sortable, filterable table shows the same skills as the map; sorting by each column works both ways.
- **Overview**: the counts (skills, used lately, uses, not used lately, names used twice), most used, use by month, where skills come from, and the last scan's summary all match what's in the data file.
- **Gaps**: an area with no skills shows "Nothing here yet" and 3 ideas from `areas-default.json`; an area with skills shows its chips and the "used lately" count; the page ends with "Want these built for you?" and a getaipowers.com button. Where a toolkit tool already covers an area (sales, marketing, money) and it's installed, its callout links straight to it; where it isn't installed, the callout opens the locked-tool panel.
- **Review**: "Review my skills" adds suggestions from Claude; "Spotted by the app" shows duplicate names and the unused list without needing Claude; Done and Not now work on a suggestion; a done list collapses under "Done".
- **Preferences**: change the person's name and business name, add and remove an extra folder, rename an area, add and remove an area (its skills become ungrouped), save and reload: all kept.
- **Adding a skill by hand** (Add a skill, top bar): add one with a name and a note; it appears on the map with `origin: "manual"`, and a re-scan doesn't remove it (see below). Add a tag to a skill from its side panel; it appears as a filter chip on the Map page.
- **Re-scan keeps everything**: after adding a tag, an area, a hand-added skill and a Claude recommendation, press Scan again (`S`) and confirm all 4 are still there afterwards, and the hand-added skill's use counts reset to zero (it was never really scanned).

## 5. Page checks, Files lens

Switch to the Files lens (the Skills | Files control in the top bar, or the `T` key) and check:

- **Fresh install** (empty `data/filemap.json`, `scan: null`): the Map page and the Home box for this lens show the "Let's map your folders" welcome card, naming the default folders (`~/Documents`, `~/Desktop`, `~/Downloads`) and the phrase to say to Claude instead.
- **First scan**: press Scan my folders now (or ask Claude), wait for it to finish, and the folder map draws with the folder in focus in the middle.
- **Map drill-down and back**: click a hub to go into that folder, 3 levels deep; the folder in the middle changes each time, the breadcrumbs grow by one each click, and clicking an earlier breadcrumb or the Up button goes back exactly that far; the `U` key also goes up one level.
- **The `T` key**: switches between the Skills and Files lenses from anywhere in the app, and every page (Map, All [skills/files], Overview, Gaps/Clean-up, Review) shows the right lens's content immediately.
- **Type filters**: filtering the map or the All files table by a kind of file (documents, images, and so on) shows only that kind, singly and cleared.
- **Worth a look**: the finding dropdown (duplicates, very big, old downloads, and so on) filters the map and the table to just the flagged items.
- **Clicking a file**: opens the side panel with its folder, size, changed date, kind, full path and copy-path button, and, where it is a duplicate, its other copies.
- **Search for a file and a folder**: finds each by name and opens its side panel.
- **All files table**: the Files and Folders modes both work; sorting by each column works both ways in each mode; the Clean-up filter dropdown narrows the table to one finding at a time.
- **Overview**: the counts, what it's made of (the type bar), biggest folders and biggest files all match the data file; clicking a biggest folder or file opens it.
- **Clean-up**: each card's "See them" opens the All files table pre-filtered to that finding; "Find on the map" opens the map with the same filter applied.
- **Review, with a stand-in `claude`**: point the stand-in at `scan-my-folders` and `review-my-folders` (see section 7) and press Review my folders; suggestions appear with Done and Not now, Done moves a suggestion under a collapsed "Done" list with Undo available, and the duplicate sets list shows underneath, independent of Claude.
- **Preferences**: add and remove a folder from "Folders to map", save and reload: the list is kept and the next scan uses it.

## 6. Light and dark, phone widths, reduced motion

- **3D map**: on both lenses, drag the map and it rotates; the wheel (or a pinch) zooms; it turns slowly by itself and stops while the pointer is over it; clicking a hub or a dot still opens the right side panel (a hub is not lost behind a small dot); Fit puts it back in view. The Skills map is pastel, the Files map is vibrant.
- **Light and dark app themes**: switch the app's own theme in the top bar. On the Skills and the Files lens alike, every panel, button and table takes the theme's colours; the map stage keeps its own look in both themes (pastel dusk for skills, vibrant neon on dark for folders).
- **Phone width 320 and 375**: on both lenses, the sidebar opens from the menu button, nothing scrolls sideways on any page (Map, All files/skills, Overview, Clean-up/Gaps, Review, Preferences), and the map stage still fits and is still usable by touch.
- **Reduced motion**: with the OS's reduce-motion setting on, open the Map page on both lenses: the canvas must be completely still, no dots or hubs growing in, no comet-trail pulses, no rotating ring, no automatic turning, no eased zoom or pan. The map still draws, still fits, and clicking, dragging and drilling in and out of folders still work.

## 7. The 6 jobs, with a stand-in `claude`

Point `TLOS_CLAUDE` at a stand-in script that follows the job prompts without using real Claude (see Task List OS's own stand-in for the pattern). For each job, trigger it from the app and check:

- **`scan-my-skills`**: the stand-in runs the skills scan script once and nothing else; the app shows "Claude is scanning your skills" while it runs and the result afterwards.
- **`group-my-skills`**: the stand-in sets `area` and `areaBy: "claude"` only on skills with no area and `areaBy` not `"you"`; a skill the person already placed by hand is untouched; the approval banner and "It looks right" button appear once there's at least one Claude-grouped skill.
- **`review-my-skills`**: the stand-in adds up to 8 new recommendations, never duplicating an open or skipped one; with Task List OS attached (see section 10), each new recommendation also appears there as a suggested task with `source.tool` set to `skill-map` and `source.id` matching the recommendation's id; without it attached, nothing else happens.
- **`scan-my-folders`**: the stand-in runs the folder scan script once (handling `scan-my-folders` the same way the skills stand-in handles `scan-my-skills`) and nothing else; the app shows a scanning state while it runs and the one-line summary afterwards.
- **`review-my-folders`**: the stand-in (also handling `review-my-folders`) adds up to 8 new recommendations to `filemap.json`, never duplicating an open or skipped one, and never adds, edits or deletes a file or folder itself; with Task List OS attached, each new recommendation appears there the same way as `review-my-skills`'s.

## 8. Speed: 700 skills and 15,000 files

Build or reuse a large fixture with around 700 skills in the skills data file and around 15,000 files (the folder map's own storage cap) in the folder data file, open each lens's Map, All [skills/files] and Overview pages, and confirm they draw and respond to filtering, sorting and search without a noticeable stall, and that panning, zooming and drilling into a folder stay smooth.

## 9. Menu and locked-tool panel

As `SHARED-V3-CHANGES.md` section 5 describes: on a scratch copy, the sidebar shows Home, Skill and Folder Map OS as an open dropdown with its pages, and the other 8 tools locked under "More tools" in catalogue order. Folding the dropdown shows the total waiting and the choice is remembered. Each locked tool opens the panel with the right tracking on its button link; Escape and a click outside close it; it works by keyboard and at phone width. `showMoreTools: false` in `catalogue.json` hides the locked tools completely.

## 10. Attach to a scratch Task List OS

Follow `ATTACHING.md` on a scratch copy of Task List OS, then check:

- Both tools show as dropdowns in the sidebar; Home offers both tools' boxes (Skill and Folder Map OS's start off, in the hidden list, per the shared rule); nothing in Task List OS broke.
- `review-my-skills` and `review-my-folders` both add their suggestions to Task List OS as described in section 7 above.
- One check-in, if scheduled, runs both tools' steps.

## 11. Helper: Node and Python behave the same

Run the app once with `node apps/server/server.js` and once with `python3 apps/server/server.py` and repeat the page checks in sections 4 and 5 for each: saving all 3 data files, the job endpoints for all 6 jobs, and the backup files (`skillmap.backup.json` and `filemap.backup.json`) all behave the same in both.

## 12. Tidy-up: script parity and safety checks

**Parity.** Build a fixture home folder with a chosen folder holding duplicates, old downloads, installers, untidy names and a crowded folder, plus a few own skills (and one plugin skill and one toolkit skill), and a `tidy.json` with one queued action of each kind. Make 2 identical copies of the fixture. Run `node apps/skill-map/tidy/tidy.js` on one and `python3 apps/skill-map/tidy/tidy.py` on the other, with the same `SKILLMAP_HOME`, `SKILLMAP_KIT` and `SKILLMAP_NOW` pattern as sections 2 and 3. The resulting `tidy.json` files and the resulting folder trees must match exactly (`cmp` on the JSON, `diff -r` on the trees).

**Refusals** (run each on both scripts; both must refuse the same things and carry on with the rest):

- a `from` path outside the chosen folders
- a path containing `..`
- a path reached through a shortcut (symbolic link) that leads out of a chosen folder
- a file whose size changed since the scan (skipped, with a note)
- a `to` path outside the same chosen folder (or outside the matching "-archive" folder for a skill)
- a destination name already taken: the file arrives as "name (2)", nothing is overwritten
- a move where the name and place are unchanged (skipped)
- a plugin skill or toolkit skill (refused)

**Dry run.** `--dry-run` prints what it would do and leaves the folders and `tidy.json` exactly as they were (`diff -r` against the untouched copy).

**Undo.** Queue an `undo` action for a finished action: every item goes back to where it was, the original action becomes `undone` (or `partly-undone` if something was in the way), and nothing is lost. Queue the same undo again: it is refused.

**In the app**, with a stand-in `claude` that runs the script when the `tidy-up` job is asked for:

- Press each folder Fix button on the Clean-up page ("Move them out of the way", "Keep one copy of each", "Clear them away", "Give them clearer names", "Sort them out") and each skill button on the Review page ("Keep one copy", "Retire them"). Check the box text says exactly what will happen, that nothing changes until the button in the box is pressed, and that Cancel changes nothing.
- After confirming: a toast with Undo appears, the action shows under "Tidied so far", and the files are in "Tidied by Claude" (dated sub-folder) or the skill is in its "-archive" folder. Nothing is deleted.
- Press Undo, from the toast and from "Tidied so far": everything goes back and the entry shows as undone.
- For the 2 judgement fixes, check the stand-in works out the moves from file names only and fills in the plan before the script runs.
- Run the folder scan again: the "Tidied by Claude" folders are skipped and do not appear on the map or in the findings.

## What can't be tested without real Claude and a real computer

- A real `/setup` run: everything above uses the stand-in `claude`, so the actual wording Claude uses when talking to a person, and how it handles an ambiguous answer, needs a run with real Claude.
- Real use counts: the fixture proves the counting logic is correct, but only a real computer with real Claude Code history in `~/.claude/projects` shows whether the numbers feel right to an actual user, and whether 90 days is the right window for how people actually use skills day to day.
- Real plugins: the fixture's fake plugin proves the mechanics; only a computer with real plugins installed (and real naming clashes between them) shows whether the duplicate-name and ranking rules hold up in practice.
- Real folders: the fixture proves the folder-scan mechanics, but only a real computer, with its own mix of cloud-only files, permission prompts and genuinely messy folders, shows whether the Clean-up findings feel useful rather than noisy.

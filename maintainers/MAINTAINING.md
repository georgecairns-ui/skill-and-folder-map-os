# Maintaining Skill and Folder Map OS

For people developing the kit itself. Customers never need this folder, but it is public on GitHub, so keep it free of anything private.

## What this project is

Skill and Folder Map OS is tool 3 of the small business toolkit, built the same way as Task List OS (the reference build) and Pipeline OS. A small business owner asks Claude to clone it, opens it in Claude Code and types `/setup`. The tool has 2 lenses on the same app, switched with a Skills | Files switch in the top bar (or the T key):

- **Skills**: Claude scans the computer for every skill and command Claude can use, draws them as one map, and offers to group them by what they do for the business. Pressing Scan, Group or Review in the app asks Claude to run one of 3 short jobs.
- **Files**: Claude scans the folders the person chose and draws them as a second map of folders and files, down to each file, with pages for the Clean-up findings and Claude's tidy-up suggestions. Pressing Scan or Review in the Files lens asks Claude to run one of 2 more short jobs.

Scanning, grouping and reviewing only read. A skill, file or folder changes only when the person presses a Fix button and confirms, and then only through the `tidy-up` job, which never deletes anything (every change is a move or a rename) and records each move so it can be undone. Nothing it scans leaves the person's computer. The tool's own id stays `skill-map`, and its folder stays `apps/skill-map/`, even though the tool and the GitHub repository are both now named Skill and Folder Map OS.

`maintainers/BUILD-PROMPT.md` has the brief this tool was built to, including what changed from the original Drive build prompt and what was added when the Files lens was built.

## Stack

- Same as Task List OS and Pipeline OS: no framework, no build step, nothing from the internet. Shared parts (`apps/server/`, `apps/shared/`, `apps/home/`, `ATTACHING.md`, `setup/scripts/`, `setup/connections/`, and the shared skills listed in `SHARED-V3-CHANGES.md`) are copied byte for byte from Task List OS. **Never change them here: change them in Task List OS first, raise the shared version, then copy the change to every tool.** `SHARED-V3-CHANGES.md` through `SHARED-V6-CHANGES.md` are the exact record of what's shared and what each tool keeps for itself; read them in order.
- `apps/skill-map/` is this tool's own folder, and nobody outside this project should edit it without checking with the lead first (the app, both scan scripts, the jobs file and both data files are treated as finished and tested): `index.html`, `menu.json` (the pages and the Home scripts), `home-boxes.js`, `claude-jobs.json` (the 5 jobs below), `areas-default.json` (the starting business areas), `data/skillmap.json` and `data/filemap.json` (the 2 data files).
- `apps/skill-map/app/`: Skills side: `model.js` (the data shape and every number the app shows, worked out from the raw scan), `view-skills.js`, `view-overview.js`, `view-gaps.js`, `view-review.js`, `drawer.js` (the side panel for a skill or a hub). Files side: `files-model.js` (the same job for folders and files), `view-files.js` (All files, Overview, Clean-up and Review for the Files lens), `drawer-files.js` (the side panel for a folder or a file). Shared by both: `map.js` (the map engine, below), `view-map.js` (the map page itself, with a folder-drilling branch alongside the skills branch), `view-preferences.js`, `components.js` (shared bits: the "Let's map your skills"/"Let's map your folders" cards, chips, stat tiles), `app.js` (store, routing, actions, search, keyboard shortcuts, the lens switch and the 5 Claude jobs), `app.css`.
- `apps/skill-map/scan/scan.js` and `scan.py`: the skills scan, in Node and Python. `apps/skill-map/scan/scan-files.js` and `scan-files.py`: the folder scan, in Node and Python. Both pairs are below.
- There is no demo mode (shared version 6 removed it from every tool): a fresh install shows a "Let's map your skills" card (`components.js`'s `scanCard`) on the Skills Map page and the first Home box, with a Scan my skills now button and the phrase to say to Claude instead; a fresh install of the Files lens shows the matching "Let's map your folders" card (`view-files.js`'s `foldersCard`) the same way.

## The data files

Three data files sit side by side in `apps/skill-map/data/`: `skillmap.json` for the skills map, `filemap.json` for the folder map and `tidy.json` for tidy-ups (see "The tidy-up" below). Nobody reads or writes the other tool's file.

### `apps/skill-map/data/skillmap.json`

The shape is documented at the top of `apps/skill-map/app/model.js` and matched exactly by both scan scripts. 3 different owners write to it, and each must stick to its own part:

| Section | Who writes it |
|---|---|
| `settings` (name, business, `setUp`, `areasApproved`, `extraFolders`, `usageDays`) | The app (Preferences) and setup |
| `scan` (`at`, `by`, `sources`, `warnings`, `usage`, `changes`) | The scan only. `by` is `"scan.js"` or `"scan.py"`, whichever ran |
| `areas` | Starts from `areas-default.json`; the person renames or adds areas in Preferences |
| `nodes` | The scan writes everything about a skill except `area`, `areaBy`, `tags` and `note`, which it keeps from the existing file unless `areaBy` was `"scan"` (an unapproved guess, safe to overwrite) or unset. Claude sets `area` + `areaBy: "claude"` and never overwrites `areaBy: "you"`. The app and the person own `tags`. A skill with `origin: "manual"` (added by hand because a scan can't see it, for example one that only lives on claude.ai) is never touched by the scan beyond resetting its use counts to zero |
| `edges` | The scan only, worked out fresh every time (never kept from before) |
| `tags` | The person, through the app |
| `recommendations` | Claude only (`review-my-skills`), the person marks them `done` or `skipped` in the app |

**Rule for Claude, from `model.js`'s own header: never type a number into this file.** Counts, uses and totals are always worked out by the app from the raw scan.

### `apps/skill-map/data/filemap.json`

The shape is documented at the top of `apps/skill-map/app/files-model.js` and matched exactly by both folder-scan scripts. 3 owners write to it:

| Section | Who writes it |
|---|---|
| `settings` (`roots`, `setUp`, `ignore`) | The app (Preferences) and setup; `roots` is the list of folders to map |
| `scan` (`at`, `by`, `roots`, `warnings`, `totals`, `truncated`, `previous`) | The folder scan only. `by` is `"scan-files.js"` or `"scan-files.py"`, whichever ran |
| `folders` | The folder scan only, worked out fresh every time: `id`, `path`, `name`, `parent`, `depth`, `root`, `direct` and `total` ({files, bytes}), `newest`, `oldest`, `types`, `subfolders`, `deeper` |
| `files` | The folder scan only: the biggest and newest files it kept in each folder, plus every file a finding names (up to 15,000 stored; the totals count every file it saw) |
| `findings` | The folder scan only: `dups`, `big`, `stale`, `oldDownloads`, `installers`, `messy`, `emptyFolders`, `looseFolders`, `deepFolders` |
| `recommendations` | Claude only (`review-my-folders`), the person marks them `done` or `skipped` in the app |

**Same rule as `skillmap.json`: Claude never types a number into this file either.** It only ever adds a `recommendations` entry.

## The 2 scan pairs: `scan.js`/`scan.py` and `scan-files.js`/`scan-files.py`

Both scan pairs are zero-dependency, read-only, and **each pair must write byte-identical output** for the same inputs (the parity tests for both are in `maintainers/TESTING.md`).

### `scan/scan.js` and `scan/scan.py` (the skills scan)

Run with `node apps/skill-map/scan/scan.js` (also `--dry-run`, `--no-usage`, `--out <file>`); `scan.py` takes the same options and needs Python 3.8 or later.

What it reads, every time:
1. `~/.claude/skills` and `~/.claude/commands` (the person's own skills and commands).
2. Any extra folders added in Preferences (`settings.extraFolders`), resolved against the home folder.
3. This kit's own `.claude/skills` (`origin: "toolkit"`), labelled with whichever tool in `apps/*/toolkit.json` claims that skill's folder name.
4. Every plugin listed in `~/.claude/plugins/installed_plugins.json`, reading its `skills/` and `commands/` folders.
5. Use counts, from `~/.claude/projects/**/*.jsonl` (files touched in the last 400 days only): a `Skill` tool call or a `<command-name>` slash command, matched to a skill by name (and by plugin prefix, `plugin:skill`, when 2 skills share a name). Only the name and the date are read, never what anyone typed. A skill used only on claude.ai or in Cowork never shows a use, because Claude Code's own history is the only thing read; this is said plainly in the app (`scan.usage.note`) and must stay honest.

What never happens: nothing is written, moved, renamed or deleted anywhere it reads from. The only file either script ever writes is `apps/skill-map/data/skillmap.json` (plus its `.backup.json` before overwriting, and a `.tmp-<pid>` file while saving, renamed into place so a crash mid-write can't corrupt the data).

Environment overrides, for testing without touching a real computer: `SKILLMAP_HOME` (stands in for the home folder), `SKILLMAP_KIT` (stands in for this kit's own folder) and `SKILLMAP_NOW` (a fixed "now", as an ISO date, so use-count windows and "modified" dates are reproducible).

**Keeping the 2 scanners in step.** Every rule above (what counts as a duplicate name, how a hyphenated word or a `` `backticked` `` word or a `/slash-command` becomes a link, the 90-day and 400-day cutoffs, the 500-character description clip with its ellipsis, the last-12-months trim on `byMonth`) is written twice, once in JavaScript and once in Python. A change to one must be made in the other in the same commit, and the parity test in `TESTING.md` must pass before it ships. If a one-off difference is unavoidable (for example a language's own JSON number formatting), say so in both files' comments and in the test.

### `scan/scan-files.js` and `scan/scan-files.py` (the folder scan)

Run with `node apps/skill-map/scan/scan-files.js` (also `--dry-run`, `--out <file>`); `scan-files.py` takes the same options and needs Python 3.8 or later. Uses the same `SKILLMAP_HOME`, `SKILLMAP_KIT` and `SKILLMAP_NOW` overrides as the skills scan.

What it reads: the name, size, kind and last-changed date of every file and folder inside the folders listed in `settings.roots` (edited in Preferences, "Folders to map"; the default when none are set is `~/Documents`, `~/Desktop` and `~/Downloads` if they exist). It never opens a file, never reads what is inside one, and never follows a symlink, whether it points out of a chosen folder or into one. It skips hidden items (names starting with a dot), `node_modules`, the Library folder at the top of a home folder, and the inside of app and photo-library bundles, which show up as a single item instead of being walked. It stops at 400,000 items and says so in a warning. A re-scan keeps the person's settings (`settings.roots`) and the suggestions Claude left (`recommendations`).

It keeps, in the saved file, the biggest and newest files in each folder and every file a finding names, up to 15,000 files stored; the totals in `scan.totals` always count every file the scan actually saw, not just the ones stored.

What never happens: nothing is written, moved, renamed or deleted anywhere it reads from. The only file either script writes is `apps/skill-map/data/filemap.json` (plus its own `.backup.json` and `.tmp-<pid>` file, the same crash-safe pattern as the skills scan).

**Keeping this pair in step too.** The finding rules (what counts as a duplicate, the 100 MB "very big" line, the 10 MB and 730-day "untouched" line, the 90-day "old download" line, the installer extensions, the untidy-name patterns, the 100-loose-file and 7-level-deep lines) are written twice, once in JavaScript and once in Python, and must move together in the same commit. The parity test in `TESTING.md` must pass before either ships.

## The map engine: `apps/skill-map/app/map.js`

Hand-written, no libraries: no d3, no three.js, no charting package. The map is 3D, drawn on a plain `<canvas>` by our own small projection code (a camera with yaw and pitch, perspective, and dots sorted and faded by depth). One engine draws both lenses. For skills, Claude sits in the middle (`core`), one hub per group round a ring, and each group's skills in a spiral round its hub. For folders, the folder in focus sits in the middle, its sub-folders as hubs round it, and its biggest kept files as dots round each hub; clicking a hub drills into that folder, and the core itself goes back up a level. Hubs sit on a ring at slightly different heights and each hub's dots sit on a loose sphere round it, so the whole thing reads as a 3D cluster. The layout is worked out from the model's own ids, so the same skills or folders always lay out the same way and the map doesn't jump about between scans. Dragging rotates the map, the wheel or pinch zooms, and it turns slowly by itself until the pointer is over it. Picking (which dot or hub a click means) scores each candidate by its distance on screen against its drawn size, with a small bonus for nearer ones, so a hub is never lost behind a small dot.

- **Each lens has its own look**, set by the `style` option passed to `create`. The Skills map is `pastel`: soft tones from a fixed list of 9 pastel colours in `map.js`, on a gentle dusk stage. The Files map is `neon`: a vibrant glowing palette of 9 colours on a dark stage. Colours cycle and rotate round the colour wheel for a tenth group and beyond. Both stay the same whichever theme the rest of the app is in, because the map does not read the app's own theme variables. The rest of the app (panels, buttons, tables) still takes its colours entirely from the theme's CSS variables and `match-my-brand`; only the map canvas itself is fixed.
- Pulses travel out along the links to the dots in use (or, on the Files side, towards the folder in focus), each with a short comet tail, plus a soft rotating ring and glow behind the centre. These are drawn fresh every frame; nothing is a static image.
- `ui.prefersReducedMotion()` (reading the OS's reduce-motion setting) turns off the build-in animation, the comet-trail pulses, the rotating rings, and eased zoom and pan tweens; the map still draws and still responds to clicks and drags, just completely still.
- The module exposes `create(canvas, handlers)`, returning `build(model, { animate })`, `setFilter`, `setSelected`, `setShowLinks`, `fit()`, `flyTo(id)`, `zoomBy(factor)`; `handlers` are `onSelect(node | null)` and `onHover(node | null, x, y)`. `view-map.js` is the only caller, for both lenses.

## The Files side

Alongside the skills files above, the Files lens has its own small set of files, mirroring the skills side exactly:

- `apps/skill-map/app/files-model.js`: the folder and file data and everything you can ask of it (the folder scan, finding types, colours per kind of file, totals, breadcrumbs), the same role `model.js` plays for skills.
- `apps/skill-map/app/view-files.js`: the All files table (Files and Folders modes, sortable, with the Clean-up filter dropdown), Overview, Clean-up and Review pages for folders and files.
- `apps/skill-map/app/drawer-files.js`: the side panel for one file or one folder (where it is, its size, when it last changed, what it is, and why it's flagged).
- The folder branch inside `apps/skill-map/app/view-map.js`: the folder-drilling map page itself (the folder in focus in the middle, breadcrumbs, an Up button, the map legend), sharing the one map page shell and the map engine with the skills branch in the same file.

## The lens switch

`state.lens` in `apps/skill-map/app/app.js` holds `"skills"` or `"files"`, remembered across visits in `localStorage` under the key `smos-lens`. Switching it (the top-bar Skills | Files control, or the `T` key) swaps which model and which set of views every page reads from; every page in the app (Map, All [skills/files], Overview, Clean-up/Gaps, Review) follows the switch, and the other keyboard shortcuts (`S` to scan, `U` to go up a folder) act on whichever lens is current.

## The 6 Claude jobs

Defined in `apps/skill-map/claude-jobs.json` (the shared job mechanism from `SHARED-V4-CHANGES.md`: the app asks `POST /api/claude/run/skill-map/<job>` with only the job's name; the words Claude follows live in this file, never in the request). Each is also a skill in `.claude/skills/<name>/SKILL.md` so it works the same whether the app triggers it or the person just asks Claude by name.

Skills side:
- **`scan-my-skills`** (the app's Scan button, and the `S` key, in the Skills lens): run the scan once (Node, falling back to `python3` if Node isn't installed), report the one-line summary, then stop. Changes nothing else in the data file beyond what the scan itself writes.
- **`group-my-skills`** (the Map page's "Group by what they do" button): for every skill with no area whose `areaBy` isn't `"you"`, read its description, its `SKILL.md` if the description isn't enough, and `context/business.md`, then choose the best existing area key and set `area` + `areaBy: "claude"`. Leaves a skill ungrouped rather than guessing, and never renames or adds an area itself. Tells the person to check the groups and press "It looks right" (which sets `settings.areasApproved`).
- **`review-my-skills`** (the Review page's "Review my skills" button): reads the whole map and adds up to 8 new suggestions to `recommendations` at a time (never duplicating an open or skipped one): duplicate names (which to keep and why), skills unused in the last `usageDays` (only once `scan.usage.files > 0`, so it never judges a computer with no history), overlapping descriptions worth merging, a missing description worth updating, and an empty area worth a first skill (suggested from that area's `ideas` in `areas-default.json`). Only ever suggests: never edits, moves, renames or deletes a skill (a Fix button does that later, through `tidy-up`). If Task List OS is attached (`apps/installed.json` has an entry with id `task-list`), each new open suggestion is also added as a suggested task there, in Task List OS's own format, carrying `"source": { "tool": "skill-map", "id": "<recommendation id>" }`. If Task List OS isn't attached, it does nothing more.

Files side:
- **`scan-my-folders`** (the app's Scan button, and the `S` key, in the Files lens): run the folder scan once (Node, falling back to `python3`), report the one-line summary, then stop. Nothing else: no suggestions, no opening a file.
- **`review-my-folders`** (the Clean-up page's "Review my folders" button): reads `findings`, `folders`, `files` and the open or skipped `recommendations` already there, plus `context/business.md` and `context/routines.md` if they exist (so it knows what the business needs to keep), and adds up to 8 new suggestions, in order: duplicates (which copy to keep), old downloads and installers to clear, big untouched files to archive (careful with anything that looks like a contract, tax record or client deliverable), untidy names to rename, and crowded, empty or buried folders to tidy. Only ever suggests: never moves, renames, edits, opens or deletes a file or folder (a Fix button does that later, through `tidy-up`). Same Task List OS hand-off as `review-my-skills`, carrying `"source": { "tool": "skill-map", "id": "<recommendation id>" }`.

### `tidy-up` (the Fix buttons)

The only job that changes anything on the computer. The person presses a Fix button (folders: "Move them out of the way", "Keep one copy of each", "Clear them away", "Give them clearer names", "Sort them out"; skills: "Keep one copy", "Retire them"), reads a plain-English box saying exactly what will happen, and presses the button in it. `tidy-model.js` builds the plan of moves from the scan, and the app queues it as an action in `apps/skill-map/data/tidy.json`. The job (`.claude/skills/tidy-up/SKILL.md`) then runs the script.

## The tidy-up: `tidy/tidy.js` and `tidy/tidy.py`

A script pair, zero-dependency, that must behave identically (parity test in `maintainers/TESTING.md`). `node apps/skill-map/tidy/tidy.js` does everything queued in `tidy.json`; `--dry-run` says what it would do and changes nothing. `tidy.py` takes the same options. Environment overrides for testing: `SKILLMAP_HOME`, `SKILLMAP_KIT`, `SKILLMAP_NOW`.

`tidy.json` is `{ "version": 1, "actions": [] }` and ships empty. Each action has:

| Field | Meaning |
|---|---|
| `id` | Unique id for the action |
| `lens` | `files` or `skills` |
| `kind` | `archive`, `keep-one`, `empty`, `rename`, `sort`, `retire` or `undo` |
| `key` | Which finding or recommendation it came from |
| `title` | The plain-English name shown under "Tidied so far" |
| `status` | `queued`, `done`, `partly`, `failed`, `undone` or `partly-undone` |
| `plan` | The moves: `[{ "from", "to", "type", "bytes" }]` |
| `needsPlan`, `task`, `items` | For the 2 judgement fixes (`rename`, `sort`): Claude reads `task` and `items` (file names only) and fills in `plan` and leaves `needsPlan` as it is (the script only needs a non-empty `plan`) |
| `results`, `summary`, `finishedAt`, `note` | Written by the script when it finishes |
| `of` | On an `undo` action, the id of the action being undone |

Safety rules the script enforces, whatever the file says:

- It never deletes anything: every change is a move or a rename.
- It only touches the folders chosen in Preferences (`settings.roots` of `filemap.json`), or the person's own skill folders. It never touches a skill from a plugin or from this toolkit.
- Folder fixes land in a "Tidied by Claude" folder inside the same chosen folder, in a dated sub-folder. Retired skills land in a folder beside their own with "-archive" on the end.
- It refuses a path outside the chosen folders, a path containing `..`, and anything reached through a shortcut. It never overwrites (it adds " (2)"), never opens a file, and skips a file whose size changed since the scan.
- Undo is another queued action of kind `undo`; the script moves each item back, and refuses to undo the same action twice.
- The folder scan skips folders called "Tidied by Claude", so tidied files do not show up as new clutter.
- The two judgement fixes use file names only: Claude works out the moves, the script carries them out.

## How the release works

`bash maintainers/make-release.sh` from the repo root builds `dist/skill-and-folder-map-os.zip`, a clean copy for a customer to download: it checks every file that ships is still a blank template (see the script's own comments for the exact checks, covering all 3 data files), copies the kit into a folder called "Skill and Folder Map OS" leaving out this `maintainers/` folder and other clutter, runs the same checks again on the copy plus some structural ones (every file that must exist, every JSON file that must parse, no em dash, no banned word, no old name, both scan pairs syntax-check cleanly), then zips it. `dist/` is git-ignored. Publishing itself follows Task List OS and Pipeline OS: a `claude/...` branch from `origin/main`, the release script run and passing, a pull request into `main`, never a direct push or a force push.

## Rules

- Same as Task List OS and Pipeline OS: anything committed ships, so never commit a filled-in `context/`, a non-empty `data/skillmap.json` or `data/filemap.json`, a ticked `setup/progress.md`, or "Setup: complete" in `CLAUDE.md`.
- No prices for Get AI Powers services anywhere, no em dashes, British English, customer-facing words never say agent, repo, repository, artifact, JSON, schema, API or MCP.
- Neither scan ever guesses a number: every count on screen is worked out in `model.js` or `files-model.js` from the scan's own output.
- Claude proposes, the person approves: `group-my-skills`, `review-my-skills` and `review-my-folders` only ever suggest; the person approves a group by pressing "It looks right" and a recommendation by marking it Done or pressing its Fix button.
- Skill and Folder Map OS never deletes or sends anything, anywhere, at any point, and changes (moves or renames) something only when the person presses a Fix button and confirms. It has no email, calendar, call-recording or CRM connection, and needs none.

## Open questions for George

- `ATTACHING.md`'s toolkit table still carries the old catalogue description for this tool; the catalogue entry itself was already updated (see `SHARED-CATALOGUE-RENAME.md`). The table row needs the same new two-map wording, made in Task List OS first and copied to every tool.
- `group-my-skills` leaves a skill ungrouped rather than guess, but there's no UI yet for a person to group one by hand from the Map or All skills page if Claude can't place it (only Preferences lets them rename or add an area). Worth a "set the area yourself" action on a node's side panel.
- The scan's use-count matching by name means 2 unrelated skills with the same name in different places (for example 2 people's own `my-skill-name`, never meant to be the same thing) can have their uses attributed to the wrong one if the plugin prefix doesn't disambiguate them. This only matters when names collide, and Review already surfaces duplicate names, but it's worth knowing before trusting a use count on a very generic skill name.
- `scan.usage.note` says plainly that claude.ai and Cowork use isn't counted, but nothing on the Overview or All skills page repeats that caveat next to the use figures themselves; worth considering for a future pass so nobody reads "0 uses" as "nobody uses this".
- The folder map keeps at most 15,000 files, and very large folders are sampled (the biggest and newest files kept, with totals still exact): a folder with thousands of similar small files may not have every one of them clickable on the map or in All files, only in the totals.
- The folder scan reads names only (plus size, kind and date): it has no way to tell what a file actually is beyond its name and extension, so a wrongly-named file will be mis-typed or missed by a finding.
- There is no way yet to open a file, or reveal it in Finder (or the equivalent on another system), from the app. The side panel offers "Copy the path" and "Look at it with Claude" instead. Worth a future "Open" or "Show in folder" action once it's clear how to do that safely from a browser page.
- Cloud-only files kept by Google Drive or OneDrive (not actually downloaded to the computer) can appear with their real size on some systems and as a near-zero placeholder size on others, depending on how that sync client reports the file to the operating system. The scan reads whatever the file system says; it doesn't know which case it's in.
- Running the folder scan through the helper's own Claude can trigger a permission prompt (for the folders being read) the first time, on some systems. This is the operating system protecting the person's files, not a fault in the scan, but it's worth a line in setup so it isn't a surprise.

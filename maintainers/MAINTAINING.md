# Maintaining Skill Map OS

For people developing the kit itself. Customers never need this folder, but it is public on GitHub, so keep it free of anything private.

## What this project is

Skill Map OS is tool 3 of the small business toolkit, built the same way as Task List OS (the reference build) and Pipeline OS. A small business owner asks Claude to clone it, opens it in Claude Code and types `/setup`. Claude scans the computer for every skill and command Claude can use, draws them as one map, and offers to group them by what they do for the business. From then on, pressing Scan, Group or Review in the app asks Claude to run one of 3 short jobs. Skill Map OS only reads: it never edits, moves, deletes or sends anything, and nothing it scans leaves the person's computer.

`maintainers/BUILD-PROMPT.md` has the brief this tool was built to, including what changed from the original Drive build prompt.

## Stack

- Same as Task List OS and Pipeline OS: no framework, no build step, nothing from the internet. Shared parts (`apps/server/`, `apps/shared/`, `apps/home/`, `ATTACHING.md`, `setup/scripts/`, `setup/connections/`, and the shared skills listed in `SHARED-V3-CHANGES.md`) are copied byte for byte from Task List OS. **Never change them here: change them in Task List OS first, raise the shared version, then copy the change to every tool.** `SHARED-V3-CHANGES.md` through `SHARED-V6-CHANGES.md` are the exact record of what's shared and what each tool keeps for itself; read them in order.
- `apps/skill-map/` is this tool's own folder, and nobody outside this project should edit it without checking with the lead first (the app, the scan scripts, the jobs file and the data file are treated as finished and tested): `index.html`, `menu.json` (the 5 pages and the Home scripts), `home-boxes.js`, `claude-jobs.json` (the 3 jobs below), `areas-default.json` (the starting business areas), `data/skillmap.json` (the one data file).
- `apps/skill-map/app/`: `model.js` (the data shape and every number the app shows, worked out from the raw scan), `map.js` (the map engine, below), `view-map.js`, `view-skills.js`, `view-overview.js`, `view-gaps.js`, `view-review.js`, `view-preferences.js`, `drawer.js` (the side panel for a skill or a hub), `components.js` (shared bits: the "Let's map your skills" card, chips, stat tiles), `app.js` (store, routing, actions, search, keyboard shortcuts, the 3 Claude jobs), `app.css`.
- `apps/skill-map/scan/scan.js` and `scan.py`: the scan, in Node and Python, see below.
- There is no demo mode (shared version 6 removed it from every tool): a fresh install shows a "Let's map your skills" card (`components.js`'s `scanCard`) on the Map page and the first Home box, with a Scan my skills now button and the phrase to say to Claude instead.

## The data file: `apps/skill-map/data/skillmap.json`

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

## The scan: `scan/scan.js` and `scan/scan.py`

Both are zero-dependency, read-only, and **must write byte-identical output** for the same inputs (the test for this is in `maintainers/TESTING.md`). Run with `node apps/skill-map/scan/scan.js` (also `--dry-run`, `--no-usage`, `--out <file>`); `scan.py` takes the same options and needs Python 3.8 or later.

What it reads, every time:
1. `~/.claude/skills` and `~/.claude/commands` (the person's own skills and commands).
2. Any extra folders added in Preferences (`settings.extraFolders`), resolved against the home folder.
3. This kit's own `.claude/skills` (`origin: "toolkit"`), labelled with whichever tool in `apps/*/toolkit.json` claims that skill's folder name.
4. Every plugin listed in `~/.claude/plugins/installed_plugins.json`, reading its `skills/` and `commands/` folders.
5. Use counts, from `~/.claude/projects/**/*.jsonl` (files touched in the last 400 days only): a `Skill` tool call or a `<command-name>` slash command, matched to a skill by name (and by plugin prefix, `plugin:skill`, when 2 skills share a name). Only the name and the date are read, never what anyone typed. A skill used only on claude.ai or in Cowork never shows a use, because Claude Code's own history is the only thing read; this is said plainly in the app (`scan.usage.note`) and must stay honest.

What never happens: nothing is written, moved, renamed or deleted anywhere it reads from. The only file either script ever writes is `apps/skill-map/data/skillmap.json` (plus its `.backup.json` before overwriting, and a `.tmp-<pid>` file while saving, renamed into place so a crash mid-write can't corrupt the data).

Environment overrides, for testing without touching a real computer: `SKILLMAP_HOME` (stands in for the home folder), `SKILLMAP_KIT` (stands in for this kit's own folder) and `SKILLMAP_NOW` (a fixed "now", as an ISO date, so use-count windows and "modified" dates are reproducible).

**Keeping the 2 scanners in step.** Every rule above (what counts as a duplicate name, how a hyphenated word or a `` `backticked` `` word or a `/slash-command` becomes a link, the 90-day and 400-day cutoffs, the 500-character description clip with its ellipsis, the last-12-months trim on `byMonth`) is written twice, once in JavaScript and once in Python. A change to one must be made in the other in the same commit, and the parity test in `TESTING.md` must pass before it ships. If a one-off difference is unavoidable (for example a language's own JSON number formatting), say so in both files' comments and in the test.

## The map engine: `apps/skill-map/app/map.js`

Hand-written, no libraries: no d3, no 3D, no charting package. Claude sits in the middle (`core`), one hub per group round a ring, and each group's skills in a spiral round its hub; a short force simulation then nudges overlapping dots apart and pulls linked skills a little closer together. The layout is worked out once per build from the model's own ids, so the same skills always lay out the same way and the map doesn't jump about between scans.

- Every colour comes from `getComputedStyle` reads of the theme's CSS variables (`--color-ink`, `--color-accent`, the `GROUP_COLOURS` list in `model.js`, and so on): nothing in `map.js` has a colour of its own, so light and dark and a customer's own brand colours (`match-my-brand`) all work without touching this file.
- `ui.prefersReducedMotion()` (reading the OS's reduce-motion setting) turns off the build-in animation, the pulsing particles along links to used skills, and eased zoom and pan tweens; the map still draws and still responds to clicks and drags, just without movement.
- The module exposes `create(canvas, handlers)`, returning `build(model, { animate })`, `setFilter`, `setSelected`, `setShowLinks`, `fit()`, `flyTo(id)`, `zoomBy(factor)`; `handlers` are `onSelect(node | null)` and `onHover(node | null, x, y)`. `view-map.js` is the only caller.

## The 3 Claude jobs

Defined in `apps/skill-map/claude-jobs.json` (the shared job mechanism from `SHARED-V4-CHANGES.md`: the app asks `POST /api/claude/run/skill-map/<job>` with only the job's name; the words Claude follows live in this file, never in the request). Each is also a skill in `.claude/skills/<name>/SKILL.md` so it works the same whether the app triggers it or the person just asks Claude by name.

- **`scan-my-skills`** (the app's Scan button, and the `S` key): run the scan once (Node, falling back to `python3` if Node isn't installed), report the one-line summary, then stop. Changes nothing else in the data file beyond what the scan itself writes.
- **`group-my-skills`** (the Map page's "Group by what they do" button): for every skill with no area whose `areaBy` isn't `"you"`, read its description, its `SKILL.md` if the description isn't enough, and `context/business.md`, then choose the best existing area key and set `area` + `areaBy: "claude"`. Leaves a skill ungrouped rather than guessing, and never renames or adds an area itself. Tells the person to check the groups and press "It looks right" (which sets `settings.areasApproved`).
- **`review-my-skills`** (the Review page's "Review my skills" button): reads the whole map and adds up to 8 new suggestions to `recommendations` at a time (never duplicating an open or skipped one): duplicate names (which to keep and why), skills unused in the last `usageDays` (only once `scan.usage.files > 0`, so it never judges a computer with no history), overlapping descriptions worth merging, a missing description worth updating, and an empty area worth a first skill (suggested from that area's `ideas` in `areas-default.json`). Only ever suggests: never edits, moves, renames or deletes a skill. If Task List OS is attached (`apps/installed.json` has an entry with id `task-list`), each new open suggestion is also added as a suggested task there, in Task List OS's own format, carrying `"source": { "tool": "skill-map", "id": "<recommendation id>" }`. If Task List OS isn't attached, it does nothing more.

## How the release works

`bash maintainers/make-release.sh` from the repo root builds `dist/skill-map-os.zip`, a clean copy for a customer to download: it checks every file that ships is still a blank template (see the script's own comments for the exact checks), copies the kit into a folder called "Skill Map OS" leaving out this `maintainers/` folder and other clutter, runs the same checks again on the copy plus some structural ones (every file that must exist, every JSON file that must parse, no em dash, no banned word, `scan.js` and `scan.py` both syntax-check cleanly), then zips it. `dist/` is git-ignored. Publishing itself follows Task List OS and Pipeline OS: a `claude/...` branch from `origin/main`, the release script run and passing, a pull request into `main`, never a direct push or a force push.

## Rules

- Same as Task List OS and Pipeline OS: anything committed ships, so never commit a filled-in `context/`, a non-empty `data/skillmap.json`, a ticked `setup/progress.md`, or "Setup: complete" in `CLAUDE.md`.
- No prices for Get AI Powers services anywhere, no em dashes, British English, customer-facing words never say agent, repo, repository, artifact, JSON, schema, API or MCP.
- The scan never guesses a number: every count on screen is worked out in `model.js` from the scan's own output.
- Claude proposes, the person approves: `group-my-skills` and `review-my-skills` only ever suggest; the person approves a group by pressing "It looks right" and a recommendation by marking it Done.
- Skill Map OS never edits, moves, deletes or sends anything, anywhere, at any point. It has no email, calendar, call-recording or CRM connection, and needs none.

## Open questions for George

- `ATTACHING.md`'s toolkit table still carries the old catalogue description ("See everything Claude could take off your plate, mapped across the business"); the catalogue entry itself was already updated (see `SHARED-CATALOGUE-RENAME.md`) because the tool now maps the installed skills, not the business's tasks. The table row needs the same wording, made in Task List OS first and copied here, per the shared-file rule.
- `group-my-skills` leaves a skill ungrouped rather than guess, but there's no UI yet for a person to group one by hand from the Map or All skills page if Claude can't place it (only Preferences lets them rename or add an area). Worth a "set the area yourself" action on a node's side panel.
- The scan's use-count matching by name means 2 unrelated skills with the same name in different places (for example 2 people's own `my-skill-name`, never meant to be the same thing) can have their uses attributed to the wrong one if the plugin prefix doesn't disambiguate them. This only matters when names collide, and Review already surfaces duplicate names, but it's worth knowing before trusting a use count on a very generic skill name.
- `scan.usage.note` says plainly that claude.ai and Cowork use isn't counted, but nothing on the Overview or All skills page repeats that caveat next to the use figures themselves; worth considering for a future pass so nobody reads "0 uses" as "nobody uses this".

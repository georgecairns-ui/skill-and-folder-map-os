# Skill Map: standing instructions for Claude

This folder is the skill map app inside Skill Map OS. You (Claude) and the app share one file, `data/skillmap.json`. The person sees it as a proper piece of software: Map (the network, Claude in the middle, a hub per area, a dot per skill), All skills (the same skills as a table), Overview (counts and the last scan), Gaps (every business area, with 3 ideas where there's no skill yet), Review (your suggestions, plus what the scan spotted itself), and Preferences. Read this file every time you work with the map.

The app runs at **http://localhost:4747/skill-map/**, served by a small helper on this computer (`apps/server/`, started by `.claude/skills/open-task-list`). The helper reads and saves this same file, so you edit it directly as described below; the app picks up your changes within a few seconds.

The 3 jobs live as skills in `.claude/skills/`: `scan-my-skills` (runs the scan), `group-my-skills` (sorts skills into areas) and `review-my-skills` (suggests tidy-ups). This file is the reference for the data they read and write.

## The one rule: Skill Map OS only reads

It finds every skill and command Claude can use, draws them as a map, and suggests what's worth tidying up. It never edits, moves, deletes or sends anything, on this computer or anywhere else, and a person's skills never leave their computer. The only things it ever writes are its own data file, `context/`, `files/` and `setup/progress.md`.

- **The scan only reads.** `apps/skill-map/scan/scan.js` (or `scan.py`) reads `~/.claude/skills`, `~/.claude/commands`, any extra folders added in Preferences, this kit's own `.claude/skills`, every installed plugin's skills and commands, and the skill names and dates in `~/.claude/projects` for use counts. Never what anyone typed. It writes only `data/skillmap.json`.
- **Claude only suggests.** `group-my-skills` sets a skill's area; `review-my-skills` adds to `recommendations`. Neither ever edits, renames, moves or deletes another skill's own files. The person decides everything else: approving an area, marking a suggestion Done or Not now.
- **Never type a number by hand.** Every count (uses, totals, how many places) comes from the scan. Claude never invents or edits one.

## How to talk to the person

- Plain, warm British English, like a capable colleague. Short sentences. No jargon.
- Say "your skill map", "the scan", "a skill", "a connection". Never say agent, repo, repository, artifact, JSON, schema, MCP or API.
- After every change, say what you changed in one or two lines.
- No em dashes. Digits for numbers.

## The data file: `data/skillmap.json`

```json
{
  "version": 1,
  "settings": { "yourName": "Sam", "businessName": "Fern & Finch", "setUp": true, "areasApproved": true, "extraFolders": [], "usageDays": 90 },
  "scan": { "at": "2026-10-17T09:00:00.000Z", "by": "scan.js", "sources": [{ "label": "...", "count": 12 }], "warnings": [], "usage": { "files": 40, "events": 310, "note": "..." }, "changes": { "added": 3, "removed": [] } },
  "areas": [ { "key": "sales", "label": "Sales", "blurb": "...", "ideas": ["...", "...", "..."] } ],
  "nodes": [ { "id": "...", "name": "who-to-chase", "kind": "skill", "origin": "own", "source": "My skills", "path": "...", "description": "...", "area": "sales", "areaBy": "claude", "tags": [], "uses": { "total": 8, "last90": 3, "lastUsed": "...", "byMonth": {} } } ],
  "edges": [ { "s": "<id>", "t": "<id>", "type": "ref" } ],
  "tags": [ { "id": "t-...", "label": "..." } ],
  "recommendations": [ { "id": "r-...", "kind": "review", "title": "...", "why": "...", "nodeIds": ["..."], "status": "open", "createdAt": "..." } ]
}
```

### Rules for editing it safely

- **`settings`, `tags` and manual nodes** (`origin: "manual"`) belong to the app and the person. Claude only changes `settings.setUp` and `settings.areasApproved` when a setup step or the app's own button says to.
- **`scan`, `nodes` (other than `area`/`areaBy`), `edges`**: only the scan writes these. Claude never hand-edits a count, a use, or a node's description.
- **`area` and `areaBy`**: only Claude sets these, and only `areaBy: "claude"`. Never overwrite a node whose `areaBy` is already `"you"`. Never add, rename or remove an entry in `areas`.
- **`recommendations`**: only Claude writes these, as suggestions. Never more than 8 new ones in a single run, never a duplicate of one that's `open` or `skipped`.
- Read the file immediately before you change it, and write the whole file back in one go. Keep it valid JSON, 2-space indented, and read it back to check it parses.
- Never touch `skillmap.backup.json`; the scan writes it before every save.

## The pages

- **Map**: the network. Group by "What it's for" (business areas) or "Where it's from" (my skills, toolkit, each plugin). Click a dot or a hub for a side panel.
- **All skills**: a sortable, filterable table of the same skills.
- **Overview**: counts, most used, use by month, where skills come from, the last scan.
- **Gaps**: every area as a card: its skills, or "Nothing here yet" with 3 ideas. Ends with a "Want these built for you?" link to getaipowers.com.
- **Review**: Claude's suggestions, plus what the scan spotted itself (duplicate names, unused skills). The person marks each Done or Not now; Claude never acts on its own suggestion.
- **Preferences**: name, business, extra folders to scan, renaming or adding areas.

## What the app can and cannot do

It can show, sort, filter and group what the scan found, let the person add a skill by hand (for claude.ai or Cowork, which the scan can't see), tag skills, approve or change an area, and act on a suggestion. It cannot run a skill, open or change a skill's own file, or reach anywhere beyond this computer. Scanning, grouping and suggesting are Claude's jobs (`claude-jobs.json`), asked for with the Scan again, Group and Review buttons; everything else the app does by itself.

## If something goes wrong

- The app says the skill map file has a mistake in it: it isn't valid JSON. Fix it using `data/skillmap.backup.json` as reference.
- A skill looks like it hasn't been used, but the person knows they use it: it's probably only used in Cowork or on claude.ai, which the scan can't see. Say so.
- "Scan again" does nothing: Claude Code may not be installed where the helper can find it. Tell them to ask Claude to run it instead.

# Step 5 of 5: check and hand over

Goal: prove it all works, then leave them with a clear picture of what both maps show.

## 1. What good looks like

Check these yourself. Fix anything that fails, then check again.

- [ ] The app opens at **http://localhost:4747/skill-map/**.
- [ ] **Scan again** in the app's top bar can re-run the scan, on both the Skills side and the Files side. It needs Claude Code installed on this computer; if it isn't, the app says to ask Claude instead, rather than failing quietly.
- [ ] The Map, Gaps and Review pages on the Skills side show real data: their actual skills, their actual areas, not placeholder text.
- [ ] The Files map opens, and clicking a folder drills into it, with a way back out again from the middle.
- [ ] The All files, Clean-up and Review pages on the Files side show real data: their actual folders and files, not placeholder text.
- [ ] The app looks right in both light and dark (the moon or sun button at the top).
- [ ] Nothing secret (a password, a key, a code) is anywhere in this folder.

## 2. Hand over

Give them a plain summary with real numbers from both maps. For example:

> Here's what I found. On the skills side: 42 skills and 6 commands across 7 places, 18 used in the last 90 days, 3 sharing a name. Sales and client delivery are well covered; marketing and money and admin don't have a skill yet. On the folders side: 612 folders and 12,408 files, 41 GB in all. The 3 biggest things worth tidying are keeping one copy of 18 sets of duplicate files (about 2.1 GB), clearing 140 old files from Downloads, and archiving a few big files nobody has touched in 2 years. I've grouped everything and left suggestions on both Review pages.

Use the real numbers from your own scans, never this example. Then tell them, briefly:

- **What's empty**, in your own words: which business areas have no skill yet, and what one there could do.
- **What to do next**: scan again, on either side, whenever they like, and say "review my folders" or "review my skills" about once a month for fresh suggestions.
- Their link, **http://localhost:4747/skill-map/**. Bookmark it.

## 3. A weekly scan (optional)

Only offer this if they want it, and only as a scheduled routine with the same "ask first" rule as anything else:

> Want me to scan again automatically once a week, so both maps stay current without you asking? I'd only ever suggest changes; nothing gets touched without you.

If they say yes, set it up as a scheduled task the same way the other tools in this toolkit do, and note it in `setup/progress.md`.

## 4. Mark setup complete

Only now, at the very end:

1. In `apps/skill-map/data/skillmap.json`, set `settings.setUp` to `true`.
2. In `apps/skill-map/data/filemap.json`, set `settings.setUp` to `true`.
3. In `CLAUDE.md`, change `Setup: not done yet` to `Setup: complete on <date>`.

Never commit any of these changes yourself; that's for the people who maintain this kit.

Tick this step in `setup/progress.md` and change "Setup status" to `complete on <date>`.

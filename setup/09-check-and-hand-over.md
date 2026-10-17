# Step 4: check and hand over

Goal: prove it all works, then leave them with a clear picture of what their map shows.

## 1. What good looks like

Check these yourself. Fix anything that fails, then check again.

- [ ] The app opens at **http://localhost:4747/skill-map/**.
- [ ] **Scan again** in the app's top bar can re-run the scan. It needs Claude Code installed on this computer; if it isn't, the app says to ask Claude instead, rather than failing quietly.
- [ ] The Map, Gaps and Review pages show real data: their actual skills, their actual areas, not placeholder text.
- [ ] The app looks right in both light and dark (the moon or sun button at the top).
- [ ] Nothing secret (a password, a key, a code) is anywhere in this folder.

## 2. Hand over

Give them a plain summary with real numbers. For example:

> Here's what I found. You've got 42 skills and 6 commands across 7 places. 18 have been used in the last 90 days; 3 share a name with another skill. Sales and client delivery are well covered; marketing and money and admin don't have a skill yet. I've grouped everything and left a few suggestions on the Review page.

Then tell them, briefly:

- **What's empty**, in your own words: which areas have no skill yet, and what one there could do.
- **What to do next**: scan again whenever they add a skill, and say "review my skills" about once a month to get fresh suggestions.
- Their link, **http://localhost:4747/skill-map/**. Bookmark it.

## 3. A weekly scan (optional)

Only offer this if they want it, and only as a scheduled routine with the same "ask first" rule as anything else:

> Want me to scan again automatically once a week, so the map stays current without you asking? I'd only ever suggest changes; nothing gets touched without you.

If they say yes, set it up as a scheduled task the same way the other tools in this toolkit do, and note it in `setup/progress.md`.

## 4. Mark setup complete

Only now, at the very end:

1. In `apps/skill-map/data/skillmap.json`, set `settings.setUp` to `true`.
2. In `CLAUDE.md`, change `Setup: not done yet` to `Setup: complete on <date>`.

Never commit either change yourself; that's for the people who maintain this kit.

Tick this step in `setup/progress.md` and change "Setup status" to `complete on <date>`.

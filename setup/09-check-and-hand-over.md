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
- That they can say "get the latest version" any time and you will bring the app up to date, keeping everything of theirs.
- Their link, **http://localhost:4747/skill-map/**. Bookmark it.

## 3. A weekly scan (optional)

Only offer this if they want it, and only as a scheduled routine with the same "ask first" rule as anything else:

> Want me to scan again automatically once a week, so both maps stay current without you asking? I'd only ever suggest changes; nothing gets touched without you.

If they say no, note it in `setup/progress.md` ("Weekly scan: said no"), tell them they can say "scan my skills" or "scan my folders" any time, and go on to section 4. If they say yes:

1. **Agree the day and time**, for example "Monday at 8am". Say plainly: "It uses a little of your Claude allowance each time, and it only runs while your computer is on and the Claude app is open."
2. **Create it from this session, in this folder:** a scheduled task runs in the folder it was made in. The tools for this are often not loaded yet: search your tools for them first. Look with `list_scheduled_tasks` for an existing weekly scan for this folder, and update it rather than making another. If there isn't one, create it with `create_scheduled_task`, with the title "Weekly scan" and this prompt, filling in this folder's full path: `In <full path of this folder>, run the weekly scan: follow .claude/skills/scan-my-skills/SKILL.md, then .claude/skills/scan-my-folders/SKILL.md. Never send anything except emails the person has already approved in the app; apart from those, never reply, forward, delete, archive, label, pay or post anything.` Only ever one weekly scan task for this folder.
3. **Run it once now** (`run_scheduled_task`) and check it finished (`list_task_runs`). Then look up that run's session (for example `get_session` with the run's session id) and check 2 things. It ran in this folder: if not, update the task's prompt so it opens with this folder's full path and run it again; if it still runs elsewhere, tell them plainly and leave scanning to "scan my skills" and "scan my folders". It didn't run in an Auto or Bypass permission mode: if it did, tell them "This session is set to act without asking, so the scan would too", ask them to switch this session to the normal permission mode, then delete that task and create it again from this session.
4. Note the day and time in `setup/progress.md`.

## 4. Mark setup complete

Only now, at the very end:

1. In `apps/skill-map/data/skillmap.json`, set `settings.setUp` to `true`.
2. In `apps/skill-map/data/filemap.json`, set `settings.setUp` to `true`.
3. In `CLAUDE.md`, change `Setup: not done yet` to `Setup: complete on <date>`.

Never commit any of these changes yourself; that's for the people who maintain this kit.

Tick this step in `setup/progress.md` and change "Setup status" to `complete on <date>`.

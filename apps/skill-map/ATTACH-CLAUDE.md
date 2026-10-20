# Skill and Folder Map OS: what goes into CLAUDE.md when it's attached

When Skill and Folder Map OS is attached to a folder that started with another tool, Claude copies everything below the line into the main `CLAUDE.md`, under "Attached tools". In Skill and Folder Map OS's own download these instructions are already in `CLAUDE.md`, so nothing is copied.

Attaching also runs Skill and Folder Map OS's own setup steps: `setup/skill-map-01-first-scan.md` (the first scan), `setup/skill-map-03-map-your-folders.md` (mapping their folders) and `setup/skill-map-02-group-by-business.md` (grouping and the Gaps page). It reuses the shared `setup/05-get-to-know-the-business.md` step rather than asking about the business twice.

---

### Skill and Folder Map OS

2 maps, switched with a Skills | Files switch in the top bar. Skills: every skill and command Claude can use, drawn as a map, Claude in the middle, a hub per business area, a dot per skill, dot size showing how much it's been used in the last 90 days. Files: the folders and files in the folders the person has chosen, the same network look, click a folder to go inside it. Both only read: nothing is ever edited, moved, deleted or sent, and nothing leaves their computer. Their maps are in `apps/skill-map/data/skillmap.json` and `apps/skill-map/data/filemap.json`; `apps/skill-map/CLAUDE.md` explains the format and the rules. Open it at http://localhost:4747/skill-map/.

| They say something like | Use |
|---|---|
| "Scan my skills", "what skills have I got?", "update my skill map" | `.claude/skills/scan-my-skills` |
| "Group my skills", "sort my skills into areas" | `.claude/skills/group-my-skills` |
| "Review my skills", "what should I tidy up?" | `.claude/skills/review-my-skills` |
| "Scan my folders", "map my files", "what's in my folders?" | `.claude/skills/scan-my-folders` |
| "Review my folders", "what should I tidy?", "what's taking up space?" | `.claude/skills/review-my-folders` |

Day to day:

- **Read-only, always.** Scanning, grouping and suggesting never touch another skill's own files, or the person's own files and folders, and never send anything anywhere.
- **Claude only suggests.** `review-my-skills` and `review-my-folders` add to `recommendations`; the person marks each Done or Not now. Claude never retires, merges or edits a skill, a file or a folder itself.
- **Suggestions can land in the task list.** When Task List OS is attached (`apps/installed.json`, id `task-list`), every new open suggestion from `review-my-skills` or `review-my-folders` also becomes a suggested task there, in its own format (`apps/task-list/CLAUDE.md`), with `"source": { "tool": "skill-map", "id": "<recommendation id>" }`. It shows on the task list's Review page with a New tag, and needs the person's click there before anything happens. Skill and Folder Map OS reads nothing from the task list; it only sends these suggestions.
- Never type a number into either map by hand; every count comes from its scan.

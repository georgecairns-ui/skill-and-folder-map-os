# Skill Map OS: what goes into CLAUDE.md when it's attached

When Skill Map OS is attached to a folder that started with another tool, Claude copies everything below the line into the main `CLAUDE.md`, under "Attached tools". In Skill Map OS's own download these instructions are already in `CLAUDE.md`, so nothing is copied.

Attaching also runs Skill Map OS's own setup steps: `setup/skill-map-01-first-scan.md` (the first scan) and `setup/skill-map-02-group-by-business.md` (grouping and the Gaps page). It reuses the shared `setup/05-get-to-know-the-business.md` step rather than asking about the business twice.

---

### Skill Map OS

Every skill and command Claude can use, drawn as one map: Claude in the middle, a hub per business area, a dot per skill, dot size showing how much it's been used in the last 90 days. It only reads: it never edits, moves, deletes or sends anything, and a person's skills never leave their computer. Their map is in `apps/skill-map/data/skillmap.json`; `apps/skill-map/CLAUDE.md` explains the format and the rules. Open it at http://localhost:4747/skill-map/.

| They say something like | Use |
|---|---|
| "Scan my skills", "what skills have I got?", "update my skill map" | `.claude/skills/scan-my-skills` |
| "Group my skills", "sort my skills into areas" | `.claude/skills/group-my-skills` |
| "Review my skills", "what should I tidy up?" | `.claude/skills/review-my-skills` |

Day to day:

- **Read-only, always.** Scanning, grouping and suggesting never touch another skill's own files, and never send anything anywhere.
- **Claude only suggests.** `review-my-skills` adds to `recommendations`; the person marks each Done or Not now. Claude never retires, merges or edits a skill itself.
- **Suggestions can land in the task list.** When Task List OS is attached (`apps/installed.json`, id `task-list`), every new open suggestion from `review-my-skills` also becomes a suggested task there, in its own format (`apps/task-list/CLAUDE.md`), with `"source": { "tool": "skill-map", "id": "<recommendation id>" }`. It shows on the task list's Review page with a New tag, and needs the person's click there before anything happens. Skill Map OS reads nothing from the task list; it only sends these suggestions.
- Never type a number into the skill map by hand; every count comes from the scan.

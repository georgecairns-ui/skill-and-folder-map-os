# Catalogue rename: skill-map's name, repository and description

The catalogue entry for `skill-map` in `apps/shared/catalogue.json` has changed twice now. The internal id stays `skill-map` throughout; only the name, repository and description change.

**20 October 2026 (this change):** the tool gained a second, Files lens alongside the original Skills lens, so the name, repository and description all changed again:

- `name`: `"Skill and Folder Map OS"` (was `"Skill Map OS"`).
- `repository`: `"skill-and-folder-map-os"` (was `"skill-map-os"`). The GitHub repository itself is renamed to match; the tool's internal id and its `apps/skill-map/` folder are unchanged.
- `description`: see the current `description` for the `skill-map` entry in `apps/shared/catalogue.json`.

**The original text** (from before the tool became a skills map at all, when it was still planned as a business-task mapper): "See everything Claude could take off your plate, mapped across your whole business. It shows what's already covered and what to set up next, so you know where the hours are."

**The previous release's text** (the skills-only version, before the Files lens): "See every skill Claude has, drawn as one map. It shows which ones you use, which are doubled up, and which parts of your business have none yet."

Task List OS and Pipeline OS (and every other tool's own copy of `apps/shared/catalogue.json`) still carry the original text. The change is a shared-file change: it must be made in Task List OS first, then copied to every tool, the same as any other change to `catalogue.json`.

`ATTACHING.md`'s toolkit table still has the old row for this tool. Its id has already been updated from `skill-map-os` to `skill-and-folder-map-os`, but the "What it does" wording hasn't caught up. Suggested new wording for that cell: "See every skill Claude has and every folder and file you keep, drawn as two glowing maps, and what to tidy first." Make the change in Task List OS first, then copy it to every tool, per the shared-file rule.

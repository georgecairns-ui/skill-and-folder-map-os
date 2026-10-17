# Catalogue rename: skill-map's description

In this kit the catalogue entry for `skill-map` had its description changed because the tool is now a map of the person's own installed skills, not a business-task mapper.

**Old:** "See everything Claude could take off your plate, mapped across your whole business. It shows what's already covered and what to set up next, so you know where the hours are."

**New:** see `description` for the `skill-map` entry in `apps/shared/catalogue.json`.

Task List OS and Pipeline OS (and every later tool) still carry the old text in their own copy of `apps/shared/catalogue.json`. The change is a shared-file change: it must be made in Task List OS first, then copied to every tool, the same as any other change to `catalogue.json`.

`ATTACHING.md`'s toolkit table row for `skill-map-os` should change to match. Suggested new wording for its "What it does" cell: "See every skill Claude has, drawn as one map, and which parts of the business still have none."

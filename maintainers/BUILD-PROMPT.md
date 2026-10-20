# Build prompt: Skill and Folder Map OS

This is a record of the brief this tool was built to. Unlike Pipeline OS's `BUILD-PROMPT.md`, it is not meant to be run again: it documents what was decided, for whoever next maintains this kit.

## What the tool is

From the shared brief (`AGENT-BRIEF.md` for this build): Skill and Folder Map OS finds every skill and command Claude can use on the person's computer and draws them as one map, a network with Claude in the middle, a hub per group and a dot per skill, dot size showing how much it's been used in the last 90 days. It shows which skills are used, which share a name, which connect, and which parts of the business have no skill yet. It only reads: it never edits, moves, deletes or sends anything, and nothing scanned ever leaves the person's computer.

5 pages: Map, All skills, Overview, Gaps (the page to share on a sales call), Review, plus Preferences. A scan runs in both Node and Python, writing the same data file. Claude does 3 jobs: scan, group by business area, and suggest tidying.

## What changed from the old Drive build prompt

The original build prompt for this tool, in the toolkit's Drive planning document, described a different tool: a **business-task mapper** that scored tasks by hours spent and how painful they were, built as a sales-call aid to show a prospective client where Claude could save them time. That version asked the person (or guessed) how many hours a task took and how much it hurt, and showed the business as a map of tasks rather than a map of skills.

The tool actually built is a map of the skills and commands **already installed on the computer**, not a map of business tasks. The Gaps page keeps the one part of the old idea worth keeping: the sales-call use, showing which parts of the business have no skill yet, with ideas for what a skill there could do and a "want these built for you?" prompt. Nothing else from the hours-and-pain version carries over.

## Decisions made

- **No libraries.** The map (`apps/skill-map/app/map.js`) is a hand-written force layout on a `<canvas>`. No d3, no 3D, no charting package, matching every other tool's "no framework, nothing from the internet" rule.
- **The scan runs in both Node and Python** (`scan.js` and `scan.py`), writing byte-identical output, so the tool works whether the person's computer has Node, Python, or both, without the app itself depending on either.
- **No changes to the shared helper for this tool.** The 3 Claude jobs (scan, group, review) use the job mechanism already built for Pipeline OS (`SHARED-V4-CHANGES.md`), so scans and suggestions can run as Claude jobs from a button press without any new shared code.
- **Hours are never asked or invented.** Unlike the old business-task mapper, nothing in this tool asks how long a task takes or how much it hurts. The only numbers are counted from the scan itself: how many skills, how often each was used, when.
- **No prices.** As with every tool in the toolkit, nothing here quotes a price for Get AI Powers' services; the Gaps page points to getaipowers.com only.

## Added 20 October 2026: folders and files

George's decisions for the second lens:

- **Rename to Skill and Folder Map OS.** The GitHub repository is renamed to `skill-and-folder-map-os`; the tool's internal id stays `skill-map` and its app folder stays `apps/skill-map/`.
- **The file map only looks at folders the person chooses**, set in setup and changed afterwards in Preferences. There is no scanning of the whole computer, and no default beyond `~/Documents`, `~/Desktop` and `~/Downloads` if they exist.
- **Names, sizes and dates only, never contents.** The folder scan never opens a file or reads what's inside one, the same promise the skills scan already makes about skills.
- **Duplicates are found by name and size.** 2 files count as the same if they share both; the tool never opens either to compare them further.
- **The map area is dark and glowing in both themes.** Whichever theme the rest of the app is in, light or dark, the map canvas itself stays a dark, glowing, futuristic network; the rest of the app keeps the ordinary toolkit look.
- **A Skills | Files switch** in the top bar (and the `T` key) moves the whole app between the 2 lenses; every page follows the switch.
- **Recommendations on cleaning, for both skills and folders.** The existing `review-my-skills` job keeps suggesting what to do with skills; a new `review-my-folders` job does the equivalent for folders and files, on the same "only ever suggest" terms.

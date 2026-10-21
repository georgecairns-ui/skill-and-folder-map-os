# Skill and Folder Map OS

**See every skill and every folder you have, at a glance.** A free kit from [Get AI Powers](https://getaipowers.com), run by Claude.

Skill and Folder Map OS draws 2 maps on one app, switched with a Skills | Files switch at the top. The **Skills** map finds every skill and command Claude can use on your computer and draws them as one map: Claude in the middle, a hub for each part of your business, a dot for each skill. The bigger the dot, the more it's been used in the last 90 days. The **Files** map looks through the folders you choose and draws them the same way: click a folder to go inside it, all the way down to a single file, and see what's taking up space, what's doubled up and what's worth tidying.

Scanning only reads. Skill and Folder Map OS looks at names, sizes and dates and never opens a file. It changes something only when you press a Fix button and confirm, it never deletes anything, every tidy-up can be undone, and nothing it finds leaves your computer.

Skill and Folder Map OS is part of a toolkit of 9 free tools from Get AI Powers. The others (a task list, Pipeline OS, proposals and more) show in the app's menu, and Get AI Powers sets them up with you on a free call.

## What happens when you type /setup

You copy the kit, open it in Claude Code and type **/setup**. In about 20 minutes, Claude:

- **Scans your computer for skills.** Every skill in your own Claude setup, in this toolkit, and in every plugin you've installed, found in one pass and drawn as a map, and opens the app.
- **Scans the folders you choose.** Names, sizes and dates only, for a map of your folders and files.
- **Gets to know your business**, in a short chat, then matches the app to your brand (your colours, your font, your logo if you have one).
- **Groups every skill by what it does.** Sales, marketing, money, whatever your business actually has, so you can see at a glance what each part of the business is covered by and what it isn't.
- **Checks it all works and hands over**, with a summary of what it found and what's missing.

## What it does

The **Skills | Files** switch at the top (or the T key) moves the whole app between the 2 maps. Every page follows the switch.

**Skills side:**

- **Draws the whole map.** Claude in the middle, a hub per group, a dot per skill. Group by what a skill is for (your business areas) or where it's from (your own skills, the toolkit, each plugin). Click a dot or a hub to see the detail.
- **Shows every skill in a list too.** The **All skills** page is the same map as a sortable, filterable table: name, where it's from, how often it's used, when it was last used.
- **Counts what you've got.** The **Overview** page: how many skills, how many used lately, how many uses, how many gone quiet, how many share a name, which ones are used most, use by month and where your skills come from.
- **Finds the gaps.** The **Gaps** page shows every part of your business as a card: the skills already there, or "Nothing here yet" with 3 ideas for what a skill could do. It's the page worth sharing on a call.
- **Suggests first, tidies when you say.** The **Review** page holds what Claude has spotted: a name used twice (and which to keep), a skill nobody's touched in 90 days, descriptions that overlap, a gap worth filling. Press **Keep one copy** or **Retire them** and Claude does it: the spare skills move into an archive folder next to their own, nothing is deleted, and you can undo it. Nothing changes until you press the button.

**Files side:**

- **Draws the whole map.** The folder you're in sits in the middle; click a folder on the map to go inside it, all the way down to a single file. Breadcrumbs and an Up button take you back. Click a file for what it is, where it lives, its size and when it last changed.
- **Shows every file in a list too.** The **All files** page is the same map as a sortable table, with a Files/Folders switch.
- **Counts what you've got.** The **Overview** page: how many files and folders, what they're made of, your biggest folders and files.
- **Finds what needs tidying.** The **Clean-up** page, biggest first: duplicate files, very big files, big files untouched for 2 years, old files in Downloads, installers, untidy names, crowded folders, empty folders, folders buried many levels down. Each one has a "See them" and "Find on the map" link.
- **Tidies when you say.** Each finding on the Clean-up page has a Fix button: **Move them out of the way**, **Keep one copy of each**, **Clear them away**, **Give them clearer names** or **Sort them out**. A box tells you in plain English exactly what will happen, and nothing changes until you press the button in it. Files go into a **Tidied by Claude** folder inside the same folder, never the bin, so nothing is deleted. Every tidy-up is listed under **Tidied so far** with an Undo button. The **Review** page holds Claude's tidy-up suggestions, plus the duplicate sets.

Both sides: **keep your choices** (scan again any time and it keeps the tags, groups and settings you've already chosen), and are **yours to shape** (your own business area names, which folders to scan, your own colours, in light or dark).

## What you need

- **Claude Code**, signed in with a paid Claude plan (Pro or Max). The Claude desktop app works too.
- Nothing else to install in most cases. The app runs on your own computer using Node (Claude installs it for you if it's missing, with your permission). If there's no Node, both scans work with Python 3 instead.
- About 20 minutes, once.

## Get started

1. **Open Claude Code** in the Claude desktop app (the Code tab) or in the Terminal (on Windows, PowerShell). Any folder will do for this first step.
2. **Ask Claude to fetch the kit.** Paste this:
   > Copy https://github.com/georgecairns-ui/skill-and-folder-map-os into a folder called "Skill and Folder Map OS" in my Documents, then tell me how to open it and set it up.

   Claude copies everything onto your computer and gives you one line to open the new folder. In the desktop app, you choose the folder instead. (If your computer asks to install "command line developer tools" or Git, say yes; it's free and takes a few minutes.)
3. **Open the Skill and Folder Map OS folder in Claude Code and choose "Yes, I trust this folder".** The first time, Claude Code asks whether you trust the folder and warns that it pre-approves some permissions. Those permissions only let Claude run the scans, update your maps and your business notes, and start the app, without stopping to ask each time. It still can't edit a skill, a file or a folder, or send anything anywhere. Press the down arrow, then Enter.
4. **Type `/setup`.**

Then it opens your map and gives you its link, **http://localhost:4747**. Bookmark it.

## Every day

| Say (or type the command) | What happens |
|---|---|
| "Scan my skills" (`S` in the app) | A fresh scan of your computer, with a one-line summary of what changed |
| "What skills do I have?" | Claude talks you through the skills map |
| "Group my skills" | Any new or ungrouped skills get sorted into your business areas |
| "Review my skills" | Claude adds any new suggestions (a duplicate, an unused skill, a gap worth filling) to the Review page |
| "Which skills do I never use?" | A straight answer, worked out from the map |
| "Scan my folders", "map my files", "what's in my folders?" | A fresh scan of the folders you've chosen, with a one-line summary |
| "Review my folders", "what should I tidy?", "clean up my files", "what's taking up space?" | Claude adds new tidy-up suggestions to the Review page on the Files side |
| "Open my map" | Starts the app if it isn't already running |

## Your information

Your maps live in this folder on your computer, in 3 files (the 2 maps, and a note of what has been tidied). Claude reads your `.claude` folder, your installed plugins and this kit's own skills to build the skills map, and the folders you choose to build the folder map; scanning never edits, moves or deletes anything. Tidying happens only when you press a Fix button: it moves or renames, never deletes, only inside the folders you chose and your own skill folders, and you can undo it. Nothing it finds is sent anywhere. There's no Skill and Folder Map OS account or server; Get AI Powers can't see any of it. Read [docs/PRIVACY-AND-SAFETY.md](docs/PRIVACY-AND-SAFETY.md) for the detail.

## Make it yours

Change the business areas, the colours, which folders it scans, by asking Claude, or in Preferences. See [docs/CUSTOMISING.md](docs/CUSTOMISING.md).

## Want it set up properly for you?

Skill and Folder Map OS works on its own. If you'd like help turning the gaps it finds into real skills for your business, Get AI Powers can help. Find us at [getaipowers.com](https://getaipowers.com).

## What's inside

```
START-HERE.md          Claude reads this first and runs setup (/setup)
toolkit.json           what this tool is, for attaching it to the others in the toolkit
ATTACHING.md           how the toolkit's tools attach to each other
CLAUDE.md              Claude's standing instructions in this folder
Open Skill and Folder Map.html    double-click to open your map (or use the link Claude gives you)
setup/                 the 5 setup steps and the key scripts
context/               Claude's notes about your business
.claude/skills/        saved know-how; each one also works as a command in Claude Code
files/                 your business documents, in numbered folders
apps/                  the app and its look (theme.css); apps/skill-map/scan/scan-files.js and
                        scan-files.py scan your folders; apps/skill-map/data/filemap.json is
                        the folder map they write
docs/                  customising, privacy and safety
maintainers/           for people developing Skill and Folder Map OS itself
```

## Licence

Free to use and change for your own business. Not for resale. See [LICENSE](LICENSE) for the plain-English terms.

Fonts: Figtree (the app's font), plus Zilla Slab and Source Serif 4 for anyone who wants them, all under the SIL Open Font License (see `apps/shared/fonts/OFL.txt`).

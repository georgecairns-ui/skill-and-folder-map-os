# Skill Map OS

**See every skill Claude has. At a glance.** A free kit from [Get AI Powers](https://getaipowers.com), run by Claude.

Skill Map OS finds every skill and command Claude can use on your computer and draws them as one map: Claude in the middle, a hub for each part of your business, a dot for each skill. The bigger the dot, the more it's been used in the last 90 days. You see what you've got, what's doubled up, what nobody's touched in months, and which parts of the business have no skill at all.

It only reads. Skill Map OS never edits, moves, deletes or sends anything, and your skills never leave your computer.

Skill Map OS is part of a toolkit of 9 free tools from Get AI Powers. The others (a task list, Pipeline OS, proposals and more) show in the app's menu, and Get AI Powers sets them up with you on a free call.

## What happens when you type /setup

You copy the kit, open it in Claude Code and type **/setup**. In about 15 minutes, Claude:

- **Scans your computer.** Every skill in your own Claude setup, in this toolkit, and in every plugin you've installed, found in one pass and drawn as a map.
- **Gets to know your business**, in a short chat, then matches the app to your brand (your colours, your font, your logo if you have one).
- **Groups every skill by what it does.** Sales, marketing, money, whatever your business actually has, so you can see at a glance what each part of the business is covered by and what it isn't.
- **Shows you the gaps.** The parts of your business with no skill yet, each with a few ideas for what a skill there could do.

## What it does

- **Draws the whole map.** Claude in the middle, a hub per group, a dot per skill. Group by what a skill is for (your business areas) or where it's from (your own skills, the toolkit, each plugin). Click a dot or a hub to see the detail.
- **Shows every skill in a list too.** The **All skills** page is the same map as a sortable, filterable table: name, where it's from, how often it's used, when it was last used.
- **Counts what you've got.** The **Overview** page: how many skills, how many used lately, how many uses, how many gone quiet, how many share a name, which ones are used most, use by month and where your skills come from.
- **Finds the gaps.** The **Gaps** page shows every part of your business as a card: the skills already there, or "Nothing here yet" with 3 ideas for what a skill could do. It's the page worth sharing on a call.
- **Suggests, never acts.** The **Review** page holds what Claude has spotted: a name used twice (and which to keep), a skill nobody's touched in 90 days, descriptions that overlap, a gap worth filling. Claude only suggests. You mark each one Done or Not now.
- **Keeps your choices.** Scan again any time and it keeps the tags, groups and settings you've already chosen.
- **Yours to shape.** Your own names for the business areas, extra folders to scan, your own colours, in light or dark.

## What you need

- **Claude Code**, signed in with a paid Claude plan (Pro or Max). The Claude desktop app works too.
- Nothing else to install in most cases. The app runs on your own computer using Node (Claude installs it for you if it's missing, with your permission). If there's no Node, the scan works with Python 3 instead.
- About 15 minutes, once.

## Get started

1. **Open Claude Code** in the Claude desktop app (the Code tab) or in the Terminal (on Windows, PowerShell). Any folder will do for this first step.
2. **Ask Claude to fetch the kit.** Paste this:
   > Copy https://github.com/georgecairns-ui/skill-map-os into a folder called "Skill Map OS" in my Documents, then tell me how to open it and set it up.

   Claude copies everything onto your computer and gives you one line to open the new folder. In the desktop app, you choose the folder instead. (If your computer asks to install "command line developer tools" or Git, say yes; it's free and takes a few minutes.)
3. **Open the Skill Map OS folder in Claude Code and choose "Yes, I trust this folder".** The first time, Claude Code asks whether you trust the folder and warns that it pre-approves some permissions. Those permissions only let Claude run the scan, update your map and your business notes, and start the app, without stopping to ask each time. It still can't edit a skill or send anything anywhere. Press the down arrow, then Enter.
4. **Type `/setup`.**

Then it opens your skill map and gives you its link, **http://localhost:4747**. Bookmark it.

## Every day

| Say (or type the command) | What happens |
|---|---|
| "Scan my skills" (`S` in the app) | A fresh scan of your computer, with a one-line summary of what changed |
| "What skills do I have?" | Claude talks you through the map |
| "Group my skills" | Any new or ungrouped skills get sorted into your business areas |
| "Review my skills" | Claude adds any new suggestions (a duplicate, an unused skill, a gap worth filling) to the Review page |
| "Which skills do I never use?" | A straight answer, worked out from the map |
| "Open my skill map" | Starts the app if it isn't already running |

## Your information

Your skill map lives in this folder on your computer, in one file. Claude reads your `.claude` folder, your installed plugins and this kit's own skills to build it; it never edits, moves or deletes a skill, and nothing it finds is sent anywhere. There's no Skill Map OS account or server; Get AI Powers can't see any of it. Read [docs/PRIVACY-AND-SAFETY.md](docs/PRIVACY-AND-SAFETY.md) for the detail.

## Make it yours

Change the business areas, the colours, the extra folders it scans, by asking Claude, or in Preferences. See [docs/CUSTOMISING.md](docs/CUSTOMISING.md).

## Want it set up properly for you?

Skill Map OS works on its own. If you'd like help turning the gaps it finds into real skills for your business, Get AI Powers can help. Find us at [getaipowers.com](https://getaipowers.com).

## What's inside

```
START-HERE.md          Claude reads this first and runs setup (/setup)
toolkit.json           what this tool is, for attaching it to the others in the toolkit
ATTACHING.md           how the toolkit's tools attach to each other
CLAUDE.md              Claude's standing instructions in this folder
Open Skill Map.html    double-click to open your skill map (or use the link Claude gives you)
setup/                 the 4 setup steps and the key scripts
context/               Claude's notes about your business
.claude/skills/        saved know-how; each one also works as a command in Claude Code
files/                 your business documents, in numbered folders
apps/                  the skill map app and its look (theme.css)
docs/                  customising, privacy and safety
maintainers/           for people developing Skill Map OS itself
```

## Licence

Free to use and change for your own business. Not for resale. See [LICENSE](LICENSE) for the plain-English terms.

Fonts: Figtree (the app's font), plus Zilla Slab and Source Serif 4 for anyone who wants them, all under the SIL Open Font License (see `apps/shared/fonts/OFL.txt`).

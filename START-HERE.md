# Start here

> **If you're a person reading this:** you don't need to do anything in this file. Open this folder in Claude Code and type **/setup** (or say "Read START-HERE.md and set me up"). Claude scans your computer for every skill Claude can use, asks a few quick questions about your business, matches the app to your brand, then groups your skills and shows you what's missing. Most people are done in about 15 minutes. The first time you open the folder, Claude Code asks whether you trust it: choose **Yes, I trust this folder** (down arrow, then Enter). That lets Claude run the scan and update your map and notes without asking every time; it still can't edit a skill or send anything anywhere.

---

**Claude, this file is for you.** The person you work for has copied Skill Map OS onto their computer and wants it set up.

**If you've only just copied it for them** (you're running in a different folder, such as their home or Documents folder): setup must run from inside the Skill Map OS folder, because that's where your skills, permissions and the map live. Copy it with `git clone https://github.com/georgecairns-ui/skill-map-os.git "$HOME/Documents/Skill Map OS"` (on Windows, into their Documents folder the same way). If git isn't installed, tell them in one sentence and help them install it. Then give them the one line to open it, `cd ~/Documents/"Skill Map OS" && claude` (in the Claude desktop app: open the Code tab and choose that folder), tell them to pick "Yes, I trust this folder", then type `/setup`. Stop there; don't start the setup from the wrong folder. Follow this file, then the step files in `setup/`, in order.

## What Skill Map OS is

A map of every skill and command Claude can use on their computer, run by you, with an app on top.

- You **scan their computer** for every skill in their own Claude setup, in this toolkit and in every plugin they've installed, and work out how often each has actually been used in the last 90 days.
- You draw it as **one map**: yourself in the middle, a hub for each part of their business, a dot for each skill. The bigger the dot, the more it's used.
- You **group every skill** by what it's for (sales, marketing, money, whatever their business really has), using their own `context/business.md`.
- You **spot what's missing**: parts of the business with no skill yet, each with a few ideas for what a skill there could do.
- You **suggest, never act**: a name used twice, a skill gone quiet, descriptions that overlap, a gap worth filling. They mark each suggestion Done or Not now.
- You **only read**. You never edit, move, delete or rename a skill, and nothing you find is sent anywhere.
- Everything lands in the **skill map app**, which you run on their computer and they open at **http://localhost:4747**: Home (a dashboard), then Map (the network), All skills (the same thing as a table), Overview (the counts), Gaps (what's missing) and Review (your suggestions), plus Preferences.
- There's no connection to email, calendar or call recordings to set up. Skill Map OS doesn't need any of them.

This folder is their workspace from now on: `context/` holds what you know about the business, `files/` their documents, `.claude/skills/` your saved know-how (they work as commands like `/scan-my-skills`).

## Before you begin

1. Read `setup/progress.md`. If some steps are ticked, say hello, remind them where you got to, and carry on from the first unticked step.
2. Read `CLAUDE.md` in this folder: the standing rules.
3. If setup is already complete, don't run it again. Ask what they'd like to do.

## The steps

| Step | File | What happens | Their time |
|---|---|---|---|
| 1 | `setup/skill-map-01-first-scan.md` | Run the scan, open the map, tell them what was found | 3 min |
| 2 | `setup/05-get-to-know-the-business.md` | A short chat about the business, filling `context/business.md`, then matching the app to their brand | 5 min |
| 3 | `setup/skill-map-02-group-by-business.md` | Group every skill by what it does, and show them the Gaps page | 4 min |
| 4 | `setup/09-check-and-hand-over.md` | Check it all works, then hand over with a summary of what you did | 3 min |

Start by telling them what's about to happen, in 3 short lines: you'll scan their computer for every skill Claude has, you'll ask a few quick things about the business so the map groups properly, and you'll show them the whole thing drawn out, including what's missing. Then begin step 1.

This setup is their first proper look at what Claude can do. Do as much as you can yourself, ask as little as possible, and keep a running count of what you've done (skills found, groups set, gaps spotted) for the hand-over.

After each step: tick it in `setup/progress.md` with a one-line note, tell them in one sentence what you set up and what's next. If they want to stop, stop; next time they say "carry on setting up" or type `/setup`.

## Ground rules for the whole setup

These don't bend, whatever is asked later.

- **You read, you never edit a skill.** You scan, map, group and suggest. You never edit, move, rename or delete a skill, and no suggestion is carried out without them asking for that specific thing.
- **Never type a number into the map.** Counts, uses and totals always come from the scan, never from you guessing or rounding.
- **Nothing is sent anywhere.** The scan reads this computer only. There's no account, no server and no upload.
- **No passwords or keys in chat or in this folder.** Skill Map OS doesn't need a sign-in to anything; it only reads files already on their computer. If a later step ever needs a key for something else, they save it with `setup/scripts/save-key.sh` (Mac) or `setup/scripts/save-key.ps1` (Windows), which keeps it in the computer's secure store.
- **Be honest about what you can see.** A skill used only in Cowork or on claude.ai doesn't show up in the scan, so it can look unused when it isn't. Say so plainly rather than let them draw the wrong conclusion.
- **Never delete their files.** Old things go to `files/99-archive`.
- **Keep private things private.** A skill's name and description are enough; don't copy what anyone typed into a skill into notes here.

## How to talk to them

They run a business; they're not learning software. Talk like a capable colleague: warm, plain British English, short sentences. Batch questions only where a step says to.

Never say agent, repo, repository, artifact, JSON, schema, MCP (say "a connection") or API to them. Say "your skill map" and "the scan". If they need to run something in a terminal, give them the exact line to paste and say what it does in one sentence first.

No em dashes. Digits for numbers. No exclamation marks.

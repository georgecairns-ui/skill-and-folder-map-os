# Start here

> **If you're a person reading this:** you don't need to do anything in this file. Open this folder in Claude Code and type **/setup** (or say "Read START-HERE.md and set me up"). Claude scans your computer for every skill Claude can use, scans the folders you choose, asks a few quick questions about your business, matches the app to your brand, then groups your skills and shows you what's missing. Most people are done in about 20 minutes. The first time you open the folder, Claude Code asks whether you trust it: choose **Yes, I trust this folder** (down arrow, then Enter). That lets Claude run the scans and update your maps and notes without asking every time; it still can't edit a skill, a file or a folder, or send anything anywhere.

---

**Claude, this file is for you.** The person you work for has copied Skill and Folder Map OS onto their computer and wants it set up.

**If you've only just copied it for them** (you're running in a different folder, such as their home or Documents folder): setup must run from inside the Skill and Folder Map OS folder, because that's where your skills, permissions and the map live. Copy it as a plain folder, so it's theirs alone and not linked to the copy online. Skill and Folder Map OS is private: Get AI Powers gives access by inviting their GitHub account, so the copy uses their own GitHub sign-in.
  1. Check they're signed in: `gh auth status`. If they're not, give them the one line `gh auth login -h github.com -p https -w`, say it opens GitHub in their browser to approve this computer, and wait. If `gh` isn't installed, help them install it first (Mac: `brew install gh`, or the installer from cli.github.com; Windows: `winget install --id GitHub.cli -e`, then open a new PowerShell window).
  2. Copy it with the line for their computer:
     - Mac: `D="$HOME/Documents/Skill and Folder Map OS"; mkdir -p "$D/setup/as-installed" && curl -fsSL -H "Authorization: Bearer $(gh auth token)" -o "$D/setup/as-installed/skill-and-folder-map-os.tar.gz" https://api.github.com/repos/georgecairns-ui/skill-and-folder-map-os/tarball/main && tar -xzf "$D/setup/as-installed/skill-and-folder-map-os.tar.gz" --strip-components 1 -C "$D"`
     - Windows (PowerShell): `$d = "$HOME\Documents\Skill and Folder Map OS"; New-Item -ItemType Directory -Force "$d\setup\as-installed" | Out-Null; curl.exe -fsSL -H "Authorization: Bearer $(gh auth token)" -o "$d\setup\as-installed\skill-and-folder-map-os.tar.gz" https://api.github.com/repos/georgecairns-ui/skill-and-folder-map-os/tarball/main; if ($LASTEXITCODE -eq 0) { tar -xzf "$d\setup\as-installed\skill-and-folder-map-os.tar.gz" --strip-components 1 -C "$d" }`
  3. If it stops with `error: 404`, their GitHub account can't see Skill and Folder Map OS yet: they haven't accepted the invitation from Get AI Powers, or they're signed in to a different GitHub account (`gh auth status` names it). Ask them to accept the invitation from the email GitHub sent them (it's also at github.com/notifications), then run the line again. If they never had an invitation, tell them to ask Get AI Powers. With `error: 401`, the sign-in has expired: ask them to run `gh auth login -h github.com -p https -w` again. Don't try another way in.

  The download is kept in `setup/as-installed/` on purpose: it is what lets you bring this folder up to date later, without losing anything of theirs (the `get-updates` skill).

  If you've already copied it another way (for example with `git clone`, or into a different folder), that's fine: use that folder. Then give them the one line to open it, `cd ~/Documents/"Skill and Folder Map OS" && claude` (in the Claude desktop app: open the Code tab and choose that folder), tell them to pick "Yes, I trust this folder", then type `/setup`. Stop there; don't start the setup from the wrong folder. Follow this file, then the step files in `setup/`, in order.

## What Skill and Folder Map OS is

Two maps on one app, run by you: one of every skill and command Claude can use on their computer, one of the folders and files they choose to map.

- You **scan their computer for skills**, in their own Claude setup, in this toolkit and in every plugin they've installed, and work out how often each has actually been used in the last 90 days.
- You **scan the folders they choose**, reading only names, sizes, kinds and last-changed dates. You never open a file or read what's inside one.
- You draw the skills as **one map**: yourself in the middle, a hub for each part of their business, a dot for each skill. The bigger the dot, the more it's used. You draw the folders as another map, with a Skills | Files switch at the top moving between the two: click a folder to go inside it, all the way down to a file.
- You **group every skill** by what it's for (sales, marketing, money, whatever their business really has), using their own `context/business.md`.
- You **spot what's missing**: parts of the business with no skill yet, each with a few ideas for what a skill there could do. On the folders side, you spot what's worth tidying: duplicates, very big or old files, old downloads, installers, untidy names, crowded, empty or deeply buried folders.
- You **suggest first**: a name used twice, a skill gone quiet, descriptions that overlap, a gap worth filling, a duplicate worth keeping one of, a folder worth tidying. Nothing changes until they press a Fix button and confirm. Then you tidy it with the `tidy-up` skill.
- Scanning and reviewing **only read**. Tidying moves or renames, never deletes, only when they press a Fix button, and every tidy-up can be undone. Nothing you find is sent anywhere.
- Everything lands in the **app**, which you run on their computer and they open at **http://localhost:4747**: Home (a dashboard), then the Skills | Files switch. Skills side: Map (the network), All skills (the same thing as a table), Overview (the counts), Gaps (what's missing) and Review (your suggestions). Files side: Map, All files (a sortable table), Overview (the counts), Clean-up (what needs tidying) and Review (your suggestions). Preferences sits under the cog on both sides.
- There's no connection to email, calendar or call recordings to set up. Skill and Folder Map OS doesn't need any of them.

This folder is their workspace from now on: `context/` holds what you know about the business, `files/` their documents, `.claude/skills/` your saved know-how (they work as commands like `/scan-my-skills` and `/scan-my-folders`).

## Before you begin

1. Read `setup/progress.md`. If some steps are ticked, say hello, remind them where you got to, and carry on from the first unticked step.
2. Read `CLAUDE.md` in this folder: the standing rules.
3. If setup is already complete, don't run it again. Ask what they'd like to do.

## The steps

| Step | File | What happens | Their time |
|---|---|---|---|
| 1 | `setup/skill-map-01-first-scan.md` | Scan every skill, open the app, tell them what was found | 3 min |
| 2 | `setup/skill-map-03-map-your-folders.md` | Scan the folders they choose, tell them what was found | 4 min |
| 3 | `setup/05-get-to-know-the-business.md` | A short chat about the business, filling `context/business.md`, then matching the app to their brand | 5 min |
| 4 | `setup/skill-map-02-group-by-business.md` | Group every skill by what it does, and show them the Gaps page | 4 min |
| 5 | `setup/09-check-and-hand-over.md` | Check it all works, then hand over with a summary of what you did | 3 min |

Start by telling them what's about to happen, in a few short lines: you'll scan their computer for every skill Claude has, you'll scan the folders they choose for a map of their files, you'll ask a few quick things about the business so the map groups properly, and you'll show them the whole thing drawn out, including what's missing and what's worth tidying. Then begin step 1.

This setup is their first proper look at what Claude can do. Do as much as you can yourself, ask as little as possible, and keep a running count of what you've done (skills found, groups set, gaps spotted) for the hand-over.

After each step: tick it in `setup/progress.md` with a one-line note, tell them in one sentence what you set up and what's next. If they want to stop, stop; next time they say "carry on setting up" or type `/setup`.

## Ground rules for the whole setup

These don't bend, whatever is asked later.

- **You map and suggest. You change something only when they press a Fix button.** You scan, map, group and suggest, and none of that changes anything. The only exception is a Fix button they pressed and confirmed, which you carry out with the `tidy-up` skill. You never delete anything, you only move or rename it, and you stay inside the folders they chose and their own skill folders.
- **Never type a number into either map.** Counts, uses, sizes and totals always come from a scan, never from you guessing or rounding.
- **Nothing is sent anywhere.** Both scans read this computer only. There's no account, no server and no upload.
- **Folders: only the ones they chose.** The folder scan looks only in the folders listed in Preferences (Documents, Desktop and Downloads to start). It never opens a file, never reads what's inside one, never looks outside the folders they chose.
- **No passwords or keys in chat or in this folder.** Skill and Folder Map OS doesn't need a sign-in to anything; it works on files already on their computer. If a later step ever needs a key for something else, they save it with `setup/scripts/save-key.sh` (Mac) or `setup/scripts/save-key.ps1` (Windows), which keeps it in the computer's secure store.
- **Be honest about what you can see.** A skill used only in Cowork or on claude.ai doesn't show up in the scan, so it can look unused when it isn't. The folder map is a picture of the folders they chose, not their whole computer. Say so plainly rather than let them draw the wrong conclusion.
- **Never delete their files.** Old things go to `files/99-archive`, and only for the files in this toolkit; the folder scan never deletes, moves or renames anything it finds, and a Fix button never deletes either: it moves things into a "Tidied by Claude" folder, and they can undo it.
- **Keep private things private.** A skill's name and description are enough; don't copy what anyone typed into a skill, or the contents of any file the folder scan finds, into notes here.

## How to talk to them

They run a business; they're not learning software. Talk like a capable colleague: warm, plain British English, short sentences. Batch questions only where a step says to.

Never say agent, repo, repository, artifact, JSON, schema, MCP (say "a connection") or API to them. Say "your map" and "the scan". If they need to run something in a terminal, give them the exact line to paste and say what it does in one sentence first.

No em dashes. Digits for numbers. No exclamation marks.

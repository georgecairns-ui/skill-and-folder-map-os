# Privacy and safety

Plain answers to the questions people ask before running the scan.

## Where is my information kept?

In this folder on your computer. Skill Map OS has no account, no server and no database. Your map is one file: `apps/skill-map/data/skillmap.json`. Claude's notes about your business are in `context/`. You can open, read and edit all of it yourself.

If this folder sits inside Google Drive, OneDrive or Dropbox, it's backed up there like any other folder. If that folder is shared with other people, they can read your map and notes too, so keep it in a private part of your drive.

## What does the scan actually read?

Only places where a skill or command could live:

- `~/.claude/skills` and `~/.claude/commands`, your own saved know-how
- any extra folders you add in Preferences
- this kit's own `.claude/skills`
- every plugin you've installed (found through `~/.claude/plugins/installed_plugins.json`), and that plugin's own skills and commands
- your Claude Code history in `~/.claude/projects`, to work out how often a skill has been used. It reads only the name of the skill and the date it was used, never anything you typed

That's everything. It doesn't read your email, calendar, documents or any file outside those places.

## What does it store about each skill?

A skill's name, its description (from its own `SKILL.md`, usually a sentence or two), where it lives, which business area it's in, a tag or two if you've added any, and how many times it's been used and when. It never stores what you typed when you used a skill, and never stores the body of a skill beyond its own description.

## Does it ever use anyone's information in Cowork or claude.ai?

No, and it can't see it either. A skill used only in Cowork or on claude.ai doesn't show up in Claude Code's history, so the scan has no way to count it. If a skill you use often looks unused on the map, that's usually why: say so plainly rather than let it mislead you. "Add a skill" in the app's top bar lets you add one by hand so it shows on the map anyway.

## Does Skill Map OS change any of my skills?

No. It only reads. Claude never edits, renames, moves or deletes a skill, anywhere, for any reason. When Claude thinks something should change (two skills sharing a name, one worth retiring, a description worth tidying), it adds a suggestion to the Review page. You decide; nothing happens to a skill unless you go and do it yourself.

## Does it send anything anywhere?

No. The scan runs entirely on your computer and writes to one file, also on your computer. Nothing is uploaded, and there's nothing for Get AI Powers to see.

## What about passwords and keys?

Skill Map OS doesn't need a sign-in to anything: it only reads files already on your computer. It never asks for a password or a key, and none should ever go into this folder or into the chat.

## What is the helper?

Your skill map app runs from a small program in your Skill Map OS folder, so it opens like a web page at http://localhost:4747. It only listens on your own computer: nothing on the internet or your network can reach it. It only shows the app and only ever saves your map file, keeping a backup before every save. When you press Scan, Group or Review in the app, it can start Claude Code on your computer to do that one job, and only when the app itself asks.

## Who sees my information?

You, and Claude while you're working with it. Your conversations with Claude are covered by your Claude account's privacy settings, which you can check in the Claude app. Get AI Powers, who made Skill Map OS, can't see your folder or your map.

## The approve button

Nothing Claude suggests on the Review page changes anything until you mark it. Mark something Not now and it stays closed; mark it Done once you've acted on it yourself. That's deliberate: you stay in charge of your own skills.

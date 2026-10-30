---
title: BB Report Tool – Crash and Bug Reports for the Bloodborne PC Port
description: Download the BB Report Tool for the Bloodborne PC port (bbport, Windows) – one zip with your PC, the port's settings and its log for our helpers, and fixes for the problems we already know. Free, nothing is uploaded.
heading: BB Report Tool
intro: One zip with what our helpers need after a crash or a bug – and the fixes for problems we already know, before you even ask.
---

<!-- The tool is built outside this repo (BB-Troubleshooting-Source, Nick). A new version: put the new .bat alone
into public/tool/BB-Report-Tool.zip (line ends as they are), then change the version, date, size and SHA-256 below.
tests/features.spec.mjs checks the version and the SHA-256 against the zip. Its knowledge (known problems and
fixes) is the signed public/tool/knowledge.json next to it (scripts/fetch-knowledge.mjs). -->

<p><a class="btn btn-primary" href="BB-Report-Tool.zip" download>Download BB Report Tool 3.0.0</a></p>

Version **3.0.0** (29 October 2026) · zip, 228 KB · Windows 10 and 11 · SHA-256 <code class="tool-sha">e92bb2011b6b897c8af09f5960587c8013f95a716b2df8aaccd0f734f63bd7a5</code>

## When you need it

- **After a crash or a bug** you want help with: the zip shows our helpers your PC, the port's settings and the log of the game that went wrong.
- **When the launcher doesn't open**, or with an older port version. The launcher makes a report as well (**Report** next to Play, or Help → Save a report); this download is the newest version of the tool on its own.

## How to use it

1. Unzip `BB-Report-Tool.zip`, for example next to your `bbport-windows` folder.
2. Right after the crash, double-click `BB-Report-Tool.bat`. The game replaces its log at every start, so run the tool before you play again.
3. It finds your port folder by itself (if not, it asks), checks it for the problems we know, and shows their fixes. It changes nothing without your OK, and backs up your settings before it changes a graphics option.
4. It saves a `bb-report-….zip`. Post it in a new topic in [Help & Support](https://forum.bbport.de/t/help-support) on our forum, and say what you were doing when it happened.

Windows may ask whether you trust the file before it runs: it is a plain PowerShell script, which you can open in Notepad to read.

## What is in the report

- **Your PC:** Windows version, processor, memory, graphics card and driver, display.
- **The port:** its version and settings, your mods and patches, the log of the last game (`user\last_run.log`), and the crashes and driver resets Windows recorded.
- **Taken out:** your Windows user name, the PC's name and your online login are removed from every file. Your online account file and your password are never copied.

The tool speaks 13 languages; the report itself is in English, for our helpers.

## What it sends

Nothing. The report stays on your PC until you post it yourself. If you allow it once in the tool, it checks GitHub for a new port version and downloads the newest list of known problems and fixes from this website, signed by our team; it sends nothing about you or your report. Details are in the [privacy notice](../privacy/).

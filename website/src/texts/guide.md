---
title: Launcher – How the Port Works
description: How the bbport launcher (Bloodborne PC port for Windows) works – the included FPS and resolution patches, where to set them, saves and backups, Steam, mods and the Help page.
heading: Launcher
intro: What the launcher does, page by page – the included patches, saves, Steam, mods and Help. Installing and updating are in the install guide, playing with others on the online page.
---

<!-- Page names as in the launcher (README-Windows.txt, help texts in launcher/bbport_help.py). If a
name changes in the launcher, update it here too. Do not copy internal notes (docs/launcher-*.md).
Installing, the first start and updating are on install.md, online play on the Online page (/server/#play):
link there instead of repeating it (Nick, 29.10.2026). -->

**Not here:** [installing, the first start and updating](../install/) · [online play](../server/#play) · [best settings for your graphics card](../best-settings/) · problems in the [FAQ](../faq/).

## What's included

**Everything you need is in the download.** The port brings the community patches for game version 1.09:

- 30, 60 or 90 FPS, or unlocked
- any output resolution, including "same as the monitor"
- effects on or off
- Quit to Desktop, Rebirth at the Doll and the HUD position
- cheats and gameplay tweaks

You set all of it in the launcher: frame rate, resolution and effects on **Picture & performance**, Quit to Desktop, Rebirth and the other gameplay tweaks on **Gameplay**, and with the **Expert view** switch at the bottom of the side bar also on **All graphics** and **Cheats**. In the game, Insert (keyboard) or L3 + R3 (controller) opens the port's menu for upscaler, resolution, effects and the field of view.

shadPS4/GoldHEN XML patches in the `patches` folder are optional. You don't need them.

## Saves

- Your saves are in the `user` folder next to `Bloodborne.exe`. The launcher can use another folder.
- **Before every start the launcher backs up your saves.** Lost a character or got a broken save? Close the game, then on the **Saves** page under **Backups** put back the newest backup from before the problem. Your current saves are backed up first, so trying an older backup loses nothing.
- Only one character is affected: under **Your characters**, open its earlier states and put back just that one.
- **A character from another version** (another port folder): **Saves → From other versions**.
- **Saves in a cloud folder** (OneDrive and the like): play on one PC at a time.

## Steam

- **Add to Steam** on **Launcher customization**, or add `Play Bloodborne.exe` yourself: both start the game directly.
- **AMD driver crashes when started from Steam:** in one report, Steam's shader pre-caching logged errors right before the crash. Turn it off under Steam → Settings → Downloads → Shader Pre-Caching. From 1.9.5 on, the port turns it off for the game by itself.
- The controller does nothing from Steam: in the game's Steam properties, try Steam Input on or off.

## Mods

- **Which mods work?** Check the [tested mods](https://forum.bbport.de/t/mods-patches?tab=works) in our forum: each one says the port version and date of its test. Not listed yet? Ask in [Mods & Patches](https://forum.bbport.de/t/mods-patches).
- Put each mod in its own folder under `mods` (with `dvdroot_ps4\…` inside, or `chr\`, `parts\` and so on directly).
- Switch mods on and put them in order on **Mods & patches** (drag and drop). Your game files are never changed.
- Mods must not bring their own `eboot.bin`.
- Rebirth, the HUD layout and the field of view are built into the port. They are not mods.

## Help and reports

- **Help** checks your game folder and your PC, lists the known problems with their fixes, and after a game that ended with an error names the cause its log shows. Start there.
- **Help → Save a report** makes the zip our helpers ask for: the log, your settings without passwords, and your PC. Post it in a new topic in [Help & Support](https://forum.bbport.de/t/help-support) on our forum (log in with Discord). If the launcher doesn't open, the [BB Report Tool](../tool/) makes the zip on its own.
- **Help → Only a black screen → Clear the shader cache** helps after a driver update (1.9.5 also has the button on **Advanced**). The first minutes stutter while the cache is built again.
- Everything else, from code 3 to crashes and stutter, is in the [FAQ](../faq/).

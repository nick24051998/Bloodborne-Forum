---
title: Launcher Guide – How the Port Works
description: How bbport, the Bloodborne PC port for Windows, works – included FPS and resolution patches, game files, updates, online play, Steam, saves and mods.
heading: Launcher guide
intro: How the port and its launcher work, page by page – and the answers to what people ask most on Discord.
---

<!-- Page names as in the launcher (README-Windows.txt, help texts in launcher/bbport_help.py). If a
name changes in the launcher, update it here too. Do not copy internal notes (docs/launcher-*.md). -->

## What's included

**Everything you need is in the download.** The port brings the community patches for game version 1.09:

- 30, 60 or 90 FPS, or unlocked
- any output resolution, including "same as the monitor"
- effects on or off
- Quit to Desktop, Rebirth at the Doll and the HUD position
- cheats and gameplay tweaks

You set all of it in the launcher: frame rate, resolution and effects on **Picture & performance**, Quit to Desktop, Rebirth and the other gameplay tweaks on **Gameplay**, and with the **Expert view** switch at the bottom of the side bar also on **All graphics** and **Cheats**. In the game, Insert (keyboard) or L3 + R3 (controller) opens the port's menu for upscaler, resolution, effects and the field of view.

shadPS4/GoldHEN XML patches in the `patches` folder are optional. You don't need them.

## Your game files

- You need your own dump of Bloodborne **CUSA03173** with the **1.09 update copied over the base game**: one folder with `eboot.bin`, `sce_module`, `sce_sys` and `dvdroot_ps4` (about 29 GB in about 28,800 files). The [install guide](../install/) shows how.
- The clean 1.09 `eboot.bin` is **exactly 93,825,704 bytes** (right-click it, then Properties).
- Don't use an `eboot.bin` with a 60 FPS patch built in, like Lance McDonald's. The port brings its own 60 FPS. With a changed file it only applies the patches that still fit (since 1.9.3), so the FPS and effect options may do nothing, and it can crash at the gestures menu or the cutscene after Rom.
- We don't help with game files from the internet (rule 2 on our Discord).

## First start

1. Unpack the port into a plain folder like `C:\Games\BBPort` and start `Bloodborne.exe`.
2. The first time, a short guide picks your game folder and the settings for your PC. Then press **PLAY**.
3. The **Play** page checks the game version, your saves, the graphics card and the FSR 4 files.

The setup screen by screen, and the settings for your graphics card: [best settings](../best-settings/). You can change the game folder later on **Game files** (expert view). `Play Bloodborne.exe` starts the game straight away with your saved settings, without opening the launcher.

## Updates

- When a new version is out, the launcher shows it at the **bottom left**. **Update** downloads and installs it and opens the launcher again. Saves, settings and mods are kept.
- **Advanced → Check for updates** checks by hand. **Advanced → Other versions** goes back to any version from 1.8.2 on.

### Updating by hand (1.9.3)

On 1.9.3 the update button never appears, and the sign-in to The Hunter's Dream hangs. Update by hand, **over your old port folder**:

1. Close the game and the launcher, including its tray icon at the bottom right. Windows won't replace `Bloodborne.exe` while it runs.
2. [Download the newest version](#latest-download). The zip holds one folder, `bbport-windows`.
3. Copy what is **inside** that folder (`Bloodborne.exe`, `_internal`, `bin`, `scripts`, `run.py` …) into your port folder and replace the files. Copying the folder itself only makes a nested `bbport-windows` folder.

Your saves, graphics settings, key bindings and mods stay: the zip has no `user` folder, no `bbport.ini`, `input.ini` or `mods` folder, and the launcher settings in `%APPDATA%` aren't touched. Don't start a new folder for this: it would begin with default graphics, which froze Intel Arc and is slow on small cards, while the launcher keeps pointing to the old folder's saves and mods.

## Online play

1. Open **Online play** and tick **Play online**.
2. Choose who you play with:
   - **The Hunter's Dream** (the default): co-op together with bbhost players. Press **Sign in with Discord** once and enter the code on the page that opens.
   - **shadNet server**: register at [shadnet.shadps4.net](https://shadnet.shadps4.net) and enter the account name (not the e-mail) and password.
3. Press **Test connection**, then PLAY, and choose online at the title screen.

Everyone in a session needs game version 1.09 and the same co-op pool. Please ask on our Discord, not The Hunter's Dream, for help with the port.

**It doesn't connect?**

- **"Failed to acquire Bloodborne server information":** update to 1.9.4, which fixes it for PCs whose antivirus scans HTTPS connections.
- Your firewall or router must let the game server port **20443** through.
- **"Seamless co-op" tool:** it overwrites a hidden server address. On 1.9.4: Online play → shadNet server → **Use my own servers** → empty the **Game server** field → switch back to The Hunter's Dream. 1.9.5 fixes this for good.
- **Your own shadNet servers:** the public server's WebAPI is `http://srv.shadps4.net:31315`, with plain `http`. An `https://` address fails with "SSL: UNEXPECTED_EOF_WHILE_READING". From 1.9.5 on, the server fields only count with **Use my own servers** ticked.

## Steam

- **Add to Steam** on **Launcher customization**, or add `Play Bloodborne.exe` yourself: both start the game directly.
- **AMD driver crashes when started from Steam:** in one report, Steam's shader pre-caching logged errors right before the crash. Turn it off under Steam → Settings → Downloads → Shader Pre-Caching. From 1.9.5 on, the port turns it off for the game by itself.
- The controller does nothing from Steam: in the game's Steam properties, try Steam Input on or off.

## Saves

- Your saves are in the `user` folder next to `Bloodborne.exe`. The launcher can use another folder.
- **Before every start the launcher backs up your saves.** Lost a character or got a broken save? Close the game, then on the **Saves** page under **Backups** put back the newest backup from before the problem. Your current saves are backed up first, so trying an older backup loses nothing.
- Only one character is affected: under **Your characters**, open its earlier states and put back just that one.
- **A character from another version** (another port folder): **Saves → From other versions**.
- **Saves in a cloud folder** (OneDrive and the like): play on one PC at a time.

## Mods

- **Which mods work?** Check the [tested mods](https://forum.bbport.de/t/mods-patches?tab=works) in our forum: each one says the port version and date of its test. Not listed yet? Ask in [Mods & Patches](https://forum.bbport.de/t/mods-patches).
- Put each mod in its own folder under `mods` (with `dvdroot_ps4\…` inside, or `chr\`, `parts\` and so on directly).
- Switch mods on and put them in order on **Mods & patches** (drag and drop). Your game files are never changed.
- Mods must not bring their own `eboot.bin`.
- Rebirth, the HUD layout and the field of view are built into the port. They are not mods.

## When something goes wrong

- **Help** checks your game folder and your PC, lists the known problems with their fixes, and after a game that ended with an error names the cause its log shows. Start there.
- **Help → Save a report** makes the zip our helpers ask for: the log, your settings without passwords, and your PC. Post it in a new topic in [Help & Support](https://forum.bbport.de/t/help-support) on our forum (log in with Discord).
- **Only a black screen**, often after a driver update: **Help → Only a black screen → Clear the shader cache**, then start again (1.9.5 also has the button on **Advanced**). The first minutes stutter while the cache is built again.
- **The game closes right away (code 3):** Windows gives it too little memory. See the [FAQ](../faq/#code-3) for the page file setting.
- **Overlays** like RivaTuner (RTSS) and MSI Afterburner can break the game. Close them.
- **Intel graphics** get no upscaler. FSR 4 freezes on Intel Arc.


---
title: Install Guide & System Requirements
description: How to install bbport (Bloodborne for Windows) step by step, plus minimum and recommended system requirements, CPU limits, driver notes and how to update.
heading: Install guide
intro: Everything to get Bloodborne running on Windows, in one place – system requirements, your game files, installing, the first start and updating.
---

<!-- One place for "get it running" (Nick, 29.10.2026): game files, first start and updating live here only.
The launcher page (guide.md) and the FAQ link here instead of repeating it. -->

> **You need your own dump of Bloodborne** (CUSA03173, Game of the Year edition) with the 1.09 update. No game files are included or shared, and we do not help find them.

## System requirements

| | Minimum (720p–1080p, about 30 FPS) | Recommended (1440p, 60–120 FPS) |
|---|---|---|
| OS | Windows 10 or 11, 64-bit | Windows 11, 64-bit |
| CPU | Intel Core i3-10100 or AMD Ryzen 3 3100 | AMD Ryzen 7 5700X or Intel Core i7-12700 |
| RAM | 16 GB | 32 GB |
| GPU | 4 GB of video memory with Vulkan 1.3 (GTX 1050 Ti, GTX 1650, RX 570, RX 6500 XT) | 8 GB of video memory or more (RTX 3060 Ti, RTX 4060, RX 6700 XT, RX 7600) |
| Storage | About 35 GB for your game dump plus 1 GB for the port; an SSD is recommended | SSD |

**For 4K or frame generation:** 12–16 GB of video memory (RTX 4070, RTX 5070, RX 7800 XT, RX 9070). Which settings fit your card, 4 GB cards included: [best settings](../best-settings/#by-card).

### Hard limits

- The CPU needs AVX, BMI1, MOVBE and LZCNT, which means Intel 4th gen (Haswell) or newer, or any Ryzen.
- Intel 2nd/3rd gen run in compatibility mode, so expect bugs.
- CPUs without AVX (many Pentium/Celeron models) can't run it at all.

### Driver notes

- **DLSS** needs a GeForce RTX 20 series or newer. **DLSS Frame Generation** needs RTX 40 (2×) or RTX 50 (up to 4×). **FSR 3.1** frame generation works on any card and works best from about 60 base FPS.
- **FSR 4** is slow below Radeon RX 7000/9000; use FSR 3.1 there.
- **AMD driver 26.8.1:** if an RX 6000/9000 crashes or shows broken graphics, clear the shader cache (Help → Clear the shader cache), or try another driver.
- **Intel graphics:** keep the upscaler off, stretched polygons can still appear with it on.
- **Overlays:** if the game won't start or keeps crashing, close MSI Afterburner, RTSS and other overlays.

*Rough guide, not a guarantee.*

<div data-hwcheck></div>

## Installation

**What you need:** a PC that meets the requirements, and your own dump of Bloodborne (CUSA03173, Game of the Year edition) with the 1.09 update. A dump means the game files copied from your own PS4 disc or account.

### Step 1: prepare your game folder (once)

1. Unpack the base game and the 1.09 update into two new, empty folders, for example with ShadPs4Plus PKG Extractor 1.1.
2. Copy everything from the update folder into the base game folder and choose "Replace the files in the destination".
3. Check the result. The folder now has `eboot.bin`, `sce_module`, `sce_sys` and `dvdroot_ps4` (about 29 GB in about 28,800 files) directly inside. The Old Hunters DLC is already part of the GOTY edition.

The clean 1.09 `eboot.bin` is **exactly 93,825,704 bytes** (right-click it, then Properties). Don't use one with a 60 FPS patch built in, like Lance McDonald's: the port brings its own 60 FPS. With a changed file it only applies the patches that still fit, so the FPS and effect options may do nothing, and it can crash at the gestures menu or the cutscene after Rom.

### Step 2: unpack the port

1. [Download `Bloodborne-Windows.zip`](#latest-download), the newest version straight from Supermedo's [official release on GitHub](https://github.com/Supermedo/bloodborne_pc/releases/latest).
2. Right-click it, choose Extract All, and pick a plain folder like `C:\Games\BBPort`. Avoid OneDrive or other synced folders, and avoid Program Files.

### Step 3: first start

1. Double-click `Bloodborne.exe`. If Windows says "Windows protected your PC", click More info, then Run anyway.
2. The first time, a short guide picks your game folder from step 1 and the settings for your PC.
3. The **Play** page checks the game version, your saves, the graphics card and the FSR 4 files.
4. Press **PLAY**. The first minutes can stutter while the shader cache is built, which is normal.

Every screen of the setup with pictures, and which settings fit your graphics card: [best settings](../best-settings/). You can change the game folder later on **Game files** (expert view).

### After that

- `Play Bloodborne.exe` starts the game straight away with your settings, without opening the launcher.
- In the game, Insert (keyboard) or L3 + R3 (controller) opens the port's menu.
- What the launcher's pages do, saves, Steam and mods: [launcher](../guide/). Playing with others: [online](../server/#play).

## Updating

- When a new version is out, the launcher shows it at the **bottom left**. **Update** downloads and installs it and opens the launcher again. Saves, settings and mods are kept.
- **Advanced → Check for updates** checks by hand. **Advanced → Other versions** goes back to any version from 1.8.2 on.
- What changed in each version: [changelog](../changelog/).

### Updating by hand (1.9.3)

On 1.9.3 the update button never appears, and the sign-in to The Hunter's Dream hangs. Update by hand, **over your old port folder**:

1. Close the game and the launcher, including its tray icon at the bottom right. Windows won't replace `Bloodborne.exe` while it runs.
2. [Download the newest version](#latest-download). The zip holds one folder, `bbport-windows`.
3. Copy what is **inside** that folder (`Bloodborne.exe`, `_internal`, `bin`, `scripts`, `run.py` …) into your port folder and replace the files. Copying the folder itself only makes a nested `bbport-windows` folder.

Your saves, graphics settings, key bindings and mods stay: the zip has no `user` folder, no `bbport.ini`, `input.ini` or `mods` folder, and the launcher settings in `%APPDATA%` aren't touched. Don't start a new folder for this: it would begin with default graphics, which froze Intel Arc and is slow on small cards, while the launcher keeps pointing to the old folder's saves and mods.

## Something went wrong?

Open **Help** in the launcher first: it checks your game folder and PC and lists the known problems with their fixes. Everything else is in the [FAQ](../faq/), from code 3 at start to crashes and stutter.

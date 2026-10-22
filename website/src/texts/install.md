---
title: Install Guide & System Requirements
description: How to install Bloodborne for Windows step by step, plus minimum and recommended system requirements, CPU limits and driver notes.
heading: Install guide
intro: Everything you need to get Bloodborne running on Windows – from system requirements to the first launch.
---

> **You need your own dump of Bloodborne** (CUSA03173, Game of the Year edition) with the 1.09 update. No game files are included or shared, and we do not help find them.

## System requirements

| | Minimum (720p–1080p, about 30 FPS) | Recommended (1440p, 60–120 FPS) |
|---|---|---|
| OS | Windows 10 or 11, 64-bit | Windows 11, 64-bit |
| CPU | Intel Core i3-10100 or AMD Ryzen 3 3100 | AMD Ryzen 7 5700X or Intel Core i7-12700 |
| RAM | 16 GB | 32 GB |
| GPU | 4 GB of video memory with Vulkan 1.3 (GTX 1050 Ti, GTX 1650, RX 570, RX 6500 XT) | 8 GB of video memory or more (RTX 3060 Ti, RTX 4060, RX 6700 XT, RX 7600) |
| Storage | About 35 GB for your game dump plus 1 GB for the port; an SSD is recommended | SSD |

**For 4K or frame generation:** 12–16 GB of video memory (RTX 4070, RTX 5070, RX 7800 XT, RX 9070).

### Hard limits

- The CPU needs AVX, BMI1, MOVBE and LZCNT, which means Intel 4th gen (Haswell) or newer, or any Ryzen.
- Intel 2nd/3rd gen run in compatibility mode, so expect bugs.
- CPUs without AVX (many Pentium/Celeron models) can't run it at all.

### Settings for 4 GB cards

720p/1080p, FSR 3.1 Performance, Model detail Default, Object motion vectors off, frame generation off, a 60 FPS cap, and the page file on "System managed".

### Driver notes

- **DLSS** needs a GeForce RTX 20 series or newer. **DLSS Frame Generation** needs RTX 40 (2×) or RTX 50 (up to 4×). **FSR 3.1** frame generation works on any card and works best from about 60 base FPS.
- **FSR 4** is slow below Radeon RX 7000/9000; use FSR 3.1 there.
- **AMD driver 26.8.1:** if an RX 6000/9000 crashes or shows broken graphics, clear the shader cache (Advanced), or try another driver.
- **Intel graphics** get no upscaler, and FSR 4 freezes on Intel Arc.
- **Overlays:** if the game won't start or keeps crashing, close MSI Afterburner, RTSS and other overlays.

*Rough guide, not a guarantee.*

<div data-hwcheck></div>

## Installation

**What you need:** a PC that meets the requirements, and your own dump of Bloodborne (CUSA03173, Game of the Year edition) with the 1.09 update. A dump means the game files copied from your own PS4 disc or account. No game files are included or shared.

### Step 1: prepare your game folder (once)

1. Unpack the base game and the 1.09 update into two new, empty folders, for example with ShadPs4Plus PKG Extractor 1.1.
2. Copy everything from the update folder into the base game folder and choose "Replace the files in the destination".
3. Check the result. The folder now has `eboot.bin` (exactly 93,825,704 bytes), `sce_module`, `sce_sys` and `dvdroot_ps4` (about 29 GB) directly inside. The Old Hunters DLC is already part of the GOTY edition.

### Step 2: unpack the port

1. [Download `Bloodborne-Windows.zip`](#latest-download), the newest version straight from Supermedo's [official release on GitHub](https://github.com/Supermedo/bloodborne_pc/releases/latest).
2. Right-click it, choose Extract All, and pick a plain folder like `C:\Games\BBPort`. Avoid OneDrive or other synced folders, and avoid Program Files.

### Step 3: first start

1. Double-click `Bloodborne.exe`. If Windows says "Windows protected your PC", click More info, then Run anyway.
2. The first time, a short guide picks your game folder from step 1 and the settings for your PC.
3. The Play page checks the game version, your saves and the graphics card.
4. Press PLAY. The first minutes can stutter while the shader cache is built, which is normal.

### After that

- `Play Bloodborne.exe` starts the game straight away with your settings.
- In the game, Insert (keyboard) or L3 + R3 (controller) opens the port's menu.
- The FPS, resolution and effect patches are already included. The [launcher guide](../guide/) shows where to set them, and how online play, saves and mods work.

## Updating

New versions show up at the bottom left of the launcher. Update keeps your saves, settings and mods. Under Advanced > Other versions you can also go back to any version from 1.8.2 on. On 1.9.3 the update button never appears: [update by hand](../guide/#updating-by-hand-193), over your old port folder. See the [changelog](../changelog/) for what changed.

## Something went wrong?

1. Open **Help** in the launcher. It checks your game folder and PC and lists the known problems with their fixes.
2. Check the [FAQ](../faq/) – it covers the most common problems, from code 3 at start to crashes and stutter.
3. Still stuck? Press Help > Save a report and ask the [community](../community/) with its zip. It shows our helpers your PC, settings and the log.

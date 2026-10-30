---
title: Changelog
description: Release notes for bbport (Bloodborne for Windows) – new features, fixes and known issues of every version, with direct downloads.
heading: Changelog
intro: What changed in each release. The newest version is at the top.
---

<!-- Version, date, download and the list of all releases come automatically from GitHub (box at the top,
list at the bottom). Only add the short summary in plain words here, newest versions on top. Template:

## 1.9.4 – 21 October 2026

- **In short, what's new:** one sentence about it.

-->

<div data-release-latest></div>

## 1.9.7 – 30 October 2026

- **Safe updates:** the launcher puts a new version in place in one step and undoes it when Windows holds a file, so an update can no longer leave a launcher that doesn't start. If yours stopped starting after the last update ("Failed to start embedded python interpreter"), unpack this version over your folder and replace all files: your saves stay.
- **Online:** Restart Game in PC Settings keeps you online. The Hunter's Dream is no longer offered: its players move to SuperMedo Server and sign in there once.
- **Checks before you play:** a graphics card Vulkan doesn't see, the game folder in OneDrive, an old driver, a missing runtime for AMD's FSR 4, a firewall block; a changed `eboot.bin` is swapped for a clean copy found on your PC.
- **Graphics and saves:** no sharpening on top of FSR 4, a new graphics card gets its own upscaler, the frame rate you chose stays, and saves and settings are written in one piece.
- **Installing:** the launcher offers the update by itself, or unpack it over 1.9.6. Settings and saves stay.

## 1.9.6 – 29 October 2026

- **Online fix:** "Failed to connect to Bloodborne server. Returning to title menu." at Play Online no longer appears on PCs where Windows hadn't downloaded the newest root certificates yet. The port now carries them itself, for SuperMedo Server and The Hunter's Dream.
- **Installing:** the launcher offers the update by itself, or unpack it over 1.9.5. Settings, saves and the shader cache stay, so there's no shader rebuild this time.

## 1.9.5 – 28 October 2026

- **Our own online server:** SuperMedo Server is the default. Sign in with Discord or make a free account on the launcher's Online page. The Hunter's Dream is the other choice; shadNet and your own servers can't be chosen any more. Friends on the same Wi-Fi play together over their home network. [Step by step](../server/#play).
- **The most common random crash is fixed** (`ucrtbase.dll`, often after about an hour in busy fights), and error code 21 no longer stops the game.
- **PC Settings in the game's own menu.**
- **Smooth at any frame rate:** capes, coats, plants and jumps behave as on the PS4, Ebrietas without frame drops, and new low-latency options.
- **Installing:** unpack into a new, empty folder or over 1.9.4. The first start rebuilds the shader cache, so it may stutter for the first minutes.
- **Known problem:** the "device lost" crash some NVIDIA players see in fights isn't fixed yet. If you hit it, send a report (launcher: Help → Save a report).

## 1.9.4 – 21 October 2026

- **Online fix:** "Failed to acquire Bloodborne server information" no longer appears when your antivirus scans HTTPS connections (Avast, AVG, Kaspersky and others) or Windows had not fetched the server's root certificate yet.
- **Updates work again:** the launcher offers new versions again. On 1.9.3 its launcher can't update itself, so update by hand once.
- **Better settings for laptops:** the hardware check knows laptop processors, and fast PCs no longer get a 30 FPS cap from the automatic settings.
- **Measure on this PC is off for now:** it comes back later. System & tests is now Your PC, and Advanced has a new benchmark for bug reports.

## 1.9.3 – 21 October 2026

- **New launcher:** a first-start setup guide, the goals Smooth, Balanced and Quiet, automatic save backups and a Gameplay page.
- **Graphics back to 1.8.2's code:** fixes stretched polygons and black screens.
- **Less video memory:** and a Low-VRAM profile for 4 GB cards.
- **Known problem:** this version can't update itself and its sign-in to The Hunter's Dream hangs. [Update by hand](../install/#updating-by-hand-193) to 1.9.4 once.

## 1.9.2 – 18 October 2026

- **Frame generation memory leak fixed:** with FSR 3.1 frame generation on, video memory no longer grows until the game crashes.
- **4 GB graphics cards:** big areas and returning to the Hunter's Dream no longer crash with "ErrorOutOfDeviceMemory". You may see a short stutter instead.
- **Stretched polygons ("vertex explosion"):** the remaining cases on NVIDIA and Intel are fixed. The shader cache rebuilds once after updating.
- **New, Advanced > Other versions:** install any version from 1.8.2 to the newest. Saves, settings and mods are kept.

## Earlier releases

- **1.9.1 (17 October 2026):** hotfix for stretched polygons and the FPS drop after dying or loading.
- **1.9 (16 October 2026):** frame generation (FSR 3.1 / DLSS), memory fixes for 4–8 GB cards.

<div data-release-list></div>

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

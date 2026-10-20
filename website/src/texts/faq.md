---
title: FAQ – Frequently Asked Questions
description: Answers to the most common questions about Bloodborne for Windows – game version, code 3, crashes, stutter, co-op, controllers and more.
heading: Frequently asked questions
intro: Quick answers to the questions we get most often. Missing something? Ask in the forum or on Discord.
# Fragen und Antworten, sortiert nach Häufigkeit in #help. Antworten sind HTML (<p>, <ol>, <code>, Links).
questions:
  - q: Do I need to own the game? Which version?
    a: |
      <p>Yes, you need your own dump of Bloodborne (CUSA03173) with the 1.09 update. No game files are included, and we don't share them or help find them.</p>
      <p>The port's FPS, resolution and effect patches need the unmodified 1.09 <code>eboot.bin</code>. Other versions run at 30 FPS, and pre-patched files ("60 fps" eboots, repacks) make the port skip its patches, break co-op and can crash the game.</p>
  - q: Where can I download the port?
    a: |
      <p>Right here: <a href="#latest-download">download Bloodborne-Windows.zip</a>. The button fetches the file straight from Supermedo's <a href="https://github.com/Supermedo/bloodborne_pc/releases/latest" rel="noopener">official release on GitHub</a>, so both are the same file. Don't take it from anywhere else. Older versions and all release notes are in the <a href="../changelog/">changelog</a>, and the <a href="../install/">install guide</a> walks you through the rest.</p>
  - q: The game closes right after I press PLAY (code 3).
    a: |
      <p>Usually Windows gives the port too little memory. Press Win + R, type <code>sysdm.cpl</code>, then go to Advanced &gt; Performance Settings &gt; Advanced &gt; Virtual memory &gt; Change. Tick "Automatically manage paging file size for all drives", then restart the PC.</p>
  - q: The game crashes while I play.
    a: |
      <ol>
        <li>Update to the newest version in the launcher. 1.9.2 fixed several crashes on 4–8 GB cards and with frame generation.</li>
        <li>Set Advanced &gt; Two-stage GPU pipeline to "Off (more stable)".</li>
        <li>Close MSI Afterburner, RTSS and other overlays.</li>
        <li>Update your graphics driver.</li>
      </ol>
      <p>On cards with little video memory, use a lower resolution, FSR 3.1 Performance and a 60 FPS cap.</p>
  - q: It stutters or the FPS is low.
    a: |
      <p>In the first minutes after installing or updating, the port builds its shader cache, so stutter is normal there.</p>
      <p>Later, stutter and late textures usually mean the video memory is full. Lower the resolution, use FSR Performance and a 60 FPS cap, and close other programs that use the GPU. Frame generation works best from about 60 base FPS.</p>
  - q: Stretched polygons, flickering or a black screen.
    a: |
      <p>Update to 1.9.2, which fixed the remaining stretched polygons on NVIDIA and Intel, then use Advanced &gt; Clear shader cache. On Intel graphics, turn the upscaler off if polygons still stretch.</p>
  - q: Can I play online and co-op?
    a: |
      <p>Yes (beta). In the launcher, go to Online co-op, tick Play online, choose The Hunter's Dream and sign in with Discord. Everyone needs game version 1.09 and the same co-op pool.</p>
  - q: Does my controller work?
    a: |
      <p>Yes. Controllers, keyboard and mouse all work, even at the same time, and you can remap everything on the Controls page. On Xbox pads, Back + d-pad left/right clicks the left/right touchpad half (gestures/key items).</p>
  - q: Does it support ultrawide?
    a: |
      <p>Yes. On screens wider than 16:9 (like 3440×1440) the port widens the camera, HUD and menus. A true 16:10 mode isn't there yet.</p>
  - q: Windows or my antivirus warns me about the port.
    a: |
      <p>The port is new, so Windows SmartScreen doesn't know it yet. Download it only <a href="#latest-download">here</a> or from the <a href="https://github.com/Supermedo/bloodborne_pc/releases/latest" rel="noopener">official release page</a>, then click More info, then Run anyway. If your antivirus blocks files in the port folder, add the folder as an exclusion.</p>
  - q: Will updates delete my saves?
    a: |
      <p>No. Updating from the launcher keeps saves, settings and mods. Under Advanced &gt; Other versions you can also go back to any version from 1.8.2 on.</p>
  - q: Is this an official Sony or FromSoftware product?
    a: |
      <p>No. Bloodborne for Windows is a free, open-source project by Supermedo, and this site is run by its community. Neither is affiliated with or endorsed by Sony Interactive Entertainment or FromSoftware.</p>
  - q: I'm still stuck. Where do I get help?
    a: |
      <p>Run the BB Report Tool (pinned in #help on our <a href="https://discord.gg/yTMG8c4Bqm" rel="noopener">Discord</a>) and post its zip in a new #help post or in the forum's Help &amp; Support section. It shows our helpers your PC, settings and the log.</p>
---

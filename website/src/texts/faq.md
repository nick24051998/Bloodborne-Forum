---
title: FAQ – Frequently Asked Questions
description: Answers to the most common questions about bbport, the Bloodborne PC port for Windows – game files, code 3, crashes, online co-op, mods and more.
heading: Frequently asked questions
intro: Quick answers to the questions we get most often, sorted by topic. Search below or jump to a topic. How the launcher works, page by page, is in the launcher guide.
# Questions and answers, by group, and within a group by how often they come up in #help.
# Answers are HTML (<p>, <ol>, <code>, links).
# id = fixed anchor for links (bbport.de/faq/#code-3): do not change it, links in Discord point to it.
# Groups of the FAQ page: id (anchor #topic-<id>), heading, one sentence; each question names its group.
groups:
  - id: start
    title: Getting started
    text: What you need and where to get it.
  - id: updates
    title: Install & updates
    text: Updating, Steam and Windows warnings.
  - id: crashes
    title: Crashes & errors
    text: The game closes, crashes or shows a black screen.
  - id: performance
    title: Performance & display
    text: Stutter, low FPS and wide screens.
  - id: online
    title: Online & co-op
    text: Playing with others and connection problems.
  - id: play
    title: Controls, saves & mods
    text: Controllers, your characters and mods.
  - id: about
    title: About bbport
    text: Who makes it and which sites are ours.
  - id: help
    title: Still stuck?
    text: Where to get help from a person.
questions:
  - id: game-files
    group: start
    q: Do I need to own the game? Which version?
    a: |
      <p>Yes, you need your own dump of Bloodborne (CUSA03173) with the 1.09 update. No game files are included, and we don't share them or help find them.</p>
      <p>The port's FPS, resolution and effect patches need the unmodified 1.09 <code>eboot.bin</code>, copied over the base game. The clean file is exactly 93,825,704 bytes. Other versions run at 30 FPS, and pre-patched files ("60 fps" eboots like Lance McDonald's, repacks) make the port skip its patches, break co-op and can crash the game.</p>
  - id: download
    group: start
    q: Where can I download the port?
    a: |
      <p>Right here: <a href="#latest-download">download Bloodborne-Windows.zip</a>. The button fetches the file straight from Supermedo's <a href="https://github.com/Supermedo/bloodborne_pc/releases/latest" rel="noopener">official release on GitHub</a>, so both are the same file. Don't take it from anywhere else. Older versions and all release notes are in the <a href="../changelog/">changelog</a>, and the <a href="../install/">install guide</a> walks you through the rest.</p>
  - id: patches
    group: start
    q: Are the FPS and resolution patches included, or do I download them?
    a: |
      <p>They are included. The port brings the community patches for 1.09: 30/60/90 FPS or unlocked, any output resolution, effects on/off, Quit to Desktop, Rebirth at the Doll, the HUD position, cheats and gameplay tweaks. You set them in the launcher on Picture &amp; performance, and in expert view on All graphics and Cheats. shadPS4/GoldHEN XML patches are optional and not needed. More in the <a href="../guide/">launcher guide</a>.</p>
  - id: update-1-9-3
    group: updates
    q: The launcher doesn't offer the update (1.9.3).
    a: |
      <p>On 1.9.3 the update button never appears, and the sign-in to The Hunter's Dream hangs. Update by hand, over your old port folder:</p>
      <ol>
        <li>Close the game and the launcher, including its tray icon at the bottom right.</li>
        <li><a href="#latest-download">Download the newest version</a>. The zip holds one folder, <code>bbport-windows</code>.</li>
        <li>Copy what is inside that folder (<code>Bloodborne.exe</code>, <code>_internal</code>, <code>bin</code> …) into your port folder and replace the files.</li>
      </ol>
      <p>Saves, graphics settings, key bindings and mods stay. Don't use a new folder for this. From then on, updates show up at the bottom left of the launcher again. Details in the <a href="../guide/#updating-by-hand-193">launcher guide</a>.</p>
  - id: updates-and-saves
    group: updates
    q: Will updates delete my saves?
    a: |
      <p>No. Updating from the launcher keeps saves, settings and mods, and the launcher backs up your saves before every start (Saves page &gt; Backups). Under Advanced &gt; Other versions you can also go back to any version from 1.8.2 on.</p>
  - id: antivirus
    group: updates
    q: Windows or my antivirus warns me about the port.
    a: |
      <p>The port is new, so Windows SmartScreen doesn't know it yet. Download it only <a href="#latest-download">here</a> or from the <a href="https://github.com/Supermedo/bloodborne_pc/releases/latest" rel="noopener">official release page</a>, then click More info, then Run anyway. If your antivirus blocks files in the port folder, add the folder as an exclusion.</p>
  - id: steam
    group: updates
    q: Can I start it from Steam?
    a: |
      <p>Yes: "Add to Steam" on the launcher's Launcher customization page, or add <code>Play Bloodborne.exe</code> yourself. Both start the game directly. If an AMD card crashes when you start from Steam, turn off Steam &gt; Settings &gt; Downloads &gt; Shader Pre-Caching.</p>
  - id: code-3
    group: crashes
    q: The game closes right after I press PLAY (code 3).
    a: |
      <p>Usually Windows gives the port too little memory: it reserves about 6 GB at its start (10 GB at 1440p and 4K), from RAM and page file together. Press Win + R, type <code>sysdm.cpl</code>, then go to Advanced &gt; Performance Settings &gt; Advanced &gt; Virtual memory &gt; Change. Tick "Automatically manage paging file size for all drives", then restart the PC. Close browsers and other big programs before you press PLAY.</p>
  - id: crashes
    group: crashes
    q: The game crashes while I play.
    a: |
      <ol>
        <li>Update to the newest version in the launcher. 1.9.2 fixed several crashes on 4–8 GB cards and with frame generation.</li>
        <li>Set Advanced &gt; Two-stage GPU pipeline to "Off (more stable)".</li>
        <li>Close MSI Afterburner, RTSS and other overlays.</li>
        <li>Update your graphics driver.</li>
        <li>Open Help in the launcher: after a game that ended with an error, it names the cause from the log.</li>
      </ol>
      <p>On cards with little video memory, use a lower resolution, FSR 3.1 Performance and a 60 FPS cap.</p>
  - id: black-screen
    group: crashes
    q: Stretched polygons, flickering or a black screen.
    a: |
      <p>A black screen, often after a driver update: in the launcher, Help &gt; Only a black screen &gt; Clear the shader cache, then start again. Stretched polygons: update to the newest version and clear the shader cache. Intel graphics get no upscaler, and FSR 4 freezes on Intel Arc.</p>
  - id: stutter
    group: performance
    q: It stutters or the FPS is low.
    a: |
      <p>In the first minutes after installing or updating, the port builds its shader cache, so stutter is normal there.</p>
      <p>Later, stutter and late textures usually mean the video memory is full. Lower the resolution, use FSR Performance and a 60 FPS cap, and close other programs that use the GPU. Frame generation works best from about 60 base FPS.</p>
      <p>Settings for your graphics card, and the goals Smooth, Balanced and Quiet: <a href="../best-settings/">best settings</a>.</p>
  - id: ultrawide
    group: performance
    q: Does it support ultrawide?
    a: |
      <p>Yes. On screens wider than 16:9 (like 3440×1440) the port widens the camera, HUD and menus. A true 16:10 mode isn't there yet.</p>
  - id: online
    group: online
    q: Can I play online and co-op?
    a: |
      <p>Yes (beta). In the launcher, open Online play, tick Play online, choose The Hunter's Dream (co-op together with bbhost players) and sign in with Discord once. Everyone needs game version 1.09 and the same co-op pool. shadNet servers are the other choice.</p>
  - id: online-connection
    group: online
    q: Online doesn't connect.
    a: |
      <ul>
        <li>Your firewall or router must let the game server port 20443 through.</li>
        <li>The "Seamless co-op" tool overwrites a hidden server address. On 1.9.4: Online play &gt; shadNet server &gt; Use my own servers &gt; empty the Game server field &gt; switch back to The Hunter's Dream. 1.9.5 fixes this for good.</li>
        <li>Your own shadNet servers: the public server's WebAPI is <code>http://srv.shadps4.net:31315</code> (plain http). An <code>https://</code> address fails with "SSL: UNEXPECTED_EOF_WHILE_READING".</li>
      </ul>
      <p>Details in the <a href="../guide/#online-play">launcher guide</a>.</p>
  - id: controller
    group: play
    q: Does my controller work?
    a: |
      <p>Yes. Controllers, keyboard and mouse all work, even at the same time, and you can remap everything on the Controls page. On Xbox pads, Back + d-pad left/right clicks the left/right touchpad half (gestures/key items).</p>
  - id: transfer-saves
    group: play
    q: Can I bring my character from another version?
    a: |
      <p>Yes: Saves &gt; From other versions. Your saves are in the <code>user</code> folder next to <code>Bloodborne.exe</code>. If they are in a cloud folder like OneDrive, play on one PC at a time.</p>
  - id: mods
    group: play
    q: How do I install mods?
    a: |
      <p>Put each mod in its own folder under <code>mods</code>, then switch it on and put it in order on Mods &amp; patches (drag and drop). Your game files are never changed. Rebirth, the HUD layout and the field of view are built into the port, not mods.</p>
      <p>Which mods work with the port: see the <a href="https://forum.bbport.de/t/mods-patches?tab=works">tested mods</a> in our forum, each with the port version and date of its test.</p>
  - id: official
    group: about
    q: Is this an official Sony or FromSoftware product?
    a: |
      <p>No. Bloodborne for Windows is a free, open-source project by Supermedo, and this site is run by its community. Neither is affiliated with or endorsed by Sony Interactive Entertainment or FromSoftware.</p>
  - id: bbport-org
    group: about
    q: Is bbport.org your site?
    a: |
      <p>No. bbport.de is the community site of Bloodborne for Windows (bbport) by Supermedo, together with our forum and Discord. bbport.org is not run by us: it offers its own download (a "v0.6.2" build) and links to a different GitHub repository. Get the port only <a href="#latest-download">here</a> or from Supermedo's <a href="https://github.com/Supermedo/bloodborne_pc/releases/latest" rel="noopener">official release page</a>.</p>
  - id: help
    group: help
    q: I'm still stuck. Where do I get help?
    a: |
      <p>Open Help in the launcher first: it checks your game folder and PC and lists the known problems with their fixes. Then press Help &gt; Save a report and post the zip in a new topic in <a href="https://forum.bbport.de/t/help-support">Help &amp; Support</a> on our forum (log in with Discord). It shows our helpers your PC, settings and the log.</p>
---

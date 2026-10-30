---
title: FAQ – Frequently Asked Questions
description: Answers to the most common questions about bbport, the Bloodborne PC port for Windows – game files, code 3, crashes, online co-op, mods and more.
heading: Frequently asked questions
intro: Quick answers to the questions we get most often, sorted by topic. Search below or jump to a topic. How the launcher works, page by page, is on the launcher page.
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
      <p>The port's FPS, resolution and effect patches need the unmodified 1.09 <code>eboot.bin</code>, copied over the base game. The clean file is exactly 93,825,704 bytes. Other versions run at 30 FPS. With pre-patched files ("60 fps" eboots like Lance McDonald's, repacks) the port only applies the patches that still fit, so its FPS and effect options may do nothing, co-op can break and the game can crash.</p>
  - id: download
    group: start
    q: Where can I download the port?
    a: |
      <p>Right here: <a href="#latest-download">download Bloodborne-Windows.zip</a>. The button fetches the file straight from Supermedo's <a href="https://github.com/Supermedo/bloodborne_pc/releases/latest" rel="noopener">official release on GitHub</a>, so both are the same file. Don't take it from anywhere else. Older versions and all release notes are in the <a href="../changelog/">changelog</a>, and the <a href="../install/">install guide</a> walks you through the rest.</p>
  - id: handhelds
    group: start
    q: Does it run on Steam Deck, ROG Ally or Linux?
    a: |
      <p>The port is made and tested for Windows 10 and 11. Windows handhelds like the ROG Ally or Legion Go count as Windows PCs: the setup's check tells you how well yours runs it.</p>
      <p>On the Steam Deck and on Linux, players run it through Proton; the team doesn't test that. On the Deck, choose FSR 3.1 instead of FSR 4 in the launcher (FSR 4 is made for Radeon RX 7000 and 9000 and costs a lot of frames there); one player reports about 30 FPS in Game Mode. Settings that worked for others: the <a href="https://forum.bbport.de/d/255">Steam Deck topic</a> in our forum.</p>
  - id: patches
    group: start
    q: Are the FPS and resolution patches included, or do I download them?
    a: |
      <p>They are included. The port brings the community patches for 1.09: 30/60/90 FPS or unlocked, any output resolution, effects on/off, Quit to Desktop, Rebirth at the Doll, the HUD position, cheats and gameplay tweaks. You set them in the launcher: frame rate, resolution and effects on Picture &amp; performance (expert view: All graphics), Quit to Desktop, Rebirth and the other gameplay tweaks on Gameplay, and cheats on Cheats. shadPS4/GoldHEN XML patches are optional and not needed. More in the <a href="../guide/">launcher guide</a>.</p>
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
      <p>Saves, graphics settings, key bindings and mods stay. Don't use a new folder for this. From then on, updates show up at the bottom left of the launcher again. Details in the <a href="../install/#updating-by-hand-193">install guide</a>.</p>
  - id: updates-and-saves
    group: updates
    q: Will updates delete my saves?
    a: |
      <p>No. Updating from the launcher keeps saves, settings and mods, and the launcher backs up your saves before every start (Saves page &gt; Backups). Under Advanced &gt; Other versions you can also go back to any version from 1.8.2 on.</p>
  - id: antivirus
    group: updates
    q: Windows or my antivirus warns me about the port.
    a: |
      <p>"Windows protected your PC": the port is new, so Windows SmartScreen doesn't know it yet. Click More info, then Run anyway. Download it only <a href="#latest-download">here</a> or from the <a href="https://github.com/Supermedo/bloodborne_pc/releases/latest" rel="noopener">official release page</a>; the <a href="../changelog/">changelog</a> has the SHA-256 to check the file.</p>
      <p>An antivirus blocks or removes files in the port folder (the log says WinError 5, WinError 32 or PermissionError): Start menu &gt; Windows Security &gt; Virus &amp; threat protection &gt; Manage settings &gt; Exclusions &gt; Add or remove exclusions &gt; Add an exclusion &gt; Folder, and choose the port folder (the one with <code>Bloodborne.exe</code>). Other antivirus programs (Avast, Norton …) have their own exceptions. A file it already removed: Windows Security &gt; Protection history &gt; the entry &gt; Restore, or unpack the port again.</p>
      <p>"bb-probe.exe – Bad Image" with 0xc0e90002: Windows' Smart App Control blocks the port's unsigned files, and it can't make an exception for one program. The only way: Windows Security &gt; App &amp; browser control &gt; Smart App Control settings &gt; Off. On many Windows 11 versions it can then only be turned on again by resetting Windows; Microsoft Defender keeps working.</p>
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
  - id: error-codes
    group: crashes
    q: What does an error code or message mean (code 1, 3, 21, 23 …)?
    a: |
      <p>After a failed start or a crash, open Help in the launcher: it reads the log and names the cause. The common codes and messages:</p>
      <ul>
        <li><strong>Code 1</strong>, "This eboot.bin has Lance McDonald's 60 fps patch applied": the port refuses pre-patched eboot.bin files on purpose. Use the clean 1.09 file, see <a href="#game-files">game files</a>.</li>
        <li><strong>Code 3</strong> right after PLAY, "cannot create … MiB of guest memory": Windows has too little memory for the start. <a href="#code-3">The fix</a>.</li>
        <li><strong>Code 21</strong>, "STOP: reserving the PS4 address range … error 487": another program sits where the game needs its memory. From 1.9.5 on the game restarts itself and gets past it, so update.</li>
        <li><strong>Code 23</strong> (error 23), "GPU library assertion failed": a crash in the graphics part, often in fights, after a few minutes or an hour. Its cause isn't known yet and there is no sure fix. Update the port and your graphics driver, close overlays like MSI Afterburner and RTSS, and set Advanced &gt; Two-stage GPU pipeline to "Off (more stable)". If it keeps happening, post your report zip in <a href="https://forum.bbport.de/t/help-support">Help &amp; Support</a>: every report helps find the cause.</li>
        <li><strong>"device lost"</strong> (ErrorDeviceLost): the graphics driver stopped. Update the driver and restart the PC, use the card's standard clocks, and close overlays. Some NVIDIA cards still hit it in fights, a known problem that isn't fixed yet: send a report.</li>
        <li><strong>ErrorOutOfDeviceMemory</strong> or "memory pressure": the graphics card's memory is full. Use the goal Quiet or a lower resolution, see <a href="#stutter">stutter</a>.</li>
        <li><strong>PermissionError, WinError 5 or WinError 32</strong>: an antivirus blocks the port's files, see <a href="#antivirus">antivirus</a>.</li>
        <li><strong>"bb-probe.exe – Bad Image", 0xc0e90002</strong>: Windows' Smart App Control blocks the port, see <a href="#antivirus">antivirus</a>.</li>
        <li><strong>"bad patch entry"</strong> and a black screen at the start: files of different versions are mixed. Download the whole package again and unpack all of it over the port folder, or into a new, empty folder.</li>
        <li><strong>"No Vulkan 1.3 graphics card found"</strong>: update the graphics driver. The port needs a card with Vulkan 1.3 and at least 4 GB of video memory.</li>
        <li><strong>"Server rejected this client"</strong> or login error code 5: shadNet doesn't accept the port. Choose SuperMedo Server, see <a href="#online-connection">online</a>.</li>
        <li><strong>"Failed to acquire Bloodborne server information"</strong>: fixed since 1.9.4, so update.</li>
        <li><strong>"Failed to connect to Bloodborne server. Returning to title menu."</strong> at Play Online, with "certificate is not trusted by Windows" or "SSL server verification failed" in the log: fixed in 1.9.6, so update.</li>
      </ul>
  - id: crashes
    group: crashes
    q: The game crashes while I play.
    a: |
      <ol>
        <li>Update to the newest version (the download button shows which one). 1.9.5 fixed the most common random crash, 1.9.2 and 1.9.3 several crashes on 4–8 GB cards and with frame generation. On 1.9.3, <a href="#update-1-9-3">update by hand</a> once.</li>
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
      <p>Yes. In the launcher, open Online play, tick Play online and choose a server: SuperMedo Server, the default since 1.9.5 (sign in with Discord or make a free account), or The Hunter's Dream (sign in with Discord once). Everyone needs game version 1.09 and the same server. Friends on the same Wi-Fi play together over their home network.</p>
  - id: friend
    group: online
    q: How do I play with a friend?
    a: |
      <ol>
        <li>Both of you: the same port version and the same server in Online play (SuperMedo Server is the default since 1.9.5), and signed in.</li>
        <li>Both with the clean 1.09 <code>eboot.bin</code> and cheats off.</li>
        <li>In the game's Network settings: Matching Regions <strong>Worldwide</strong> and the same password.</li>
        <li>The host rings the <strong>Beckoning Bell</strong>: it needs 1 Insight, and the area's boss must still be alive.</li>
        <li>The friend rings the <strong>Small Resonant Bell</strong> in the same area and waits a minute or two.</li>
      </ol>
      <p>Bells greyed out: the area's boss is already dead, there is no Insight, or the spot doesn't allow summons. On the same Wi-Fi it works from 1.9.5 on: the two PCs connect over your home network.</p>
  - id: account
    group: online
    q: How do I get a SuperMedo Server account, or a new password?
    a: |
      <p>With Discord you need none: in the launcher, Online play &gt; SuperMedo Server &gt; Sign in with Discord. Without Discord, <a href="https://game.supermedo.com/account/register" rel="noopener">make a free account</a> and sign in with it in the launcher. Forgot your password: <a href="https://game.supermedo.com/account/forgot" rel="noopener">get a new one by email</a>.</p>
  - id: online-connection
    group: online
    q: Online doesn't connect.
    a: |
      <ul>
        <li>Update to the newest version. From 1.9.5 on the launcher opens your router's port by itself, goes through SuperMedo Server's relay when a router blocks a direct connection, and signs in past expired certificates in Windows.</li>
        <li>"Failed to connect to Bloodborne server. Returning to title menu.": fixed in 1.9.6 for PCs where Windows hadn't downloaded the newest root certificates yet.</li>
        <li>"Failed to acquire Bloodborne server information": fixed since 1.9.4, also on PCs whose antivirus scans HTTPS connections.</li>
        <li>A certificate or date error at sign-in: check your PC's clock.</li>
        <li>shadNet: shadPS4's public shadNet server doesn't accept the port, and from 1.9.5 on your own servers can't be chosen any more. Choose SuperMedo Server.</li>
        <li>Seamless co-op (BBSC): from 1.9.5 on its own start plays its own save, separate from your characters, and normal online works again afterwards.</li>
        <li>The Hunter's Dream: your firewall or router must let its game server port 20443 through.</li>
      </ul>
      <p>Step by step, with both servers: <a href="../server/#play">online</a>.</p>
  - id: controller
    group: play
    q: Does my controller work?
    a: |
      <p>Yes. Controllers, keyboard and mouse all work, even at the same time, and you can remap everything on the Controls page. On Xbox pads, Back + d-pad left/right clicks the left/right touchpad half (gestures/key items). Since 1.9.5 the game's own menu also has PC Settings, so you can change settings with the controller.</p>
  - id: transfer-saves
    group: play
    q: Can I bring my character from another version?
    a: |
      <p>Yes: Saves &gt; From other versions. Your saves are in the <code>user</code> folder next to <code>Bloodborne.exe</code>. If they are in a cloud folder like OneDrive, play on one PC at a time.</p>
  - id: save-lost
    group: play
    q: My character is gone, or the save is broken.
    a: |
      <p>Before every start the launcher backs up your saves, so you can go back to how they were:</p>
      <ol>
        <li>Close the game.</li>
        <li>On the Saves page, under Backups, put back the newest backup from before the problem ("Before playing" with the date of your last good session).</li>
        <li>Only one character is affected: under Your characters, open its earlier states and put back just that one.</li>
      </ol>
      <p>Your current saves are backed up first, so trying an older backup loses nothing. A character from another version without a backup yet: import it again under Saves &gt; From other versions.</p>
  - id: new-pc
    group: play
    q: How do I move my characters to a new PC?
    a: |
      <p>Your saves are in the <code>user</code> folder next to <code>Bloodborne.exe</code>. Copy that folder to the new PC. Put it next to <code>Bloodborne.exe</code> in the new port folder before its first start, or anywhere else and import it in the launcher: Saves &gt; From other versions &gt; Choose a folder.</p>
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
  - id: support
    group: about
    q: How can I support the port?
    a: |
      <p>The port is free and stays free. If you want to thank Supermedo, <a href="https://buymeacoffee.com/supermedo" rel="noopener">support our server</a> with a coffee: his Buy Me a Coffee page. You help just as much when you send a report zip after a crash (launcher: Help &gt; Save a report), post your FPS in <a href="https://forum.bbport.de/t/performance">Performance Reports</a>, or answer other players' questions in <a href="https://forum.bbport.de/t/help-support">Help &amp; Support</a>.</p>
  - id: bbport-org
    group: about
    q: Is bbport.org your site?
    a: |
      <p>No. bbport.de is the community site of Bloodborne for Windows (bbport) by Supermedo, together with our forum and Discord. bbport.org is not run by us: it offers its own download (a "v0.6.2" build) and links to a different GitHub repository. Get the port only <a href="#latest-download">here</a> or from Supermedo's <a href="https://github.com/Supermedo/bloodborne_pc/releases/latest" rel="noopener">official release page</a>.</p>
  - id: help
    group: help
    q: I'm still stuck. Where do I get help?
    a: |
      <ol>
        <li>Open Help in the launcher: it checks your game folder and PC and lists the known problems with their fixes.</li>
        <li>Look up your error or symptom here in the FAQ (<a href="#error-codes">error codes</a>, <a href="#crashes">crashes</a>, <a href="#online-connection">online</a>).</li>
        <li>Check the <a href="https://forum.bbport.de/t/known-fixes">known fixes</a> and the <a href="https://forum.bbport.de/t/bug-reports">known bugs</a> in our forum.</li>
        <li>Still stuck: press Help &gt; Save a report and post the zip in a new topic in <a href="https://forum.bbport.de/t/help-support">Help &amp; Support</a>. It shows our helpers your PC, settings and the log. If the launcher doesn't open, the <a href="../tool/">BB Report Tool</a> makes the zip on its own.</li>
      </ol>
      <p>Reading the forum needs no account. To post, log in with Discord; the forum has no sign-up of its own.</p>
---

Most problems have a quick fix. Please try these before you start a new discussion, and search [Known Fixes](/t/known-fixes): solutions that worked for others, checked by a helper.

- **The game closes right after PLAY (code 3):** Windows gives the port too little memory. Press Win + R, type `sysdm.cpl`, then go to Advanced > Performance Settings > Advanced > Virtual memory > Change, tick "Automatically manage paging file size for all drives" and restart the PC.
- **Crashes while playing:** update to the newest version in the launcher, set Advanced > Two-stage GPU pipeline to "Off (more stable)", close MSI Afterburner, RTSS and other overlays, and update your graphics driver.
- **Stutter or low FPS:** normal for the first minutes after installing or updating (shader cache). Later it usually means the video memory is full: lower the resolution, use FSR Performance and a 60 FPS cap.
- **Stretched polygons, flickering or a black screen:** update to the newest version, then use Advanced > Clear shader cache. On Intel graphics, turn the upscaler off.
- **30 FPS only, patches missing or co-op broken:** the port needs the unmodified 1.09 `eboot.bin`. Pre-patched "60 fps" eboots and repacks break it.

More answers: [FAQ]({{WEBSITE_URL}}/faq/) · requirements and setup: [install guide]({{WEBSITE_URL}}/install/)

### How to ask for help

Start a new discussion in Help & Support, one problem per discussion. The form already asks for everything our helpers need: port version, game version, GPU and driver, CPU/RAM/Windows, what happens, and your **BB Report Tool zip** (pinned in #help on [our Discord]({{DISCORD_INVITE_URL}})).

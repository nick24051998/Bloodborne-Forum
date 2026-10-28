Most problems have a quick fix. Please try these before you start a new discussion, and search [Known Fixes](/t/known-fixes): solutions that worked for others, checked by a helper.

- **The game closes right after PLAY (code 3):** Windows gives the port too little memory. Press Win + R, type `sysdm.cpl`, then go to Advanced > Performance Settings > Advanced > Virtual memory > Change, tick "Automatically manage paging file size for all drives" and restart the PC.
- **Crashes while playing:** update to the newest version (1.9.4; on 1.9.3 [update by hand]({{WEBSITE_URL}}/faq/#update-1-9-3) once), set Advanced > Two-stage GPU pipeline to "Off (more stable)", close MSI Afterburner, RTSS and other overlays, and update your graphics driver.
- **Stutter or low FPS:** normal for the first minutes after installing or updating (shader cache). Later it usually means the video memory is full: lower the resolution, use FSR Performance and a 60 FPS cap.
- **Stretched polygons, flickering or a black screen:** update to the newest version, then use Help > Only a black screen > Clear the shader cache in the launcher. On Intel graphics, turn the upscaler off.
- **30 FPS only, patches missing or co-op broken:** the port needs the unmodified 1.09 `eboot.bin`. With pre-patched "60 fps" eboots and repacks it only applies the patches that still fit, so FPS options can do nothing and co-op can break.

More answers: [FAQ]({{WEBSITE_URL}}/faq/) · requirements and setup: [install guide]({{WEBSITE_URL}}/install/) · settings for your graphics card: [best settings]({{WEBSITE_URL}}/best-settings/)

### How to ask for help

Start a new discussion in Help & Support, one problem per discussion. The form already asks for everything our helpers need: port version, game version, GPU and driver, CPU/RAM/Windows, what happens, and your **report zip** (in the launcher: Help > Save a report).

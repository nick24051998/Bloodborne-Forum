The full guide lives on our website: **[Install guide & system requirements]({{WEBSITE_URL}}/install/)**. Here is the short version.

**You need your own dump of Bloodborne** (CUSA03173, Game of the Year edition) with the 1.09 update. No game files are included or shared, and we don't help find them.

### System requirements

**Minimum** (720p–1080p, about 30 FPS)
- Windows 10 or 11, 64-bit
- Intel Core i3-10100 or AMD Ryzen 3 3100
- 16 GB RAM
- 4 GB of video memory with Vulkan 1.3 (GTX 1050 Ti, GTX 1650, RX 570, RX 6500 XT)
- About 35 GB for your game dump plus 1 GB for the port; an SSD is recommended

**Recommended** (1440p, 60–120 FPS)
- Windows 11, 64-bit
- AMD Ryzen 7 5700X or Intel Core i7-12700
- 32 GB RAM
- 8 GB of video memory or more (RTX 3060 Ti, RTX 4060, RX 6700 XT, RX 7600)
- SSD

**For 4K or frame generation:** 12–16 GB of video memory (RTX 4070, RTX 5070, RX 7800 XT, RX 9070).

**Hard limit:** the CPU needs AVX, BMI1, MOVBE and LZCNT, which means Intel 4th gen (Haswell) or newer, or any Ryzen. CPUs without AVX can't run it at all.

### Install in three steps

1. **Prepare your game folder (once):** unpack the base game and the 1.09 update into two new, empty folders, then copy everything from the update folder into the base game folder and choose "Replace the files in the destination". The folder now has `eboot.bin`, `sce_module`, `sce_sys` and `dvdroot_ps4` directly inside.
2. **Unpack the port:** download `Bloodborne-Windows.zip` from the [official release page](https://github.com/Supermedo/bloodborne_pc/releases/latest) and extract it to a plain folder like `C:\Games\BBPort`. Avoid OneDrive or other synced folders, and avoid Program Files.
3. **First start:** double-click `Bloodborne.exe`. The first time, a short setup guide picks your game folder and the settings for your PC, and the Play page checks the game version (it should say 01.09). Press PLAY. The first minutes can stutter while the shader cache is built, which is normal.

Driver notes, settings for 4 GB cards and the full steps are in the [install guide]({{WEBSITE_URL}}/install/). Something not working? Read the pinned post in Help & Support or the [FAQ]({{WEBSITE_URL}}/faq/).

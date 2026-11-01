# Transplantation Instructions

This directory is already in a "self-contained" version: it does not rely on the LuaRules/Utilities tool layer of Zero-K,
and the directory is not fixed. It can be loaded in any game or at any path location.

## 1. Which files need to be copied?

Copy to the `<game>.sdd/LuaUI/Widgets/` directory of the target game (or the user-writable directory's `LuaUI/Widgets/`, the latter being applicable to all games)

Don't rename `chili_old` to `chili`: The loader recognizes both directory names, but `chili/` in the new ZK version is a separate RTT implementation, so don't confuse them.
The reason for not using the latest version of Chili is because of some of the latest technologies and some issues. Currently, this one seems to be relatively stable and new.

## 2. Requirements for the Target Environment

- Engine: Spring / Recoil 10.x series (the local Recoil 2026.07.04 has been tested and passed).
When GL2/FBO is not available, the framework will automatically follow the old path, which will not affect anything.
- LuaUI: The standard widget system will suffice - `LuaUI/main.lua` + `LuaUI/widgets.lua`
(Original Spring will do; ZK's cawidgets also work).
- There is no need for the target game to have its own `Spring.Utilities`, `Spring.ScaledGetMouseState`, `Spring.Orig`, or `Spring.GetViewSizes`: when these are missing, they will be automatically filled in by `chili_old/Headers/zkcompat.lua` (and will not overwrite existing content).

## 3. When the target game already has its own "chili" element

Judgment method: Check if there is `api_chili.lua` or `chili/` under its `LuaUI/Widgets/` directory.

- If you want to continue using its new version of chili: Just copy `chili_old/`, **do not overwrite** its `api_chili.lua`. Its loader points to `chili/`, so it will not interfere with the stable version you copied over.
- **Want to switch to this stable version of chili**: Replace it with `api_chili.lua` in the same directory as this one,
or set `ZKUseNewChiliRTT` in its configuration to 0.
When both directories (`chili/` and `chili_old/`) exist, the loader will select based on
`ZKUseNewChiliRTT` + GL capabilities. The selected one that doesn't exist will be automatically replaced with another one,
and a line will be printed in the console: `api_chili: Unable to find... Automatically switching to...` `。
- **Games without chili at all** (such as VroomRTS): Just copy the entire file without making any changes.

> Note: The widget names for both `api_chili.lua` are "Chili Framework".
> The widget with the name "widget" can only be active once. Don't keep both versions in the "Widgets" directory.

## 4. How to Self-Check After Transplantation

After entering the game, check the `infolog.txt` file (or start the console)

| Content | Meaning |
|---|---|
| `USE_OLD_CHILI` | Normal, stable version of chili has been activated |
| `Not USE_OLD_CHILI` | The version being used is the new `chili/` (you did not copy `chili_old` or set it to 1) |
| `api_chili: Can't find... Automatically switch to ...` | The directory detection has failed. Checking the directory name / copying location |
| `Removed widget: Chili Framework` | Failed to load. Scroll up to the first `[widgets.lua] Error` entry. |

After the framework is loaded successfully, the widget of chili can be used to display the window normally.
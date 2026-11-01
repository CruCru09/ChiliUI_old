---
title: 移植到其他游戏
short: 移植
desc: 这套 chili_old 已自包含：目录不写死（debug.getinfo 自解析）、不依赖 Zero-K 工具层，缺失的 Spring.* 由 Headers/zkcompat.lua 在加载最开始补齐；把 api_chili.lua 和整个目录拷过去即可
order: 50
id: porting
---

# 移植到其他游戏

这套 `chili_old` 已经是自包含版本：目录不写死（`debug.getinfo` 自解析），也不依赖 Zero-K 的 LuaRules/Utilities 工具层 —— 缺失的 `Spring.Utilities.CopyTable`、`Spring.ScaledGetMouseState`、`Spring.GetViewSizes`、`Spring.Orig` 由 `Headers/zkcompat.lua` 在框架加载最开始补齐（已存在则不覆盖）。

把同级的 `api_chili.lua` 和整个 `chili_old/` 目录一起拷到目标游戏的 `LuaUI/Widgets/` 下即可；目标游戏已有 `chili/` 时的处理、以及启动后如何自检，见 [PORTING.md(移植说明)](PORTING.md)。

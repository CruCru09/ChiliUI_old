---
title: Porting to another game
short: Porting
desc: This chili_old is self-contained - no hardcoded directory (debug.getinfo resolves it), no Zero-K tool-layer dependency, and the missing Spring.* helpers are provided by Headers/zkcompat.lua - so copying api_chili.lua plus the folder is all it takes
order: 50
id: porting
---

# Porting to another game

This `chili_old` is already self-contained: its directory is not hardcoded (`debug.getinfo` resolves it), and it does not depend on Zero-K's LuaRules/Utilities tool layer - the missing `Spring.Utilities.CopyTable`, `Spring.ScaledGetMouseState`, `Spring.GetViewSizes` and `Spring.Orig` are provided by `Headers/zkcompat.lua` at the very start of framework loading (existing values are not overwritten).

Copy the sibling `api_chili.lua` and the whole `chili_old/` directory into the target game's `LuaUI/Widgets/` and you are done. For what happens when the target game already has `chili/`, and how to self-check after launch, see [PORTING.md (porting notes)](PORTING.md).

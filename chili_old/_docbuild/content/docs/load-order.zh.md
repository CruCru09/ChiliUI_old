---
title: 加载顺序（core.lua）
short: 加载顺序
desc: core.lua 用 VFS.Include 依次加载 40 个文件：先 Headers/ 工具与 Handlers/ 资源句柄，再按继承依赖顺序加载 Controls/（父类先于子类）
order: 40
id: loadorder
---

# 加载顺序（core.lua）

框架入口 `core.lua` 按下列顺序 `VFS.Include` 各文件：先加载 `Headers/` 工具与 `Handlers/` 资源句柄，再按继承依赖顺序加载 `Controls/`（父类先于子类）。

[[loadorder]]

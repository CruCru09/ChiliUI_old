---
title: 基本用法
short: 基本用法
desc: Chili 由 api_chili.lua 以 layer 1000 加载，于是有三条硬性约束（别在顶层取类、layer 要大于 1000、顶层控件必须给 parent），外加一个最小可用窗口的完整代码
order: 30
id: usage
---

# 基本用法

Chili 框架由 `LuaUI/Widgets/api_chili.lua` 加载：它把整个类表放进 `WG.Chili`，**不会**创建全局 `Chili`，而且它的 `layer = 1000`。这带来三个必须注意的约束：

1. **别在文件顶层取类**：widget 文件体在加载阶段就执行，此时框架还没 Initialize，`WG.Chili` 是 nil。
2. **layer 要大于 1000**：widget 按 `layer` 升序初始化，`api_chili.lua` 是 1000，自己的窗口 widget 得排在它后面。
3. **顶层控件必须给 parent**：[Object:New](#fn-Object-New) 只有在传了 `parent` 时才把控件挂进父控件；没有 parent 的控件不会挂到 `Screen0`，永远不会被绘制、也不会响应鼠标。

```lua title="最小可用的窗口 widget"
-- api_chili.lua 把 Chili 的类表放进 WG.Chili（不创建全局 Chili），它自己的 layer = 1000
function widget:GetInfo()
  return { name = "Chili Test", layer = 1001, enabled = true } -- 1001 > 1000，保证 chili 先就绪
end

local Chili, win   -- 文件顶层只声明变量，不取类

function widget:Initialize()
  Chili = WG.Chili                          -- 不要用全局 Chili，它不存在
  if not Chili then return end          -- 框架没加载成功时直接放弃，避免 nil 索引

  win = Chili.Window:New{
    parent  = Chili.Screen0,                -- 关键：没有 parent 的控件永远不会被画出来
    caption = "示例窗口",
    x = 100, y = 100, width = 320, height = 180,
    children = {                            -- children 会自动 AddChild，不用重复写 parent
      Chili.Label:New{ caption = "你好，Chili", x = 12, y = 40 },
      Chili.Button:New{
        caption = "点击", x = 12, y = 90, width = 100, height = 26,
        OnClick = { function(self) Spring.Echo("clicked") end },
      },
    },
  }
end
```

> [!note] 构造函数的通用行为由 [Object:New](#fn-Object-New) / [Control:New](#fn-Control-New) 定义：把传入表的字段逐个拷贝到新实例，处理 `children`、`childrenByName`，并触发控件的布局与绘制缓存初始化。想改外观（颜色 / 贴图 / 字体 / 边距）就改该控件在皮肤里的字段，见下方 [皮肤](#skins) 一节。

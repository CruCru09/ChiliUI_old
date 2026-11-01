---
title: 新手起步
short: 新手起步
desc: 装好 chili 之后怎么让屏幕上出现自己写的窗口：复制模板、改 GetInfo、在 Initialize 里建控件的三步流程，三条铁律及它们背后的加载顺序与对象树约束，reload 后怎么生效，以及忘了字段名时该去哪查
order: 10
---

# 新手起步

> [!lead] **装好chili之后，怎么让屏幕上出现一个自己写的窗口？** 复制模板、改 `GetInfo`、在 `Initialize` 里建控件

## 先确认框架真的在跑 {#gs-ready}

chili 不是引擎自带的，它是两个东西：`api_chili.lua`（加载器，`layer = 1000`）和 `chili_old/`（框架本体）。两个必须在同一层目录，少一个框架就完全不加载。

```text title="目标：确认文件放对了地方" hint="LuaUI/Widgets/"
LuaUI/Widgets/
  api_chili.lua             -- 加载器，layer = 1000，只有它会写 WG.Chili
  chili_old/                -- 框架本体：Controls/ Handlers/ Headers/ Skins/ Themes/
  chili_demo_00_template.lua -- 官方模板，复制它当起点
  my_widget.lua             -- 你自己写的 widget，放在同一层
```

启动游戏后自查三件事：

1. Widget 列表里有 `Chili Framework`，并且在勾选状态。
2. `infolog.txt` 里没有跟 chili 相关的 `Error`。
3. 屏幕上没多出任何界面  这是正常的，框架只把类表放进 `WG.Chili`，本身不带界面。

## 写出第一个窗口！ {#gs-steps}

第一步，把 `chili_demo_00_template.lua` 复制成 `my_widget.lua`（仍在同一目录），它就是一份能跑的骨架。第二步，改 `GetInfo`。它有一串字段，真正会踩坑的是 `name` / `layer` / `enabled`：

```lua title="目标：让引擎认得出你的 widget" hint="my_widget.lua"
function widget:GetInfo()
  return {
    name    = "My First Window",  -- 显示在 Widget 列表里，别和其他 widget 重名
    desc    = "我的第一个 chili 窗口",
    layer   = 1010,               -- 必须大于 1000，api_chili.lua 是 1000
    enabled = true,               -- 复制出去的模板默认是 false，记得打开
  }
end
```

第三步，在 `Initialize` 里建控件。想达到的效果：屏幕上有窗口、一句文字、一个按钮 —— 这就是能跑的最小界面：

```lua title="目标：屏幕上出现窗口，里面有文字和按钮" hint="Window / Label / Button"
local Chili, win

function widget:Initialize()
  Chili = WG.Chili                    -- 类表只能在 Initialize 里拿
  if not Chili or not Chili.Screen0 then return end

  win = Chili.Window:New{
    parent  = Chili.Screen0,          -- 顶层控件必须挂到 Screen0
    caption = "我的第一个窗口",
    x = 200, y = 200, width = 320, height = 160,
  }
  Chili.Label:New{ parent = win, caption = "Hello Chili", x = 16, y = 40 }
  Chili.Button:New{ parent = win, caption = "点我", x = 16, y = 80,
    OnClick = { function(self) Spring.Echo("clicked") end } }
end
```

> [!note] `Initialize` 只在 widget 启动时跑一次，别把建控件写在 `Update` 里 —— 那样是每帧新建一个窗口。

## 你需要知道的规则 {#gs-rules}

是对加载顺序和对象树的硬约束，破一条就是白屏或报nil；最后一条是 `New` 本身的机制，解释为什么写了没反应。

- **layer 必须大于 1000。**Widget 按 `layer` 升序执行 `Initialize`，`api_chili.lua` 是 1000，而 `WG.Chili` 正是在它的 `Initialize` 里写进去的。所以 layer 小于等于 1000 时，你的 `Initialize` 里 `WG.Chili` 还是 `nil`。
- **文件顶层不要取类，只声明 local。**文件顶层代码在 widget *加载*阶段就执行了，那时 Chili 连 `Initialize` 都还没跑；真正取类要放在 `Initialize` 里，并加一句判空。
- <b>顶层控件必须 <code>parent = Chili.Screen0</code>。</b>没有 parent 的对象不在可见树上，`Object:IsVisibleOnScreen()` 直接返回 false；它不会被画出来，也不收鼠标。
- <b><code>New</code> 的表就是属性赋值。</b>表里的键直接写到实例上，拼错的键不会报错（只是多一个没人用的字段），所以「写了没反应」先怀疑键名；`New` 会顺手修正大小写（`Caption` 当 `caption` 用），但不修拼写。皮肤同理，只在 `New` 那一刻合并，之后改 theme/skinName 对已建好的控件无效。

## 怎么跑起来，改完怎么生效 {#gs-reload}

游戏内按 <kbd>F11</kbd> 打开widget列表勾上你的widget，之后每次改完代码只需控制台执行 `/luaui reload`：所有 widget 先`Shutdown` 再重新 `Initialize`，不用重启游戏。想达到的效果：reload 或退出游戏时把自己的界面清干净 - 所以 `Shutdown` 里必须 `Dispose` 顶层窗口，否则改几次代码就叠几层旧窗口：

```lua title="目标：reload或退出时清干净自己的界面" hint="Shutdown"
function widget:Shutdown()
  if win then win:Dispose() end   -- Dispose 会级联释放所有子控件
  win = nil                       -- 清掉引用，避免下次 Initialize 用到死对象
end
```

> [!note] reload 之后 `Initialize` 会重新执行，所以那些局部引用（`win`、`statusLabel`…）都会重新赋值，不需要手动重置。

## 忘了字段名/方法名，去哪查 {#gs-find}

1. 这个界面该用哪个类？  [类索引](#class-index)
2. `New` 的构造表里能写哪些键？  [New 里能写什么](#guide-newkeys)
3. 这个方法会读写哪些字段？  [方法读写了哪些字段](#guide-uses)
4. 只记得一个词？  顶部搜索框 <kbd>Ctrl</kbd>+<kbd>K</kbd>

> [!note] 文档里的键名和源码一致，Lua 大小写敏感，抄的时候别自己改大小写。

## 下一步 {#gs-next}

想直接照着抄一个完整例子，看 [示例讲解](#guide-examples)；想搞懂构造表还能写什么（尺寸、布局、事件、children），看 [New 里能写什么](#guide-newkeys)。

> [!note] 下一步：[示例讲解](#guide-examples)

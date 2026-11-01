---
title: 重要函数与常用模式
short: 重要函数
desc: 想改屏幕上的东西该调哪个方法？
order: 50
---

# 重要函数与常用模式

> [!lead] 想改界面上的某个东西，到底该调哪个 API。答案是——九成需求都落在那张速查表里，剩下的用三个能直接抄的完整模式就够；而"改了却没反应"基本只会踩到后面 4 个机制中的一个。

表按"你想达到的效果"排：左边是想做的事，右边是能直接抄的写法。

| 想达到的效果 | 用哪个方法 | 直接抄 |
|---|---|---|
| 开一个窗口 / 把它关掉 | <a href="#fn-Object-New"><code>Class:New{}</code></a> / <a href="#fn-Object-Dispose"><code>:Dispose()</code></a> | `win = Chili.Window:New{parent = Chili.Screen0, x = 120, y = 120, width = 400, height = 300}` |
| 挪位置 / 改大小 / 读尺寸 | <a href="#fn-Control-SetPos"><code>:SetPos(x, y, w, h)</code></a>；读 `.width` / `.height` | `win:SetPos(200, 140, 360, 300)` |
| 临时隐藏再显示 | <a href="#fn-Object-SetVisibility"><code>:SetVisibility(b)</code></a> / `:Hide()` / `:Show()` | `win:SetVisibility(false)` |
| 谁压在谁上面 | <a href="#fn-Object-SetLayer"><code>:SetLayer(n)</code></a> / <a href="#fn-Object-BringToFront"><code>:BringToFront()</code></a> / `:SendToBack()` | `win:BringToFront()` |
| 改显示的文字 | `Label`/`Button` <a href="#fn-Label-SetCaption"><code>:SetCaption()</code></a>；`EditBox` <a href="#fn-EditBox-SetText"><code>:SetText()</code></a> | `label:SetCaption("新文字")` |
| 改颜色 / 字体 | <a href="#prop-Control-backgroundColor"><code>backgroundColor</code></a>、`font` 等字段 + <a href="#fn-Control-Invalidate"><code>:Invalidate()</code></a> | `label.backgroundColor = {1, 0.8, 0.2, 1} label:Invalidate()` |
| 点按钮干活 | <a href="#prop-Object-OnClick"><code>OnClick</code></a>：函数表，可以挂多个 | `Chili.Button:New{parent = win, OnClick = {function(self) ... end}}` |
| 拿到某个子控件 | <a href="#fn-Object-GetChildByName"><code>:GetChildByName(name)</code></a> / `children` 数组 | `local lb = win:GetChildByName("status")` |

表里塞不下的两件事。**滚动**：`ScrollPanel:SetScrollPos(x, y)` 把视口移到 (x, y)，越界自动夹住（想滚到底就传个很大的 y），默认带 `smoothScroll = true` 的平滑动画，要瞬间跳到就传第 4 个参数 `forceNotSmooth = true`；滚动条只在子控件超出可视区时才出现，开关是 `verticalScrollbar` / `horizontalScrollbar`。**配置持久化**不归 Chili 管：`widget:GetConfigData()` 返回一张表让引擎序列化到 `LuaUI/Config`，下次启用时引擎回调 `widget:SetConfigData(data)`，你在回调里把值写回控件即可。

## 点按钮改文字 {#fn-click}

结论：把 `OnClick` 写成函数表，函数里调 `Label:SetCaption()`，不用你手动重绘。

想达到的效果：点一下按钮，旁边那行标签立刻变成"已点 N 次"。

```lua title="目标：按钮点击后改一个 Label 的文字" hint="Label + Button"
local count = 0
local label = Chili.Label:New{ parent = win, x = 20, y = 46, caption = "还没点" }
Chili.Button:New{
  parent = win, caption = "点我", x = 20, y = 84, width = 120, height = 28,
  OnClick = {
    function(self)
      count = count + 1
      label:SetCaption("已点 " .. count .. " 次")  -- 内部已 UpdateLayout + Invalidate
    end,
  },
}
```

注意：`Label` 没有 `SetText()`（那是 `EditBox` 的方法）。直接写 `label.caption = "x"` 不会重绘，还得自己 `:Invalidate()`；`Label` 默认 `autosize`，文字变长变短时还要 `:UpdateLayout()` 重算宽高——用 `SetCaption()` 这三件事都帮你做了。

## 让窗口能拖动 {#fn-drag}

结论：`Window` 自带拖拽，`draggable` 默认就是 `true`，你几乎什么都不用写。

想达到的效果：按住窗口的空白处（不是按钮上）就能把整个窗口拖走。

```lua title="目标：一个可拖动、不可缩放的窗口" hint="Window"
win = Chili.Window:New{
  parent = Chili.Screen0,
  caption = "拖动我",
  x = 120, y = 120, width = 420, height = 260,
  resizable = false,   -- 右下角不再有缩放角
  draggable = true,    -- 默认就是 true，写出来只是表意
}
-- 想让整窗只有 skin 里的那个 drag box 能拖，打开抓手：
win.dragUseGrip = true
```

注意：拖拽是内置的——鼠标按在窗口上会 `StartDragging()`，之后 `Control:MouseMove` 里做 `SetPos(x + dx, y + dy)`，所以别自己写 `MouseMove` 去搬窗口；被按钮吃掉的按下不会触发拖拽。`tweakDraggable` 只在引擎的 tweak 模式里生效，普通玩法界面不用管。

## 每帧刷新 HUD（记得节流） {#fn-tick}

结论：在 `widget:Update(dt)` 里累加 `dt`，够一个间隔再改控件。

想达到的效果：屏幕上有个标签跟着游戏时间走，每秒跳 5 次就够，不想每帧都去改控件。

```lua title="目标：HUD 上一行时间，每 0.2 秒刷一次" hint="Label + widget:Update"
local acc = 0
local hud = Chili.Label:New{ parent = Chili.Screen0, x = 20, y = 40, caption = "" }
function widget:Update(dt)
  acc = acc + dt
  if acc < 0.2 then return end   -- 0.2 秒一次：观感上就是连续的
  acc = 0
  hud:SetCaption("时间 " .. math.floor(Spring.GetGameSeconds()))
end
```

注意：`SetCaption` 会按新文字重算尺寸并 `Invalidate()`，每帧调就是每帧重建一次 display list，几十个控件同时刷就会掉帧。HUD 挂在 `Chili.Screen0` 上，`widget:Shutdown` 里记得 `hud:Dispose()`。

## 为什么改了却没反应？ {#fn-why}

结论：Chili 的改动大多不是立刻生效的 - 它缓存画面、把几何约束算成坐标、在构造时固定皮肤，还把隐藏的控件挪到另一个数组。踩中任何一条，你都会以为 API 坏了。

1. **画面有缓存，改字段要手动失效。**控件默认 `useDList = true`，把自己画进 OpenGL display list；`:Invalidate()` 只是标脏并 `RequestUpdate()`，真正的重建发生在下一帧的 `Update` 里。所以改 `backgroundColor`、`caption` 这类字段之后必须自己 `:Invalidate()`；`Set*` 方法（`Label:SetCaption`、`Progressbar:SetValue`…）内部已经调过了。另外 `Object` 上的 `Invalidate` 是空函数，只有 `Control` 才真的实现它。
2. **`right` / `bottom` 是约束，不是字段。**`New` 之后 `DetectRelativeBounds` 记下你给的约束，`GetRelativeBox` 再把 `right` / `bottom` 换算成 `x` / `width`（`right = 10` 就是离父容器右边 10 像素，也认 `"100%"` 这种相对值）。同一轴只给一个约束时，另一头回落到 `defaultWidth` / `defaultHeight`（`Object` 是 10，`Label` 是 70）——这就是"我设的宽没生效"。`SetPos(x, y, w, h)` 只写这四个字段，并且会把之前写的 `right` / `bottom` 约束清掉；`w` / `h` 还会被夹在 `minWidth` / `maxWidth` 之间。
3. **皮肤只在 New 那一刻合并。**`Control:New` 里调 `theme.LoadThemeDefaults(obj)` + `SkinHandler.LoadSkin(obj, self)`，把 `skin.general` 和 `skin.<类名>` 填进实例。控件建好之后再改 `skinName` 或换 theme 都不会重新套皮——要么 `New` 时就传 `skinName`，要么 `Dispose()` 后用新皮肤重建。
4. **隐藏的控件会离开 children。**`SetVisibility(false)` 走的是 `parent:HideChild()`，控件被挪进 `children_hidden`，所以 `ipairs(win.children)` 和 `#win.children` 都看不到它（`GetChildByName` 会查隐藏表，能找到）。同时 `SetParent` 会把 `visible` 重置为 `true`，这就是"换个爹又自己冒出来"。要 `OnShow` / `OnHide` 回调就用 `Show()` / `Hide()`，`SetVisibility` 只改状态不派发事件。

<p class="note" id="fn-next">下一步：去看 <a href="#guide-faq">常见问题与避坑</a> </p>

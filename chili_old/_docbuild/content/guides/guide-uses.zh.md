---
title: 方法读写了哪些字段
short: 方法读写字段
desc: 方法名下面那排小方块是函数体里 self./obj. 引用的静态扫描结果，这页讲清它怎么算出来、三个真实例子、为什么只列一部分，以及什么时候该信它
order: 30
---

# 方法读写了哪些字段

> [!lead] 方法详情下面那排小方块 源码里读写的字段 **不是方法的参数**，也**不是这个控件有哪些属性**。它只回答一件事：**这段函数的代码里碰过控件的哪些字段，是读还是写。** 参数在括号里，属性在上面的属性表里，方块是这段代码动了什么。

## 参数在括号里，字段在方块里 {#uses-vs-params}

参数是调用时你传进去的值；字段是控件自己身上的属性（`width`、`caption`、`color`…）。方块统计的是函数体里出现的 `self.xxx`。

```lua title="参数 and 字段" hint="Control:SetPos"
-- 括号里的 x y w h 是【参数】
function Control:SetPos(x, y, w, h)
  self.width = w   -- width 是字段，这里被写
  self.x     = x   -- x 也是字段，被写
end
-- 所以 SetPos 的方块是：x w  y w  width w  height w (w = 写)
```

## 它是怎么算出来的 {#uses-how}

构建文档时（`_docbuild/parse.cjs`），对每个 `function` 做四件事，纯文本处理、不执行 Lua：

1. 切出函数体：从 `function` 那行开始，数 `function`/`do`/`repeat` 与 `end` 的配对，直到配平。
2. 在函数体里找 `self.字段名` 和 `obj.字段名`（只认这两个前缀）。
3. 看引用后面紧跟什么：单个 `=`（不是 `==`）算**写 w**，其它都算**读 r**。
4. 同一字段读写都有 → `rw`。

所以它是一份「哪个方法碰了哪个字段」的索引，不是手写的说明。

## 例子一：想让按钮贴在右边 {#uses-eg-right}

**想达到的效果：** 按钮固定在窗口右侧，窗口拉宽它也跟着走。

用 `SetPos` 写死坐标不管用——它的方块里没有 `right`，它只写 x/width。要贴右就在 New 里给 `right`。

```lua title="贴右按钮" hint="Button"
-- 窗口一拉宽就不贴了
btn:SetPos(300, 10, 80, 24)

-- 只给 right 和 width，x 由框架算
local btn = Button:New{
  parent = win, right = 8, y = 8, width = 80, height = 24,
  caption = "关闭",
}
```

> [!note] 原理：`right` 是在 `Control:DetectRelativeBounds` 里被解析成 `x` 的（那个方法的方块里就有 `right rw`），`SetPos` 不负责这件事。这就是「方块里没有的字段，这个方法就不认」。

## 例子二：New 里写 visible = false 为什么没用 {#uses-eg-visible}

**想达到的效果：** 窗口先建好、先不显示，以后再 Show。

因为挂到父控件时，`Object:SetParent` 会把 `visible` 写成 true —— 它的方块里有 `visible w`。

```lua title="先藏起来" hint="Window"
local win = Window:New{ parent = Chili.Screen0, visible = false }  -- 会被改回 true
win:Hide()   -- 建完再隐藏，这个才有效
```

## 例子三：SetValue 和直接改字段的区别 {#uses-eg-value}

**想达到的效果：** 把进度条设成 50%。

```lua title="设进度" hint="Progressbar"
bar:SetValue(0.5)   -- 方块：value rw + OnChange r  → 会触发你的 OnChange
bar.value = 0.5     -- 只改字段，不触发回调
bar:Invalidate()    -- 直接改字段后想立刻看到，补一行重绘
```

`rw` = 先读旧值再写新值（典型 setter）；`OnChange r` 表示它只拿这个回调去调用。

## 方块怎么读？ {#uses-read}

- **彩色**：`r` 只读（不会改你的值）、`w` 会被它写掉、`rw` 又读又写（setter）。
- **灰色 `_` 开头**：框架内部字段（如 `_relativeBounds`），别手动改。
- **一个都没有**：这个函数没直接碰字段（`Control:Resize` 只转调 SetPos），不代表它没用。

## 为什么看起来只列了一部分？ {#uses-limits}

因为它只扫这一个函数体，所以下面几条都是「正常现象」，不是漏了：

- **只认 `self.` / `obj.`**：`win.width`、`parent.x`、局部变量 `t.width` 都不算。
- **调用别的方法改的字段不算在自己头上**：A 调 B，B 改的字段记在 B 名下。这就是 `Control:Resize` 方块为空的原因。
- **嵌套表只记第一段**：`self.font.size` 只记 `font`。
- **`table.merge` 整表合并只算一条**：`font` / `skin` 这种整表灌进来的，只记表名。

## 和可用属性的关系 {#uses-vs-table}

**属性表回答这个控件能写什么（完整），方块回答这个方法碰了什么（子集）。**

## 什么时候值得看 {#uses-use}

1. 调方法前要先设哪个字段 - 看它**读**什么。
2. 我设的值怎么被改掉了 - 看谁**写**了它。
3. 改完要不要手动刷新 - 看它有没有写 `_needRedraw` 或调 `OnChange`。

> [!note] 下一步：想在 New 里一次写全这些字段 → [New 里能写什么](#guide-newkeys)；想按 我要做什么 找方法 → [重要函数与常用模式](#guide-functions)；想查某个控件有哪些属性 >> [类索引](#class-index)。

---
title: New 里能写什么
short: New 能写什么
desc: New 表的全部可用键：结构键 parent / children / name、几何键 x / y / width / height / right / bottom 与百分比、它们为什么这样表现（table.merge 只填空位、几何是约束、只纠正类属性大小写），以及四个最常见的坑
order: 20
---

# New 里能写什么？

> [!lead] **写 `Class:New{...}` 时，那个表里到底能塞哪些键？**
>
> 答案一句话：**能写的 = 这个类自己声明的属性 + 从父类继承的属性 + 一组所有控件通用的键**（结构键、几何键、clientWidth 等）。通用键在类页面里查不到，全在这一页。

## 1. 结构键：parent/children/name {#nk-struct}

结论：控件**挂在哪、叫什么、下面有谁**这三件事都在 New 的表里一次写完，不用再补AddChild。

**想达到的效果：**一行 New 建出窗口，顺手挂到屏幕上、起个名字、带上两个子控件。

```lua title="目标：建窗口/起名/塞子控件" hint="Window"
local win = Window:New{
  parent = Chili.Screen0,   -- 顶层控件必须给，否则是孤儿
  name   = "mainwin",       -- 之后 win:GetChildByName("mainwin") 找得回来
  x = 120, y = 90, width = 420, height = 280,
  children = { Button:New{ x = 8, y = 8, width = 80, height = 24 } },
}
```

| 键 | 作用 | 省略时 |
|---|---|---|
| `parent` | 挂到哪个父控件，等于构造完立刻 `parent:AddChild(自己)` | 孤儿：不绘制、收不到鼠标；顶层控件要写 `Chili.Screen0` |
| `children` | 子控件数组 `{a, b, c}`，顺序就是层级（后面的压在上面） | 没有子控件；写成键值表会静默失效 |
| `name` | 控件名，给 `GetChildByName` 和调试输出用 | 自动生成「classname + 序号」；同一父控件下重名直接报错 |
| `classname` | 决定吃哪套皮肤（`skin[classname]`） | 用类自己的 classname |
| `clientWidth` / `clientHeight` | 客户区（能画内容那块）的宽高，框架自动把 padding 加回来当 width / height | 用 width / height 减 padding 算 |
| `minimumSize` | 旧写法 `{w, h}`，等价于 minWidth + minHeight | nil，走 minWidth / minHeight 的默认值 |

> [!note] 位置和大小那 6 个键（`x / y / width / height / right / bottom`）下一节讲；遍历子控件用 `ipairs(win.children)`，别用 `pairs`。

## 2. 几何键：固定/贴右/拉伸/百分比 {#nk-geometry}

结论：位置不用写死像素。水平方向 `x / width / right` 三选二，垂直方向 `y / height / bottom` 三选二，少给的那个由框架算出来。

**想达到的效果：**按钮固定尺寸、固定位置。

```lua title="目标：固定尺寸和位置" hint="Button"
local ok = Button:New{
  parent = win, x = 8, y = 232, width = 120, height = 24,
  caption = "确定",
}
```

**想达到的效果：**关闭按钮永远贴着窗口右边 8 像素。

```lua title="目标：贴在父控件右边" hint="Button"
local close = Button:New{
  parent = win, right = 8, y = 8, width = 80, height = 24,
  caption = "关闭",
}
-- 没给 x：x = 父客户区宽 - 80 - 8
```

**想达到的效果：**输入框左右都贴边，窗口变宽它跟着变宽。

```lua title="目标：左右拉伸" hint="EditBox"
local bar = EditBox:New{
  parent = win, x = 8, right = 8, y = 40, height = 24,
}
-- 没给 width：width = 父客户区宽 - 8 - 8
```

**想达到的效果：**面板永远占窗口一半宽。

```lua title="目标：按父控件百分比" hint="Panel"
local half = Panel:New{
  parent = win, x = 0, width = "50%", y = 0, height = 120,
}
-- 字符串一律当百分比，x / y / width / height 都支持
```

> [!note] 写 right 和百分比记的是约束，父控件一变就重算；负数表示从右边量，`x = -120` 就是「父宽 - 120」。

## 3. 三个决定 New 行为的机制！ {#nk-why}

结论：New 不是把表原样存进实例，它做了几件你没预料到的事 —— 这才是很多键「写了没反应」的根因。

**1 表型值逐层合并，只填空位。** Control:New 先加载主题和皮肤，Object:New 再用 `table.merge` 补类默认值；merge 遇到已有值直接跳过，所以**你写的键永远赢**。数组按位置填：`padding = {10}` 得到的是 `{10, 5, 5, 5}`，不是四周 10。

**2 几何键是「约束」，New 时先记下来，之后按父控件尺寸算成坐标。** right / bottom、百分比、负数都记进 `_relativeBounds`，父控件 resize 时重算 —— 这就是它比固定像素好的地方。

```lua title="为什么贴右能跟着窗口变：约束会被重算" hint="Control"
local bar = EditBox:New{ parent = win, x = 8, right = 8, y = 40, height = 24 }
win:Resize(800, 600)   -- 父控件变宽，bar.width 自动重算
bar:SetPos(20)         -- 传数字 x：right 约束被清掉，从此不再贴右
```

**3 大小写纠正只对类属性生效。** `Object:New` 会把你写的 `Padding` 纠正成 `padding`；但 `x / width / right` 这些通用键没人纠正，写错就静默失效。

## 4. 四个最容易踩的坑 {#nk-traps}

结论：下面四种写法看着对、其实不生效，正确做法就在每条后面。

**想达到的效果：**居中、按需隐藏、调整层级、让内容区正好某个宽度 —— 这四件事都别指望在 New 里硬凑键。

1. **没有 center / dock / anchor 这类键。** 居中要么父控件建好后再算 `x = (win.clientWidth - 200) / 2`，要么用百分比 `x = "25%"`；自动排布交给 [LayoutPanel](#cls-LayoutPanel) / [Grid](#cls-Grid)。
2. **New 里写 `visible = false` 无效**，控件挂到父控件时 `Object:SetParent` 会强制 `visible = true`；构造完再调 `ctrl:Hide()`。
3. **没有 `layer` 键。** 层级就是父控件 children 数组里的顺序，要调就 `ctrl:SetLayer(5)` / `:BringToFront()`，而且得先有 parent。
4. **width 被父容器接管时，用 `clientWidth`。** 想让内容区正好 200 宽就写 `clientWidth = 200`，框架会加回 padding；自己按 padding 手算，换皮肤或字体就对不上了。

> [!warn] 没反应时先对照本节：类属性写错大小写会被自动纠正，通用键拼错则完全没有报错。

## 5. 下一步 {#nk-next}

键写对了，接下来是读写控件上的字段、让控件跟着窗口一起动。

> [!note] 下一步：看 [读写字段与控件状态](#guide-uses)、[可以直接抄的示例](#guide-examples)。

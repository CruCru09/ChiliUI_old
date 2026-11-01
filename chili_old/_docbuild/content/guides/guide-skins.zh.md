---
title: 换皮肤
short: 换皮肤
desc: 皮肤是在控件 New 那一刻复制进实例的一组默认字段，这页讲清三种换法与优先级、已经显示的控件为什么改不动、以及怎么写出最小的一套皮肤
order: 70
---

# 换皮肤

> [!lead] **怎么把界面换成另一种风格？**。答案是改控件的 `skinName`（全局 / 按类 / 单控件三个层次），但皮肤是在控件 **New 那一刻**被合并进实例的，所以已经显示出来的控件不会自动换皮，得Dispose掉重建。

## 1. 皮肤是什么 {#sk-what}

> [!ok] **结论：** 一套皮肤就是 `Skins/<目录>/skin.lua` 返回的一张表，字段名和控件属性同名；控件 `New` 时（`Controls/control.lua:79-81`）把这些字段**复制**进实例，于是 `ctrl.textColor`、`ctrl.backgroundColor`、`ctrl.DrawControl` 都成了控件自己的字段 - 皮肤不是样式表，是一堆提前写好的默认值。

想达到的效果：不想每个按钮都手写一遍颜色、字体、边框，直接让一批控件共用同一套观感。皮肤表里有三样东西：`info`（元信息，`info.name` 就是皮肤名）、`general`（对**所有**控件生效的兜底字段）、以及每个类一个块 —— 块的键是小写的 `classname`，值是这个类要覆盖的字段和绘制函数 `DrawControl`。顺带一句：自带皮肤里 `skin.control` 就是 `skin.general` 的同一套字段（7 套直接写 `skin.control = skin.general` 这行别名，另外 4 套靠 `info.depend` 从依赖皮肤拿到），所以「类没有自己的块」时，实际生效的就是 general。

```lua title="一套皮肤就是一张表" hint="Skins/<名字>/skin.lua"
return {
  info    = { name = "Glass" },                                -- 必需：皮肤名
  general = { textColor = {1,1,1,1}, borderThickness = 1.5 },  -- 对所有控件生效
  button  = { DrawControl = DrawButton },                      -- 键 = 小写 classname
}
```

注意：字段名就是控件属性名，你想改的 `textColor` / `backgroundColor` / `font` / `padding` 全在这张表里；改哪个字段，就写哪个键。

## 2. 三种换法 {#sk-how}

> [!ok] **结论：** 三个层次写的是同一个字段 `skinName`：全局改 `theme.skin.general.skinName`、按类改 `theme.skin[小写类名].skinName`、单控件就在 New 表里直接写。三者都用，就是「单控件 > 按类 > 全局」。

为什么是这个顺序：`Control:New` 里 `theme.LoadThemeDefaults` 先把 `theme.skin[类名]` 合并进来，再合并 `theme.skin.general`；而 `table.merge` **只填空位**。所以 New 表里你自己写的值最先存在、谁也盖不掉；general 最后合并，只能给前面都没给的字段兜底。

```lua title="想达到的效果：一次换全部/只换按钮/只换这一个" hint="widget:Initialize"
-- 1 全局：之后新建的控件都变
Chili.theme.skin.general.skinName = "Glass"

-- 2 按类：只有 Button 变（button 这个键原本不存在，要先建出来）
Chili.theme.skin.button = Chili.theme.skin.button or {}
Chili.theme.skin.button.skinName = "Carbon"

-- 3 单控件：只影响这一个实例
local b = Chili.Button:New{ parent = win, caption = "确定", skinName = "Twilight" }
```

注意：1 按类匹配的是**精确** `classname`，`theme.skin.button` 只管 classname 为 `button` 的控件，从 Button 派生出来的类不会自动跟着变 —— 皮肤文件里的块才会沿继承链找。② 名字写错不报错 —— `GetSkin` 返回 `nil`，这套皮肤的块全被跳过，只剩 `default` 皮肤兜底，看起来就像「换了但界面变丑了」。名字用 `Chili.SkinHandler.GetAvailableSkins()` 现查，别硬编码。

## 3. 为什么改完没反应（原理） {#sk-stale}

> [!ok] **结论：** 皮肤是「构造时复制进去的普通字段」，不是运行时样式表。New 之后再改 `theme`、改 `ctrl.skinName` 都不会有任何效果，因为没有任何代码会再读它。

四条机制，看懂就不会再试错：

- **合并点只有一个。** `SkinHandler.LoadSkin` 在全仓库只被 `Controls/control.lua:81` 调用一次；没有 `ApplySkin` / `ReloadSkin` 这类 API，框架里也不存在重刷皮肤的入口。
- **`table.merge` 只填空位**（`Headers/util.lua:295-307`：`elseif (self[i] == nil) then self[i] = v end`）。所以哪怕你手动再 merge 一遍皮肤表，已有的颜色/贴图也不会被覆盖，只会补那些还是 `nil` 的字段。
- **`skinName` 只在 `LoadSkin` 第一行被读一次**（`GetSkin(control.skinName)`，`Handlers/skinhandler.lua:147`）。事后改 `ctrl.skinName` 只是给控件加了个字符串。
- **子控件各自在 New 时合并**，不是从父控件继承过来的。所以换肤要整棵子树重建；反过来说 `Dispose` 父控件时子控件会一起销毁，不会漏。

```lua title="无效写法！" hint="两种都不生效"
win.skinName = "Glass"                        -- 无效：构造完没人再读它
Chili.theme.skin.general.skinName = "Glass"   -- 无效：只影响之后新建的控件
```

```lua title="想达到的效果：运行时真的换掉皮肤" hint="Dispose + 重建"
local win

local function rebuild()
  if win then win:Dispose() end                -- 旧控件先销毁
  win = Chili.Window:New{ parent = Chili.Screen0, caption = "换肤",
                          x = 100, y = 100, width = 420, height = 300 }
end

Chili.theme.skin.general.skinName = "Carbon"
rebuild()                                      -- 重建后才吃到新皮肤
```

注意：Dispose 会连里面的 EditBox 文本、ScrollPanel 位置一起丢掉，重建前先把要保留的值存到 widget 局部变量或 `GetConfigData()` 里。开发时想图省事也可以 `/luaui reload`，它会把所有 widget 重新初始化一遍。

## 4. 自己写一套最小皮肤 {#sk-own}

> [!ok] **结论：** 在 chili 目录的 `Skins/<名字>/` 下写一个 `skin.lua`，里面只要有 `info` + `general` 就能用，想改哪类再加一块；没写的类由 `default` 皮肤兜底，所以最小十几行就够。

三条规则，缺了会用错：

- **`info.name` 必需**：加载器先检查返回值是 table、`info` 是 table（`Handlers/skinhandler.lua:66`），再用 `info.name:lower()` 当索引（69 行）—— 名字缺失不是「跳过」，是直接报错。
- **贴图只写文件名，别写路径**：加载时 `TranslateFilePaths` 会依次在 [本皮肤目录, `info.depend` 的目录, `Skins/default/`] 里找同名文件并替换成完整路径；找不到就保留原字符串 —— 运行时只是贴图不显示，**不报错**，所以别指望它自己提醒你。
- **只覆盖想改的类**：`BubbleBlack` 就只写了 `general` + `window` 两块，其余全靠 `default` 补，不用把 19 个块抄一遍。

```lua title="想达到的效果：一套深色皮肤，按钮沿用默认绘制" hint="Skins/MySkin/skin.lua"
local skin = {
  info = { name = "MySkin" },
  general = {                            -- 对所有控件生效
    textColor       = {0.9, 0.95, 1, 1},
    font            = { size = 13, outline = false },
    borderThickness = 1.5,
    borderColor     = {1, 1, 1, 0.6},
    backgroundColor = {0.1, 0.12, 0.18, 0.9},
  },
  button = { DrawControl = DrawButton }, -- 绘制函数沿用 skinutils 里的
}
return skin
```

> [!warn] 注意：目录名和 `info.name` 写成一致最省心；皮肤目录只在框架加载时扫一次，新增或改名之后必须 `/luaui reload`。

## 5. 下一步 {#sk-next}

> [!note] 下一步：想看能点着操作的换肤界面，读 [示例讲解](#guide-examples) 里换皮肤那一节，源码是 `LuaUI/Widgets/chili_demo_09_skins.lua`（三种换法 + Dispose 重建都演示了）；要查某套自带皮肤到底设了哪些字段，看 [皮肤章节](#skins)。

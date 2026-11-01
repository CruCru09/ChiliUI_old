---
title: "Skins
short: Skins
desc: "A skin is a set of default fields copied onto a control the moment it is Newed; this page covers the three ways to choose one and their order, why existing controls never restyle, and how to write a minimal skin"
order: 70
---

# Skins

> [!lead] **how do I give the UI a different look?**. The answer is to set a control's `skinName` (global, per class, or per control), but a skin is merged into the instance **the moment it is created** - so controls that are already on screen will not restyle themselves; you have to dispose and rebuild them.

## 1. What a skin is {#sk-what}

> [!ok] **Bottom line:** a skin is a table returned by `Skins/<dir>/skin.lua` whose keys are control field names; when a control is `New`ed (`Controls/control.lua:79-81`) those values are **copied** onto the instance, so `ctrl.textColor`, `ctrl.backgroundColor` and `ctrl.DrawControl` end up as the control's own fields - a skin is not a stylesheet, it is a set of ready-made defaults.

The effect you want: stop hand-writing colours, fonts and borders for every button and let a group of controls share one look. A skin table holds three things: `info` (metadata, `info.name` is the skin's name), `general` (fallback fields applied to **every** control), and one block per class - the key is the lower-case `classname`, the value holds the fields to override plus the draw function `DrawControl`. One aside: in the bundled skins `skin.control` carries the same fields as `skin.general` (7 write the `skin.control = skin.general` alias line, the other 4 get it through `info.depend`), so when a class has no block of its own, what actually applies is general.

```lua title="A skin is just a table" hint="Skins/<name>/skin.lua"
return {
  info    = { name = "Glass" },                                -- required: skin name
  general = { textColor = {1,1,1,1}, borderThickness = 1.5 },  -- applies to all controls
  button  = { DrawControl = DrawButton },                      -- key = lower-case classname
}
```

Note: the keys are the property names, so the `textColor` / `backgroundColor` / `font` / `padding` you want to change all live in this table - whichever field you change, write that key.

## 2. Three ways to choose a skin {#sk-how}

> [!ok] **Bottom line:** all three scopes write the same field, `skinName`: global sets `theme.skin.general.skinName`, per class sets `theme.skin[lowercase classname].skinName`, per control just writes it in the New table. Use them together and the order is per control > per class > global.

Why that order: inside `Control:New`, `theme.LoadThemeDefaults` first merges `theme.skin[classname]` and then `theme.skin.general`, while `table.merge` **only fills empty slots**. So a value you wrote in the New table exists first and nothing can override it; general is merged last and only fills what neither of the other levels provided.

```lua title="Goal: restyle everything / only buttons / only this one" hint="widget:Initialize"
-- 1) global: every control created afterwards
Chili.theme.skin.general.skinName = "Glass"

-- 2) per class: only Button changes (the key does not exist yet, create it)
Chili.theme.skin.button = Chili.theme.skin.button or {}
Chili.theme.skin.button.skinName = "Carbon"

-- 3) per control: affects this instance only
local b = Chili.Button:New{ parent = win, caption = "OK", skinName = "Twilight" }
```

Note: (1) the per-class key matches the **exact** `classname`: `theme.skin.button` only affects controls whose classname is `button`, and a class derived from Button does not follow it automatically - only blocks inside a skin file walk the inheritance chain. (2) A wrong name does not raise an error - `GetSkin` returns `nil`, every block of that skin is skipped and only the `default` skin fills in, which looks like "the skin changed but got ugly". Look names up with `Chili.SkinHandler.GetAvailableSkins()` instead of hard-coding them.

## 3. Why nothing happens after you change it (the mechanism) {#sk-stale}

> [!ok] **Bottom line:** a skin is a set of ordinary fields copied in at construction time, not a runtime stylesheet. Changing `theme` or `ctrl.skinName` afterwards has no effect, because no code reads it again.

Four facts, and you will never have to guess again:

- **There is exactly one merge point.** `SkinHandler.LoadSkin` is called from `Controls/control.lua:81` and nowhere else in the repository; there is no `ApplySkin` / `ReloadSkin` API and no "restyle" entry point.
- **`table.merge` only fills empty slots** (`Headers/util.lua:295-307`: `elseif (self[i] == nil) then self[i] = v end`). Even if you merge a skin table by hand, existing colours and textures are not overwritten - only fields that are still `nil` get filled.
- **`skinName` is read once**, on the first line of `LoadSkin` (`GetSkin(control.skinName)`, `Handlers/skinhandler.lua:147`). Setting `ctrl.skinName` later just stores a string on the control.
- **Every child is merged when it is New**ed; it does not inherit from its parent. So a new skin means rebuilding the whole subtree - and conversely `Dispose` on the parent destroys the children too, nothing leaks.

```lua title="What does NOT work!" hint="neither has any effect"
win.skinName = "Glass"                        -- no effect: nobody reads it after New
Chili.theme.skin.general.skinName = "Glass"   -- no effect: only new controls use it
```

```lua title="Goal: actually change the skin at runtime" hint="dispose + rebuild"
local win

local function rebuild()
  if win then win:Dispose() end                -- destroy the old tree first
  win = Chili.Window:New{ parent = Chili.Screen0, caption = "Skins",
                          x = 100, y = 100, width = 420, height = 300 }
end

Chili.theme.skin.general.skinName = "Carbon"
rebuild()                                      -- only a rebuild picks up the new skin
```

Note: disposing throws away the text in EditBoxes, the scroll position of ScrollPanels, and so on - save what you need into widget locals or `GetConfigData()` before rebuilding. During development `/luaui reload` is the lazy option: it re-runs every widget from scratch.

## 4. Write your own minimal skin {#sk-own}

> [!ok] **Bottom line:** create `Skins/<name>/skin.lua` in the chili directory with `info` + `general` and it already works; add a block for any class you want to override. Classes you do not write are filled in by the `default` skin, so a dozen lines is enough.

Three rules you will get wrong otherwise:

- **`info.name` is required:** the loader first checks that the file returns a table with a table `info` (`Handlers/skinhandler.lua:66`), then indexes it by `info.name:lower()` (line 69) - a missing name is not "skipped", it errors.
- **Textures are file names, not paths:** at load time `TranslateFilePaths` tries each string in [the skin's own directory, the `info.depend` directories, `Skins/default/`] and replaces the first match with a full path; an unresolved name stays as written - at run time the texture simply does not show and **nothing warns you**.
- **Override only the classes you care about:** `BubbleBlack` writes just `general` + `window` and lets `default` fill the rest instead of copying all 19 blocks.

```lua title="Goal: a dark skin that keeps the stock button drawing" hint="Skins/MySkin/skin.lua"
local skin = {
  info = { name = "MySkin" },
  general = {                            -- applies to all controls
    textColor       = {0.9, 0.95, 1, 1},
    font            = { size = 13, outline = false },
    borderThickness = 1.5,
    borderColor     = {1, 1, 1, 0.6},
    backgroundColor = {0.1, 0.12, 0.18, 0.9},
  },
  button = { DrawControl = DrawButton }, -- draw function from skinutils
}
return skin
```

> [!warn] Note: keeping the directory name equal to `info.name` saves trouble; skin directories are scanned once at framework load, so a new or renamed skin needs `/luaui reload`.

## 5. Next {#sk-next}

> [!note] Next: for a clickable skin-switcher UI read the skins section of [the examples](#guide-examples) - the source is `LuaUI/Widgets/chili_demo_09_skins.lua` (it demos all three ways plus dispose-and-rebuild). To see which fields a bundled skin actually sets, see [the skins chapter](#skins).

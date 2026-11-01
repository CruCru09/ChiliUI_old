---
title: Getting started
short: Getting started
desc: Getting a window of your own onto the screen the three steps (copy the template, edit GetInfo, build the controls in Initialize), the three hard rules and why they exist, reloading after an edit, and where to look up field or method names
order: 10
---

# Getting started

> [!lead] **the framework is installed, so how do I get a window I wrote onto the screen?** copy the template, edit `GetInfo`, build the controls in `Initialize`.

## First, make sure the framework is running {#gs-ready}

Chili does not ship with the engine. It is two things: `api_chili.lua` (the loader, `layer = 1000`) and `chili_old/` (the framework itself). Both must sit in the same folder

```text title="Goal: the files are in the right place" hint="LuaUI/Widgets/"
LuaUI/Widgets/
  api_chili.lua             -- loader, layer = 1000; it is what writes WG.Chili
  chili_old/                -- the framework: Controls/ Handlers/ Headers/ Skins/ Themes/
  chili_demo_00_template.lua -- the shipped template, copy it as your starting point
  my_widget.lua             -- your own widget, same folder
```

After starting the game, check three things:

1. The widget list shows `Chili Framework` and it is ticked.
2. `infolog.txt` has no chili-related `Error`.
3. Nothing new on screen — that is normal: the framework only puts the class table into `WG.Chili` and draws no UI of its own.

## your first window! {#gs-steps}

Step one: copy `chili_demo_00_template.lua` to `my_widget.lua` in the same folder; it is a skeleton that already runs. Step two: edit `GetInfo`. It carries a pile of fields; the three that actually bite are `name` / `layer` / `enabled`:

```lua title="Goal: the engine recognises your widget" hint="my_widget.lua"
function widget:GetInfo()
  return {
    name    = "My First Window",  -- shown in the widget list; do not reuse a name
    desc    = "my first chili window",
    layer   = 1010,               -- must be greater than 1000; api_chili.lua is 1000
    enabled = true,               -- the copied template defaults to false
  }
end
```

Step three: build the controls in `Initialize`. Goal: a window, some text and a button on screen — that is the smallest UI that works:

```lua title="Goal: a window on screen with text and a button" hint="Window / Label / Button"
local Chili, win

function widget:Initialize()
  Chili = WG.Chili                    -- the class table is only reachable here
  if not Chili or not Chili.Screen0 then return end

  win = Chili.Window:New{
    parent  = Chili.Screen0,          -- a top-level control needs Screen0 as parent
    caption = "My first window",
    x = 200, y = 200, width = 320, height = 160,
  }
  Chili.Label:New{ parent = win, caption = "Hello Chili", x = 16, y = 40 }
  Chili.Button:New{ parent = win, caption = "Click me", x = 16, y = 80,
    OnClick = { function(self) Spring.Echo("clicked") end } }
end
```

> [!note] `Initialize` runs once when the widget starts. Do not create controls in `Update` — that builds a new window every frame.

## The rules you need to know {#gs-rules}

It is a strict constraint on the loading sequence and the object tree. Breaking any one of them will result in a blank screen or a "nil" error; the last one is the mechanism of `New` itself, explaining why there is no response when it is written.

- <b><code>layer</code> must be greater than 1000.</b> Widgets run `Initialize` in ascending `layer` order, `api_chili.lua` is 1000, and `WG.Chili` is written inside that loader's `Initialize`. So with a layer of 1000 or lower, `WG.Chili` is still `nil` inside your `Initialize`.
- **Never grab the classes at file top level.** Top-level code runs during the *loading* phase, before any widget's `Initialize`. Declare `local Chili` there, assign it inside `Initialize`, and guard with a nil check.
- <b>A top-level control needs <code>parent = Chili.Screen0</code>.</b> An object without a parent is not on the visible tree: `Object:IsVisibleOnScreen()` returns false immediately, so it is neither drawn nor hit-tested by the mouse.
- <b>The <code>New</code> table is just property assignment.</b> Every key is written onto the instance; a misspelled key raises no error, it only leaves an unused field, so when "nothing happens" suspect the key name first. `New` does fix letter case (`Caption` is accepted as `caption`) but not spelling. Skins behave the same way: they are merged at `New` time, so changing theme or `skinName` later does not affect controls that already exist.

## Running it, and reloading after an edit {#gs-reload}

Press <kbd>F11</kbd> in game and tick your widget, then after each edit just run `/luaui reload` in the console: every widget is shut down and initialised again, no game restart needed. Goal: leave no UI behind on reload or exit — so `Shutdown` must dispose your top-level window, otherwise each reload stacks another copy of the old UI:

```lua title="Goal: clean up your UI on reload or exit" hint="Shutdown"
function widget:Shutdown()
  if win then win:Dispose() end   -- Dispose recursively frees all child controls
  win = nil                       -- drop the reference to the dead object
end
```

> [!note] After a reload `Initialize` runs again, so every local reference (`win`, `statusLabel`, ...) is reassigned; you do not need to reset anything by hand.

## Where to look up a field or method name {#gs-find}

Pick the entry point that matches what you are stuck on; it beats scrolling:

1. "Which class should this UI use?"  [Class index](#class-index)
2. "What keys can I put in the `New` table?"  [Keys for New](#guide-newkeys)
3. "Which fields does this method touch?"  [Fields read and written](#guide-uses)
4. You only remember a word → the search box (<kbd>Ctrl</kbd>+<kbd>K</kbd>)

> [!note] Key names in the docs match the source, and Lua is case-sensitive: do not "tidy up" the capitalisation when copying.

## Next {#gs-next}

Want a complete example to copy from? Read [The examples](#guide-examples). Want to know everything the constructor table accepts (size, layout, events, children)? Read [Keys for New](#guide-newkeys).

> [!note] Next: [The examples](#guide-examples)

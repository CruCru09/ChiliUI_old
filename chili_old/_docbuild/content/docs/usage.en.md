---
title: Basic usage
short: Basic usage
desc: Chili is loaded by api_chili.lua at layer 1000, which gives three rules (no classes at file top level, layer above 1000, a top-level control needs parent) plus one complete minimal window
order: 30
id: usage
---

# Basic usage

Chili is loaded by `LuaUI/Widgets/api_chili.lua`: it puts the whole class table into `WG.Chili`, **does not** create a global `Chili`, and has `layer = 1000`. That leads to three rules you must respect:

1. **Do not grab classes at file top level**: the widget file body runs at the "load stage", before the framework has run Initialize, so `WG.Chili` is nil.
2. **layer must be greater than 1000**: widgets are initialized in ascending `layer` order and `api_chili.lua` is 1000, so your own window widget must come after it.
3. **Top-level controls must pass parent**: [Object:New](#fn-Object-New) only calls AddChild when a parent is present; a control without one is not attached to `Screen0`, so it is never drawn and never receives mouse input.

```lua title="Minimal window widget"
-- api_chili.lua puts the whole Chili class table into WG.Chili (without creating a global Chili); its own layer = 1000
function widget:GetInfo()
  return { name = "Chili Test", layer = 1001, enabled = true } -- 1001 > 1000, ensuring Chili is ready first
end

local Chili, win   -- file top level only declares variables, does not grab classes

function widget:Initialize()
  Chili = WG.Chili                          -- do not use the global Chili; it does not exist
  if not Chili then return end              -- bail out if the framework failed to load, to avoid nil index

  win = Chili.Window:New{
    parent  = Chili.Screen0,                -- KEY: a control without parent is never drawn
    caption = "Example Window",
    x = 100, y = 100, width = 320, height = 180,
    children = {                            -- children automatically AddChild; do not repeat parent
      Chili.Label:New{ caption = "Chili", x = 12, y = 40 },
      Chili.Button:New{
        caption = "Click", x = 12, y = 90, width = 100, height = 26,
        OnClick = { function(self) Spring.Echo("clicked") end },
      },
    },
  }
end
```

> [!note] The generic constructor behaviour is defined by [Object:New](#fn-Object-New) / [Control:New](#fn-Control-New): copy every field of the passed table onto the new instance, handle `children` and `childrenByName`, and trigger the control's layout and draw-cache init. To change the appearance (colors / textures / fonts / padding), change that control's fields in the skin - see the [Skin](#skins) section below.

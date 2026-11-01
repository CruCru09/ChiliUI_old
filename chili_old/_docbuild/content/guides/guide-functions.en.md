---
title: Key functions and common patterns
short: Key functions
desc: Which method should I use to modify the content on the screen?
order: 50
---

# Key functions and common patterns

> [!lead] to change something on screen, which API do I call? Nine times out of ten the answer is in the quick table below; the rest is covered by three copy-paste patterns; and "I changed it but nothing happened" almost always means you hit one of the four mechanics at the end.

The table is organised by what you want to achieve: left is the goal, right is the code to copy.

| What you want | Which method | Copy this |
|---|---|---|
| open a window / close it | <a href="#fn-Object-New"><code>Class:New{}</code></a> / <a href="#fn-Object-Dispose"><code>:Dispose()</code></a> | `win = Chili.Window:New{parent = Chili.Screen0, x = 120, y = 120, width = 400, height = 300}` |
| move / resize / read the size | <a href="#fn-Control-SetPos"><code>:SetPos(x, y, w, h)</code></a>; read `.width` / `.height` | `win:SetPos(200, 140, 360, 300)` |
| hide, then show again | <a href="#fn-Object-SetVisibility"><code>:SetVisibility(b)</code></a> / `:Hide()` / `:Show()` | `win:SetVisibility(false)` |
| put one control above another | <a href="#fn-Object-SetLayer"><code>:SetLayer(n)</code></a> / <a href="#fn-Object-BringToFront"><code>:BringToFront()</code></a> / `:SendToBack()` | `win:BringToFront()` |
| change the displayed text | `Label`/`Button` <a href="#fn-Label-SetCaption"><code>:SetCaption()</code></a>; `EditBox` <a href="#fn-EditBox-SetText"><code>:SetText()</code></a> | `label:SetCaption("new text")` |
| change colour / font | <a href="#prop-Control-backgroundColor"><code>backgroundColor</code></a>, `font`, ... + <a href="#fn-Control-Invalidate"><code>:Invalidate()</code></a> | `label.backgroundColor = {1, 0.8, 0.2, 1} label:Invalidate()` |
| react to a button press | <a href="#prop-Object-OnClick"><code>OnClick</code></a>: a list of functions, several are allowed | `Chili.Button:New{parent = win, OnClick = {function(self) ... end}}` |
| grab a child control | <a href="#fn-Object-GetChildByName"><code>:GetChildByName(name)</code></a> / the `children` array | `local lb = win:GetChildByName("status")` |

Two things do not fit in a table. **Scrolling**: `ScrollPanel:SetScrollPos(x, y)` moves the viewport to (x, y) and clamps to the valid range (pass a huge y to jump to the bottom); `smoothScroll = true` is the default and animates, so pass `forceNotSmooth = true` as the fourth argument to jump immediately. Scrollbars only appear when children extend past the visible area; switch them with `verticalScrollbar` / `horizontalScrollbar`. **Saving settings** is not a Chili feature: `widget:GetConfigData()` returns a table the engine serialises into `LuaUI/Config`, and the engine calls `widget:SetConfigData(data)` the next time your widget is enabled, so just write those values back into the controls there.

## Button click changes a label {#fn-click}

Answer: put a function list in `OnClick` and call `Label:SetCaption()`; you never repaint by hand.

Goal: one click on the button and the label next to it immediately says "clicked N times".

```lua title="Goal: a button that updates a Label caption" hint="Label + Button"
local count = 0
local label = Chili.Label:New{ parent = win, x = 20, y = 46, caption = "not clicked yet" }
Chili.Button:New{
  parent = win, caption = "click me", x = 20, y = 84, width = 120, height = 28,
  OnClick = {
    function(self)
      count = count + 1
      label:SetCaption("clicked " .. count .. " times")  -- does UpdateLayout + Invalidate
    end,
  },
}
```

Note: `Label` has no `SetText()` (that one belongs to `EditBox`). Assigning `label.caption = "x"` does not repaint: you must call `:Invalidate()` yourself, and because `Label` is `autosize` by default a longer or shorter text also needs `:UpdateLayout()` to resize the box. `SetCaption()` does all that for you.

## Make a window draggable {#fn-drag}

Answer: `Window` drags out of the box, `draggable` already defaults to `true`, so there is almost nothing to write.

Goal: press any empty part of the window (not on a button) and drag the whole thing around.

```lua title="Goal: a draggable, non-resizable window" hint="Window"
win = Chili.Window:New{
  parent = Chili.Screen0,
  caption = "drag me",
  x = 120, y = 120, width = 420, height = 260,
  resizable = false,   -- no resize corner any more
  draggable = true,    -- already the default; written out for clarity
}
-- make only the skin's drag box draggable:
win.dragUseGrip = true
```

Note: dragging is built in. Pressing on the window calls `StartDragging()`, and `Control:MouseMove` then does `SetPos(x + dx, y + dy)`, so do not write your own `MouseMove` handler to move a window. A mouse-down consumed by a button never starts a drag. `tweakDraggable` only matters in the engine's tweak mode, not for a normal player UI.

## Refresh a HUD every frame (throttled) {#fn-tick}

Answer: accumulate `dt` inside `widget:Update(dt)` and only touch the control once an interval has passed.

Goal: a label on screen showing game time, updating five times a second is plenty and you do not want to rebuild it every frame.

```lua title="Goal: one HUD line updated every 0.2s" hint="Label + widget:Update"
local acc = 0
local hud = Chili.Label:New{ parent = Chili.Screen0, x = 20, y = 40, caption = "" }
function widget:Update(dt)
  acc = acc + dt
  if acc < 0.2 then return end   -- 5 updates per second looks continuous
  acc = 0
  hud:SetCaption("time " .. math.floor(Spring.GetGameSeconds()))
end
```

Note: `SetCaption` re-measures the text and calls `Invalidate()`, so calling it every frame rebuilds a display list every frame and dozens of such labels will cost you FPS. HUD elements hang off `Chili.Screen0`; dispose them in `widget:Shutdown`.

## Why did the change not have the desired effect? {#fn-why}

Answer: most changes in Chili are not immediate. It caches the drawing, resolves geometric constraints into coordinates, fixes the skin at construction time, and moves hidden children into another table. Hit any of these and the API looks broken.

1. **Drawing is cached; field changes need an explicit invalidation.** Controls default to `useDList = true` and draw themselves into an OpenGL display list. `:Invalidate()` only marks the control dirty and calls `RequestUpdate()`; the real rebuild happens in the next frame's `Update`. So after assigning `backgroundColor`, `caption` or similar you must call `:Invalidate()` yourself. `Set*` methods (`Label:SetCaption`, `Progressbar:SetValue`, ...) already do. Also note `Invalidate` on `Object` is an empty function; only `Control` implements it.
2. **`right` / `bottom` are constraints, not fields.** After `New`, `DetectRelativeBounds` records the constraints you gave and `GetRelativeBox` turns `right` / `bottom` into `x` / `width` (`right = 10` means 10 pixels from the parent's right edge; `"100%"` style values work too). When an axis has only one constraint the other end falls back to `defaultWidth` / `defaultHeight` (`Object` uses 10, `Label` uses 70) -- that is your "the width I set was ignored". `SetPos(x, y, w, h)` writes only these four fields and drops any earlier `right` / `bottom` constraint; `w` / `h` are clamped to `minWidth` / `maxWidth`.
3. **The skin is merged only at New time.** `Control:New` calls `theme.LoadThemeDefaults(obj)` + `SkinHandler.LoadSkin(obj, self)`, filling the instance from `skin.general` and `skin.<ClassName>`. Changing `skinName` or swapping the theme afterwards never re-skins the control -- either pass `skinName` when creating it, or `Dispose()` and rebuild.
4. **Hidden controls leave the children array.** `SetVisibility(false)` goes through `parent:HideChild()`, which moves the control into `children_hidden`, so `ipairs(win.children)` and `#win.children` no longer see it (`GetChildByName` does search the hidden table, so it still finds it). `SetParent` also resets `visible` to `true` -- that is the "it reappeared after I re-parented it" effect. If you need `OnShow` / `OnHide` callbacks use `Show()` / `Hide()`; `SetVisibility` only flips the state and fires no events.

<p class="note" id="fn-next">Next: read <a href="#guide-faq">FAQ and pitfalls</a> </p>

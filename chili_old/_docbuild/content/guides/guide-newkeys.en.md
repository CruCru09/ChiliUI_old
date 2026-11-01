---
title: What you can pass to New
short: Keys for New
desc: Every key a New table really accepts: structural keys (parent / children / name), geometry keys (x / y / width / height / right / bottom) and percentages, why they behave that way (the merge only fills empty slots, geometry keys are constraints, case correction only covers class properties), plus the four most common traps
order: 20
---

# What you can pass to New?

> [!lead] **what keys can you actually put into `Class:New{...}`?**
>
> The short answer: **the class's own properties + the ones it inherits + a set of keys every control understands** (structural keys, geometry keys, clientWidth, ...). Those generic keys are documented nowhere else — they are all here.

## 1. Structural keys: parent/children/name {#nk-struct}

The short version: where a control lives, what it is called and what sits inside it are all settled in the New table — you never call AddChild yourself.

**What you want:** build a window, mount it on the screen, give it a name and two child controls, in one call.

```lua title="Goal: window/name/child controls" hint="Window"
local win = Window:New{
  parent = Chili.Screen0,   -- required for a top-level control, else it is an orphan
  name   = "mainwin",       -- later: win:GetChildByName("mainwin")
  x = 120, y = 90, width = 420, height = 280,
  children = { Button:New{ x = 8, y = 8, width = 80, height = 24 } },
}
```

| Key | What it does | If omitted |
|---|---|---|
| `parent` | The control it hangs under; same as calling `parent:AddChild(self)` right after construction | An orphan: never drawn, never gets the mouse. Top-level controls need `Chili.Screen0` |
| `children` | Array of child controls `{a, b, c}`; the order is the stacking order (later ones on top) | No children. Writing it as a key/value table fails silently |
| `name` | Control name, used by `GetChildByName` and debug output | Auto-generated as "classname + counter". A duplicate name under the same parent raises an error |
| `classname` | Picks which skin applies (`skin[classname]`) | The class's own classname |
| `clientWidth` / `clientHeight` | Size of the client area (where content may draw); the framework adds padding back to get width / height | Computed as width / height minus padding |
| `minimumSize` | Old form `{w, h}`, equivalent to minWidth + minHeight | nil, so the minWidth / minHeight defaults apply |

> [!note] The six size/position keys (`x / y / width / height / right / bottom`) are the next section. Iterate children with `ipairs(win.children)`, never `pairs`.

## 2. Geometry keys: fixed / pinned right / stretched / percentage {#nk-geometry}

The short version: positions do not have to be pixels. Horizontally `x / width / right` — pick two; vertically `y / height / bottom` — pick two. The framework computes the one you left out.

**What you want:** a button of fixed size at a fixed spot.

```lua title="Goal: fixed size and position" hint="Button"
local ok = Button:New{
  parent = win, x = 8, y = 232, width = 120, height = 24,
  caption = "OK",
}
```

**What you want:** a close button that always sits 8 pixels from the window's right edge.

```lua title="Goal: pinned to the parent's right edge" hint="Button"
local close = Button:New{
  parent = win, right = 8, y = 8, width = 80, height = 24,
  caption = "Close",
}
-- no x given: x = parent client width - 80 - 8
```

**What you want:** an edit box glued to both edges, growing and shrinking with the window.

```lua title="Goal: stretch left to right" hint="EditBox"
local bar = EditBox:New{
  parent = win, x = 8, right = 8, y = 40, height = 24,
}
-- no width given: width = parent client width - 8 - 8
```

**What you want:** a panel that is always half the window wide.

```lua title="Goal: percentage of the parent" hint="Panel"
local half = Panel:New{
  parent = win, x = 0, width = "50%", y = 0, height = 120,
}
-- any string is a percentage; x / y / width / height all accept it
```

> [!note] Writing right or a percentage stores a constraint that is recomputed whenever the parent changes; a negative number measures from the right, so `x = -120` means "parent width - 120".

## 3. three mechanisms that decide what New does! {#nk-why}

The short version: New does not store your table as-is — it does a few things you would not guess, and those are the root cause of "I set the key and nothing happened".

**① Table values are merged layer by layer, and merging only fills empty slots.** Control:New loads the theme and skin first, then Object:New fills in the class defaults with `table.merge`; merge skips any slot that already has a value, so **whatever you wrote always wins**. Arrays are filled by position: `padding = {10}` becomes `{10, 5, 5, 5}`, not 10 on every side.

**② Geometry keys are constraints: recorded at New time, turned into coordinates later from the parent's size.** right / bottom, percentages and negative numbers all go into `_relativeBounds` and are recomputed when the parent resizes — that is what makes them better than hard pixels.

```lua title="Why pinning right follows the window: the constraint is recomputed" hint="Control"
local bar = EditBox:New{ parent = win, x = 8, right = 8, y = 40, height = 24 }
win:Resize(800, 600)   -- parent got wider, bar.width is recomputed
bar:SetPos(20)         -- a numeric x: the right constraint is dropped, it is no longer pinned
```

**③ Case correction only covers class properties.** `Object:New` turns your `Padding` into `padding`; but nothing corrects generic keys such as `x / width / right`, so a misspelling fails silently.

## 4. Four traps worth remembering {#nk-traps}

The short version: all four of the following look right and do nothing. The fix is right after each one.

**What you want:** centre a control, hide it by default, reorder its stacking, or make the content area exactly some width — none of that is a New key.

1. **There is no center / dock / anchor key.** Either compute `x = (win.clientWidth - 200) / 2` once the parent exists, or use a percentage like `x = "25%"`; for automatic layout use [LayoutPanel](#cls-LayoutPanel) / [Grid](#cls-Grid).
2. **`visible = false` in New does not work**: when the control is mounted, `Object:SetParent` forces `visible = true`. Call `ctrl:Hide()` after construction instead.
3. **There is no `layer` key.** Stacking is just the order inside the parent's children array; use `ctrl:SetLayer(5)` / `:BringToFront()`, and the control must already have a parent.
4. **When the parent drives your size, use `clientWidth`.** For a content area exactly 200 wide, set `clientWidth = 200` and let the framework add padding back; hand-computing it from padding breaks as soon as the skin or font changes.

> [!warn] If a key seems ignored, check this section first: wrong capitalisation of a class property is corrected for you, a misspelled generic key is not — and nothing reports it.

## 5. Next {#nk-next}

With the keys right, the next step is reading and writing fields on a control, and making it move with the window.

> [!note] Next: [reading and writing fields](#guide-uses), and [runnable examples](#guide-examples).

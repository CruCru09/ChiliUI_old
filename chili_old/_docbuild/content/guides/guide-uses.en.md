---
title: "Fields read and written"
short: Method fields
desc: "Those chips are neither parameters nor a property list: they are a static scan of self./obj. references in the body, and this page covers how they are computed, three real examples, why the list is partial, and when to trust them"
order: 30
---

# Fields read and written

> [!lead] The details of the method are shown in the row of small squares below. The fields read and written in the source code are **not parameters of the method**, nor **are they the attributes of this control**. They only answer one question: **Which fields of the control were accessed and read or written in this function's code?** The parameters are in parentheses, the attributes are in the above attribute table, and the squares represent what this code has done.

## Parameters live in the parentheses, fields live in the chips {#uses-vs-params}

Parameters are the values you pass when you call the method. Fields are properties on the control itself (`width`, `caption`, `color`...). The chips count the `self.xxx` references inside the function body.

```lua title="parameters and fields" hint="Control:SetPos"
-- x y w h in the parentheses are PARAMETERS
function Control:SetPos(x, y, w, h)
  self.width = w   -- width is a FIELD: written here
  self.x     = x   -- x is a FIELD: written here
end
-- so the chips for SetPos are: x w  y w  width w  height w  (w = written)
```

## How it is computed {#uses-how}

When the documentation is built (`_docbuild/parse.cjs`), four steps run for every `function`, as pure text processing (no Lua is executed):

1. Cut out the function body: from the `function` line, count `function`/`do`/`repeat` against `end` until they balance.
2. Find `self.fieldName` and `obj.fieldName` inside the body (only these two prefixes are recognised).
3. Look at what follows the reference: a single `=` (not `==`) counts as **write w**, everything else counts as **read r**.
4. A field that is both read and written becomes `rw`.

So it is an index of "which method touches which field", not a hand-written description.

## Example 1: pin a button to the right edge {#uses-eg-right}

**What you want:** the button stays on the right side of the window and follows when the window gets wider.

`SetPos` with hard-coded coordinates does not work: its chips contain no `right`, it only writes x/width. Give `right` to New instead.

```lua title="pinned-right button" hint="Button"
-- wrong: stops hugging the edge as soon as the window is resized
btn:SetPos(300, 10, 80, 24)

-- right: give right and width only, x is computed for you
local btn = Button:New{
  parent = win, right = 8, y = 8, width = 80, height = 24,
  caption = "Close",
}
```

> [!note] Why: `right` is resolved into `x` in `Control:DetectRelativeBounds` (that method's chips do contain `right rw`); `SetPos` does not do that job. If a field is missing from the chips, that method simply does not look at it.

## Example 2: why visible = false in New does nothing {#uses-eg-visible}

**What you want:** build the window now, show it later.

When the control is attached to its parent, `Object:SetParent` writes `visible` to true - its chips contain `visible w`.

```lua title="start hidden" hint="Window"
local win = Window:New{ parent = Chili.Screen0, visible = false }  -- reset to true
win:Hide()   -- hide it after construction: this one works
```

## Example 3: SetValue versus setting the field {#uses-eg-value}

**What you want:** set a progress bar to 50%.

```lua title="set progress" hint="Progressbar"
bar:SetValue(0.5)   -- chips: value rw + OnChange r -> your OnChange fires
bar.value = 0.5     -- field only, no callback
bar:Invalidate()    -- after setting the field, redraw if you want it visible now
```

`rw` means read-then-write (the typical setter); `OnChange r` means the method only reads that table to call it.

## How to read the chips (three lines) {#uses-read}

- **Coloured**: `r` read-only (it will not change your value), `w` gets written (your value may be overwritten), `rw` read and written (a setter).
- **Grey `_` prefix**: framework-internal field (for example `_relativeBounds`), do not set it yourself.
- **No chip at all**: this function touches no field directly (`Control:Resize` just forwards to SetPos); that does not make it useless.

## Why the list looks partial {#uses-limits}

It only scans this one function body, so the following are expected, not missing data:

- **Only `self.` / `obj.`**: `win.width`, `parent.x` and local variables such as `t.width` are not counted.
- **Fields changed by another method are not credited here**: if A calls B, whatever B changes is listed under B. That is why `Control:Resize` has an empty chip row.
- **Nested tables are recorded by their first key**: `self.font.size` is recorded as `font`.
- **A whole-table `table.merge` counts once**: tables such as `font` / `skin` poured in at once are recorded only by the table name.

## How it relates to "usable properties" {#uses-vs-table}

One sentence: **the property table answers "what can I set on this control" (complete), the chips answer "what does this method touch" (a subset).**

## When is it worth watching? {#uses-use}

1. Which field must I set before calling a method? Look at what it **reads**.
2. Why did my value get overwritten? Look at who **writes** it.
3. Do I have to redraw afterwards? Look for `_needRedraw` or an `OnChange` call.

> [!note] Next: to write all these keys at once in New, see [What you can pass to New](#guide-newkeys); to search methods by "what I want to do", see [Key functions and common patterns](#guide-functions); for the property list of a control, see [Class index](#class-index).

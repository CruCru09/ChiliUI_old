---
title: How to read this page
short: How to read
desc: A tour of every section: property tables, inherited properties, universal keys, the class index, properties x methods, method field chips, skins, events, init timing and visibility
order: 20
id: howto
---

# How to read this page

Every part of the reference page has a fixed place. When looking up a class, read the **property table** first to see what you can pass at construction, then the **method details** to see how to call it. The table below explains what each remaining section answers, and why some tables only appear on a couple of class pages.

| Section | Content |
| --- | --- |
| Property table | Fields declared by the class itself: **property name / type / default / description**. When constructing an object, pass these names directly in the `Class:New{ ... }` table. |
| Inherited properties | Fields the class does not redeclare but inherits from its parent class; shown collapsed, with the class they come from. |
| Universal keys | **Declared by no class yet accepted by every control**: structure keys `parent / children / name / classname / clientWidth / clientHeight`, geometry keys `x / y / width / height / right / bottom` (from [Control](#cls-Control) down). **The full tables live on [Object](#cls-Object) (structure keys) and [Control](#cls-Control) (structure + geometry keys) only**; the other 26 class pages just carry a one-line pointer - the keys are identical for every control, so repeating them 28 times would only make the page longer. Full rules: [What you can pass to New](#guide-newkeys). |
| Class index | All 28 classes side by side: parent, own / total properties, own / total methods, skin blocks and a one-line purpose - use it to pick the class you need, then open the details. See [the class index](#class-index). |
| Properties x methods | Answers the two questions people ask most: **is a property only valid for some methods** (no - every property is readable and writable on any instance), and **which fields does a method read or write** (a per-class method -> fields table produced by static scanning). See [Properties x methods](#props-methods). |
| Method fields | The chips under every method detail ("fields read / written in the source") are **not a property list**: they are a static scan of the `self.x` / `obj.x` references inside that function body - r = read, w = written, rw = both, a leading `_` means a framework-internal field. They only cover the fields the method touches directly, which is why the list looks partial. Full explanation, legend, limits and the difference from the property table: [Fields read and written](#guide-uses). |
| Skins | The actual fields of all 11 bundled skins, the three ways to switch (global / per class / per control), writing your own set, and why changing the theme does not restyle existing controls. Guide: [Skins](#guide-skins); runnable demo: `chili_demo_09_skins.lua`. |
| Methods / Functions | `Class:Method(...)` denotes an instance method (called with a colon; `self` is passed automatically and omitted from the parameter list); `Class.Static(...)` denotes a static function called with a dot. Every function lists its parameters and return value. |
| Events | Properties named `On*` are event tables; write them as `OnClick = { function(self) ... end }` at construction. When the event fires, every function in the table is called in order. |
| Init timing | The widget file body runs at the **load stage** (at that point `WG.Chili` is still nil); the class table only exists after `api_chili.lua` has been initialized. Widgets are initialized in ascending `layer` order, so a widget that uses Chili must set `layer` to `> 1000`. |
| Visibility | A top-level control must set `parent = Chili.Screen0`. [Object:New](#fn-Object-New) only calls AddChild when a parent is present; an orphan control is never drawn and never receives mouse input. |
| Helper modules | Global / table functions in `Handlers/`, `Headers/`, `core.lua` and `Themes/` that do not belong to a control class. |
| Skin | The per-control skin fields (color, texture, font, ...) in `Skins/*/skin.lua`; they decide the actual appearance of each control. |

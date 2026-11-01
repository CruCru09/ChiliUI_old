---
title: FAQ
short: FAQ
desc: Invisible windows, nil errors, changes that do not repaint, events firing during construction, frame drops
order: 60
---

# FAQ

> [!lead] Use the "phenomenon" index to identify the pitfalls. First, search for the phenomenon you encountered, then look at the causes and solutions. Each item is marked with the relevant class/function. Click the link to return to the corresponding page to check the details. (The order is roughly arranged according to the probability of encountering pitfalls when beginners start.)

## First three things to check {#faq-first}

:::html
<details class="faq" open><summary>1. The window is completely invisible</summary><div class="faqbody">
<ol>
  <li><b>No <code>parent</code>.</b> <code>Object:New</code> only calls <code>AddChild</code> when a parent is given; an orphan control is never
      drawn and gets no mouse input. A top-level window needs <code>parent = Chili.Screen0</code>.</li>
  <li><b><code>layer &lt;= 1000</code>.</b> Widgets initialise in ascending layer order and <code>api_chili.lua</code> is 1000, so your
      <code>Initialize</code> ran while <code>WG.Chili</code> was still nil and the widget quietly returned.</li>
  <li><b><code>enabled = false</code>.</b> Most demo files ship disabled; tick them in the widget list or change <code>enabled</code> in
      <code>GetInfo</code>.</li>
</ol>
<p>Debug order: <code>Spring.Echo</code> checkpoints > is <code>WG.Chili</code> non-nil → is <code>win.visible</code> true and is
<code>win.x/win.y</code> inside the screen?</p>
</div></details>
:::

:::html
<details class="faq"><summary>2. <code>attempt to index global 'Chili' (a nil value)</code></summary><div class="faqbody">
<p>You grabbed the class table at <b>file scope</b>. Widget files are executed during the load stage, before the framework exists.
Declare <code>local Chili</code> at the top and assign <code>Chili = WG.Chili</code> inside <code>widget:Initialize()</code>.</p>
<p>The same applies to <code>local Window = Chili.Window</code> — if you want such locals, create them in <code>Initialize</code>.</p>
</div></details>
:::

:::html
<details class="faq"><summary>3. <code>attempt to index field 'Screen0' (a nil value)</code> / <code>WG.Chili</code> is nil</summary><div class="faqbody">
<p>The framework did not load — not your widget's fault. Search <code>infolog.txt</code> for the first <code>Error</code> mentioning
<code>Chili Framework</code>. Common causes: <code>chili_old/</code> not next to <code>api_chili.lua</code>, a missing file inside
<code>chili_old/</code>, or missing engine APIs when porting (see <a href="PORTING.md">PORTING.md</a>).</p>
<p>If both <code>chili/</code> and <code>chili_old/</code> are installed, the loader picks one by config. Both loaders are named
<code>Chili Framework</code>, so only one should be active.</p>
</div></details>
:::

## Nothing appears / appears wrong {#faq-paint}

:::html
<details class="faq"><summary>1. I changed a colour or a caption and nothing repaints</summary><div class="faqbody">
<p>Controls default to <code>useDList = true</code>, caching themselves in an OpenGL display list. After a direct field assignment,
invalidate that cache:</p>
:::

```lua title="Repaint after a field change" hint="Control:Invalidate"
label.caption = "new text"
label:SetCaption("new text")   -- better: Set* handles the repaint
panel.backgroundColor = {1, 0, 0, 1}
panel:Invalidate()                -- required after assigning a field
```

:::html
<p>See <a href="#fn-Control-Invalidate"><code>Control:Invalidate</code></a>. If the control sits inside a hidden parent, invalidating will
not make it appear — show the parent.</p>
</div></details>
:::

:::html
<details class="faq"><summary>2. I set <code>width = 300</code> and the width did not change</summary><div class="faqbody">
<p><code>x/y/width/height</code> are <b>layout constraints</b>: each axis needs two of them to resolve, and with only one the control falls back to
<code>defaultWidth</code>/<code>defaultHeight</code>.</p>
<ul>
  <li>x axis: <code>x + width</code>, or <code>right + width</code>, or <code>x + right</code></li>
  <li>y axis: <code>y + height</code>, or <code>bottom + height</code>, or <code>y + bottom</code></li>
</ul>
<p>Second common cause: the control is inside a <code>StackPanel</code>/<code>Grid</code> with <code>resizeItems = true</code>, so the
container decides the size.</p>
</div></details>
:::

:::html
<details class="faq"><summary>3. Everything is crammed into the top-left corner / overlapping</summary><div class="faqbody">
<p>Child coordinates are relative to the parent's client area (title bar and border removed). When adding children to a
<code>Window</code>, start around <code>y = 30</code>, or the title bar covers them. Also check for a missing <code>y</code> — the default is 0,
which stacks everything.</p>
<p>Debug trick: give controls a temporary <code>backgroundColor</code> to see the area they really occupy.</p>
</div></details>
:::

:::html
<details class="faq"><summary>4. My child sizes are ignored inside StackPanel / Grid</summary><div class="faqbody">
<p>That is what <code>resizeItems = true</code> means: the panel divides its client area into columns × rows cells and each child fills one.
A single-column <code>StackPanel</code> gives every child the <b>same height and full width</b>; a single-row one gives equal widths and full height.</p>
<p>For free sizing use a plain <code>Panel</code> with absolute coordinates, or set <code>resizeItems = false</code> and place children yourself.</p>
</div></details>
:::

:::html
<details class="faq"><summary>5. Controls in a named <code>children</code> table never show up</summary><div class="faqbody">
<p><code>Object:New</code> only iterates the <b>array part</b> of <code>children</code> (<code>for i = 1, #children</code>); named keys are silently
ignored. Use a plain array: <code>children = { Chili.Label:New{...}, Chili.Button:New{...} }</code>.</p>
</div></details>
:::

:::html
<details class="faq"><summary>6. <code>AddChild: a child with the name 'xxx' already exists</code></summary><div class="faqbody">
<p><a href="#fn-Object-AddChild"><code>Object:AddChild</code></a> raises an error when <code>childrenByName</code> already holds that name.
<code>New</code> generates a unique name per instance (class name + counter), so collisions only happen when you hard-code
<code>name = "row"</code> and add a second one.</p>
<p>Append an index to fixed names (<code>name = "row_" .. i</code>), or leave <code>name</code> out entirely.</p>
</div></details>
:::

:::html
<details class="faq"><summary>7. Chinese (or other non-Latin) text renders as boxes</summary><div class="faqbody">
<p>The default font is <code>FreeSansBold.otf</code> (see <a href="#cls-Font">Font</a>) and may not contain CJK glyphs. Switch to a font that does:
<code>font = { font = "YourCJKFont.otf", size = 14 }</code>, with the font file placed where the VFS can read it (for example
<code>LuaUI/Fonts/</code>). Also save your Lua file as <b>UTF-8 without BOM</b>, or the text arrives already mangled.</p>
</div></details>
:::

## Events {#faq-event}

:::html
<details class="faq"><summary>1. My event fires during construction and the callback finds nil controls</summary><div class="faqbody">
<p>Three classes fire events from inside <code>New</code>:</p>
<ul>
  <li><b>TabBar</b>: <code>New</code> ends with <code>obj:Select(selected)</code> → one <code>OnChange(self, tabname)</code>;</li>
  <li><b>ComboBox</b>: <code>New</code> calls <code>obj:Select(obj.selected or 1)</code> → <code>OnSelect(self, idx, true)</code>;</li>
  <li><b>TreeView</b>: <code>New</code> calls <code>obj:Select(selected or 1)</code> → <code>OnSelectNode(self, node, old)</code>.</li>
</ul>
<p>So every callback that touches a control created later must nil-guard it: <code>if not preview then return end</code>.
The demo widgets do exactly that.</p>
</div></details>
:::

:::html
<details class="faq"><summary>2. In Checkbox's <code>OnChange</code>, <code>self.checked</code> is the old value</summary><div class="faqbody">
<p><code>Checkbox:Toggle</code> notifies listeners with the <b>new</b> state first and flips <code>self.checked</code> afterwards, so inside the
callback the field still holds the previous value. Use the argument <code>newChecked</code>.</p>
</div></details>
:::

:::html
<details class="faq"><summary>3. Dragging a Trackbar freezes the game / stack overflow</summary><div class="faqbody">
<p>Almost always recursion: the <code>OnChange</code> handler calls <code>trackbar:SetValue(...)</code> and <code>SetValue</code> fires
<code>OnChange</code> <b>every time</b>, even when the value does not change. Keep the handler to other controls, or guard the loop:</p>
:::

```lua title="Guard the loop with a flag" hint="Trackbar OnChange"
local syncing = false
trackbar.OnChange = { function(self, v)
  if syncing then return end
  syncing = true
  other:SetValue(v)      -- will fire once more, but the flag stops it
  syncing = false
end }
```

:::html
</div></details>
:::

:::html
<details class="faq"><summary>4. Progressbar's <code>OnChange</code> sometimes does not fire</summary><div class="faqbody">
<p><code>Progressbar:SetValue</code> only notifies when the value <b>really changed</b> (Trackbar differs — it notifies every time). This is
deliberate, so per-frame updates of an unchanged value do not flood your handlers. If you need a reaction every call, do it in your own code.</p>
</div></details>
:::

:::html
<details class="faq"><summary>5. <code>Progressbar:SetValue(v)</code> does not update the text</summary><div class="faqbody">
<p><code>SetValue</code> only sets the number. Set the caption explicitly with <code>:SetCaption("60%")</code>, or call
<code>:SetValue(v, true)</code> to have the number written into the caption.</p>
</div></details>
:::

:::html
<details class="faq"><summary>6. Does EditBox have an <code>OnTextChange</code> event?</summary><div class="faqbody">
<p>No. Read the content with <a href="#fn-EditBox-GetText"><code>:GetText()</code></a> (multi-line boxes return lines joined by <code>\n</code>).
For live reaction use <code>OnKeyPress</code>, or simply read when the user confirms.</p>
</div></details>
:::

## Shutdown, reload, performance {#faq-close}

:::html
<details class="faq"><summary>1. The window stays on screen after the widget is disabled</summary><div class="faqbody">
<p><code>Shutdown</code> never disposed the top-level window. Add it:</p>
:::

```lua title="Dispose the window in Shutdown" hint="widget:Shutdown"
function widget:Shutdown()
  if win then win:Dispose() end
  win = nil
end
```

:::html
<p>Without it the control objects stay parented to <code>Screen0</code> and still receive the mouse.</p>
</div></details>
:::

:::html
<details class="faq"><summary>2. Two windows appear after <code>/luaui reload</code></summary><div class="faqbody">
<p>You are creating the UI more than once, usually by calling <code>build_ui()</code> from <code>Update</code> or another recurring callback.
Build only in <code>Initialize</code>, and make sure <code>Shutdown</code> disposes. A defensive
<code>if win then win:Dispose() end</code> before building also works.</p>
</div></details>
:::

:::html
<details class="faq"><summary>3. The widget is not loaded at all / gets disabled automatically</summary><div class="faqbody">
<p>LuaUI disables widgets that throw during load or initialisation. Look in <code>infolog.txt</code> for
<code>[widgets.lua] Error:</code> or <code>Removed widget: &lt;your name&gt;</code>, then scroll up to the first error, which normally carries the
<b>file and line number</b>.</p>
<p>Frequent messages: "attempt to call a nil value" (misspelled method or wrong class) and "attempt to index nil" (see the entries above).</p>
</div></details>
:::

:::html
<details class="faq"><summary>4. The UI stutters / frame rate drops</summary><div class="faqbody">
<ul>
  <li><b>Do not touch controls every frame.</b> <code>SetCaption</code>/<code>SetValue</code> re-trigger layout and repaint; throttle to
      0.2–0.5 s with an accumulated timer (demo 06).</li>
  <li><b>Skip unchanged values:</b> <code>if text ~= last then label:SetCaption(text); last = text end</code>.</li>
  <li><b>Update big lists incrementally</b> instead of clearing and rebuilding them each frame.</li>
  <li><b>Do not swap <code>Image.file</code> every frame</b> — that reloads the texture.</li>
</ul>
</div></details>
:::

:::html
<details class="faq"><summary>5. Buttons do not receive clicks / the mouse passes through</summary><div class="faqbody">
<p>Hit testing is rectangle-based and follows draw order: higher layers and later children get the mouse first. Check for:</p>
<ul>
  <li>an invisible full-size <code>Panel</code> on top swallowing the clicks;</li>
  <li>a control positioned outside its parent's client area (clipped visually but still holding a rectangle);</li>
  <li>decoration overlays that should not take input — see <code>hitTest</code> / <code>disableChildrenHitTest</code> on the base classes.</li>
</ul>
</div></details>
:::

:::html
<details class="faq"><summary>6. The window cannot be dragged or resized</summary><div class="faqbody">
<p><code>Window.draggable</code> and <code>Window.resizable</code> are both <code>false</code> by default — switch them on explicitly.
Dragging a window normally means dragging its title bar; with <code>dragUseGrip = true</code> only the grip area works, so set it to
<code>false</code> if "drag from anywhere" is what you want. In tweak (UI-edit) mode the relevant flags are
<code>tweakDraggable</code>/<code>tweakResizable</code>.</p>
</div></details>
:::

## Misc {#faq-misc}

:::html
<details class="faq"><summary>7. How do I pin a window to the right edge / keep it there on resize?</summary><div class="faqbody">
<p>Use relative constraints <code>right</code>/<code>bottom</code> (see the "layout constraints" section of
<a href="#guide-start">Getting started</a>): <code>right = 20, width = 280, y = 20, height = 200</code>.
To re-place descendants when the window itself is resized, react to <code>OnResize(self, cw, ch)</code>.</p>
</div></details>
:::

:::html
<details class="faq"><summary>8. How do I debug the UI?</summary><div class="faqbody">
<ul>
  <li><code>Spring.Echo</code> plus <code>infolog.txt</code>;</li>
  <li><code>dbg_chili_inspector.lua</code> and <code>dbg_chili_profiler.lua</code> in the widgets folder — enable one and read its own header for usage;</li>
  <li>print the tree: <code>for i,c in ipairs(win.children) do Spring.Echo(i, c.classname, c.name, c.x, c.y) end</code>;</li>
  <li><code>/luaui reload</code> re-runs your widget without restarting the game.</li>
</ul>
</div></details>
:::

:::html
<details class="faq"><summary>9. I edited the framework sources — do I need to regenerate this document?</summary><div class="faqbody">
<p>Yes. The document is generated from source: double-click <code>build-docs.bat</code> in the <code>chili_old/</code> folder
(a Chinese-named copy of the same script sits next to it), which runs <code>parse.cjs</code> and rebuilds both language versions.
If you only change descriptions, edit <code>_docbuild/desc/*.json</code> (Chinese) and <code>_docbuild/desc_en/*.json</code> (English).</p>
</div></details>
:::

:::html
<details class="faq"><summary>10. Using this framework in another game</summary><div class="faqbody">
<p>Copy <code>api_chili.lua</code> and the whole <code>chili_old/</code> folder into the target game's <code>LuaUI/Widgets/</code>. Path and
ZK-dependency compatibility has already been handled here (<code>Headers/zkcompat.lua</code>). For the full procedure, including what to do
when the target already ships Chili, see <a href="PORTING.md">PORTING.md</a> and the <a href="#porting">porting section</a> of this document.</p>
</div></details>
:::

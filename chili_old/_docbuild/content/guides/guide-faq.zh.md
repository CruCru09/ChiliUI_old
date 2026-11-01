---
title: 常见问题
short: 常见问题
desc: 窗口看不到、报错 nil、改了属性不重绘、事件在构造期触发、性能掉帧……
order: 60
---

# 常见问题与避坑

> [!lead] 按"现象"索引踩坑点，先搜你遇到的现象，再看原因和改法。每条都标了相关类/函数，点链接回对应页面查细节。（顺序大致按新手上手时踩坑的概率排。）

## 最先看的三条 {#faq-first}

:::html
<details class="faq" open><summary>1 窗口完全看不到</summary><div class="faqbody">
<ol>
  <li><b>没写 <code>parent</code></b>：<code>Object:New</code> 只在传了 parent 时才 AddChild，没有 parent 的控件是孤儿，不绘制、不响应鼠标。
      顶层窗口必须 <code>parent = Chili.Screen0</code>。</li>
  <li><b><code>layer &lt;= 1000</code></b>：widget 按 layer 升序 Initialize，<code>api_chili.lua</code> 是 1000；你的 layer 更小的话
      Initialize 时 <code>WG.Chili</code> 还是 nil，通常接着就在 <code>if not Chili then return end</code> 里安静退出了。</li>
  <li><b><code>enabled = false</code></b>：示例文件大多默认关闭，要去 Widget 列表里手动勾选，或把 <code>GetInfo</code> 里的
      <code>enabled</code> 改成 <code>true</code>。</li>
</ol>
<p>排查顺序：<code>Spring.Echo</code> 打点 > 看 <code>WG.Chili</code> 是否有值 → 看窗口的 <code>win.visible</code>、<code>win.x/y</code> 是否在屏幕外。</p>
</div></details>
:::

:::html
<details class="faq"><summary>2 报错 <code>attempt to index global 'Chili' (a nil value)</code></summary><div class="faqbody">
<p>在<b>文件顶层</b>取了类。widget 文件体在"加载阶段"执行，那时框架还没初始化。正确做法：顶层只声明 <code>local Chili</code>，
在 <code>widget:Initialize()</code> 里 <code>Chili = WG.Chili</code>。</p>
<p>同理不要写 <code>local Window = Chili.Window</code> 这种顶层赋值；要写也在 Initialize 里写。</p>
</div></details>
:::

:::html
<details class="faq"><summary>3 报错 <code>attempt to index field 'Screen0' (a nil value)</code> / <code>WG.Chili</code> 是 nil</summary><div class="faqbody">
<p>框架没加载起来（不是你的 widget 的问题）。看 <code>infolog.txt</code> 里 <code>Chili Framework</code> 相关的第一条 Error；
常见原因：<code>chili_old/</code> 与 <code>api_chili.lua</code> 不在同一层、<code>chili_old/</code> 缺文件、或者目标游戏缺引擎 API（移植时看 <a href="PORTING.md">PORTING.md</a>）。</p>
<p>如果你装了 <code>chili/</code> 和 <code>chili_old/</code> 两套，加载器会按配置选一套；两套的 widget 名都叫 <code>Chili Framework</code>，
只应该保留一份加载器。</p>
</div></details>
:::

## 画不出来/画得不对 {#faq-paint}

:::html
<details class="faq"><summary>1 改了颜色/文字，界面上没变化</summary><div class="faqbody">
<p>控件默认 <code>useDList = true</code>，把自己缓存进 OpenGL display list。直接改字段后要让它失效：</p>
:::

```lua title="改字段后让界面重绘" hint="Control:Invalidate"
label.caption = "新文字"
label:SetCaption("新文字")   -- 更好：Set* 内部已处理重绘
panel.backgroundColor = {1, 0, 0, 1}
panel:Invalidate()                -- 直接改字段后必须手动调
```

:::html
<p>参考 <a href="#fn-Control-Invalidate"><code>Control:Invalidate</code></a>。如果控件在隐藏的父控件里，Invalidate 也不会让它出现 - 先 Show 父控件。</p>
</div></details>
:::

:::html
<details class="faq"><summary>2 我写了 <code>width = 300</code>，宽度却没生效</summary><div class="faqbody">
<p>原因是 <code>x/y/width/height</code> 是<b>布局约束</b>：每一轴至少要有 2 个约束才能解出矩形，只有一个时会退回 <code>defaultWidth</code>/<code>defaultHeight</code>。</p>
<ul>
  <li>x 轴要两项：<code>x + width</code> 或 <code>right + width</code> 或 <code>x + right</code></li>
  <li>y 轴要两项：<code>y + height</code> 或 <code>bottom + height</code> 或 <code>y + bottom</code></li>
</ul>
<p>另一个常见原因：控件在 <code>StackPanel</code>/<code>Grid</code> 里（<code>resizeItems = true</code>），尺寸由布局面板算，子控件的 width/height 被覆盖。</p>
</div></details>
:::

:::html
<details class="faq"><summary>3 所有控件都挤在左上角 / 位置重叠</summary><div class="faqbody">
<p>子控件的坐标是<b>相对父控件</b>的客户区（去掉标题栏和边框）。给 <code>Window</code> 加子控件时从 <code>y = 30</code> 左右开始，
否则会被标题栏盖住。另外检查是不是漏写了 <code>y</code>（默认 0，全叠在一起）。</p>
<p>调试诀窍：给每个控件临时加 <code>backgroundColor</code> 看它实际占的区域。</p>
</div></details>
:::

:::html
<details class="faq"><summary>4 StackPanel / Grid 里子控件尺寸被改掉了</summary><div class="faqbody">
<p>这就是 <code>resizeItems = true</code> 的定义：面板把客户区等分成 columns×rows 个格子，每个子控件占一格。
<code>StackPanel</code> 单列时每项<b>等高、宽度拉满</b>；单行时每项<b>等宽、高度拉满</b>。</p>
<p>要自由尺寸：改用普通 <code>Panel</code> + 绝对坐标，或设 <code>resizeItems = false</code> 并自己摆位置。</p>
</div></details>
:::

:::html
<details class="faq"><summary>5 <code>children = { a = ..., b = ... }</code> 里的控件没出现</summary><div class="faqbody">
<p><code>Object:New</code> 只遍历 <code>children</code> 的<b>数组部分</b>（<code>for i = 1, #children</code>），命名 key 会被静默忽略。
必须写成 <code>children = { Chili.Label:New{...}, Chili.Button:New{...} }</code> 这种纯数组。</p>
</div></details>
:::

:::html
<details class="faq"><summary>6 报错 <code>AddChild: a child with the name 'xxx' already exists</code></summary><div class="faqbody">
<p><a href="#fn-Object-AddChild"><code>Object:AddChild</code></a> 遇到 <code>childrenByName</code> 里已有的同名控件会直接 <code>error()</code>。
<code>New</code> 会给每个实例自动生成唯一 name（类名 + 自增号），一般不会撞；但如果你手写 <code>name = "row"</code>，加第二个就炸。</p>
<p>要固定的名字就加后缀（<code>name = "row_" .. i</code>），或者干脆不写 name。</p>
</div></details>
:::

:::html
<details class="faq"><summary>7 中文字显示成方块/缺字</summary><div class="faqbody">
<p>默认字体是 <code>FreeSansBold.otf</code>（见 <a href="#cls-Font">Font</a>），是否含中文字形取决于你游戏里的字体文件。
中文界面通常要换一个含 CJK 的字体：<code>font = { font = "YourCJKFont.otf", size = 14 }</code>，字体文件放在 <code>LuaUI/Fonts/</code> 或 VFS 可读路径。
另外注意文件本身要存成 <b>UTF-8（无 BOM）</b>，否则中文会变乱码。</p>
</div></details>
:::

## 事件相关 {#faq-event}

:::html
<details class="faq"><summary>1 构造时就触发了我的事件，回调里控件还是 nil</summary><div class="faqbody">
<p>三个类在 <code>New</code> 内部就会主动触发事件：</p>
<ul>
  <li><b>TabBar</b>：<code>New</code> 末尾 <code>obj:Select(selected)</code> → 触发一次 <code>OnChange(self, tabname)</code>；</li>
  <li><b>ComboBox</b>：<code>New</code> 里 <code>obj:Select(obj.selected or 1)</code> → 触发 <code>OnSelect(self, idx, true)</code>；</li>
  <li><b>TreeView</b>：<code>New</code> 里 <code>obj:Select(selected or 1)</code> → 触发 <code>OnSelectNode(self, node, old)</code>。</li>
</ul>
<p>所以回调里凡是访问"后面才创建"的控件，都必须判空：<code>if not preview then return end</code>。示例 02/03 里都有这种写法。</p>
</div></details>
:::

:::html
<details class="faq"><summary>2 Checkbox 的 <code>OnChange</code> 里 <code>self.checked</code> 是旧值</summary><div class="faqbody">
<p><code>Checkbox:Toggle</code> 的顺序是"先 CallListeners(OnChange, 新值)，再翻转 <code>self.checked</code>"，
所以回调执行时字段还是旧值。判断新状态请用参数 <code>newChecked</code>（示例 02 有演示）。</p>
</div></details>
:::

:::html
<details class="faq"><summary>3 拖动 Trackbar 直接卡死 / 栈溢出</summary><div class="faqbody">
<p>多半是在 <code>OnChange</code> 里又调 <code>trackbar:SetValue(...)</code>：<code>SetValue</code> 每次都会触发 <code>OnChange</code>（哪怕值没变），
于是无限递归。正确做法：回调里只更新别的控件；要同步另一个滑条时用一个 <code>syncing</code> 标志位挡住回环。</p>
:::

```lua title="用标志位挡住回环" hint="Trackbar OnChange"
local syncing = false
trackbar.OnChange = { function(self, v)
  if syncing then return end
  syncing = true
  other:SetValue(v)      -- 会再触发一次 OnChange，但被 syncing 拦住
  syncing = false
end }
```

:::html
</div></details>
:::

:::html
<details class="faq"><summary>4 Progressbar 的 <code>OnChange</code> 有时不触发</summary><div class="faqbody">
<p><code>Progressbar:SetValue</code> 只在<b>值真的变化</b>时触发 <code>OnChange</code>（Trackbar 不是，它每次都触发）。这是设计如此，
避免每帧刷同一数值时刷屏。要每次都响应，就在自己的逻辑里处理，不要依赖这个事件。</p>
</div></details>
:::

:::html
<details class="faq"><summary>5 <code>Progressbar:SetValue(v)</code> 后文字没变</summary><div class="faqbody">
<p><code>SetValue</code> 只管数值。改文字用 <code>:SetCaption("60%")</code>，或者 <code>:SetValue(v, true)</code> 让它顺手把 caption 设成数值。</p>
</div></details>
:::

:::html
<details class="faq"><summary>6 EditBox 没有 <code>OnTextChange</code> 事件？</summary><div class="faqbody">
<p>对，它没有。取内容用 <a href="#fn-EditBox-GetText"><code>:GetText()</code></a>（多行会拼成带 <code>
</code> 的字符串）。
需要"边输入边响应"就用 <code>OnKeyPress</code> 自己判断，或者只在用户点"确定"时读。</p>
</div></details>
:::

## 关闭/重载/性能 {#faq-close}

:::html
<details class="faq"><summary>1 关掉 widget 后窗口还在屏幕上</summary><div class="faqbody">
<p><code>Shutdown</code> 里没有 Dispose 顶层窗口。补上：</p>
:::

```lua title="Shutdown 里 Dispose 窗口" hint="widget:Shutdown"
function widget:Shutdown()
  if win then win:Dispose() end
  win = nil
end
```

:::html
<p>不 Dispose 的话控件对象还挂在 <code>Screen0</code> 上，鼠标还能点到它。</p>
</div></details>
:::

:::html
<details class="faq"><summary>2 <code>/luaui reload</code> 之后出现两个窗口</summary><div class="faqbody">
<p>每次都新建窗口却没清理旧的。通常是<b>在 <code>Update</code>/其他回调里重复 </b><code>build_ui()</code>；
把建界面的逻辑只放在 <code>Initialize</code> 里，并保证 <code>Shutdown</code> 会 Dispose。</p>
<p>开发时也可以用 <code>if win then win:Dispose() end</code> 在建之前先清一次，防御性写法。</p>
</div></details>
:::

:::html
<details class="faq"><summary>3 widget 根本没被加载 / 被自动禁用</summary><div class="faqbody">
<p>LuaUI 里 widget 抛错会被自动禁用，日志形如 <code>[widgets.lua] Error: ...</code> 或 <code>Removed widget: 你的名字</code>。
打开 <code>infolog.txt</code> 往上翻第一条 Error，通常带着<b>文件与行号</b>。</p>
<p>常见："attempt to call a nil value"（方法名拼错/类选错）、"attempt to index nil"（见前面几条）。</p>
</div></details>
:::

:::html
<details class="faq"><summary>4 界面卡顿/掉帧</summary><div class="faqbody">
<ul>
  <li><b>别每帧改控件</b>：<code>SetCaption</code>/<code>SetValue</code> 会触发重排重绘，用累加时间节流到 0.2~0.5 秒（示例 06）。</li>
  <li><b>值没变就别设</b>：<code>if text ~= last then label:SetCaption(text); last = text end</code>。</li>
  <li><b>大列表增量更新</b>：不要每帧清空重建；只改变化的行，或分页。</li>
  <li><b>贴图别每帧换</b>：<code>Image.file</code> 变了会重新加载纹理。</li>
</ul>
</div></details>
:::

:::html
<details class="faq"><summary>5 按钮点不到/鼠标穿透/被别的控件挡住</summary><div class="faqbody">
<p>命中测试是按控件矩形 + 层级顺序来的：后加/层级高的先收到鼠标。检查：</p>
<ul>
  <li>是不是有透明的大 Panel 盖在上面（看不见但吃鼠标）；</li>
  <li>控件是不是在父控件客户区之外（被裁掉了但矩形还在）；</li>
  <li>需要"不挡鼠标"的装饰层，可以看类页面里 <code>hitTest</code> / <code>disableChildrenHitTest</code> 相关字段。</li>
</ul>
</div></details>
:::

:::html
<details class="faq"><summary>6 窗口拖不动/缩放不了</summary><div class="faqbody">
<p><code>Window</code> 的 <code>draggable</code> 与 <code>resizable</code> 默认都是 <code>false</code>，要显式打开。
另外整窗拖动需要抓标题栏，想"点哪里都能拖"设 <code>dragUseGrip = false</code>（默认就是 false，但若你设过 true 就只能抓手柄）。
Tweak 模式（界面编辑）下拖动另有 <code>tweakDraggable</code>/<code>tweakResizable</code> 开关。</p>
</div></details>
:::

## 其它 {#faq-misc}

:::html
<details class="faq"><summary>7 怎么让窗口贴着屏幕右边/随分辨率变化</summary><div class="faqbody">
<p>用相对约束 <code>right</code>/<code>bottom</code>，见 <a href="#guide-start">新手起步</a> 的"位置约束"一节：
<code>right = 20, width = 280, y = 20, height = 200</code>。跟随窗口自身缩放则用 <code>OnResize(self, cw, ch)</code> 重算子控件位置。</p>
</div></details>
:::

:::html
<details class="faq"><summary>8 怎么调试界面？</summary><div class="faqbody">
<ul>
  <li><code>Spring.Echo</code> 打日志，看 <code>infolog.txt</code>；</li>
  <li>目录里有 <code>dbg_chili_inspector.lua</code>、<code>dbg_chili_profiler.lua</code>，可以在游戏里查看控件树/性能（启用后看它们自己的说明）；</li>
  <li>打印控件树：<code>for i,c in ipairs(win.children) do Spring.Echo(i, c.classname, c.name, c.x, c.y) end</code>；</li>
  <li>改完代码 <code>/luaui reload</code> 最快，不用退游戏。</li>
</ul>
</div></details>
:::

:::html
<details class="faq"><summary>9 我改了 <code>chili_old</code> 里的源码，文档要不要重生成？</summary><div class="faqbody">
<p>要。文档是从源码自动解析的：在 <code>chili_old/</code> 目录双击 <code>构建文档.bat</code>（等价 <code>build-docs.bat</code>），
会重新跑 <code>parse.cjs</code> → 生成中英文两份 HTML。只改解释文字的话，改 <code>_docbuild/desc/*.json</code>（中文）与
<code>_docbuild/desc_en/*.json</code>（英文）即可。</p>
</div></details>
:::

:::html
<details class="faq"><summary>10 想把chili用到别的游戏里</summary><div class="faqbody">
<p>复制 <code>api_chili.lua</code> + 整个 <code>chili_old/</code> 到目标游戏 <code>LuaUI/Widgets/</code> 下；目录路径和 ZK 依赖已在本项目里做过兼容（<code>Headers/zkcompat.lua</code>）。
详细步骤、目标游戏已有 chili 时怎么处理、启动后怎么自检，见 <a href="PORTING.md">PORTING.md</a> 与本文档 <a href="#porting">移植到其他游戏</a>。</p>
</div></details>
:::

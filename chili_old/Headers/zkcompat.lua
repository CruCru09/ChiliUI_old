--------------------------------------------------------------------------------
-- zkcompat.lua
--
-- 本文件是给「从 Zero-K 拷出来的 chili_old」补的兼容垫片。
-- Zero-K 在自己的 LuaUI/LuaRules 工具层里、在 chili 之前定义了三样东西：
--   * Spring.Utilities.CopyTable(tbl, deep, appendTo)   —— 表拷贝
--   * Spring.ScaledGetMouseState()                      —— 按 WG.uiScale 折算的鼠标坐标
--   * Spring.Orig.GetViewSizes / GetWindowGeometry ...  —— 未经缩放的原始尺寸
-- 普通的 Spring / Recoil 游戏没有这一层，于是会出现：
--   * Skins/Blueprint/skin.lua:116、Skins/Carbon/skin.lua:165/171、
--     Skins/Evolved/skin.lua:438/442/457/461 调用 Spring.Utilities.CopyTable
--     → "attempt to index field 'Utilities' (a nil value)"
--   * Widgets/api_chili.lua 的 IsAbove / MousePress / MouseRelease / MouseMove /
--     MouseWheel 调用 Spring.ScaledGetMouseState（引擎不提供，ZK 才加）
-- 这些错误会中断 core.lua 的 include 链，让 Chili Framework 整个被移除，UI 不显示。
--
-- 这里只补最小可用实现；若运行环境已经提供了同名函数（例如整个 ZK 一起拷过来），
-- 本文件不会覆盖。
--------------------------------------------------------------------------------

local SpringUtilities = Spring.Utilities
if (not SpringUtilities) then
  SpringUtilities = {}
  Spring.Utilities = SpringUtilities
end

-- 与 ZK 的 Spring.Utilities.CopyTable 签名一致：
--   CopyTable(t)              浅拷贝
--   CopyTable(t, true)        深拷贝（不支持循环引用）
--   CopyTable(t, deep, dst)   拷贝到已有表 dst 里
if (not SpringUtilities.CopyTable) then
  function SpringUtilities.CopyTable(tbl, deep, appendTo)
    local copy = appendTo or {}
    for key, value in pairs(tbl) do
      if (deep and type(value) == "table") then
        copy[key] = SpringUtilities.CopyTable(value, true)
      else
        copy[key] = value
      end
    end
    return copy
  end
end

-- 按 WG.uiScale 折算的鼠标状态；界面缩放为 1（默认）时与 Spring.GetMouseState 等价
if (not Spring.ScaledGetMouseState) then
  function Spring.ScaledGetMouseState()
    local mx, my, lmb, mmb, rmb, offscreen = Spring.GetMouseState()
    local scale = (WG and WG.uiScale) or 1
    return mx / scale, my / scale, lmb, mmb, rmb, offscreen
  end
end

-- Recoil 引擎里没有 Spring.GetViewSizes（只有 gl.GetViewSizes），但 chili 的
-- Controls/screen.lua（Screen:New、WorldToScreen 等 7 处）依赖它，这里补一个转发。
if (not Spring.GetViewSizes) then
  local glGetViewSizes = gl and gl.GetViewSizes
  function Spring.GetViewSizes()
    if (glGetViewSizes) then
      return glGetViewSizes()
    end
    local vsx, vsy = Spring.GetViewGeometry()
    return vsx, vsy
  end
end

-- 未缩放的窗口/视口尺寸；只有改动界面缩放（api_chili.lua 的 RecvLuaMsg 分支）才用得到
if (not Spring.Orig) then
  local glGetViewSizes = gl and gl.GetViewSizes
  Spring.Orig = {
    GetViewSizes = function()
      if (glGetViewSizes) then
        return glGetViewSizes()
      end
      return Spring.GetViewSizes()
    end,
    GetWindowGeometry = function()
      if (Spring.GetWindowGeometry) then
        return Spring.GetWindowGeometry()
      end
      local vsx, vsy = glGetViewSizes()
      return vsx, vsy, 0, 0
    end,
    GetViewGeometry = function()
      if (Spring.GetViewGeometry) then
        return Spring.GetViewGeometry()
      end
      local vsx, vsy = glGetViewSizes()
      return vsx, vsy, 0, 0
    end,
  }
end

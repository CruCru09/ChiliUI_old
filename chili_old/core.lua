local includes = {
  --"headers/autolocalizer.lua",
  "headers/zkcompat.lua", -- 兼容层：补 Spring.Utilities / Spring.ScaledGetMouseState（普通引擎没有）
  "headers/util.lua",
  "headers/links.lua",
  "headers/backwardcompability.lua",
  "headers/unicode.lua",
  
  "handlers/debughandler.lua",
  "handlers/taskhandler.lua",
  "handlers/skinhandler.lua",
  "handlers/themehandler.lua",
  "handlers/fonthandler.lua",
  "handlers/texturehandler.lua",

  "controls/object.lua",
  "controls/font.lua",
  "controls/control.lua",
  "controls/screen.lua",
  "controls/window.lua",
  "controls/label.lua",
  "controls/button.lua",
  "controls/editbox.lua",
  "controls/textbox.lua", -- uses editbox
  "controls/checkbox.lua",
  "controls/trackbar.lua",
  "controls/colorbars.lua",
  "controls/scrollpanel.lua",
  "controls/image.lua",
  "controls/layoutpanel.lua",
  "controls/grid.lua",
  "controls/stackpanel.lua",
  "controls/imagelistview.lua",
  "controls/progressbar.lua",
  "controls/multiprogressbar.lua",
  "controls/scale.lua",
  "controls/panel.lua",
  "controls/treeviewnode.lua",
  "controls/treeview.lua",
  "controls/line.lua",
  "controls/combobox.lua",
  "controls/tabbaritem.lua",
  "controls/tabbar.lua",
}

local Chili = widget

-- 目录自解析：即使调用方没先设置 CHILI_DIRNAME（例如别的 widget 直接 VFS.Include 本文件），
-- 也从 core.lua 自己的路径推导出来，于是这套框架放在任意目录/任意游戏里都能用。
local selfSource = debug and debug.getinfo(1, "S") and debug.getinfo(1, "S").source
local selfDir = selfSource and selfSource:gsub("(.*/)(.*)", "%1")

CHILI_DIRNAME = CHILI_DIRNAME or selfDir or ((LUAUI_DIRNAME or "LuaUI/") .. "Widgets/chili_old/")
Chili.CHILI_DIRNAME = CHILI_DIRNAME
Chili.SKIN_DIRNAME  = SKIN_DIRNAME or (CHILI_DIRNAME .. "skins/")

if (-1>0) then
  Chili = {}
  -- make the table strict
  VFS.Include(Chili.CHILI_DIRNAME .. "headers/strict.lua")(Chili, widget)
end

for _, file in ipairs(includes) do
  VFS.Include(Chili.CHILI_DIRNAME .. file, Chili, VFS.RAW_FIRST)
end


return Chili

--[[ -----------------------------------------------------------------------
  chili_demo_00_template.lua -- 复制本文件,作为你自己widget的起点 [Copy this file as the starting point for your own widget.]
----------------------------------------------------------------------- ]]

function widget:GetInfo()
  return {
    name    = "Chili Demo 00 Template",
    desc    = "A basic Chili template",
    author  = "You",
    date    = "A wonderful day",
    license = "GNU GPL v2 or later",
    layer   = 1019,
    enabled = false,
  }
end

local Chili        -- = WG.Chili,在Initialize里赋值
local win          -- 顶层窗口(Shutdown 时记得 Dispose) [Top-level window (Remember to Dispose when shutting down)]
local statusLabel  -- 需要动态更新的控件 [Controls that require dynamic updates]

local clicks = 0

local function Echo(msg)
  Spring.Echo("[Chili Demo 00] " .. msg)
end

-- 只在Initialize里调用一次 [Call only once in the Initialize function.]
local function build_ui()
  win = Chili.Window:New{
    parent    = Chili.Screen0,
    caption   = "Template Window",
    x = 220, y = 220, width = 380, height = 190,
    resizable = false,
    draggable = true,
  }

  statusLabel = Chili.Label:New{
    parent  = win,
    name    = "status",          -- 起了名字就能用 win:GetChildByName("status") 找到它
    caption = "Replace this with your own content.",
    x = 16, y = 44, width = 340,
  }

  Chili.Button:New{
    parent = win,
    caption = "Click me", --点我
    x = 16, y = 90, width = 110, height = 28,
    OnClick = {
      function(self)
        clicks = clicks + 1
        statusLabel:SetCaption("The button was clicked. " .. clicks .. "")
        Echo("button clicked,count = " .. clicks)
      end,
    },
  }

  Chili.Button:New{
    parent = win,
    caption = "Close Window", --关闭窗口
    x = 246, y = 130, width = 110, height = 28,
    OnClick = {
      function(self)
        if win then win:Dispose() end
        win = nil
      end,
    },
  }
end

function widget:Initialize()
  Chili = WG.Chili
  if not Chili or not Chili.Screen0 then
    Echo("WG.Chili inexistence:Chili Framework(api_chili.lua)Failed to load. Please check infolog.txt")
    return
  end
  build_ui()
end

function widget:Shutdown()
  if win then win:Dispose() end
  win = nil
  statusLabel = nil
end

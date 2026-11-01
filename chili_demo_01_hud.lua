--[[ 
  [cn] chili_demo_06_hud.lua -- 稍复杂的实时HUD(每帧/定时刷新) 
  [en] A slightly more complex real-time HUD (refreshed every frame/timing)

  [cn] 这个例子里界面会自己动:
  [en] In this example, the interface will move by itself:
  
    * [cn] 用 widget:Update(dt) 做定时刷新（这里节流到每 0.25 秒一次，避免每帧都改控件）；
    * [en] Use widget:Update(dt) for periodic refreshing (here, throttled to occur every 0.25 seconds to avoid modifying the control every frame);
    
    * [cn] 从Spring API取实时数据:Spring.GetGameSeconds / Spring.GetGameFrame /
      Spring.GetSelectedUnits；
    * [en] Retrieving real-time data from the Spring API: Spring.GetGameSeconds / Spring.GetGameFrame /
    
    * [cn] 窗口固定在屏幕右上角:用right=20这种相对约束,屏幕分辨率变了也跟着走;
    * [en] The window is fixed at the top right corner of the screen: Using a "relative constraint"like"right=20", the window will move along with any changes in the screen resolution.
    
    * [cn] 折叠/展开:改一组子控件的可见性;
    * [en] Fold/Unfold: Change the visibility of a group of child controls;
    
    * [cn] 关闭后重开:Shutdown里Dispose、Initialize里重建.
    * [en] Close and then reopen: Dispose in the shutdown process, rebuild in the initialize process.

  [cn] 性能提醒:改控件属性(SetCaption/SetValue)会触发重排/重绘,能少改就少改,并且一定要节流,不要每帧都SetCaption.
  [en] Performance reminder: Modifying the properties of this control (SetCaption/SetValue) will trigger reordering/repainting. Try to make changes as little as possible, and always throttle the process. Do not set the caption every frame.
 ]]

function widget:GetInfo()
  return {
    name    = "Chili Demo 01 HUD",
    desc    = "Real-time HUD example",
    author  = "You",
    date    = "A wonderful day",
    license = "GNU GPL v2 or later",
    layer   = 1025,
    enabled = false,
  }
end

local Chili
local win
local timeLabel, unitLabel, frameLabel, bar
local bodyPanel          -- 折叠时整体隐藏 [It is hidden completely when folded.]
local collapsed = false
local acc = 0            -- 累计时间,用来节流 [Cumulative time, used for throttling]
local INTERVAL = 0.25    -- 每0.25秒刷新一次界面 [The interface is refreshed every 0.25 seconds.]

local function echo(msg) Spring.Echo("[Chili Demo 01] " .. msg) end

local function fmtTime(seconds)
  seconds = math.max(0, math.floor(seconds))
  return string.format("%02d:%02d", math.floor(seconds / 60), seconds % 60)
end

-- 把当前游戏状态刷到界面上(只有这里会碰控件)
local function refresh()
  local t = Spring.GetGameSeconds and Spring.GetGameSeconds() or 0
  local frame = Spring.GetGameFrame and Spring.GetGameFrame() or 0
  local selected = Spring.GetSelectedUnits and #Spring.GetSelectedUnits() or 0

  if timeLabel  then timeLabel:SetCaption("Time:" .. fmtTime(t)) end
  if frameLabel then frameLabel:SetCaption("Frame number:" .. tostring(frame)) end
  if unitLabel  then unitLabel:SetCaption("Selected unit:" .. tostring(selected) .. " ") end
  if bar then
    -- Progressbar:SetValue(值是否顺便把caption设成值)
    bar:SetValue(t % 60, false)
    bar:SetCaption(fmtTime(t))
  end
end

local function setCollapsed(state)
  collapsed = state
  if bodyPanel then bodyPanel:SetVisibility(not state) end
  if win then
    win:Resize(win.width, state and 74 or 186)
  end
end

local function build_ui()
  -- 
  win = Chili.Window:New{
    parent    = Chili.Screen0,
    caption   = "HUD Example",
    right     = 20, y = 20,
    width     = 280, height = 186,
    resizable = false,
    draggable = true,
    padding   = { 6, 6, 6, 6 },
  }

  timeLabel = Chili.Label:New{
    parent  = win,
    caption = "time:00:00",
    x = 10, y = 32, width = 250,
    font = { size = 14, color = {0.85, 0.95, 1, 1} },
  }

  bodyPanel = Chili.Panel:New{
    parent = win,
    x = 6, y = 56, width = 268, height = 120,
    backgroundColor = { 0, 0, 0, 0 },
  }

  frameLabel = Chili.Label:New{
    parent = bodyPanel, caption = "Frame:0",
    x = 10, y = 2, width = 250,
  }
  unitLabel = Chili.Label:New{
    parent = bodyPanel, caption = "Selected unit:0",
    x = 10, y = 24, width = 250,
  }
  bar = Chili.Progressbar:New{
    parent = bodyPanel,
    x = 10, y = 50, width = 240, height = 20,
    min = 0, max = 60, value = 0,
    caption = "00:00",
  }
  Chili.Button:New{
    parent = bodyPanel, caption = "Fold",
    x = 10, y = 80, width = 80, height = 24,
    OnClick = {
      function(self)
        setCollapsed(not collapsed)
        self:SetCaption(collapsed and "Expand" or "Fold")
      end,
    },
  }
  Chili.Button:New{
    parent = bodyPanel, caption = "Turn off the HUD",
    x = 100, y = 80, width = 100, height = 24,
    OnClick = {
      function(self)
        if win then win:Dispose() end
        win = nil
        echo("HUD has been closed (the widget is still enabled. You can rebuild it by reloading /luaui or reopening the widget.)")
      end,
    },
  }
end

function widget:Initialize()
  Chili = WG.Chili
  if not Chili or not Chili.Screen0 then
    Spring.Echo("[Chili Demo 01] WG.Chili does not exist: The Chili Framework (api_chili.lua) failed to load successfully")
    return
  end
  build_ui()
  refresh()
end

-- 每帧调用:dt 是距上一帧的秒数
function widget:Update(dt)
  if not win then return end
  acc = acc + (dt or 0)
  if acc < INTERVAL then return end
  acc = 0
  refresh()
end

function widget:Shutdown()
  if win then win:Dispose() end
  win = nil
  bodyPanel = nil
  timeLabel = nil; unitLabel = nil; frameLabel = nil; bar = nil
end

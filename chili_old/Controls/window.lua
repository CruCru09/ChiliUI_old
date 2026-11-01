Window = Control:Inherit{
  classname = 'window',
  resizable = true,
  draggable = true,
  bringToFrontOnClick = true,
  noFont = true,

  minWidth  = 50,
  minHeight = 50,
  defaultWidth  = 400,
  defaultHeight = 300,
}

local this = Window
local inherited = this.inherited

--//=============================================================================
--[[
function Window:UpdateClientArea()
  inherited.UpdateClientArea(self)

  if (not WG['blur_api']) then return end

  if (self.blurId) then
    WG['blur_api'].RemoveBlurRect(self.blurId)
  end

  local screeny = select(2,gl.GetViewSizes()) - self.y

  self.blurId = WG['blur_api'].InsertBlurRect(self.x,screeny,self.x+self.width,screeny-self.height)
end
--]]
--//=============================================================================

function Window:New(obj)
  if obj.noFont == nil and obj.caption then
    obj.noFont = false
  end
  obj = inherited.New(self,obj)
  obj:BringToFront()
  return obj
end

function Window:DrawControl()
  --// gets overriden by the skin/theme
end

function Window:MouseDown(...)
  if self.bringToFrontOnClick then
    self:BringToFront()
  end
  return inherited.MouseDown(self,...)
end

VFS.Include(CHILI_DIRNAME .. "headers/skinutils.lua", nil, VFS.RAW_FIRST)

function Window:TweakDraw()
  gl.Color(0.6,1,0.6,0.65)

  local x = self.x
  local y = self.y
  local w = self.width
  local h = self.height

  -- 贴图路径跟随框架实际所在目录（原代码写死 "LuaUI/Widgets/chili/..."，
  -- 一旦把 chili_old 改名或搬到别的游戏里就找不到这张图）
  local overlayPath = CHILI_DIRNAME .. "skins/default/tweak_overlay.png"
  if (self.resizable or self.tweakResizable) then
    TextureHandler.LoadTexture(0, CHILI_DIRNAME .. "skins/default/tweak_overlay_resizable.png", self)
  else
    TextureHandler.LoadTexture(0, overlayPath, self)
  end
    local texInfo = gl.TextureInfo(overlayPath) or {xsize=1, ysize=1}
    local tw,th = texInfo.xsize, texInfo.ysize

    gl.BeginEnd(GL.TRIANGLE_STRIP, _DrawTiledTexture, x,y,w,h, 31,31,31,31, tw,th, 0)
  gl.Texture(0,false)
end

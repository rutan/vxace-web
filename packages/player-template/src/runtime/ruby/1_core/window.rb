require 'js'
require 'json'

class Window
  def initialize(x = 0, y = 0, width = 0, height = 0, viewport = nil)
    @viewport = viewport
    @__window_id = JS.global[:rubyBridge][:app].createWindow(viewport&.__viewport_id).to_i
    @z = 100
    @ox = 0
    @oy = 0
    @windowskin = nil
    @contents = Bitmap.new(1, 1)
    @cursor_rect = Rect.new
    @active = true
    @visible = true
    @arrows_visible = true
    @pause = false
    @padding = 12
    @padding_bottom = 12
    @opacity = 255
    @back_opacity = 192
    @contents_opacity = 255
    @openness = 255
    @tone = Tone.new
    bind_tone(@tone)
    @disposed = false
    write_property('x', x.to_i)
    write_property('y', y.to_i)
    write_property('windowWidth', width.to_i)
    write_property('windowHeight', height.to_i)
    write_property('zIndex', @z)
    write_property('active', @active)
    write_property('visible', @visible)
    write_property('padding', @padding)
    write_property('paddingBottom', @padding_bottom)
    write_property('arrowsVisible', @arrows_visible)
    write_property('pause', @pause)
    write_property('opacity', @opacity)
    write_property('backOpacity', @back_opacity)
    write_property('contentsOpacity', @contents_opacity)
    write_property('openness', @openness)
    self.ox = @ox
    self.oy = @oy
    sync_cursor_rect
    sync_tone
    JS.global[:rubyBridge][:app].setContentsToWindow(@__window_id, @contents.__bitmap_id)
  end

  def viewport
    @viewport
  end

  def viewport=(value)
    @viewport = value
    JS.global[:rubyBridge][:app].setViewport('window', @__window_id, value&.__viewport_id)
  end

  def x = read_property('x').to_i

  def x=(value)
    write_property('x', value.to_i)
  end

  def y = read_property('y').to_i

  def y=(value)
    write_property('y', value.to_i)
  end

  def z = read_property('zIndex').to_i

  def z=(value)
    write_property('zIndex', value.to_i)
  end

  def ox
    @ox
  end

  def ox=(value)
    value = value.to_i
    return if @ox == value

    @ox = value
    write_property('ox', @ox)
    sync_cursor_rect
  end

  def oy
    @oy
  end

  def oy=(value)
    value = value.to_i
    return if @oy == value

    @oy = value
    write_property('oy', @oy)
    sync_cursor_rect
  end

  def width = read_property('windowWidth').to_i

  def width=(value)
    write_property('windowWidth', value.to_i)
    sync_cursor_rect
  end

  def height = read_property('windowHeight').to_i

  def height=(value)
    write_property('windowHeight', value.to_i)
    sync_cursor_rect
  end

  attr_reader :windowskin, :contents, :cursor_rect

  def windowskin=(bitmap)
    @windowskin = bitmap
    bitmap_id = bitmap&.__bitmap_id
    JS.global[:rubyBridge][:app].setWindowskinToWindow(@__window_id, bitmap_id)
  end

  def contents=(bitmap)
    @contents = bitmap
    bitmap_id = bitmap&.__bitmap_id
    JS.global[:rubyBridge][:app].setContentsToWindow(@__window_id, bitmap_id)
  end

  def cursor_rect=(rect)
    @cursor_rect = rect || Rect.new
    @cursor_rect.__on_change = proc { sync_cursor_rect }
    sync_cursor_rect
  end

  def tone
    @tone
  end

  def tone=(value)
    @tone = value || Tone.new
    bind_tone(@tone)
    sync_tone
  end

  def active
    @active
  end

  def active=(value)
    value = !!value
    return if @active == value

    @active = value
    write_property('active', @active)
  end

  def visible
    @visible
  end

  def visible=(value)
    value = !!value
    return if @visible == value

    @visible = value
    write_property('visible', @visible)
  end

  def padding
    @padding
  end

  def padding=(value)
    value = value.to_i
    return if @padding == value

    @padding = value
    write_property('padding', @padding)
    sync_cursor_rect
  end

  def padding_bottom
    @padding_bottom
  end

  def padding_bottom=(value)
    value = value.to_i
    return if @padding_bottom == value

    @padding_bottom = value
    write_property('paddingBottom', @padding_bottom)
  end

  def arrows_visible
    @arrows_visible
  end

  def arrows_visible=(value)
    value = !!value
    return if @arrows_visible == value

    @arrows_visible = value
    write_property('arrowsVisible', @arrows_visible)
  end

  def pause
    @pause
  end

  def pause=(value)
    value = !!value
    return if @pause == value

    @pause = value
    write_property('pause', @pause)
  end

  def opacity
    @opacity
  end

  def opacity=(value)
    value = clamp_channel(value)
    return if @opacity == value

    @opacity = value
    write_property('opacity', @opacity)
  end

  def back_opacity
    @back_opacity
  end

  def back_opacity=(value)
    value = clamp_channel(value)
    return if @back_opacity == value

    @back_opacity = value
    write_property('backOpacity', @back_opacity)
  end

  def contents_opacity
    @contents_opacity
  end

  def contents_opacity=(value)
    value = clamp_channel(value)
    return if @contents_opacity == value

    @contents_opacity = value
    write_property('contentsOpacity', @contents_opacity)
  end

  def openness
    @openness
  end

  def openness=(value)
    value = clamp_channel(value)
    return if @openness == value

    @openness = value
    write_property('openness', @openness)
  end

  def dispose
    return if @disposed

    JS.global[:rubyBridge][:app].disposeObject('window', @__window_id)
    @disposed = true
  end

  def disposed?
    @disposed
  end

  def update
    sync_cursor_rect
  end

  def move(x, y, width, height)
    self.x = x
    self.y = y
    self.width = width
    self.height = height
  end

  def open?
    self.openness == 255
  end

  def close?
    self.openness == 0
  end

  def open
    self.openness = 255
  end

  def close
    self.openness = 0
  end

  def show
    self.visible = true
  end

  def hide
    self.visible = false
  end

  def activate
    self.active = true
  end

  def deactivate
    self.active = false
  end

  def contents_width
    [self.width - @padding * 2, 1].max
  end

  def contents_height
    [self.height - @padding - @padding_bottom, 1].max
  end

  private

  def sync_cursor_rect
    return unless @cursor_rect

    cursor_rect = [@cursor_rect.x.to_i, @cursor_rect.y.to_i, @cursor_rect.width.to_i, @cursor_rect.height.to_i]
    return if @__last_cursor_rect == cursor_rect

    @__last_cursor_rect = cursor_rect
    JS.global[:rubyBridge][:app].setCursorRectToWindow(
      @__window_id,
      cursor_rect[0],
      cursor_rect[1],
      cursor_rect[2],
      cursor_rect[3]
    )
  end

  def sync_tone
    tone = [@tone.red.to_i, @tone.green.to_i, @tone.blue.to_i, @tone.gray.to_i]
    return if @__last_tone == tone

    @__last_tone = tone
    JS.global[:rubyBridge][:app].setToneToWindow(
      @__window_id,
      JSON.generate({
        red: tone[0],
        green: tone[1],
        blue: tone[2],
        gray: tone[3]
      })
    )
  end

  def read_property(prop)
    return @__property_cache[prop] if @__property_cache&.key?(prop)

    JS.global[:rubyBridge][:app].getProperty('window', @__window_id, prop)
  end

  def write_property(prop, value)
    @__property_cache ||= {}
    return if @__property_cache.key?(prop) && @__property_cache[prop] == value

    @__property_cache[prop] = value
    JS.global[:rubyBridge][:app].setProperty('window', @__window_id, prop, value)
  end

  def clamp_channel(value)
    [[value.to_i, 0].max, 255].min
  end

  def bind_tone(tone)
    tone.__on_change = proc { sync_tone }
  end
end

require 'js'
require 'json'

class Viewport
  def initialize(*args)
    @__viewport_id = JS.global[:rubyBridge][:app].createViewport.to_i
    if args.size == 0
      @rect = Rect.new(0, 0, Graphics.width, Graphics.height)
    elsif args.size == 1
      @rect = args[0]
    else
      @rect = Rect.new(args[0], args[1], args[2], args[3])
    end
    @color = Color.new
    @tone = Tone.new
    bind_rect(@rect)
    bind_color(@color)
    bind_tone(@tone)
    @visible = true
    @z = 0
    @ox = 0
    @oy = 0
    @disposed = false
    RPGVXAceWeb::RGSSObjectLifecycle.register_finalizer(self, 'viewport', @__viewport_id)
    sync_all
  end

  attr_reader :__viewport_id, :rect, :color, :tone

  def rect=(value)
    @rect = value || Rect.new
    bind_rect(@rect)
    sync_rect
  end

  def visible
    @visible
  end

  def visible=(value)
    @visible = !!value
    write_property('visible', @visible)
  end

  def z
    @z
  end

  def z=(value)
    @z = value.to_i
    write_property('zIndex', @z)
  end

  def ox
    @ox
  end

  def ox=(value)
    @ox = value.to_i
    write_property('ox', @ox)
  end

  def oy
    @oy
  end

  def oy=(value)
    @oy = value.to_i
    write_property('oy', @oy)
  end

  def color=(value)
    @color = value || Color.new
    bind_color(@color)
    sync_color
  end

  def tone=(value)
    @tone = value || Tone.new
    bind_tone(@tone)
    sync_tone
  end

  def dispose
    return if @disposed

    JS.global[:rubyBridge][:app].disposeObject('viewport', @__viewport_id)
    @disposed = true
  end

  def disposed?
    @disposed
  end

  def flash(color, duration)
    payload =
      if color
        {
          red: color.red.to_i,
          green: color.green.to_i,
          blue: color.blue.to_i,
          alpha: color.alpha.to_i
        }
      end
    JS.global[:rubyBridge][:app].setFlashToViewport(@__viewport_id, JSON.generate(payload), duration.to_i)
  end

  def update
    JS.global[:rubyBridge][:app].updateViewportEffects(@__viewport_id)
  end

  private

  def sync_all
    sync_rect
    self.visible = @visible
    self.z = @z
    self.ox = @ox
    self.oy = @oy
    sync_color
    sync_tone
  end

  def sync_rect
    rect = [@rect.x.to_i, @rect.y.to_i, @rect.width.to_i, @rect.height.to_i]
    return if @__last_rect == rect

    @__last_rect = rect
    JS.global[:rubyBridge][:app].setRectToViewport(
      @__viewport_id,
      rect[0],
      rect[1],
      rect[2],
      rect[3]
    )
  end

  def sync_color
    color = [@color.red.to_i, @color.green.to_i, @color.blue.to_i, @color.alpha.to_i]
    return if @__last_color == color

    @__last_color = color
    JS.global[:rubyBridge][:app].setColorToViewport(
      @__viewport_id,
      JSON.generate({
        red: color[0],
        green: color[1],
        blue: color[2],
        alpha: color[3]
      })
    )
  end

  def sync_tone
    tone = [@tone.red.to_i, @tone.green.to_i, @tone.blue.to_i, @tone.gray.to_i]
    return if @__last_tone == tone

    @__last_tone = tone
    JS.global[:rubyBridge][:app].setToneToViewport(
      @__viewport_id,
      JSON.generate({
        red: tone[0],
        green: tone[1],
        blue: tone[2],
        gray: tone[3]
      })
    )
  end

  def write_property(prop, value)
    @__property_cache ||= {}
    return if @__property_cache.key?(prop) && @__property_cache[prop] == value

    @__property_cache[prop] = value
    JS.global[:rubyBridge][:app].setProperty('viewport', @__viewport_id, prop, value)
  end

  def bind_rect(rect)
    rect.__on_change = proc { sync_rect }
  end

  def bind_color(color)
    color.__on_change = proc { sync_color }
  end

  def bind_tone(tone)
    tone.__on_change = proc { sync_tone }
  end
end

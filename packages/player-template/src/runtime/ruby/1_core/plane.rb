require 'js'
require 'json'

class Plane
  attr_reader :bitmap, :viewport

  def initialize(viewport = nil)
    @viewport = viewport
    @__plane_id = JS.global[:rubyBridge][:app].createPlane(viewport&.__viewport_id).to_i
    @bitmap = nil
    @color = Color.new
    @tone = Tone.new
    bind_color(@color)
    bind_tone(@tone)
    @disposed = false
  end

  def bitmap=(bitmap)
    return if @bitmap == bitmap

    @bitmap = bitmap
    JS.global[:rubyBridge][:app].setBitmapToPlane(@__plane_id, bitmap&.__bitmap_id)
  end

  def viewport=(value)
    @viewport = value
    JS.global[:rubyBridge][:app].setViewport('plane', @__plane_id, value&.__viewport_id)
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

  def ox = read_property('ox').to_i

  def ox=(value)
    write_property('ox', value.to_i)
  end

  def oy = read_property('oy').to_i

  def oy=(value)
    write_property('oy', value.to_i)
  end

  def zoom_x = read_property('zoomX').to_f

  def zoom_x=(value)
    write_property('zoomX', value.to_f)
  end

  def zoom_y = read_property('zoomY').to_f

  def zoom_y=(value)
    write_property('zoomY', value.to_f)
  end

  def visible
    read_property('visible')
  end

  def visible=(value)
    write_property('visible', !!value)
  end

  def opacity = read_property('opacity').to_i

  def opacity=(value)
    write_property('opacity', [[value.to_i, 0].max, 255].min)
  end

  def blend_type = read_property('blendType').to_i

  def blend_type=(value)
    write_property('blendType', value.to_i)
  end

  attr_reader :color, :tone

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

    JS.global[:rubyBridge][:app].disposeObject('plane', @__plane_id)
    @disposed = true
  end

  def disposed?
    @disposed
  end

  private

  def read_property(prop)
    return @__property_cache[prop] if @__property_cache&.key?(prop)

    JS.global[:rubyBridge][:app].getProperty('plane', @__plane_id, prop)
  end

  def write_property(prop, value)
    @__property_cache ||= {}
    return if @__property_cache.key?(prop) && @__property_cache[prop] == value

    @__property_cache[prop] = value
    JS.global[:rubyBridge][:app].setProperty('plane', @__plane_id, prop, value)
  end

  def sync_color
    color = [@color.red.to_i, @color.green.to_i, @color.blue.to_i, @color.alpha.to_i]
    return if @__last_color == color

    @__last_color = color
    JS.global[:rubyBridge][:app].setColorToPlane(
      @__plane_id,
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
    JS.global[:rubyBridge][:app].setToneToPlane(
      @__plane_id,
      JSON.generate({
        red: tone[0],
        green: tone[1],
        blue: tone[2],
        gray: tone[3]
      })
    )
  end

  def bind_color(color)
    color.__on_change = proc { sync_color }
  end

  def bind_tone(tone)
    tone.__on_change = proc { sync_tone }
  end
end

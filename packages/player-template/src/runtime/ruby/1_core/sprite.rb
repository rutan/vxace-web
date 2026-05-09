require 'js'
require 'json'

class Sprite
  attr_reader :bitmap
  attr_reader :viewport

  def initialize(viewport = nil)
    @viewport = viewport
    @__sprite_id = JS.global[:rubyBridge][:app].createSprite(viewport&.__viewport_id).to_i
    @src_rect = Rect.new
    @src_rect.__on_change = proc { sync_src_rect }
    @color = Color.new
    @tone = Tone.new
    bind_color(@color)
    bind_tone(@tone)
    @wave_amp = 0
    @wave_length = 180
    @wave_speed = 360
    @wave_phase = 0
    @bush_opacity = 128
    @disposed = false
  end

  def bitmap=(bitmap)
    return if @bitmap == bitmap

    @bitmap = bitmap
    JS.global[:rubyBridge][:app].setBitmapToSprite(@__sprite_id, @bitmap&.__bitmap_id)
    @src_rect.set(0, 0, @bitmap.width, @bitmap.height) if @bitmap
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

  def width = read_property('rgssWidth').to_i

  def height = read_property('rgssHeight').to_i

  def ox = read_property('ox').to_i

  def ox=(value)
    write_property('ox', value.to_i)
  end

  def oy = read_property('oy').to_i

  def oy=(value)
    write_property('oy', value.to_i)
  end

  def angle = read_property('angle').to_f

  def angle=(value)
    write_property('angle', value.to_f)
  end

  def zoom_x = read_property('zoomX').to_f

  def zoom_x=(value)
    write_property('zoomX', value.to_f)
  end

  def zoom_y = read_property('zoomY').to_f

  def zoom_y=(value)
    write_property('zoomY', value.to_f)
  end

  def mirror
    read_property('mirror').to_s == 'true'
  end

  def mirror=(value)
    write_property('mirror', !!value)
  end

  def visible
    read_property('visible')
  end

  def visible=(value)
    write_property('visible', !!value)
  end

  def viewport=(value)
    @viewport = value
    JS.global[:rubyBridge][:app].setViewport('sprite', @__sprite_id, value&.__viewport_id)
  end

  attr_reader :src_rect, :color, :tone

  def src_rect=(rect)
    @src_rect = rect || Rect.new
    @src_rect.__on_change = proc { sync_src_rect }
    sync_src_rect
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

    JS.global[:rubyBridge][:app].disposeObject('sprite', @__sprite_id)
    @disposed = true
  end

  def disposed?
    @disposed
  end

  def opacity = read_property('opacity').to_i

  def opacity=(value)
    write_property('opacity', [[value.to_i, 0].max, 255].min)
  end

  def blend_type = read_property('blendType').to_i

  def blend_type=(value)
    write_property('blendType', value.to_i)
  end

  def bush_depth = read_property('bushDepth').to_i

  def bush_depth=(value)
    write_property('bushDepth', [value.to_i, 0].max)
  end

  def bush_opacity
    @bush_opacity
  end

  def bush_opacity=(value)
    value = [[value.to_i, 0].max, 255].min
    return if @bush_opacity == value

    @bush_opacity = value
    write_property('bushOpacity', @bush_opacity)
  end

  def wave_amp
    @wave_amp
  end

  def wave_amp=(value)
    value = value.to_i
    return if @wave_amp == value

    @wave_amp = value
    write_property('waveAmp', @wave_amp)
  end

  def wave_length
    @wave_length
  end

  def wave_length=(value)
    value = [value.to_i, 1].max
    return if @wave_length == value

    @wave_length = value
    write_property('waveLength', @wave_length)
  end

  def wave_speed
    @wave_speed
  end

  def wave_speed=(value)
    value = value.to_i
    return if @wave_speed == value

    @wave_speed = value
    write_property('waveSpeed', @wave_speed)
  end

  def wave_phase
    @wave_phase
  end

  def wave_phase=(value)
    value = value.to_f
    return if @wave_phase == value

    @wave_phase = value
    write_property('wavePhase', @wave_phase)
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
    JS.global[:rubyBridge][:app].setFlashToSprite(@__sprite_id, JSON.generate(payload), duration.to_i)
  end

  def update
    @wave_phase = JS.global[:rubyBridge][:app].updateSpriteEffects(@__sprite_id).to_f
  end

  private

  def read_property(prop)
    return @__property_cache[prop] if @__property_cache&.key?(prop)

    JS.global[:rubyBridge][:app].getProperty('sprite', @__sprite_id, prop)
  end

  def write_property(prop, value)
    @__property_cache ||= {}
    return if @__property_cache.key?(prop) && @__property_cache[prop] == value

    @__property_cache[prop] = value
    JS.global[:rubyBridge][:app].setProperty('sprite', @__sprite_id, prop, value)
  end

  def sync_src_rect
    return unless @src_rect

    src_rect = [@src_rect.x.to_i, @src_rect.y.to_i, @src_rect.width.to_i, @src_rect.height.to_i]
    return if @__last_src_rect == src_rect

    @__last_src_rect = src_rect
    JS.global[:rubyBridge][:app].setSrcRectToSprite(
      @__sprite_id,
      src_rect[0],
      src_rect[1],
      src_rect[2],
      src_rect[3]
    )
  end

  def sync_color
    color = [@color.red.to_i, @color.green.to_i, @color.blue.to_i, @color.alpha.to_i]
    return if @__last_color == color

    @__last_color = color
    JS.global[:rubyBridge][:app].setColorToSprite(
      @__sprite_id,
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
    JS.global[:rubyBridge][:app].setToneToSprite(
      @__sprite_id,
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

require 'js'

class Bitmap
  attr_reader :__bitmap_id
  attr_accessor :font

  def initialize(*args)
    @__bitmap_id =
      if args.size == 1
        JS.global[:rubyBridge][:app].loadBitmapFromImage("#{RPGVXAceWeb::Internal.game_dir}/#{args[0]}").await.to_i
      else
        width = args[0].to_i
        height = args[1].to_i
        raise RGSSError, 'failed to create bitmap' if width <= 0 || height <= 0

        JS.global[:rubyBridge][:app].createBitmapFromSize(width, height).to_i
      end

    @font = Font.new
    @disposed = false
    RPGVXAceWeb::RGSSObjectLifecycle.register_finalizer(self, 'bitmap', @__bitmap_id)
  end

  def initialize_copy(source)
    super
    @__bitmap_id = JS.global[:rubyBridge][:app].cloneBitmap(source.__bitmap_id).to_i
    @font = source.font.clone
    @disposed = false
    RPGVXAceWeb::RGSSObjectLifecycle.register_finalizer(self, 'bitmap', @__bitmap_id)
  end

  def dispose
    return if @disposed

    DL.__release_bitmap(self) if defined?(DL)
    JS.global[:rubyBridge][:app].disposeObject('bitmap', @__bitmap_id)
    @disposed = true
  end

  def disposed?
    @disposed
  end

  def width
    read_property('width').to_i
  end

  def height
    read_property('height').to_i
  end

  def draw_text(*args)
    x, y, width, height, str, align =
      if args.size > 3
        [args[0], args[1], args[2], args[3], args[4].to_s, args[5] || 0]
      else
        [args[0].x, args[0].y, args[0].width, args[0].height, args[1].to_s, args[2] || 0]
      end

    get_object.drawText(
      self.font.__to_css_font,
      self.font.size.to_i,
      self.font.__to_css_color,
      self.font.__to_css_out_color,
      self.font.__to_css_shadow_color,
      !!self.font.outline,
      !!self.font.shadow,
      x,
      y,
      width,
      height,
      str,
      align
    )
  end

  def rect
    Rect.new(0, 0, width, height)
  end

  def clear
    get_object.clear
  end

  def clear_rect(*args)
    x, y, width, height = __extract_rect_args(args)
    get_object.clearRect(x, y, width, height)
  end

  def fill_rect(*args)
    color = args.pop
    x, y, width, height = __extract_rect_args(args)
    get_object.fillRect(x, y, width, height, color.__to_css_color)
  end

  def gradient_fill_rect(*args)
    if args.size == 3 || args.size == 4
      x, y, width, height = __extract_rect_args([args[0]])
      color1 = args[1]
      color2 = args[2]
      vertical = args[3] || false
    else
      x, y, width, height = __extract_rect_args(args.first(4))
      color1 = args[4]
      color2 = args[5]
      vertical = args[6] || false
    end

    get_object.gradientFillRect(
      x,
      y,
      width,
      height,
      color1.__to_css_color,
      color2.__to_css_color,
      !!vertical
    )
  end

  def blt(x, y, src_bitmap, src_rect, opacity = 255)
    return unless src_bitmap

    get_object.blt(
      src_bitmap.__send__(:get_object),
      x.to_i,
      y.to_i,
      src_rect.x.to_i,
      src_rect.y.to_i,
      src_rect.width.to_i,
      src_rect.height.to_i,
      __clamp_opacity(opacity)
    )
  end

  def stretch_blt(dest_rect, src_bitmap, src_rect, opacity = 255)
    return unless src_bitmap

    get_object.stretchBlt(
      src_bitmap.__send__(:get_object),
      dest_rect.x.to_i,
      dest_rect.y.to_i,
      dest_rect.width.to_i,
      dest_rect.height.to_i,
      src_rect.x.to_i,
      src_rect.y.to_i,
      src_rect.width.to_i,
      src_rect.height.to_i,
      __clamp_opacity(opacity)
    )
  end

  def blur
    get_object.blur
    self
  end

  def radial_blur(angle, division)
    get_object.radialBlur(angle.to_i, division.to_i)
    self
  end

  def hue_change(hue)
    get_object.hueChange(hue.to_i)
    self
  end

  def text_size(str)
    text_width = get_object.measureText(self.font.__to_css_font, str.to_s).to_i
    Rect.new(0, 0, text_width, self.font.size.to_i)
  end

  def get_pixel(x, y)
    data = get_object.getPixel(x.to_i, y.to_i)
    Color.new(data[:red].to_i, data[:green].to_i, data[:blue].to_i, data[:alpha].to_i)
  end

  def set_pixel(x, y, color)
    get_object.setPixel(
      x.to_i,
      y.to_i,
      color.red.to_i,
      color.green.to_i,
      color.blue.to_i,
      color.alpha.to_i
    )
  end

  def __rgba_pixel_data
    Base64.decode64(get_object.getRgbaPixelsBase64.to_s)
  end

  def __rgba_pixel_data=(data)
    get_object.putRgbaPixelsBase64(Base64.strict_encode64(data.to_s))
  end

  private

  def get_object
    JS.global[:rubyBridge][:app].getObject('bitmap', @__bitmap_id)
  end

  def read_property(prop)
    JS.global[:rubyBridge][:app].getProperty('bitmap', @__bitmap_id, prop)
  end

  def __extract_rect_args(args)
    if args.size == 1
      [args[0].x.to_i, args[0].y.to_i, args[0].width.to_i, args[0].height.to_i]
    else
      [args[0].to_i, args[1].to_i, args[2].to_i, args[3].to_i]
    end
  end

  def __clamp_opacity(value)
    [[value.to_i, 0].max, 255].min
  end
end

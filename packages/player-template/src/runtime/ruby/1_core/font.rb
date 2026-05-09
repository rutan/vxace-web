require 'json'

class Font
  CSS_FONT_SIZE_RATIO = 0.75

  class << self
    def exist?(name)
      JS.global[:rubyBridge][:app].fontExists(name.to_s).to_s == 'true'
    end

    def default_name
      @default_name ||= 'VL Gothic'
    end

    def default_name=(value)
      @default_name = value.is_a?(Array) ? value.map(&:to_s) : value.to_s
    end

    def default_size
      @default_size ||= 24
    end

    def default_size=(value)
      @default_size = [value.to_i, 1].max
    end

    def default_bold
      @default_bold ||= false
    end

    def default_bold=(value)
      @default_bold = !!value
    end

    def default_italic
      @default_italic ||= false
    end

    def default_italic=(value)
      @default_italic = !!value
    end

    def default_outline
      @default_outline = true if @default_outline.nil?
      @default_outline
    end

    def default_outline=(value)
      @default_outline = !!value
    end

    def default_shadow
      @default_shadow ||= false
    end

    def default_shadow=(value)
      @default_shadow = !!value
    end

    def default_color
      @default_color ||= Color.new(255, 255, 255, 255)
    end

    def default_color=(value)
      @default_color = __clone_color(value || Color.new(255, 255, 255, 255))
    end

    def default_out_color
      @default_out_color ||= Color.new(0, 0, 0, 128)
    end

    def default_out_color=(value)
      @default_out_color = __clone_color(value || Color.new(0, 0, 0, 128))
    end

    private

    def __clone_color(color)
      Color.new(color.red, color.green, color.blue, color.alpha)
    end
  end

  def initialize(name = nil, size = nil)
    @name = name.nil? ? self.class.default_name : name
    @size = size.nil? ? self.class.default_size : size
    @bold = self.class.default_bold
    @italic = self.class.default_italic
    @outline = self.class.default_outline
    @shadow = self.class.default_shadow
    @color = Color.new(
      self.class.default_color.red,
      self.class.default_color.green,
      self.class.default_color.blue,
      self.class.default_color.alpha
    )
    @out_color = Color.new(
      self.class.default_out_color.red,
      self.class.default_out_color.green,
      self.class.default_out_color.blue,
      self.class.default_out_color.alpha
    )
  end

  attr_accessor :name, :size, :bold, :italic, :outline, :shadow, :color, :out_color

  def __to_css_font
    [
      self.italic ? 'italic' : nil,
      self.bold ? 'bold' : nil,
      "#{__to_css_font_size}px",
      __to_css_font_family
    ].compact.join(' ')
  end

  def __to_css_color
    "rgba(#{self.color.red}, #{self.color.green}, #{self.color.blue}, #{self.color.alpha / 255.0})"
  end

  def __to_css_out_color
    alpha = (self.out_color.alpha / 255.0) * (self.color.alpha / 255.0)
    "rgba(#{self.out_color.red}, #{self.out_color.green}, #{self.out_color.blue}, #{alpha})"
  end

  def __to_css_shadow_color
    "rgba(0, 0, 0, #{self.color.alpha / 255.0})"
  end

  private

  def __to_css_font_size
    [(self.size.to_i * CSS_FONT_SIZE_RATIO).round, 1].max
  end

  def __to_css_font_family
    requested_families =
      if self.name.is_a?(Array)
        self.name
      else
        [self.name]
      end

    families = JSON.parse(
      JS.global[:rubyBridge][:app].resolveFontFamilies(JSON.generate(requested_families.map(&:to_s))).to_s
    )

    families = requested_families if families.empty?

    families
      .map { |family| "\"#{family.to_s.gsub('"', '\"')}\"" }
      .join(', ')
  end
end

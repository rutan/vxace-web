class Color
  attr_writer :__on_change

  def initialize(*args)
    if args.empty?
      @red = 0
      @green = 0
      @blue = 0
      @alpha = 0
    else
      self.red = args[0]
      self.green = args[1]
      self.blue = args[2]
      self.alpha = args[3] || 255
    end
  end

  [:red, :green, :blue, :alpha].each do |c|
    define_method(c) do
      instance_variable_get("@#{c}")
    end

    define_method("#{c}=") do |value|
      value = [[0, value].max, 255].min
      unless instance_variable_get("@#{c}") == value
        instance_variable_set("@#{c}", value)
        __notify_change
      end
    end
  end

  def set(*args)
    if args.size == 1
      self.red = args[0].red
      self.green = args[0].green
      self.blue = args[0].blue
      self.alpha = args[0].alpha
    else
      self.red = args[0]
      self.green = args[1]
      self.blue = args[2]
      self.alpha = args[3] || 255
    end
  end

  class << self
    def _load(obj)
      Color.new(*obj.unpack('E4'))
    end
  end

  def _dump(_level)
    [@red, @green, @blue, @alpha].pack('E4')
  end

  def __to_css_color
    "rgba(#{red}, #{green}, #{blue}, #{alpha / 255.0})"
  end

  private

  def __notify_change
    @__on_change&.call(self)
  end
end

class Tone
  attr_writer :__on_change

  def initialize(*args)
    if args.empty?
      @red = 0
      @green = 0
      @blue = 0
      @gray = 0
    else
      self.red = args[0]
      self.green = args[1]
      self.blue = args[2]
      self.gray = args[3] || 0
    end
  end

  [:red, :green, :blue, :gray].each do |c|
    define_method(c) do
      instance_variable_get("@#{c}")
    end

    define_method("#{c}=") do |value|
      min, max =
        if c == :gray
          [0, 255]
        else
          [-255, 255]
        end

      value = [[min, value].max, max].min
      unless instance_variable_get("@#{c}") == value
        instance_variable_set("@#{c}", value)
        __notify_change
      end
    end
  end

  def set(*args)
    if args.size == 1
      if args[0].nil?
        @red = 0
        @green = 0
        @blue = 0
        @gray = 0
      else
        self.red = args[0].red
        self.green = args[0].green
        self.blue = args[0].blue
        self.gray = args[0].gray
      end
    else
      self.red = args[0]
      self.green = args[1]
      self.blue = args[2]
      self.gray = args[3] || 0
    end
  end

  class << self
    def _load(obj)
      Tone.new(*obj.unpack('E4'))
    end
  end

  def _dump(_level)
    [@red, @green, @blue, @gray].pack('E4')
  end

  private

  def __notify_change
    @__on_change&.call(self)
  end
end

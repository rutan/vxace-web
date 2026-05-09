class Rect
  attr_writer :__on_change

  def initialize(x = 0, y = 0, width = 0, height = 0)
    @x = x
    @y = y
    @width = width
    @height = height
  end

  def x
    @x
  end

  def x=(value)
    return if @x == value

    @x = value
    __notify_change
  end

  def y
    @y
  end

  def y=(value)
    return if @y == value

    @y = value
    __notify_change
  end

  def width
    @width
  end

  def width=(value)
    return if @width == value

    @width = value
    __notify_change
  end

  def height
    @height
  end

  def height=(value)
    return if @height == value

    @height = value
    __notify_change
  end

  def set(*args)
    old_values = [@x, @y, @width, @height]
    if args.size == 1
      @x = args[0].x
      @y = args[0].y
      @width = args[0].width
      @height = args[0].height
    else
      @x = args[0]
      @y = args[1]
      @width = args[2]
      @height = args[3]
    end
    return if old_values == [@x, @y, @width, @height]

    __notify_change
  end

  def empty
    return if @x == 0 && @y == 0 && @width == 0 && @height == 0

    @x = 0
    @y = 0
    @width = 0
    @height = 0
    __notify_change
  end

  private

  def __notify_change
    @__on_change&.call(self)
  end
end

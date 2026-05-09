class Table
  def initialize(xsize, ysize = 1, zsize = 1)
    @xsize = xsize
    @ysize = ysize
    @zsize = zsize
    @data = Array.new(@xsize * @ysize * @zsize, 0)
  end

  attr_reader :xsize, :ysize, :zsize

  def to_a
    @data.dup
  end

  def resize(xsize, ysize = 1, zsize = 1)
    old_xsize = @xsize
    old_ysize = @ysize
    old_zsize = @zsize
    old_data = @data

    @xsize = xsize.to_i
    @ysize = ysize.to_i
    @zsize = zsize.to_i
    @data = Array.new(@xsize * @ysize * @zsize, 0)

    [old_zsize, @zsize].min.times do |z|
      [old_ysize, @ysize].min.times do |y|
        [old_xsize, @xsize].min.times do |x|
          old_index = x + y * old_xsize + z * old_xsize * old_ysize
          @data[calc_index(x, y, z)] = old_data[old_index]
        end
      end
    end
    self
  end

  def [](*args)
    index = calc_index(*args)
    return nil unless index

    @data[index]
  end

  def []=(*args)
    value = args.pop
    index = calc_index(*args)
    return nil unless index

    @data[index] = value.to_i
  end

  class << self
    def _load(obj)
      xsize, ysize, zsize, size, body = unpack_table(obj)

      table = Table.new(xsize, ysize, zsize)
      table.instance_variable_set(:@data, body.unpack('s<*'))
      raise "unexpected table size: #{size}" unless table.__size == size

      table
    end
  end

  def _dump(_level)
    [dimension_size, @xsize, @ysize, @zsize, @data.size].pack('V5') +
      @data.pack('s<*')
  end

  def __size
    @data.size
  end

  private

  def calc_index(x, y = 0, z = 0)
    x = x.to_i
    y = y.to_i
    z = z.to_i

    return nil if x < 0 || x >= @xsize
    return nil if y < 0 || y >= @ysize
    return nil if z < 0 || z >= @zsize

    x + y * @xsize + z * @xsize * @ysize
  end

  def dimension_size
    if @zsize > 1
      3
    elsif @ysize > 1
      2
    else
      1
    end
  end

  def self.unpack_table(obj)
    header = obj.byteslice(0, 20)
    body = obj.byteslice(20..)
    dimension, xsize, ysize, zsize, size = header.unpack('V5')

    raise "invalid table dimension: #{dimension}" unless (1..3).cover?(dimension)
    raise "unexpected table payload size" unless body.bytesize == size * 2

    [xsize, ysize, zsize, size, body]
  end
end

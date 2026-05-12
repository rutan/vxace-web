require 'js'
require 'json'

class Tilemap
  class BitmapList < Array
    def initialize(&on_change)
      super()
      @on_change = on_change
    end

    def []=(*args)
      result = super
      changed
      result
    end

    def <<(value)
      result = super
      changed
      result
    end

    def push(*values)
      result = super
      changed
      result
    end

    def concat(values)
      result = super
      changed
      result
    end

    def replace(values)
      result = super
      changed
      result
    end

    def clear
      result = super
      changed
      result
    end

    private

    def changed
      @on_change&.call
    end
  end

  attr_reader :map_data, :flags, :bitmaps
  attr_accessor :flash_data

  def initialize(viewport = nil)
    @viewport = viewport
    @__tilemap_id = JS.global[:rubyBridge][:app].createTilemap(viewport&.__viewport_id).to_i
    @bitmaps = BitmapList.new { sync_bitmaps }
    @flash_data = nil
    @map_data = nil
    @flags = nil
    @visible = true
    @ox = 0
    @oy = 0
    @disposed = false
    RPGVXAceWeb::RGSSObjectLifecycle.register_finalizer(self, 'tilemap', @__tilemap_id)
  end

  def bitmaps=(value)
    @bitmaps.replace(Array(value))
  end

  def __characters=(value)
    characters = Array(value).map do |item|
      bitmap, x, y, character_index, direction, pattern, name = item
      {
        bitmapId: bitmap&.__bitmap_id,
        x: x.to_i,
        y: y.to_i,
        characterIndex: character_index.to_i,
        direction: direction.to_i,
        pattern: pattern.to_i,
        name: name.to_s
      }
    end
    JS.global[:rubyBridge][:app].setCharactersToTilemap(@__tilemap_id, JSON.generate(characters))
  end

  def map_data=(value)
    return if @map_data.equal?(value)

    @map_data = value
    sync_data
  end

  def flags=(value)
    return if @flags.equal?(value)

    @flags = value
    sync_data
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

  def ox
    @ox
  end

  def ox=(value)
    value = value.to_i
    return if @ox == value

    @ox = value
    write_property('ox', @ox)
  end

  def oy
    @oy
  end

  def oy=(value)
    value = value.to_i
    return if @oy == value

    @oy = value
    write_property('oy', @oy)
  end

  def viewport
    @viewport
  end

  def viewport=(value)
    @viewport = value
    JS.global[:rubyBridge][:app].setViewport('tilemap', @__tilemap_id, value&.__viewport_id)
  end

  def update
    JS.global[:rubyBridge][:app].updateTilemap(@__tilemap_id)
  end

  def refresh
    update
  end

  def dispose
    return if @disposed

    JS.global[:rubyBridge][:app].disposeObject('tilemap', @__tilemap_id)
    @disposed = true
  end

  def disposed?
    @disposed
  end

  private

  def sync_bitmaps
    bitmap_ids = Array(@bitmaps).map { |bitmap| bitmap&.__bitmap_id }
    JS.global[:rubyBridge][:app].setBitmapsToTilemap(@__tilemap_id, JSON.generate(bitmap_ids))
  end

  def sync_data
    return unless @map_data && @flags

    payload = {
      mapData: serialize_table(@map_data),
      flags: serialize_table(@flags)
    }
    JS.global[:rubyBridge][:app].setDataToTilemap(@__tilemap_id, JSON.generate(payload))
  end

  def write_property(prop, value)
    @__property_cache ||= {}
    return if @__property_cache.key?(prop) && @__property_cache[prop] == value

    @__property_cache[prop] = value
    JS.global[:rubyBridge][:app].setProperty('tilemap', @__tilemap_id, prop, value)
  end

  def serialize_table(table)
    unless table.respond_to?(:xsize) && table.respond_to?(:ysize) && table.respond_to?(:zsize) && table.respond_to?(:to_a)
      raise TypeError, "expected Table-compatible object, got #{table.class}"
    end

    {
      xsize: table.xsize.to_i,
      ysize: table.ysize.to_i,
      zsize: table.zsize.to_i,
      data: table.to_a
    }
  end
end

module DL
  POINTER_SIZE = 4
  ADDRESS_ALIGNMENT = 0x100
  BASE_ADDRESS = 0x10000

  @next_address = BASE_ADDRESS
  @bitmap_layouts = {}
  @pointer_cells = {}
  @bitmap_data_addresses = {}

  class CPtr
    attr_reader :size

    def initialize(address, size = nil)
      @address = address.to_i
      @size = size&.to_i
    end

    def [](offset, length = nil)
      normalized_offset = offset.to_i
      normalized_length = length ? length.to_i : 1
      DL.__read_memory(@address + normalized_offset, normalized_length)
    end

    def []=(offset, length, value)
      normalized_offset = offset.to_i
      normalized_length = length.to_i
      DL.__write_memory(@address + normalized_offset, normalized_length, value.to_s)
    end

    def free
      nil
    end
  end

  class << self
    def dlwrap(object)
      return __bitmap_layout(object)[:base] if defined?(Bitmap) && object.is_a?(Bitmap)

      __allocate_address
    end

    def __read_memory(address, length)
      bitmap_data = __bitmap_data_for_address(address)
      if bitmap_data
        offset = address - bitmap_data[:address]
        bitmap = __bitmap_from_entry(bitmap_data)
        return ''.b unless bitmap

        return bitmap.__rgba_pixel_data.byteslice(offset, length) || ''.b
      end

      pointer_value = @pointer_cells[address.to_i]
      return [pointer_value || 0].pack('l<') if length == POINTER_SIZE

      ''.b.ljust(length, "\x00")
    end

    def __write_memory(address, length, value)
      bitmap_data = __bitmap_data_for_address(address)
      return value unless bitmap_data

      bitmap = __bitmap_from_entry(bitmap_data)
      return value unless bitmap

      offset = address - bitmap_data[:address]
      write_length = [length, bitmap_data[:byte_length] - offset].min
      return value if write_length <= 0

      data = bitmap.__rgba_pixel_data
      replacement = value.byteslice(0, write_length) || ''.b
      replacement = replacement.ljust(write_length, "\x00")
      data[offset, write_length] = replacement
      bitmap.__rgba_pixel_data = data
      value
    end

    def __release_bitmap(bitmap)
      __release_bitmap_by_object_id(bitmap.object_id)
    end

    def __release_bitmap_by_object_id(object_id)
      layout = @bitmap_layouts.delete(object_id.to_i)
      return unless layout

      @bitmap_data_addresses.delete(layout[:data])
      layout[:pointer_cells].each { |address| @pointer_cells.delete(address) }
    end

    private

    def __bitmap_layout(bitmap)
      @bitmap_layouts[bitmap.object_id] ||= begin
        base = __allocate_address(32)
        level1 = __allocate_address(32)
        level2 = __allocate_address(32)
        data = __allocate_address(bitmap.width * bitmap.height * 4)

        @pointer_cells[base + 16] = level1 - 8
        @pointer_cells[level1] = level2 - 16
        @pointer_cells[level2] = data
        bitmap_data = {
          address: data,
          bitmap_object_id: bitmap.object_id,
          byte_length: bitmap.width * bitmap.height * 4,
        }
        @bitmap_data_addresses[data] = bitmap_data
        ObjectSpace.define_finalizer(bitmap, __bitmap_finalizer(bitmap.object_id))

        { base: base, data: data, pointer_cells: [base + 16, level1, level2] }
      end
    end

    def __bitmap_from_entry(entry)
      ObjectSpace._id2ref(entry[:bitmap_object_id])
    rescue RangeError
      __release_bitmap_by_object_id(entry[:bitmap_object_id])
      nil
    end

    def __bitmap_finalizer(object_id)
      proc { DL.__release_bitmap_by_object_id(object_id) }
    end

    def __allocate_address(size = ADDRESS_ALIGNMENT)
      address = @next_address
      reserved_size = [size.to_i, ADDRESS_ALIGNMENT].max
      @next_address += ((reserved_size + ADDRESS_ALIGNMENT - 1) / ADDRESS_ALIGNMENT) * ADDRESS_ALIGNMENT
      address
    end

    def __bitmap_data_for_address(address)
      normalized_address = address.to_i

      @bitmap_data_addresses.each_value do |entry|
        return entry if normalized_address >= entry[:address] && normalized_address < entry[:address] + entry[:byte_length]
      end

      nil
    end
  end
end

# Win32API class のモック
# 実際の挙動をすることはできないが、最小限の振る舞いをして可能な限りの互換性を保つ
class Win32API
  HANDLED_FUNC_NAMES = %w[
    findwindow
    getclientrect
    getcurrentdirectory
    getkeyboardstate
    getprivateprofilestring
    getusername
    getwindowrect
    movewindow
    multibytetowidechar
    shellexecute
    shgetfolderpath
    widechartomultibyte
    writeprivateprofilestring
  ].freeze

  MOCK_CURRENT_DIRECTORY = 'C:\game'.freeze
  MOCK_USER_NAME = 'VXAceWeb'.freeze

  def initialize(dll, func, param_types, return_type)
    @dll = dll.to_s.downcase
    @func = func.to_s
    @param_types = param_types
    @return_type = return_type.to_s.downcase
  end

  def call(*args)
    case normalized_func_name
    when 'getprivateprofilestring'
      get_private_profile_string(*args)
    when 'writeprivateprofilestring'
      write_private_profile_string(*args)
    when 'multibytetowidechar', 'widechartomultibyte'
      convert_string_buffer(*args)
    when 'findwindow'
      find_window(*args)
    when 'getwindowrect'
      get_window_rect(*args)
    when 'movewindow'
      move_window(*args)
    when 'getclientrect'
      get_client_rect(*args)
    when 'shellexecute'
      shell_execute(*args)
    when 'getcurrentdirectory'
      get_current_directory(*args)
    when 'shgetfolderpath'
      sh_get_folder_path(*args)
    when 'getusername'
      get_user_name(*args)
    when 'getkeyboardstate'
      get_keyboard_state(*args)
    else
      default_return_value
    end
  end

  private

  def get_private_profile_string(section, key, default_value, buffer, length, filename)
    value =
      begin
        RPGVXAceWeb::Internal::IniFile.load(filename).read(section, key)
      rescue StandardError
        nil
      end
    write_string_buffer(value.nil? ? default_value.to_s : value.to_s, buffer, length)
  end

  def write_private_profile_string(section, key, value, filename)
    ini = RPGVXAceWeb::Internal::IniFile.load(filename)
    return 0 unless ini.write(section, key, value)

    ini.save(filename) ? 1 : 0
  rescue StandardError
    0
  end

  def convert_string_buffer(_code_page, _flags, source, _source_length, dest, dest_length, *_rest)
    text = source.to_s
    if dest.nil?
      text.bytesize + 1
    else
      write_string_buffer(text, dest, dest_length)
    end
  end

  def find_window(*_args)
    0
  end

  def get_window_rect(_hwnd, buffer)
    write_rect_buffer(buffer) ? 1 : 0
  end

  def move_window(*_args)
    0
  end

  def get_client_rect(_hwnd, buffer)
    write_rect_buffer(buffer) ? 1 : 0
  end

  def shell_execute(*_args)
    0
  end

  def get_current_directory(length, buffer)
    write_string_buffer(MOCK_CURRENT_DIRECTORY, buffer, length)
  end

  def sh_get_folder_path(*args)
    buffer = args[4] || args[-1]
    return 1 unless writable_buffer?(buffer)

    write_string_buffer(MOCK_CURRENT_DIRECTORY, buffer, buffer_capacity(buffer))
    0
  end

  def get_user_name(buffer, length_buffer)
    capacity = read_int32_le(length_buffer)
    required = MOCK_USER_NAME.bytesize + 1

    if capacity < required || buffer_capacity(buffer) < required
      write_int32_le(length_buffer, required)
      return 0
    end

    written = write_string_buffer(MOCK_USER_NAME, buffer, capacity)
    return 0 unless written == MOCK_USER_NAME.bytesize

    write_int32_le(length_buffer, written)
    1
  end

  def get_keyboard_state(buffer)
    write_binary_buffer("\0" * 256, buffer) ? 1 : 0
  end

  def write_string_buffer(value, buffer, length)
    capacity = [length.to_i, buffer_capacity(buffer)].min
    return 0 if capacity <= 0
    return 0 unless writable_buffer?(buffer)

    copied = value.to_s.byteslice(0, [capacity - 1, 0].max).to_s
    bytes = copied + "\0"
    capacity.times do |index|
      buffer.setbyte(index, bytes.getbyte(index) || 0)
    end
    copied.bytesize
  rescue StandardError
    0
  end

  def write_rect_buffer(buffer)
    write_binary_buffer([0, 0, Graphics.width, Graphics.height].pack('l<l<l<l<'), buffer)
  end

  def write_binary_buffer(bytes, buffer)
    return false unless writable_buffer?(buffer)
    return false if buffer.bytesize < bytes.bytesize

    bytes.bytes.each_with_index do |byte, index|
      buffer.setbyte(index, byte)
    end
    true
  rescue StandardError
    false
  end

  def read_int32_le(buffer)
    return buffer.to_i unless buffer.respond_to?(:bytesize)
    return 0 if buffer.bytesize < 4

    buffer.byteslice(0, 4).unpack1('l<')
  rescue StandardError
    0
  end

  def write_int32_le(buffer, value)
    return false unless buffer.respond_to?(:bytesize) && buffer.respond_to?(:setbyte)
    return false if buffer.bytesize < 4

    [value.to_i].pack('l<').bytes.each_with_index do |byte, index|
      buffer.setbyte(index, byte)
    end
    true
  rescue StandardError
    false
  end

  def writable_buffer?(buffer)
    buffer.respond_to?(:bytesize) && buffer.respond_to?(:setbyte)
  end

  def buffer_capacity(buffer)
    buffer.respond_to?(:bytesize) ? buffer.bytesize : 0
  end

  def normalized_func_name
    name = @func.downcase
    return name if HANDLED_FUNC_NAMES.include?(name)

    suffixed_name = name.sub(/[aw]\z/, '')
    HANDLED_FUNC_NAMES.include?(suffixed_name) ? suffixed_name : name
  end

  def default_return_value
    case @return_type
    when 'i', 'l'
      0
    else
      nil
    end
  end
end

require 'js'
begin
  require 'base64'
rescue LoadError
  module Base64
    TABLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    DECODE_TABLE = TABLE.chars.each_with_index.to_h

    class << self
      def encode64(value)
        strict_encode64(value).scan(/.{1,60}/).join("\n") + "\n"
      end

      def decode64(value)
        clean = value.to_s.gsub(/[^A-Za-z0-9+\/=]/, '')
        bytes = []
        clean.scan(/.{1,4}/).each do |chunk|
          chars = chunk.ljust(4, '=').chars
          nums = chars.map { |char| char == '=' ? 0 : DECODE_TABLE.fetch(char) }
          triple = (nums[0] << 18) | (nums[1] << 12) | (nums[2] << 6) | nums[3]
          bytes << ((triple >> 16) & 0xff)
          bytes << ((triple >> 8) & 0xff) unless chars[2] == '='
          bytes << (triple & 0xff) unless chars[3] == '='
        end
        bytes.pack('C*')
      end

      def strict_encode64(value)
        bytes = value.to_s.bytes
        output = +''
        bytes.each_slice(3) do |slice|
          b0 = slice[0] || 0
          b1 = slice[1] || 0
          b2 = slice[2] || 0
          triple = (b0 << 16) | (b1 << 8) | b2
          output << TABLE[(triple >> 18) & 0x3f]
          output << TABLE[(triple >> 12) & 0x3f]
          output << (slice.length > 1 ? TABLE[(triple >> 6) & 0x3f] : '=')
          output << (slice.length > 2 ? TABLE[triple & 0x3f] : '=')
        end
        output
      end
    end
  end
end

module Kernel
  MISSING_BINARY_BASE64 = '__RPGVXACE_WEB_MISSING_BINARY_BASE64__'

  def rgss_main(&block)
    block.call
  rescue StandardError => error
    detail = ["#{error.class}: #{error.message}", *Array(error.backtrace)].join("\n")
    raise error.exception(detail), detail, error.backtrace
  end

  def rgss_stop
    loop do
      Graphics.update
    end
  end

  def load_data(filename)
    normalized_filename = normalize_data_filename(filename)
    base64 = JS.global[:rubyBridge][:utils].loadVirtualBinaryBase64(RPGVXAceWeb::Internal.game_id, normalized_filename).await
    raise Errno::ENOENT, normalized_filename if base64.to_s == MISSING_BINARY_BASE64

    binary = Base64.decode64(base64.to_s)
    Marshal.load(binary)
  end

  def save_data(obj, filename)
    normalized_filename = normalize_data_filename(filename)
    base64 = Base64.strict_encode64(Marshal.dump(obj))
    JS.global[:rubyBridge][:utils].saveBinaryBase64(RPGVXAceWeb::Internal.game_id, normalized_filename, base64).await
    nil
  end

  def msgbox(*args)
    puts args.map(&:to_s)
  end

  def msgbox_p(*args)
    puts args.map(&:inspect)
  end

  private

  def normalize_data_filename(filename)
    filename.to_s.gsub('\\', '/').sub(%r{\A\./}, '').sub(%r{\A/+}, '')
  end
end

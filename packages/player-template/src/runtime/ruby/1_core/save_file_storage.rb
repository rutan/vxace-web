require 'js'
require 'stringio'
require 'time'

module RPGVXAceWeb
  module Internal
    module SaveFileStorage
      MISSING_BINARY_BASE64 = '__RPGVXACE_WEB_MISSING_BINARY_BASE64__'

      class SaveFileIO < StringIO
        def initialize(filename, mode, initial_value = ''.b)
          super(initial_value, mode)
          @filename = filename
          @closed_to_storage = false
        end

        def close
          return if @closed_to_storage

          @closed_to_storage = true
          JS.global[:rubyBridge][:utils].saveBinaryBase64(
            RPGVXAceWeb::Internal.game_id,
            @filename,
            Base64.strict_encode64(string)
          ).await
          super
        end
      end

      class << self
        def virtual_filename(path)
          filename = path.to_s.gsub('\\', '/')
          return nil if filename.match?(%r{\A(?:[A-Za-z]:)?/})

          filename = filename.sub(%r{\A\./}, '')
          return nil if filename.empty?
          return nil if filename.split('/').include?('..')

          filename
        end

        def open(filename, mode)
          normalized_mode = normalize_mode(mode)
          if normalized_mode.include?('r') && !writable_mode?(normalized_mode)
            return StringIO.new(load_binary(filename), normalized_mode)
          end

          if normalized_mode.include?('r')
            return SaveFileIO.new(filename, normalized_mode, load_binary(filename, saved_only: true))
          end

          if normalized_mode.include?('w')
            return SaveFileIO.new(filename, normalized_mode)
          end

          if normalized_mode.include?('a')
            initial_value =
              begin
                load_binary(filename, saved_only: true)
              rescue StandardError
                ''.b
              end
            io = SaveFileIO.new(filename, normalized_mode, initial_value)
            io.seek(0, IO::SEEK_END)
            return io
          end

          raise ArgumentError, "unsupported virtual file mode: #{mode}"
        end

        def delete(filename)
          JS.global[:rubyBridge][:utils].deleteSavedData(RPGVXAceWeb::Internal.game_id, filename).await
          1
        end

        def mtime(filename)
          info = JS.global[:rubyBridge][:utils].getSavedDataInfo(RPGVXAceWeb::Internal.game_id, filename).await
          raise Errno::ENOENT, filename unless info

          Time.iso8601(info[:updatedAt].to_s)
        end

        def exist?(filename)
          JS.global[:rubyBridge][:utils].virtualFileExists(RPGVXAceWeb::Internal.game_id, filename).await.to_s == 'true'
        end

        def glob(pattern)
          normalized_pattern = virtual_filename(pattern)
          return [] unless normalized_pattern

          JS.global[:rubyBridge][:utils]
            .listSavedData(RPGVXAceWeb::Internal.game_id)
            .await
            .to_a
            .map { |info| info[:filename].to_s }
            .select { |filename| File.fnmatch?(normalized_pattern, filename) }
        end

        private

        def normalize_mode(mode)
          normalized_mode = mode.to_s.empty? ? 'r' : mode.to_s
          return normalized_mode if normalized_mode.include?('b')

          "#{normalized_mode}b"
        end

        def writable_mode?(mode)
          mode.include?('w') || mode.include?('a') || mode.include?('+')
        end

        def load_binary(filename, saved_only: false)
          base64 =
            if saved_only
              JS.global[:rubyBridge][:utils].loadSavedBinaryBase64ForRuby(RPGVXAceWeb::Internal.game_id, filename).await
            else
              JS.global[:rubyBridge][:utils].loadVirtualBinaryBase64(RPGVXAceWeb::Internal.game_id, filename).await
            end
          raise Errno::ENOENT, filename if base64.to_s == MISSING_BINARY_BASE64

          Base64.decode64(base64.to_s)
        end
      end
    end
  end
end

class << File
  alias __vxace_web_open open
  alias __vxace_web_delete delete
  alias __vxace_web_mtime mtime
  alias __vxace_web_exist? exist?
  alias __vxace_web_exists? exists? if method_defined?(:exists?)
  alias __vxace_web_file? file?

  def open(path, mode = 'r', *args)
    filename = RPGVXAceWeb::Internal::SaveFileStorage.virtual_filename(path)
    return __vxace_web_open(path, mode, *args) unless filename

    io = RPGVXAceWeb::Internal::SaveFileStorage.open(filename, mode)
    return io unless block_given?

    begin
      yield io
    ensure
      io.close
    end
  end

  def delete(path)
    filename = RPGVXAceWeb::Internal::SaveFileStorage.virtual_filename(path)
    return __vxace_web_delete(path) unless filename

    RPGVXAceWeb::Internal::SaveFileStorage.delete(filename)
  end

  def mtime(path)
    filename = RPGVXAceWeb::Internal::SaveFileStorage.virtual_filename(path)
    return __vxace_web_mtime(path) unless filename

    RPGVXAceWeb::Internal::SaveFileStorage.mtime(filename)
  end

  def exist?(path)
    filename = RPGVXAceWeb::Internal::SaveFileStorage.virtual_filename(path)
    return __vxace_web_exist?(path) unless filename

    RPGVXAceWeb::Internal::SaveFileStorage.exist?(filename)
  end

  if method_defined?(:exists?)
    def exists?(path)
      filename = RPGVXAceWeb::Internal::SaveFileStorage.virtual_filename(path)
      return __vxace_web_exists?(path) unless filename

      RPGVXAceWeb::Internal::SaveFileStorage.exist?(filename)
    end
  else
    alias exists? exist?
  end

  def file?(path)
    filename = RPGVXAceWeb::Internal::SaveFileStorage.virtual_filename(path)
    return __vxace_web_file?(path) unless filename

    RPGVXAceWeb::Internal::SaveFileStorage.exist?(filename)
  end
end

class << Dir
  alias __vxace_web_glob glob

  def glob(pattern, *args)
    return __vxace_web_glob(pattern, *args) unless args.empty?

    saved_files = RPGVXAceWeb::Internal::SaveFileStorage.glob(pattern)
    saved_files.empty? ? __vxace_web_glob(pattern) : saved_files
  end
end

class << FileTest
  alias __vxace_web_exist? exist?
  alias __vxace_web_exists? exists? if method_defined?(:exists?)
  alias __vxace_web_file? file?

  def exist?(path)
    filename = RPGVXAceWeb::Internal::SaveFileStorage.virtual_filename(path)
    return __vxace_web_exist?(path) unless filename

    RPGVXAceWeb::Internal::SaveFileStorage.exist?(filename)
  end

  if method_defined?(:exists?)
    def exists?(path)
      filename = RPGVXAceWeb::Internal::SaveFileStorage.virtual_filename(path)
      return __vxace_web_exists?(path) unless filename

      RPGVXAceWeb::Internal::SaveFileStorage.exist?(filename)
    end
  else
    alias exists? exist?
  end

  def file?(path)
    filename = RPGVXAceWeb::Internal::SaveFileStorage.virtual_filename(path)
    return __vxace_web_file?(path) unless filename

    RPGVXAceWeb::Internal::SaveFileStorage.exist?(filename)
  end
end

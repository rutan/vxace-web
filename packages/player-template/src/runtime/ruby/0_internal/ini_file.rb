require 'js'

module RPGVXAceWeb
  module Internal
    class IniFile
      MISSING_BINARY_BASE64 = '__RPGVXACE_WEB_MISSING_BINARY_BASE64__'

      def initialize(raw)
        @raw = raw
        @sections = {}
        @section_order = []
        parse_text
      end

      def read(section, key)
        entry = section_entry(section, create: false)
        return nil unless entry

        value = entry[:entries][normalize_name(key)]
        value && value[:value]
      end

      def write(section, key, value)
        return false if section.nil?

        if key.nil?
          delete_section(section)
          return true
        end

        entry = section_entry(section, create: true)
        normalized_key = normalize_name(key)
        if value.nil?
          entry[:key_order].delete(normalized_key)
          entry[:entries].delete(normalized_key)
          return true
        end

        unless entry[:entries].key?(normalized_key)
          entry[:key_order] << normalized_key
        end
        entry[:entries][normalized_key] = {
          name: key.to_s,
          value: value.to_s
        }
        true
      end

      def save(filename)
        normalized_filename = self.class.normalize_filename(filename)
        return false unless normalized_filename

        JS.global[:rubyBridge][:utils].saveBinaryBase64(
          RPGVXAceWeb::Internal.game_id,
          normalized_filename,
          Base64.strict_encode64(to_s)
        ).await
        self.class.cache(normalized_filename, self)
        true
      end

      def to_s
        lines = []
        @section_order.each do |normalized_section|
          section = @sections[normalized_section]
          next unless section

          lines << "[#{section[:name]}]" unless section[:name].empty?
          section[:key_order].each do |normalized_key|
            entry = section[:entries][normalized_key]
            lines << "#{entry[:name]}=#{entry[:value]}" if entry
          end
        end
        lines.join("\n") + (lines.empty? ? '' : "\n")
      end

      private

      def parse_text
        current_section = section_entry('', create: true)

        @raw.to_s.split(/\r?\n/).each do |line|
          stripped = line.strip
          next if stripped.empty? || stripped.start_with?(';')

          if stripped.match?(/\A\[.*\]\z/)
            current_section = section_entry(stripped[1...-1].strip, create: true)
            next
          end

          key, value = line.split('=', 2)
          next if value.nil?

          normalized_key = normalize_name(key)
          unless current_section[:entries].key?(normalized_key)
            current_section[:key_order] << normalized_key
          end
          current_section[:entries][normalized_key] = {
            name: key.strip,
            value: value.strip
          }
        end
      end

      def section_entry(section, create:)
        normalized_section = normalize_name(section)
        entry = @sections[normalized_section]
        return entry if entry || !create

        @section_order << normalized_section
        @sections[normalized_section] = {
          name: section.to_s,
          entries: {},
          key_order: []
        }
      end

      def delete_section(section)
        normalized_section = normalize_name(section)
        @section_order.delete(normalized_section)
        @sections.delete(normalized_section)
      end

      def normalize_name(value)
        value.to_s.strip.downcase
      end

      class << self
        def load(filename = 'Game.ini')
          normalized_filename = normalize_filename(filename)
          return IniFile.new('') unless normalized_filename

          cached = cached(normalized_filename)
          return cached if cached

          ini = IniFile.new(load_text(normalized_filename).to_s)
          cache(normalized_filename, ini)
          ini
        end

        def normalize_filename(filename)
          normalized = filename.to_s.gsub('\\', '/').sub(%r{\A\./}, '').sub(%r{\A/+}, '')
          game_dir_prefix = "#{RPGVXAceWeb::Internal.game_dir}/"
          normalized = normalized[game_dir_prefix.length..] if normalized.downcase.start_with?(game_dir_prefix.downcase)
          return nil if normalized.empty?
          return nil if normalized.match?(%r{\A[A-Za-z]:/})
          return nil if normalized.split('/').include?('..')

          normalized
        end

        def cache(filename, ini)
          ini_cache[cache_key(filename)] = ini
        end

        private

        def cached(filename)
          ini_cache[cache_key(filename)]
        end

        def load_text(filename)
          base64 = JS.global[:rubyBridge][:utils].loadVirtualBinaryBase64(RPGVXAceWeb::Internal.game_id, filename).await
          return Base64.decode64(base64.to_s) unless base64.to_s == MISSING_BINARY_BASE64

          JS.global[:rubyBridge][:utils].fetchText("#{RPGVXAceWeb::Internal.game_dir}/#{filename}").await.to_s
        rescue StandardError
          ''
        end

        def ini_cache
          @ini_cache ||= {}
        end

        def cache_key(filename)
          filename.to_s.downcase
        end
      end
    end
  end
end

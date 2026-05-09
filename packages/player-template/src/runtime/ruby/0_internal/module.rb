# 内部的に必要な処理

require 'js'

module RPGVXAceWeb
  # Runtime internal namespace. This is intentionally not a public compatibility API.
  module Internal
    def self.game_dir
      raise 'game dir not set' unless @game_dir
      @game_dir
    end

    def self.game_dir=(value)
      raise 'invalid game dir' unless value.match(/\A[A-Za-z0-9\-_]+\z/)

      @game_dir = value
    end

    def self.game_id
      raise 'game id not set' unless @game_id
      @game_id
    end

    def self.game_id=(value)
      raise 'invalid game id' unless value.match(/\A[A-Za-z0-9][A-Za-z0-9._:-]{0,127}\z/)

      @game_id = value
    end
  end
end

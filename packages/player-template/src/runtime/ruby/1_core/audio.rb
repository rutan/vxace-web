begin
  require 'js'
rescue LoadError
  # Native smoke scripts provide no JS bridge and only need class definitions.
end

module Audio
  class << self
    def setup_midi
    end

    def bgm_play(filename, volume = 100, pitch = 100, *pos)
      if pos.empty?
        app&.playAudio('bgm', filename.to_s, volume.to_i, pitch.to_i)
      else
        app&.playAudio('bgm', filename.to_s, volume.to_i, pitch.to_i, pos.first.to_f)
      end
    end

    def bgm_stop
      app&.stopAudio('bgm')
    end

    def bgm_fade(time)
      app&.fadeAudio('bgm', time.to_i)
    end

    def bgm_pos
      app&.audioPos('bgm').to_f
    end

    def bgs_play(filename, volume = 100, pitch = 100, *pos)
      if pos.empty?
        app&.playAudio('bgs', filename.to_s, volume.to_i, pitch.to_i)
      else
        app&.playAudio('bgs', filename.to_s, volume.to_i, pitch.to_i, pos.first.to_f)
      end
    end

    def bgs_stop
      app&.stopAudio('bgs')
    end

    def bgs_fade(time)
      app&.fadeAudio('bgs', time.to_i)
    end

    def bgs_pos
      app&.audioPos('bgs').to_f
    end

    def me_play(filename, volume = 100, pitch = 100)
      app&.playAudio('me', filename.to_s, volume.to_i, pitch.to_i, 0)
    end

    def me_stop
      app&.stopAudio('me')
    end

    def me_fade(time)
      app&.fadeAudio('me', time.to_i)
    end

    def se_play(filename, volume = 100, pitch = 100)
      app&.playAudio('se', filename.to_s, volume.to_i, pitch.to_i, 0)
    end

    def se_stop
      app&.stopAudio('se')
    end

    private

    def app
      return nil unless defined?(JS)

      JS.global[:rubyBridge][:app]
    end
  end
end

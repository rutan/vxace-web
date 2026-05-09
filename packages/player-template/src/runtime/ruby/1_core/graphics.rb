require 'js'

module Graphics
  class << self
    def frame_rate
      @frame_rate ||= 60
    end

    def frame_rate=(value)
      @frame_rate = [value.to_i, 1].max
    end

    def frame_count
      @frame_count ||= 0
    end

    def frame_count=(value)
      @frame_count = value
    end

    def brightness
      @brightness ||= 255
    end

    def brightness=(value)
      @brightness = [[value.to_i, 0].max, 255].min
      JS.global[:rubyBridge][:app].setGraphicsBrightness(@brightness)
    end

    def update
      @frame_count = frame_count + 1
      JS.global[:rubyBridge][:app].updateGraphics(frame_rate).await
    end

    def wait(duration)
      [duration.to_i, 0].max.times { update }
    end

    def fadeout(duration)
      apply_fade(0, duration)
    end

    def fadein(duration)
      apply_fade(255, duration)
    end

    def freeze
      JS.global[:rubyBridge][:app].freezeGraphics
    end

    def transition(duration = 10, filename = nil, vague = 40)
      steps = [duration.to_i, 0].max
      if steps == 0
        self.brightness = 255
        JS.global[:rubyBridge][:app].clearFrozenGraphics
        return
      end

      JS.global[:rubyBridge][:app].prepareGraphicsTransition(filename&.to_s, vague.to_i).await
      start_brightness = brightness
      steps.times do |index|
        progress = (index + 1).to_f / steps
        JS.global[:rubyBridge][:app].setFrozenGraphicsTransitionProgress(progress, vague.to_i)
        self.brightness = (start_brightness + ((255 - start_brightness) * progress)).round
        update
      end
      JS.global[:rubyBridge][:app].clearFrozenGraphics
      self.brightness = 255
    end

    def snap_to_bitmap
      bitmap = Bitmap.new(self.width, self.height)
      JS.global[:rubyBridge][:app].copyScreenToBitmap(bitmap.__bitmap_id)
      bitmap
    end

    def frame_reset
      # frame_count を 0 にするメソッドではなく、フレームスキップを抑止するためのメソッド
      # Web版では次の Graphics.update の待機基準だけを現在時刻へ戻す
      JS.global[:rubyBridge][:app].resetGraphicsFramePacing
    end

    def width
      @width ||= 544
    end

    def height
      @height ||= 416
    end

    def resize_screen(width, height)
      @width = [width.to_i, 1].max
      @height = [height.to_i, 1].max
      JS.global[:rubyBridge][:app].resizeScreen(@width, @height)
    end

    def play_movie(filename)
      JS.global[:rubyBridge][:app].playMovie(filename.to_s)
    end

    private

    def apply_fade(target_brightness, duration)
      steps = [duration.to_i, 0].max
      start_brightness = brightness
      if steps == 0
        self.brightness = target_brightness
        return
      end

      steps.times do |index|
        ratio = (index + 1).to_f / steps
        next_brightness = start_brightness + ((target_brightness - start_brightness) * ratio)
        self.brightness = next_brightness.round
        update
      end
    end
  end
end

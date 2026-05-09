require 'js'

module Input
  DOWN = :DOWN
  LEFT = :LEFT
  RIGHT = :RIGHT
  UP = :UP
  A = :A
  B = :B
  C = :C
  X = :X
  Y = :Y
  Z = :Z
  L = :L
  R = :R
  SHIFT = :SHIFT
  CTRL = :CTRL
  ALT = :ALT
  F5 = :F5
  F6 = :F6
  F7 = :F7
  F8 = :F8
  F9 = :F9

  class << self
    def __state
      @__state ||= {}
    end

    def update
      @__state = JS.global[:rubyBridge][:app].updateKey()
    end

    def press?(key)
      __key_value(key) > 0
    end

    def trigger?(key)
      __key_value(key) == 1
    end

    def repeat?(key)
      value = __key_value(key)
      value == 1 || (value >= 24 && value % 6 == 0)
    end

    def dir4
      case
      when __key_value(:DOWN) > 0
        2
      when __key_value(:LEFT) > 0
        4
      when __key_value(:RIGHT) > 0
        6
      when __key_value(:UP) > 0
        8
      else
        0
      end
    end

    def dir8
      x =
        if __key_value(:LEFT) > 0
          -1
        elsif __key_value(:RIGHT) > 0
          1
        else
          0
        end

      y =
        if __key_value(:DOWN) > 0
          1
        elsif __key_value(:UP) > 0
          -1
        else
          0
        end

      x == 0 && y == 0 ? 0 : 5 + x - y * 3
    end

    def __key_value(key)
      __state[key].to_i.nonzero? || __state[key.to_s].to_i
    end
  end
end

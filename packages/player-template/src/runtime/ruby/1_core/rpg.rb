module RPG
  class Map
    attr_accessor :tileset_id, :width, :height, :scroll_type,
                  :specify_battleback, :battleback1_name, :battleback2_name,
                  :autoplay_bgm, :bgm, :autoplay_bgs, :bgs, :disable_dashing,
                  :encounter_list, :encounter_step, :parallax_name,
                  :parallax_loop_x, :parallax_loop_y, :parallax_sx, :parallax_sy,
                  :parallax_show, :data, :events, :note, :display_name

    def initialize(width, height)
      @display_name = ''
      @tileset_id = 1
      @width = width
      @height = height
      @scroll_type = 0
      @specify_battleback = false
      @battleback1_name = ''
      @battleback2_name = ''
      @autoplay_bgm = false
      @bgm = RPG::BGM.new
      @autoplay_bgs = false
      @bgs = RPG::BGS.new('', 80)
      @disable_dashing = false
      @encounter_list = []
      @encounter_step = 30
      @parallax_name = ''
      @parallax_loop_x = false
      @parallax_loop_y = false
      @parallax_sx = 0
      @parallax_sy = 0
      @parallax_show = false
      @note = ''
      @data = Table.new(width, height, 4)
      @events = {}
    end
  end

  class Map::Encounter
    attr_accessor :troop_id, :weight, :region_set

    def initialize
      @troop_id = 1
      @weight = 10
      @region_set = []
    end
  end

  class MapInfo
    attr_accessor :name, :parent_id, :order, :expanded, :scroll_x, :scroll_y

    def initialize
      @name = ''
      @parent_id = 0
      @order = 0
      @expanded = false
      @scroll_x = 0
      @scroll_y = 0
    end
  end

  class Event
    attr_accessor :id, :name, :x, :y, :pages

    def initialize(x, y)
      @id = 0
      @name = ''
      @x = x
      @y = y
      @pages = [RPG::Event::Page.new]
    end
  end

  class Event::Page
    attr_accessor :condition, :graphic, :move_type, :move_speed, :move_frequency,
                  :move_route, :walk_anime, :step_anime, :direction_fix, :through,
                  :priority_type, :trigger, :list

    def initialize
      @condition = RPG::Event::Page::Condition.new
      @graphic = RPG::Event::Page::Graphic.new
      @move_type = 0
      @move_speed = 3
      @move_frequency = 3
      @move_route = RPG::MoveRoute.new
      @walk_anime = true
      @step_anime = false
      @direction_fix = false
      @through = false
      @priority_type = 0
      @trigger = 0
      @list = [RPG::EventCommand.new]
    end
  end

  class Event::Page::Condition
    attr_accessor :switch1_valid, :switch2_valid, :variable_valid,
                  :self_switch_valid, :item_valid, :actor_valid,
                  :switch1_id, :switch2_id, :variable_id, :variable_value,
                  :self_switch_ch, :item_id, :actor_id

    def initialize
      @switch1_valid = false
      @switch2_valid = false
      @variable_valid = false
      @self_switch_valid = false
      @item_valid = false
      @actor_valid = false
      @switch1_id = 1
      @switch2_id = 1
      @variable_id = 1
      @variable_value = 0
      @self_switch_ch = 'A'
      @item_id = 1
      @actor_id = 1
    end
  end

  class Event::Page::Graphic
    attr_accessor :tile_id, :character_name, :character_index, :direction, :pattern

    def initialize
      @tile_id = 0
      @character_name = ''
      @character_index = 0
      @direction = 2
      @pattern = 0
    end
  end

  class EventCommand
    attr_accessor :code, :indent, :parameters

    def initialize(code = 0, indent = 0, parameters = [])
      @code = code
      @indent = indent
      @parameters = parameters
    end
  end

  class MoveRoute
    attr_accessor :repeat, :skippable, :wait, :list

    def initialize
      @repeat = true
      @skippable = false
      @wait = false
      @list = [RPG::MoveCommand.new]
    end
  end

  class MoveCommand
    attr_accessor :code, :parameters

    def initialize(code = 0, parameters = [])
      @code = code
      @parameters = parameters
    end
  end

  class BaseItem
    attr_accessor :id, :name, :icon_index, :description, :note, :features

    def initialize
      @id = 0
      @name = ''
      @icon_index = 0
      @description = ''
      @features = []
      @note = ''
    end
  end

  class Actor < BaseItem
    attr_accessor :id, :name, :nickname, :class_id, :initial_level, :max_level,
                  :character_name, :character_index, :face_name, :face_index,
                  :equips, :description, :features, :note

    def initialize
      super
      @nickname = ''
      @class_id = 1
      @initial_level = 1
      @max_level = 99
      @character_name = ''
      @character_index = 0
      @face_name = ''
      @face_index = 0
      @equips = [0, 0, 0, 0, 0]
    end
  end

  class Class < BaseItem
    attr_accessor :id, :name, :learnings, :features, :note, :params,
                  :exp_params, :icon_index, :description

    def initialize
      super
      @exp_params = [30, 20, 30, 30]
      @params = Table.new(8, 100)
      (1..99).each do |i|
        @params[0, i] = 400 + i * 50
        @params[1, i] = 80 + i * 10
        (2..5).each { |j| @params[j, i] = 15 + i * 5 / 4 }
        (6..7).each { |j| @params[j, i] = 30 + i * 5 / 2 }
      end
      @learnings = []
      @features.push(RPG::BaseItem::Feature.new(23, 0, 1))
      @features.push(RPG::BaseItem::Feature.new(22, 0, 0.95))
      @features.push(RPG::BaseItem::Feature.new(22, 1, 0.05))
      @features.push(RPG::BaseItem::Feature.new(22, 2, 0.04))
      @features.push(RPG::BaseItem::Feature.new(41, 1))
      @features.push(RPG::BaseItem::Feature.new(51, 1))
      @features.push(RPG::BaseItem::Feature.new(52, 1))
    end

    def exp_for_level(level)
      return 0 if level.to_i <= 1

      basis = @exp_params&.[](0).to_i
      extra = @exp_params&.[](1).to_i
      acc_a = @exp_params&.[](2).to_i
      acc_b = [@exp_params&.[](3).to_i, 1].max
      n = level.to_f

      (basis * ((n - 1) ** (0.9 + acc_a / 250.0)) * n * (n + 1) /
        (6 + n**2 / 50.0 / acc_b) + (n - 1) * extra).round
    end
  end

  class UsableItem < BaseItem
    attr_accessor :scope, :occasion, :speed, :success_rate, :repeats,
                  :tp_gain, :hit_type, :animation_id, :damage, :effects

    def initialize
      super
      @scope = 0
      @occasion = 0
      @speed = 0
      @success_rate = 100
      @repeats = 1
      @tp_gain = 0
      @hit_type = 0
      @animation_id = 0
      @damage = RPG::UsableItem::Damage.new
      @effects = []
    end

    def for_opponent?
      [1, 2, 3, 4, 5, 6].include?(@scope)
    end

    def for_friend?
      [7, 8, 9, 10, 11].include?(@scope)
    end

    def for_dead_friend?
      [9, 10].include?(@scope)
    end

    def for_user?
      @scope == 11
    end

    def for_one?
      [1, 3, 7, 9, 11].include?(@scope)
    end

    def for_random?
      [3, 4, 5, 6].include?(@scope)
    end

    def number_of_targets
      for_random? ? @scope - 2 : 0
    end

    def for_all?
      [2, 8, 10].include?(@scope)
    end

    def need_selection?
      [1, 7, 9].include?(@scope)
    end

    def battle_ok?
      [0, 1].include?(@occasion)
    end

    def menu_ok?
      [0, 2].include?(@occasion)
    end

    def certain?
      @hit_type == 0
    end

    def physical?
      @hit_type == 1
    end

    def magical?
      @hit_type == 2
    end
  end

  class Skill < UsableItem
    attr_accessor :stype_id, :mp_cost, :tp_cost, :message1, :message2,
                  :required_wtype_id1, :required_wtype_id2

    def initialize
      super
      @scope = 1
      @stype_id = 1
      @mp_cost = 0
      @tp_cost = 0
      @message1 = ''
      @message2 = ''
      @required_wtype_id1 = 0
      @required_wtype_id2 = 0
    end
  end

  class Item < UsableItem
    attr_accessor :price, :consumable, :itype_id

    def initialize
      super
      @scope = 7
      @itype_id = 1
      @price = 0
      @consumable = true
    end

    def key_item?
      @itype_id == 2
    end
  end

  class EquipItem < BaseItem
    attr_accessor :price, :params, :etype_id

    def initialize
      super
      @price = 0
      @etype_id = 0
      @params = [0] * 8
    end
  end

  class Weapon < EquipItem
    attr_accessor :wtype_id, :animation_id

    def initialize
      super
      @wtype_id = 0
      @animation_id = 0
      @features.push(RPG::BaseItem::Feature.new(31, 1, 0))
      @features.push(RPG::BaseItem::Feature.new(22, 0, 0))
    end

    def performance
      params[2] + params[4] + params.inject(0) {|r, v| r += v }
    end
  end

  class Armor < EquipItem
    attr_accessor :atype_id

    def initialize
      super
      @atype_id = 0
      @etype_id = 1
      @features.push(RPG::BaseItem::Feature.new(22, 1, 0))
    end

    def performance
      params[3] + params[5] + params.inject(0) {|r, v| r += v }
    end
  end

  class Enemy < BaseItem
    attr_accessor :id, :name, :battler_name, :battler_hue, :params, :exp,
                  :gold, :drop_items, :actions, :features, :note

    def initialize
      super
      @battler_name = ''
      @battler_hue = 0
      @params = [100,0,10,10,10,10,10,10]
      @exp = 0
      @gold = 0
      @drop_items = Array.new(3) { RPG::Enemy::DropItem.new }
      @actions = [RPG::Enemy::Action.new]
      @features.push(RPG::BaseItem::Feature.new(22, 0, 0.95))
      @features.push(RPG::BaseItem::Feature.new(22, 1, 0.05))
      @features.push(RPG::BaseItem::Feature.new(31, 1, 0))
    end
  end

  class State < BaseItem
    attr_accessor :id, :name, :icon_index, :restriction, :priority,
                  :remove_at_battle_end, :remove_by_restriction,
                  :auto_removal_timing, :min_turns, :max_turns,
                  :remove_by_damage, :chance_by_damage, :remove_by_walking,
                  :steps_to_remove, :message1, :message2, :message3, :message4,
                  :features, :note

    def initialize
      super
      @restriction = 0
      @priority = 50
      @remove_at_battle_end = false
      @remove_by_restriction = false
      @auto_removal_timing = 0
      @min_turns = 1
      @max_turns = 1
      @remove_by_damage = false
      @chance_by_damage = 100
      @remove_by_walking = false
      @steps_to_remove = 100
      @message1 = ''
      @message2 = ''
      @message3 = ''
      @message4 = ''
    end
  end

  class BaseItem::Feature
    attr_accessor :code, :data_id, :value

    def initialize(code = 0, data_id = 0, value = 0)
      @code = code
      @data_id = data_id
      @value = value
    end
  end

  class UsableItem::Damage
    attr_accessor :type, :element_id, :formula, :variance, :critical

    def initialize
      @type = 0
      @element_id = 0
      @formula = '0'
      @variance = 20
      @critical = false
    end

    def none?
      @type == 0
    end

    def to_hp?
      [1, 3, 5].include?(@type)
    end

    def to_mp?
      [2, 4, 6].include?(@type)
    end

    def recover?
      [3, 4].include?(@type)
    end

    def drain?
      [5, 6].include?(@type)
    end

    def sign
      recover? ? -1 : 1
    end

    def eval(a, b, v)
      [Kernel.eval(@formula), 0].max * sign
    rescue
      0
    end
  end

  class UsableItem::Effect
    attr_accessor :code, :data_id, :value1, :value2

    def initialize(code = 0, data_id = 0, value1 = 0, value2 = 0)
      @code = code
      @data_id = data_id
      @value1 = value1
      @value2 = value2
    end
  end

  class Class::Learning
    attr_accessor :level, :skill_id, :note

    def initialize
      @level = 1
      @skill_id = 1
      @note = ''
    end
  end

  class Enemy::DropItem
    attr_accessor :kind, :data_id, :denominator

    def initialize
      @kind = 0
      @data_id = 1
      @denominator = 1
    end
  end

  class Enemy::Action
    attr_accessor :condition_type, :condition_param1, :condition_param2,
                  :rating, :skill_id

    def initialize
      @skill_id = 1
      @condition_type = 0
      @condition_param1 = 0
      @condition_param2 = 0
      @rating = 5
    end
  end

  class Troop
    attr_accessor :id, :name, :members, :pages

    def initialize
      @id = 0
      @name = ''
      @members = []
      @pages = [RPG::Troop::Page.new]
    end
  end

  class Troop::Member
    attr_accessor :enemy_id, :x, :y, :hidden

    def initialize
      @enemy_id = 1
      @x = 0
      @y = 0
      @hidden = false
    end
  end

  class Troop::Page
    attr_accessor :condition, :span, :list

    def initialize
      @condition = RPG::Troop::Page::Condition.new
      @span = 0
      @list = [RPG::EventCommand.new]
    end
  end

  class Troop::Page::Condition
    attr_accessor :turn_ending, :turn_valid, :enemy_valid, :actor_valid,
                  :switch_valid, :turn_a, :turn_b, :enemy_index, :enemy_hp,
                  :actor_id, :actor_hp, :switch_id

    def initialize
      @turn_ending = false
      @turn_valid = false
      @enemy_valid = false
      @actor_valid = false
      @switch_valid = false
      @turn_a = 0
      @turn_b = 0
      @enemy_index = 0
      @enemy_hp = 50
      @actor_id = 1
      @actor_hp = 50
      @switch_id = 1
    end
  end

  class Animation
    attr_accessor :id, :name, :animation1_name, :animation1_hue,
                  :animation2_name, :animation2_hue, :position, :frame_max,
                  :frames, :timings

    def initialize
      @id = 0
      @name = ''
      @animation1_name = ''
      @animation1_hue = 0
      @animation2_name = ''
      @animation2_hue = 0
      @position = 1
      @frame_max = 1
      @frames = [RPG::Animation::Frame.new]
      @timings = []
    end

    def to_screen?
      @position == 3
    end
  end

  class Animation::Frame
    attr_accessor :cell_max, :cell_data

    def initialize
      @cell_max = 0
      @cell_data = Table.new(0, 0)
    end
  end

  class Animation::Timing
    attr_accessor :frame, :se, :flash_scope, :flash_color, :flash_duration

    def initialize
      @frame = 0
      @se = RPG::SE.new('', 80)
      @flash_scope = 0
      @flash_color = Color.new(255, 255, 255, 255)
      @flash_duration = 5
    end
  end

  class Tileset
    attr_accessor :id, :name, :mode, :tileset_names, :flags, :note

    def initialize
      @id = 0
      @mode = 1
      @name = ''
      @tileset_names = Array.new(9).collect { '' }
      @flags = Table.new(8192)
      @flags[0] = 0x0010
      (2048..2815).each { |i| @flags[i] = 0x000F }
      (4352..8191).each { |i| @flags[i] = 0x000F }
      @note = ''
    end
  end

  class CommonEvent
    attr_accessor :id, :name, :trigger, :switch_id, :list

    def initialize
      @id = 0
      @name = ''
      @trigger = 0
      @switch_id = 1
      @list = [RPG::EventCommand.new]
    end

    def autorun?
      @trigger.to_i == 1
    end

    def parallel?
      @trigger.to_i == 2
    end
  end

  class System
    def initialize
      @game_title = ''
      @version_id = 0
      @japanese = true
      @party_members = [1]
      @currency_unit = ''
      @elements = [nil, '']
      @skill_types = [nil, '']
      @weapon_types = [nil, '']
      @armor_types = [nil, '']
      @switches = [nil, '']
      @variables = [nil, '']
      @boat = RPG::System::Vehicle.new
      @ship = RPG::System::Vehicle.new
      @airship = RPG::System::Vehicle.new
      @title1_name = ''
      @title2_name = ''
      @opt_draw_title = true
      @opt_use_midi = false
      @opt_transparent = false
      @opt_followers = true
      @opt_slip_death = false
      @opt_floor_death = false
      @opt_display_tp = true
      @opt_extra_exp = false
      @window_tone = Tone.new(0, 0, 0)
      @title_bgm = RPG::BGM.new
      @battle_bgm = RPG::BGM.new
      @battle_end_me = RPG::ME.new
      @gameover_me = RPG::ME.new
      @sounds = Array.new(24) { RPG::SE.new }
      @test_battlers = []
      @test_troop_id = 1
      @start_map_id = 1
      @start_x = 0
      @start_y = 0
      @terms = RPG::System::Terms.new
      @battleback1_name = ''
      @battleback2_name = ''
      @battler_name = ''
      @battler_hue = 0
      @edit_map_id = 1
    end

    attr_accessor :game_title, :version_id, :japanese, :party_members, :currency_unit, :skill_types, :weapon_types, :armor_types, :elements, :switches, :variables, :boat, :ship, :airship, :title1_name, :title2_name, :opt_draw_title, :opt_use_midi, :opt_transparent, :opt_followers, :opt_slip_death, :opt_floor_death, :opt_display_tp, :opt_extra_exp, :window_tone, :title_bgm, :battle_bgm, :battle_end_me, :gameover_me, :sounds, :test_battlers, :test_troop_id, :start_map_id, :start_x, :start_y, :terms, :battleback1_name, :battleback2_name, :battler_name, :battler_hue, :edit_map_id

    class Vehicle
      def initialize
        @character_name = ''
        @character_index = 0
        @bgm = RPG::BGM.new
        @start_map_id = 0
        @start_x = 0
        @start_y = 0
      end

      attr_accessor :character_name, :character_index, :bgm, :start_map_id, :start_x, :start_y
    end

    class Terms
      def initialize
        @basic = Array.new(8) {''}
        @params = Array.new(8) {''}
        @etypes = Array.new(5) {''}
        @commands = Array.new(23) {''}
      end
      attr_accessor :basic, :params, :etypes, :commands
    end

    class TestBattler
      attr_accessor :actor_id, :level, :equips

      def initialize
        @actor_id = 1
        @level = 1
        @equips = [0, 0, 0, 0, 0]
      end
    end
  end

  class AudioFile
    def initialize(name = '', volume = 100, pitch = 100)
      @name = name
      @volume = volume
      @pitch = pitch
    end

    attr_accessor :name, :volume, :pitch
  end

  class BGM < AudioFile
    @@last = RPG::BGM.new
    attr_accessor :pos

    def play(*pos)
      if @name.empty?
        Audio.bgm_stop
        @@last = RPG::BGM.new
      else
        if pos.empty?
          Audio.bgm_play('Audio/BGM/' + @name, @volume, @pitch)
        else
          Audio.bgm_play('Audio/BGM/' + @name, @volume, @pitch, pos.first)
        end
        @@last = self.clone
      end
    end

    def replay
      play(@pos || 0)
    end

    class << self
      def stop
        Audio.bgm_stop
        @@last = RPG::BGM.new
      end

      def fade(time)
        Audio.bgm_fade(time)
        @@last = RPG::BGM.new
      end

      def last
        @@last.tap { |last| last.pos = Audio.bgm_pos }
      end
    end
  end

  class BGS < AudioFile
    @@last = RPG::BGS.new
    attr_accessor :pos

    def play(*pos)
      if @name.empty?
        Audio.bgs_stop
        @@last = RPG::BGS.new
      else
        if pos.empty?
          Audio.bgs_play("Audio/BGS/#{@name}", @volume, @pitch)
        else
          Audio.bgs_play("Audio/BGS/#{@name}", @volume, @pitch, pos.first)
        end
        @@last = self.clone
      end
    end

    def replay
      play(@pos || 0)
    end

    class << self
      def stop
        Audio.bgs_stop
        @@last = RPG::BGS.new
      end

      def fade(time)
        Audio.bgs_fade(time)
        @@last = RPG::BGS.new
      end

      def last
        @@last.tap {|last| last.pos = Audio.bgs_pos }
      end
    end
  end

  class ME < AudioFile
    def play
      if @name.empty?
        Audio.me_stop
      else
        Audio.me_play("Audio/ME/#{@name}", @volume, @pitch)
      end
    end

    class << self
      def stop
        Audio.me_stop
      end

      def fade(time)
        Audio.me_fade(time)
      end
    end
  end

  class SE < AudioFile
    def play
      Audio.se_play("Audio/SE/#{@name}", @volume, @pitch) unless @name.empty?
    end

    class << self
      def stop
        Audio.se_stop
      end
    end
  end
end

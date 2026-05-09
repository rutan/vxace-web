import { expect, test } from '@playwright/test';
import { expectNoRuntimeError, loadGame } from './helpers';

test.describe('RGSS core compatibility', () => {
  test('defines RGSS exception classes and Input constants', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      return JSON.parse(
        (
          await rubyManager.evalAsync(
            `
            {
              rgss_error_superclass: RGSSError.superclass.name,
              rgss_reset_superclass: RGSSReset.superclass.name,
              input_constants: [Input::DOWN, Input::LEFT, Input::RIGHT, Input::UP, Input::C, Input::F9].map(&:to_s)
            }.to_json
          `,
            'test-rgss-core-constants',
          )
        ).toString(),
      );
    });

    expect(result.rgss_error_superclass).toBe('StandardError');
    expect(result.rgss_reset_superclass).toBe('Exception');
    expect(result.input_constants).toEqual(['DOWN', 'LEFT', 'RIGHT', 'UP', 'C', 'F9']);
    await expectNoRuntimeError(page);
  });

  test('Table#resize preserves overlapping cells and initializes new cells', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      return JSON.parse(
        (
          await rubyManager.evalAsync(
            `
            table = Table.new(2, 2, 1)
            table[0, 0, 0] = 11
            table[1, 1, 0] = 22
            table.resize(3, 2, 2)
            {
              size: [table.xsize, table.ysize, table.zsize],
              kept: [table[0, 0, 0], table[1, 1, 0]],
              fresh: table[2, 1, 1],
              out_of_range: table[3, 0, 0]
            }.to_json
          `,
            'test-table-resize',
          )
        ).toString(),
      );
    });

    expect(result.size).toEqual([3, 2, 2]);
    expect(result.kept).toEqual([11, 22]);
    expect(result.fresh).toBe(0);
    expect(result.out_of_range).toBeNull();
    await expectNoRuntimeError(page);
  });

  test('Win32API reads and writes ini values through profile string APIs', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      return JSON.parse(
        (
          await rubyManager.evalAsync(
            `
            get_profile = Win32API.new('kernel32', 'GetPrivateProfileStringA', 'PPPPLP', 'L')
            write_profile = Win32API.new('kernel32', 'WritePrivateProfileStringA', 'PPPP', 'L')

            def read_profile(api, section, key, default_value, length, filename)
              buffer = "\\0" * length
              count = api.call(section, key, default_value, buffer, length, filename)
              {
                count: count,
                value: buffer.split("\\0", 2).first,
                bytesize: buffer.bytesize
              }
            end

            full_title = read_profile(get_profile, 'Game', 'Title', 'fallback', 32, 'Game.ini')
            missing_key = read_profile(get_profile, 'Game', 'Missing', 'fallback', 32, 'Game.ini')
            missing_file = read_profile(get_profile, 'Game', 'Title', 'fallback', 32, 'Missing.ini')
            truncated = read_profile(get_profile, 'Game', 'Title', 'fallback', 6, 'Game.ini')
            write_result = write_profile.call('Game', 'Title', 'updated-title', 'Game.ini')
            written_title = read_profile(get_profile, 'Game', 'Title', 'fallback', 32, 'Game.ini')
            new_section_result = write_profile.call('Custom', 'Answer', '42', 'Game.ini')
            new_section_value = read_profile(get_profile, 'Custom', 'Answer', 'fallback', 32, 'Game.ini')

            {
              full_title: full_title,
              missing_key: missing_key,
              missing_file: missing_file,
              truncated: truncated,
              write_result: write_result,
              written_title: written_title,
              new_section_result: new_section_result,
              new_section_value: new_section_value
            }.to_json
          `,
            'test-win32api-profile-string-ini',
          )
        ).toString(),
      );
    });

    expect(result.full_title).toEqual({ count: 9, value: 'wasm-test', bytesize: 32 });
    expect(result.missing_key.value).toBe('fallback');
    expect(result.missing_key.count).toBe(8);
    expect(result.missing_file.value).toBe('fallback');
    expect(result.truncated).toEqual({ count: 5, value: 'wasm-', bytesize: 6 });
    expect(result.write_result).toBe(1);
    expect(result.written_title.value).toBe('updated-title');
    expect(result.written_title.count).toBe(13);
    expect(result.new_section_result).toBe(1);
    expect(result.new_section_value.value).toBe('42');
    await expectNoRuntimeError(page);
  });

  test('runtime internals are isolated from guest Internal constant', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', guest: false });

    const result = await page.evaluate(async () => {
      const bridge = (window as any).rubyBridge;
      await bridge.utils.deleteSavedData(bridge.gameId, 'NamespaceInternal.rvdata2');

      return JSON.parse(
        (
          await bridge.rubyManager.evalAsync(
            `
            top_level_before = Object.const_defined?(:Internal, false)

            class Internal
              VALUE = 'guest-owned'
            end

            bitmap = Bitmap.new('Graphics/rutan')
            get_profile = Win32API.new('kernel32', 'GetPrivateProfileStringA', 'PPPPLP', 'L')
            buffer = "\\0" * 32
            profile_count = get_profile.call('Game', 'Title', 'fallback', buffer, 32, 'Game.ini')

            File.open('NamespaceInternal.rvdata2', 'wb') { |file| file.write('namespaced') }
            file_value = File.open('NamespaceInternal.rvdata2', 'rb') { |file| file.read }
            actors = load_data('Data/Actors.rvdata2')

            {
              top_level_before: top_level_before,
              top_level_after: Object.const_get(:Internal).name,
              internal_alias: RPGVXAceWeb::Internal.equal?(Object.const_get(:Internal)),
              runtime_game_dir: RPGVXAceWeb::Internal.game_dir,
              runtime_game_id: RPGVXAceWeb::Internal.game_id,
              runtime_ini_class: RPGVXAceWeb::Internal::IniFile.name,
              bitmap_size: [bitmap.width, bitmap.height],
              profile: {
                count: profile_count,
                value: buffer.split("\\0", 2).first
              },
              file_value: file_value,
              actors_is_array: actors.is_a?(Array),
              actors_count: actors.length
            }.to_json
          `,
            'test-internal-namespace-isolated',
          )
        ).toString(),
      );
    });

    expect(result.top_level_before).toBe(false);
    expect(result.top_level_after).toBe('Internal');
    expect(result.internal_alias).toBe(false);
    expect(result.runtime_game_dir).toBe('minimal');
    expect(result.runtime_game_id).toBe('local:minimal');
    expect(result.runtime_ini_class).toBe('RPGVXAceWeb::Internal::IniFile');
    expect(result.bitmap_size).toEqual([128, 128]);
    expect(result.profile).toEqual({ count: 9, value: 'wasm-test' });
    expect(result.file_value).toBe('namespaced');
    expect(result.actors_is_array).toBe(true);
    expect(result.actors_count).toBeGreaterThan(1);
    await expectNoRuntimeError(page);
  });

  test('Win32API mocks common Windows API methods with writable buffers', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      return JSON.parse(
        (
          await rubyManager.evalAsync(
            `
            def c_string(buffer)
              buffer.split("\\0", 2).first
            end

            def int32_le(buffer)
              buffer.byteslice(0, 4).unpack1('l<')
            end

            Graphics.resize_screen(321, 234)

            find_window_a = Win32API.new('user32', 'FindWindowA', 'PP', 'L')
            find_window_w = Win32API.new('user32', 'FindWindowW', 'PP', 'L')
            move_window = Win32API.new('user32', 'MoveWindow', 'LLLLLL', 'L')
            shell_execute_w = Win32API.new('shell32', 'ShellExecuteW', 'LPPPLL', 'L')

            get_window_rect_w = Win32API.new('user32', 'GetWindowRectW', 'LP', 'L')
            window_rect_buffer = "\\0" * 16
            window_rect_result = get_window_rect_w.call(0, window_rect_buffer)
            short_rect_result = get_window_rect_w.call(0, "\\0" * 15)

            get_client_rect = Win32API.new('user32', 'GetClientRect', 'LP', 'L')
            client_rect_buffer = "\\0" * 16
            client_rect_result = get_client_rect.call(0, client_rect_buffer)

            get_current_directory_a = Win32API.new('kernel32', 'GetCurrentDirectoryA', 'LP', 'L')
            current_directory_buffer = "\\0" * 16
            current_directory_count = get_current_directory_a.call(16, current_directory_buffer)
            short_directory_buffer = "\\0" * 4
            short_directory_count = get_current_directory_a.call(4, short_directory_buffer)

            sh_get_folder_path_w = Win32API.new('shell32', 'SHGetFolderPathW', 'LLLLP', 'L')
            folder_path_buffer = "\\0" * 16
            folder_path_result = sh_get_folder_path_w.call(0, 0, 0, 0, folder_path_buffer)

            get_user_name_a = Win32API.new('advapi32', 'GetUserNameA', 'PP', 'L')
            user_name_buffer = "\\0" * 32
            user_name_length = [32].pack('l<')
            user_name_result = get_user_name_a.call(user_name_buffer, user_name_length)
            short_user_name_buffer = "\\0" * 4
            short_user_name_length = [4].pack('l<')
            short_user_name_result = get_user_name_a.call(short_user_name_buffer, short_user_name_length)

            get_keyboard_state = Win32API.new('user32', 'GetKeyboardState', 'P', 'L')
            keyboard_buffer = "\\xff" * 256
            keyboard_result = get_keyboard_state.call(keyboard_buffer)
            short_keyboard_result = get_keyboard_state.call("\\xff" * 255)

            {
              failure_values: {
                find_window_a: find_window_a.call(nil, nil),
                find_window_w: find_window_w.call(nil, nil),
                move_window: move_window.call(0, 0, 0, 0, 0, 0),
                shell_execute_w: shell_execute_w.call(0, 'open', 'https://example.test', nil, nil, 1)
              },
              window_rect: {
                result: window_rect_result,
                values: window_rect_buffer.unpack('l<l<l<l<'),
                short_result: short_rect_result
              },
              client_rect: {
                result: client_rect_result,
                values: client_rect_buffer.unpack('l<l<l<l<')
              },
              current_directory: {
                count: current_directory_count,
                value: c_string(current_directory_buffer),
                short_count: short_directory_count,
                short_value: c_string(short_directory_buffer)
              },
              folder_path: {
                result: folder_path_result,
                value: c_string(folder_path_buffer)
              },
              user_name: {
                result: user_name_result,
                value: c_string(user_name_buffer),
                length: int32_le(user_name_length),
                short_result: short_user_name_result,
                short_required_length: int32_le(short_user_name_length)
              },
              keyboard: {
                result: keyboard_result,
                first: keyboard_buffer.getbyte(0),
                last: keyboard_buffer.getbyte(255),
                sum: keyboard_buffer.bytes.sum,
                short_result: short_keyboard_result
              }
            }.to_json
          `,
            'test-win32api-common-method-mocks',
          )
        ).toString(),
      );
    });

    expect(result.failure_values).toEqual({
      find_window_a: 0,
      find_window_w: 0,
      move_window: 0,
      shell_execute_w: 0,
    });
    expect(result.window_rect).toEqual({
      result: 1,
      values: [0, 0, 321, 234],
      short_result: 0,
    });
    expect(result.client_rect).toEqual({
      result: 1,
      values: [0, 0, 321, 234],
    });
    expect(result.current_directory).toEqual({
      count: 7,
      value: 'C:\\game',
      short_count: 3,
      short_value: 'C:\\',
    });
    expect(result.folder_path).toEqual({
      result: 0,
      value: 'C:\\game',
    });
    expect(result.user_name).toEqual({
      result: 1,
      value: 'VXAceWeb',
      length: 8,
      short_result: 0,
      short_required_length: 9,
    });
    expect(result.keyboard).toEqual({
      result: 1,
      first: 0,
      last: 0,
      sum: 0,
      short_result: 0,
    });
    await expectNoRuntimeError(page);
  });

  test('Ruby Plane exposes RGSS3 visual properties', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      return JSON.parse(
        (
          await rubyManager.evalAsync(
            `
            plane = Plane.new
            plane.zoom_x = 1.5
            plane.zoom_y = 0.75
            plane.color = Color.new(10, 20, 30, 40)
            plane.tone = Tone.new(-10, 20, 30, 40)
            object = JS.global[:rubyBridge][:app].getObject('plane', plane.instance_variable_get(:@__plane_id))
            {
              zoom_x: plane.zoom_x,
              zoom_y: plane.zoom_y,
              tile_scale_x: object[:tileScale][:x].to_f,
              tile_scale_y: object[:tileScale][:y].to_f,
              color: [plane.color.red, plane.color.green, plane.color.blue, plane.color.alpha],
              tone: [plane.tone.red, plane.tone.green, plane.tone.blue, plane.tone.gray]
            }.to_json
          `,
            'test-plane-rgss3-properties',
          )
        ).toString(),
      );
    });

    expect(result.zoom_x).toBeCloseTo(1.5);
    expect(result.zoom_y).toBeCloseTo(0.75);
    expect(result.tile_scale_x).toBeCloseTo(1.5);
    expect(result.tile_scale_y).toBeCloseTo(0.75);
    expect(result.color).toEqual([10, 20, 30, 40]);
    expect(result.tone).toEqual([-10, 20, 30, 40]);
    await expectNoRuntimeError(page);
  });

  test('Plane color and tone effects are rendered from tiled bitmap alpha', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const bitmapId = app.createBitmapFromSize(16, 16);
      const planeId = app.createPlane();
      const bitmap = app.getObject('bitmap', bitmapId);
      bitmap.fillRect(0, 0, 16, 16, 'rgba(0, 255, 0, 1)');
      app.setBitmapToPlane(planeId, bitmapId);
      app.setColorToPlane(planeId, JSON.stringify({ red: 255, green: 0, blue: 0, alpha: 128 }));
      app.setToneToPlane(planeId, JSON.stringify({ red: 64, green: 0, blue: 0, gray: 0 }));
      app._renderNow();

      const canvas = app._pixiApp.renderer.extract.canvas(undefined, app._pixiApp.screen) as HTMLCanvasElement;
      const context = canvas.getContext('2d')!;
      return Array.from(context.getImageData(4, 4, 1, 1).data);
    });

    expect(result[0]).toBeGreaterThan(0);
    expect(result[1]).toBeGreaterThan(0);
    expect(result[3]).toBe(255);
    await expectNoRuntimeError(page);
  });

  test('Ruby Sprite bush_opacity and Viewport flash methods exist', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      return JSON.parse(
        (
          await rubyManager.evalAsync(
            `
            sprite = Sprite.new
            sprite.bush_opacity = 64
            viewport = Viewport.new
            viewport.flash(Color.new(255, 255, 255, 128), 2)
            viewport.update
            object = JS.global[:rubyBridge][:app].getObject('sprite', sprite.instance_variable_get(:@__sprite_id))
            {
              bush_opacity: sprite.bush_opacity,
              bridge_bush_opacity: object[:bushOpacity].to_i,
              viewport_flash_ok: true
            }.to_json
          `,
            'test-sprite-bush-opacity-viewport-flash',
          )
        ).toString(),
      );
    });

    expect(result.bush_opacity).toBe(64);
    expect(result.bridge_bush_opacity).toBe(64);
    expect(result.viewport_flash_ok).toBe(true);
    await expectNoRuntimeError(page);
  });

  test('Sprite bush_opacity affects only the bottom bush_depth pixels', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const bitmapId = app.createBitmapFromSize(8, 8);
      const spriteId = app.createSprite();
      const bitmap = app.getObject('bitmap', bitmapId);
      const sprite = app.getObject('sprite', spriteId);
      bitmap.fillRect(0, 0, 8, 8, 'rgba(255, 0, 0, 1)');
      app.setBitmapToSprite(spriteId, bitmapId);
      app.setProperty('sprite', spriteId, 'x', 24);
      app.setProperty('sprite', spriteId, 'y', 24);
      app.setProperty('sprite', spriteId, 'bushDepth', 4);
      app.setProperty('sprite', spriteId, 'bushOpacity', 64);
      app._renderNow();

      const canvas = app._pixiApp.renderer.extract.canvas(undefined, app._pixiApp.screen) as HTMLCanvasElement;
      const context = canvas.getContext('2d')!;
      return {
        top: Array.from(context.getImageData(25, 25, 1, 1).data),
        bottom: Array.from(context.getImageData(25, 30, 1, 1).data),
        bushDepth: sprite.bushDepth,
        bushOpacity: sprite.bushOpacity,
      };
    });

    expect(result.bushDepth).toBe(4);
    expect(result.bushOpacity).toBe(64);
    expect(result.top[0]).toBeGreaterThan(result.bottom[0]);
    expect(result.bottom[0]).toBeGreaterThanOrEqual(50);
    expect(result.bottom[0]).toBeLessThanOrEqual(80);
    await expectNoRuntimeError(page);
  });

  test('Viewport flash with nil hides content for the flash duration', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      const viewportId = app.createViewport();
      const viewport = app.getObject('viewport', viewportId);
      app.setFlashToViewport(viewportId, 'null', 2);
      const during = viewport.content.visible;
      app.updateViewportEffects(viewportId);
      const afterOneUpdate = viewport.content.visible;
      app.updateViewportEffects(viewportId);
      const afterDuration = viewport.content.visible;
      return { during, afterOneUpdate, afterDuration };
    });

    expect(result.during).toBe(false);
    expect(result.afterOneUpdate).toBe(false);
    expect(result.afterDuration).toBe(true);
    await expectNoRuntimeError(page);
  });

  test('RPG data classes expose documented VX Ace API surface', async ({ page }) => {
    await loadGame(page, { gameDir: 'demo', guest: false });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      return JSON.parse(
        (
          await rubyManager.evalAsync(
            `
            checks = {
              'RPG::Map' => [:display_name, :tileset_id, :width, :height, :scroll_type, :specify_battleback, :battleback1_name, :battleback2_name, :autoplay_bgm, :bgm, :autoplay_bgs, :bgs, :disable_dashing, :encounter_list, :encounter_step, :parallax_name, :parallax_loop_x, :parallax_loop_y, :parallax_sx, :parallax_sy, :parallax_show, :note, :data, :events],
              'RPG::Map::Encounter' => [:troop_id, :weight, :region_set],
              'RPG::MapInfo' => [:name, :parent_id, :order, :expanded, :scroll_x, :scroll_y],
              'RPG::Event' => [:id, :name, :x, :y, :pages],
              'RPG::Event::Page' => [:condition, :graphic, :move_type, :move_speed, :move_frequency, :move_route, :walk_anime, :step_anime, :direction_fix, :through, :priority_type, :trigger, :list],
              'RPG::Event::Page::Condition' => [:switch1_valid, :switch2_valid, :variable_valid, :self_switch_valid, :item_valid, :actor_valid, :switch1_id, :switch2_id, :variable_id, :variable_value, :self_switch_ch, :item_id, :actor_id],
              'RPG::Event::Page::Graphic' => [:tile_id, :character_name, :character_index, :direction, :pattern],
              'RPG::EventCommand' => [:code, :indent, :parameters],
              'RPG::MoveRoute' => [:repeat, :skippable, :wait, :list],
              'RPG::MoveCommand' => [:code, :parameters],
              'RPG::BaseItem' => [:id, :name, :icon_index, :description, :features, :note],
              'RPG::Actor' => [:nickname, :class_id, :initial_level, :max_level, :character_name, :character_index, :face_name, :face_index, :equips],
              'RPG::Class' => [:exp_params, :params, :learnings],
              'RPG::UsableItem' => [:scope, :occasion, :speed, :success_rate, :repeats, :tp_gain, :hit_type, :animation_id, :damage, :effects],
              'RPG::Skill' => [:stype_id, :mp_cost, :tp_cost, :message1, :message2, :required_wtype_id1, :required_wtype_id2],
              'RPG::Item' => [:itype_id, :price, :consumable],
              'RPG::EquipItem' => [:price, :etype_id, :params],
              'RPG::Weapon' => [:wtype_id, :animation_id],
              'RPG::Armor' => [:atype_id],
              'RPG::Enemy' => [:battler_name, :battler_hue, :params, :exp, :gold, :drop_items, :actions],
              'RPG::State' => [:restriction, :priority, :remove_at_battle_end, :remove_by_restriction, :auto_removal_timing, :min_turns, :max_turns, :remove_by_damage, :chance_by_damage, :remove_by_walking, :steps_to_remove, :message1, :message2, :message3, :message4],
              'RPG::BaseItem::Feature' => [:code, :data_id, :value],
              'RPG::UsableItem::Damage' => [:type, :element_id, :formula, :variance, :critical],
              'RPG::UsableItem::Effect' => [:code, :data_id, :value1, :value2],
              'RPG::Class::Learning' => [:level, :skill_id, :note],
              'RPG::Enemy::DropItem' => [:kind, :data_id, :denominator],
              'RPG::Enemy::Action' => [:skill_id, :condition_type, :condition_param1, :condition_param2, :rating],
              'RPG::Troop' => [:id, :name, :members, :pages],
              'RPG::Troop::Member' => [:enemy_id, :x, :y, :hidden],
              'RPG::Troop::Page' => [:condition, :span, :list],
              'RPG::Troop::Page::Condition' => [:turn_ending, :turn_valid, :enemy_valid, :actor_valid, :switch_valid, :turn_a, :turn_b, :enemy_index, :enemy_hp, :actor_id, :actor_hp, :switch_id],
              'RPG::Animation' => [:id, :name, :animation1_name, :animation1_hue, :animation2_name, :animation2_hue, :position, :frame_max, :frames, :timings],
              'RPG::Animation::Frame' => [:cell_max, :cell_data],
              'RPG::Animation::Timing' => [:frame, :se, :flash_scope, :flash_color, :flash_duration],
              'RPG::Tileset' => [:id, :mode, :name, :tileset_names, :flags, :note],
              'RPG::CommonEvent' => [:id, :name, :trigger, :switch_id, :list],
              'RPG::System' => [:game_title, :version_id, :japanese, :party_members, :currency_unit, :skill_types, :weapon_types, :armor_types, :elements, :switches, :variables, :boat, :ship, :airship, :title1_name, :title2_name, :opt_draw_title, :opt_use_midi, :opt_transparent, :opt_followers, :opt_slip_death, :opt_floor_death, :opt_display_tp, :opt_extra_exp, :window_tone, :title_bgm, :battle_bgm, :battle_end_me, :gameover_me, :sounds, :test_battlers, :test_troop_id, :start_map_id, :start_x, :start_y, :terms, :battleback1_name, :battleback2_name, :battler_name, :battler_hue, :edit_map_id],
              'RPG::System::Vehicle' => [:character_name, :character_index, :bgm, :start_map_id, :start_x, :start_y],
              'RPG::System::Terms' => [:basic, :params, :etypes, :commands],
              'RPG::System::TestBattler' => [:actor_id, :level, :equips],
              'RPG::AudioFile' => [:name, :volume, :pitch],
              'RPG::BGM' => [:pos],
              'RPG::BGS' => [:pos]
            }

            missing = []
            checks.each do |class_name, attrs|
              klass = class_name.split('::').inject(Object) {|mod, name| mod.const_get(name) }
              attrs.each do |attr|
                missing << "#{class_name}##{attr}" unless klass.method_defined?(attr) && klass.method_defined?("#{attr}=")
              end
            end

            method_checks = {
              'RPG::Class' => [:exp_for_level],
              'RPG::UsableItem' => [:for_opponent?, :for_friend?, :for_dead_friend?, :for_user?, :for_one?, :for_random?, :number_of_targets, :for_all?, :need_selection?, :battle_ok?, :menu_ok?, :certain?, :physical?, :magical?],
              'RPG::Item' => [:key_item?],
              'RPG::Weapon' => [:performance],
              'RPG::Armor' => [:performance],
              'RPG::UsableItem::Damage' => [:none?, :to_hp?, :to_mp?, :recover?, :drain?, :sign, :eval],
              'RPG::CommonEvent' => [:autorun?, :parallel?],
              'RPG::Animation' => [:to_screen?],
              'RPG::BGM' => [:play, :replay],
              'RPG::BGS' => [:play, :replay],
              'RPG::ME' => [:play],
              'RPG::SE' => [:play]
            }
            method_checks.each do |class_name, methods|
              klass = class_name.split('::').inject(Object) {|mod, name| mod.const_get(name) }
              methods.each do |method_name|
                missing << "#{class_name}##{method_name}" unless klass.method_defined?(method_name)
              end
            end

            class_method_checks = {
              'RPG::BGM' => [:last, :stop, :fade],
              'RPG::BGS' => [:last, :stop, :fade],
              'RPG::ME' => [:stop, :fade],
              'RPG::SE' => [:stop]
            }
            class_method_checks.each do |class_name, methods|
              klass = class_name.split('::').inject(Object) {|mod, name| mod.const_get(name) }
              methods.each do |method_name|
                missing << "#{class_name}.#{method_name}" unless klass.respond_to?(method_name)
              end
            end

            {
              class_count: checks.keys.count + 2,
              missing: missing
            }.to_json
          `,
            'test-rpg-data-api-surface',
          )
        ).toString(),
      );
    });

    expect(result.class_count).toBe(45);
    expect(result.missing).toEqual([]);
    await expectNoRuntimeError(page);
  });
});

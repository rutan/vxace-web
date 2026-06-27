import * as path from 'node:path';
import { deflateSync } from 'node:zlib';
import { describe, expect, test } from 'vitest';
import { nodeRuntime } from '../../src/internal/nodeEnvironment';
import type {
  RubyMarshalArray,
  RubyMarshalBytes,
  RubyMarshalHash,
  RubyMarshalObject,
  RubyMarshalValue,
} from '../../src/internal/rubyMarshal';
import {
  collectVxAceAssetReferencesWithRuntime,
  collectVxAceScriptLiteralAssetReferences,
} from '../../src/internal/vxaceAssetReferences';
import { collectVxAceAssetReferencesFromDataDir } from '../../src/internal/vxaceAssetReferencesNode';

describe('collectVxAceAssetReferences', () => {
  test('collects database, map, event command, move route, and default system assets', async () => {
    const result = await collectVxAceAssetReferencesWithRuntime({
      dataFiles: {
        'System.rvdata2': object('RPG::System', {
          '@sounds': array([audio('RPG::SE', 'Cursor1')]),
          '@title_bgm': audio('RPG::BGM', 'TitleTheme.wma'),
          '@battle_bgm': audio('RPG::BGM', 'BattleTheme'),
          '@battle_end_me': audio('RPG::ME', 'BattleEnd'),
          '@gameover_me': audio('RPG::ME', 'GameOver'),
          '@boat': vehicle('Boat', audio('RPG::BGM', 'BoatBgm')),
          '@ship': vehicle('Ship', audio('RPG::BGM', 'ShipBgm')),
          '@airship': vehicle('Airship', audio('RPG::BGM', 'AirshipBgm')),
          '@title1_name': 'TitleA',
          '@title2_name': 'TitleB',
          '@battleback1_name': 'Grassland',
          '@battleback2_name': 'Clouds',
          '@battler_name': 'ActorBattler',
        }),
        'Actors.rvdata2': array([
          null,
          object('RPG::Actor', {
            '@character_name': 'Hero.png',
            '@face_name': 'Actor1',
          }),
        ]),
        'Enemies.rvdata2': array([object('RPG::Enemy', { '@battler_name': 'Slime' })]),
        'Tilesets.rvdata2': array([
          object('RPG::Tileset', {
            '@tileset_names': array(['', 'Outside_A1.png', 'Outside_B']),
          }),
        ]),
        'Animations.rvdata2': array([
          object('RPG::Animation', {
            '@animation1_name': 'Slash',
            '@animation2_name': 'Impact',
            '@timings': array([object('RPG::Animation::Timing', { '@se': audio('RPG::SE', 'Slash1') })]),
          }),
        ]),
        'CommonEvents.rvdata2': array([
          object('RPG::CommonEvent', {
            '@list': array([
              eventCommand(101, ['MessageFace']),
              eventCommand(132, [audio('RPG::BGM', 'ChangedBattle')]),
              eventCommand(133, [audio('RPG::ME', 'ChangedVictory')]),
              eventCommand(139, [0, audio('RPG::ME', 'BattleMusicEvent')]),
              eventCommand(205, [0, moveRoute([moveCommand(44, [audio('RPG::SE', 'RouteStep')])])]),
              eventCommand(231, [1, 'Picture1']),
              eventCommand(241, [audio('RPG::BGM', 'MapBgmEvent')]),
              eventCommand(245, [audio('RPG::BGS', 'RiverEvent')]),
              eventCommand(249, [audio('RPG::ME', 'JingleEvent')]),
              eventCommand(250, [audio('RPG::SE', 'DecisionEvent')]),
              eventCommand(261, ['Opening.mp4']),
              eventCommand(283, ['EventBattleback1', 'EventBattleback2']),
              eventCommand(284, ['EventParallax']),
              eventCommand(285, ['NotAnAsset']),
              eventCommand(322, [1, 'ChangedCharacter', 0, 'ChangedFace']),
            ]),
          }),
        ]),
        'Troops.rvdata2': array([
          object('RPG::Troop', {
            '@pages': array([
              object('RPG::Troop::Page', {
                '@list': array([eventCommand(250, [audio('RPG::SE', 'TroopSe')])]),
              }),
            ]),
          }),
        ]),
        'Map001.rvdata2': object('RPG::Map', {
          '@battleback1_name': 'MapBattleback1',
          '@battleback2_name': 'MapBattleback2',
          '@parallax_name': 'MapParallax',
          '@bgm': audio('RPG::BGM', 'MapBgm'),
          '@bgs': audio('RPG::BGS', 'MapBgs'),
          '@events': hash([
            [
              1,
              object('RPG::Event', {
                '@pages': array([
                  object('RPG::Event::Page', {
                    '@graphic': object('RPG::Event::Page::Graphic', {
                      '@character_name': 'MapCharacter',
                    }),
                    '@list': array([eventCommand(101, ['MapFace'])]),
                    '@move_route': moveRoute([moveCommand(44, [audio('RPG::SE', 'PageMoveSe')])]),
                  }),
                ]),
              }),
            ],
          ]),
        }),
        'Scripts.rvdata2': array([
          array([
            1,
            'Asset literals',
            bytes(
              deflateSync(`\
Cache.character("ScriptHero")
Cache.picture("ScriptPicture", 0)
Cache.picture("CG_" + $game_variables[1].to_s)
Graphics.transition(30, "Graphics/System/Transition")
RPG::BGM.new("ScriptTheme")
RPG::SE.new("ScriptDecision.wma")
Audio.bgm_play("Audio/BGM/ScriptBattle")
Audio.se_play("Audio/SE/" + name)
`),
            ),
          ]),
        ]),
      },
      runtime: nodeRuntime,
    });

    expect(result.warnings).toEqual([]);
    expect(result.references).toEqual(
      expect.arrayContaining([
        'Audio/BGM/AirshipBgm',
        'Audio/BGM/BattleTheme',
        'Audio/BGM/BoatBgm',
        'Audio/BGM/ChangedBattle',
        'Audio/BGM/MapBgm',
        'Audio/BGM/MapBgmEvent',
        'Audio/BGM/ShipBgm',
        'Audio/BGM/ScriptBattle',
        'Audio/BGM/ScriptTheme',
        'Audio/BGM/TitleTheme',
        'Audio/BGS/MapBgs',
        'Audio/BGS/RiverEvent',
        'Audio/ME/BattleEnd',
        'Audio/ME/BattleMusicEvent',
        'Audio/ME/ChangedVictory',
        'Audio/ME/GameOver',
        'Audio/ME/JingleEvent',
        'Audio/SE/Cursor1',
        'Audio/SE/DecisionEvent',
        'Audio/SE/PageMoveSe',
        'Audio/SE/RouteStep',
        'Audio/SE/ScriptDecision',
        'Audio/SE/Slash1',
        'Audio/SE/TroopSe',
        'Graphics/Animations/Impact',
        'Graphics/Animations/Slash',
        'Graphics/Battlebacks1/EventBattleback1',
        'Graphics/Battlebacks1/Grassland',
        'Graphics/Battlebacks1/MapBattleback1',
        'Graphics/Battlebacks2/Clouds',
        'Graphics/Battlebacks2/EventBattleback2',
        'Graphics/Battlebacks2/MapBattleback2',
        'Graphics/Battlers/ActorBattler',
        'Graphics/Battlers/Slime',
        'Graphics/Characters/Airship',
        'Graphics/Characters/Boat',
        'Graphics/Characters/ChangedCharacter',
        'Graphics/Characters/Hero',
        'Graphics/Characters/MapCharacter',
        'Graphics/Characters/ScriptHero',
        'Graphics/Characters/Ship',
        'Graphics/Faces/Actor1',
        'Graphics/Faces/ChangedFace',
        'Graphics/Faces/MapFace',
        'Graphics/Faces/MessageFace',
        'Graphics/Parallaxes/EventParallax',
        'Graphics/Parallaxes/MapParallax',
        'Graphics/Pictures/Picture1',
        'Graphics/Pictures/ScriptPicture',
        'Graphics/System/IconSet',
        'Graphics/System/Iconset',
        'Graphics/System/Transition',
        'Graphics/System/Window',
        'Graphics/Tilesets/Outside_A1',
        'Graphics/Tilesets/Outside_B',
        'Graphics/Titles1/TitleA',
        'Graphics/Titles2/TitleB',
        'Movies/Opening',
      ]),
    );
    expect(result.references).not.toContain('Graphics/Parallaxes/NotAnAsset');
    expect(result.references).not.toContain('Graphics/Pictures/CG_');
    expect(result.references).not.toContain('Audio/SE');
  });
});

describe('collectVxAceScriptLiteralAssetReferences', () => {
  test('collects static script literals without treating dynamic concatenation as a full reference', () => {
    const references = collectVxAceScriptLiteralAssetReferences(`\
Cache.animation('Anim1')
Cache.battleback1("BattlebackA")
Cache.battleback2("BattlebackB")
Cache.battler("BattlerA")
Cache.character("Hero")
Cache.face("FaceA")
Cache.parallax("Clouds")
Cache.picture("PictureA")
Cache.system("Window")
Cache.tileset("Outside_A1")
Cache.title1("Plain")
Cache.title2("Forest")
Cache.picture("CG_" + suffix)
Graphics.transition(15, "Graphics/System/Fade")
RPG::BGS.new("River")
RPG::ME.new("Victory")
Audio.me_play("Audio/ME/Fanfare")
Audio.se_play("Audio/SE/" + dynamic_name)
`);

    expect(references).toEqual([
      'Audio/BGS/River',
      'Audio/ME/Fanfare',
      'Audio/ME/Victory',
      'Graphics/Animations/Anim1',
      'Graphics/Battlebacks1/BattlebackA',
      'Graphics/Battlebacks2/BattlebackB',
      'Graphics/Battlers/BattlerA',
      'Graphics/Characters/Hero',
      'Graphics/Faces/FaceA',
      'Graphics/Parallaxes/Clouds',
      'Graphics/Pictures/PictureA',
      'Graphics/System/Fade',
      'Graphics/System/Window',
      'Graphics/Tilesets/Outside_A1',
      'Graphics/Titles1/Plain',
      'Graphics/Titles2/Forest',
    ]);
  });
});

describe('collectVxAceAssetReferencesFromDataDir', () => {
  test('reads example demo VX Ace data files', async () => {
    const dataDir = path.resolve(import.meta.dirname, '../../../../example/demo/Data');
    const result = await collectVxAceAssetReferencesFromDataDir(dataDir);

    expect(result.warnings).toEqual([]);
    expect(result.references).toEqual(
      expect.arrayContaining([
        'Audio/BGM/Airship',
        'Audio/BGM/Field1',
        'Audio/BGM/Ship',
        'Audio/BGM/Theme1',
        'Audio/ME/Gameover1',
        'Audio/ME/Victory1',
        'Audio/SE/Buzzer1',
        'Audio/SE/Cancel2',
        'Audio/SE/Cursor2',
        'Audio/SE/Decision3',
        'Graphics/Animations/Fire1',
        'Graphics/Battlebacks1/Grassland',
        'Graphics/Battlebacks2/Grassland',
        'Graphics/Battlers/Slime',
        'Graphics/Characters/Actor4',
        'Graphics/Faces/Actor4',
        'Graphics/System/Balloon',
        'Graphics/System/BattleStart',
        'Graphics/System/GameOver',
        'Graphics/System/IconSet',
        'Graphics/System/Shadow',
        'Graphics/System/Window',
        'Graphics/Tilesets/World_A1',
        'Graphics/Tilesets/World_A2',
        'Graphics/Titles1/Plain',
        'Graphics/Titles2/Forest',
      ]),
    );
  });
});

const object = (className: string, ivars: Record<string, RubyMarshalValue>): RubyMarshalObject => {
  return {
    type: 'object',
    className,
    ivars: new Map(Object.entries(ivars)),
  };
};

const array = (items: RubyMarshalValue[]): RubyMarshalArray => {
  return {
    type: 'array',
    items,
  };
};

const bytes = (value: Uint8Array): RubyMarshalBytes => {
  return {
    type: 'bytes',
    bytes: value,
    ivars: new Map(),
  };
};

const hash = (entries: [RubyMarshalValue, RubyMarshalValue][]): RubyMarshalHash => {
  return {
    type: 'hash',
    entries: entries.map(([key, value]) => ({ key, value })),
  };
};

const audio = (className: 'RPG::BGM' | 'RPG::BGS' | 'RPG::ME' | 'RPG::SE', name: string) => {
  return object(className, {
    '@name': name,
  });
};

const vehicle = (characterName: string, bgm: RubyMarshalObject) => {
  return object('RPG::System::Vehicle', {
    '@character_name': characterName,
    '@bgm': bgm,
  });
};

const eventCommand = (code: number, parameters: RubyMarshalValue[]) => {
  return object('RPG::EventCommand', {
    '@code': code,
    '@parameters': array(parameters),
  });
};

const moveCommand = (code: number, parameters: RubyMarshalValue[]) => {
  return object('RPG::MoveCommand', {
    '@code': code,
    '@parameters': array(parameters),
  });
};

const moveRoute = (commands: RubyMarshalValue[]) => {
  return object('RPG::MoveRoute', {
    '@list': array(commands),
  });
};

import { ConversionRuntime, ConversionSource } from './environment';
import {
  getRubyIvar,
  isRubyArray,
  isRubyBytes,
  isRubyHash,
  isRubyObject,
  parseRubyMarshal,
  type RubyMarshalBytes,
  type RubyMarshalObject,
  type RubyMarshalValue,
} from './rubyMarshal';

export type VxAceAssetReferenceWarningCode =
  | 'invalid-data-directory'
  | 'invalid-rvdata2'
  | 'invalid-script-body'
  | 'missing-data-file'
  | 'unexpected-data-shape';

export interface VxAceAssetReferenceWarning {
  code: VxAceAssetReferenceWarningCode;
  message: string;
  file?: string;
}

export interface VxAceAssetReferenceResult {
  references: string[];
  warnings: VxAceAssetReferenceWarning[];
}

export type VxAceDataFiles =
  | ReadonlyMap<string, RubyMarshalValue>
  | Readonly<Record<string, RubyMarshalValue | undefined>>;

const DATABASE_FILENAMES = [
  'System.rvdata2',
  'Actors.rvdata2',
  'Enemies.rvdata2',
  'Tilesets.rvdata2',
  'Animations.rvdata2',
  'CommonEvents.rvdata2',
  'Troops.rvdata2',
] as const;

const SCRIPTS_FILENAME = 'Scripts.rvdata2';
const MAP_FILENAME_PATTERN = /^Map\d{3}\.rvdata2$/;
const ASSET_EXTENSION_PATTERN = /\.(?:png|bmp|jpe?g|ogg|mp3|wav|m4a|wma|mid|midi|mp4|webm|ogv|avi)$/i;
const DEFAULT_SYSTEM_ASSET_NAMES = ['Balloon', 'BattleStart', 'GameOver', 'IconSet', 'Iconset', 'Shadow', 'Window'];
const CACHE_FOLDERS: Readonly<Record<string, string>> = {
  animation: 'Graphics/Animations',
  battleback1: 'Graphics/Battlebacks1',
  battleback2: 'Graphics/Battlebacks2',
  battler: 'Graphics/Battlers',
  character: 'Graphics/Characters',
  face: 'Graphics/Faces',
  parallax: 'Graphics/Parallaxes',
  picture: 'Graphics/Pictures',
  system: 'Graphics/System',
  tileset: 'Graphics/Tilesets',
  title1: 'Graphics/Titles1',
  title2: 'Graphics/Titles2',
};
const AUDIO_CLASS_FOLDERS: Readonly<Record<string, string>> = {
  'RPG::BGM': 'BGM',
  'RPG::BGS': 'BGS',
  'RPG::ME': 'ME',
  'RPG::SE': 'SE',
};

export const collectVxAceAssetReferencesFromSource = async (options: {
  source: ConversionSource;
  sourceFiles: string[];
  runtime: ConversionRuntime;
}): Promise<VxAceAssetReferenceResult> => {
  const { runtime, source, sourceFiles } = options;
  const warnings: VxAceAssetReferenceWarning[] = [];
  const dataFiles = new Map<string, RubyMarshalValue>();

  for (const filename of DATABASE_FILENAMES) {
    const value = await readDataFileFromSource(source, filename, warnings);
    if (value !== undefined) dataFiles.set(filename, value);
  }

  for (const filename of readMapFilenamesFromSourceFiles(sourceFiles)) {
    const value = await readDataFileFromSource(source, filename.canonicalFilename, warnings, filename.sourceFilename);
    if (value !== undefined) dataFiles.set(filename.canonicalFilename, value);
  }

  const scripts = await readOptionalScriptsDataFileFromSource(source, warnings);
  if (scripts !== undefined) dataFiles.set(SCRIPTS_FILENAME, scripts);

  const result = await collectVxAceAssetReferencesWithRuntime({
    dataFiles,
    runtime,
  });
  return {
    references: result.references,
    warnings: [...warnings, ...result.warnings],
  };
};

export const collectVxAceScriptLiteralAssetReferences = (scriptText: string): string[] => {
  const references = new Set<string>();
  const add = (value: string) => {
    const normalized = normalizeLogicalPath(value);
    if (!normalized || normalized.endsWith('/')) return;

    references.add(normalized);
  };

  collectCacheLiteralAssetReferences(scriptText, add);
  collectTransitionLiteralAssetReferences(scriptText, add);
  collectAudioLiteralAssetReferences(scriptText, add);

  return [...references].sort((left, right) => left.localeCompare(right));
};

export const collectVxAceAssetReferences = (dataFiles: VxAceDataFiles): VxAceAssetReferenceResult => {
  const collector = new VxAceAssetReferenceCollector(dataFiles, []);
  return collector.collect();
};

export const collectVxAceAssetReferencesWithRuntime = async (options: {
  dataFiles: VxAceDataFiles;
  runtime: ConversionRuntime;
}): Promise<VxAceAssetReferenceResult> => {
  const { dataFiles, runtime } = options;
  const warnings: VxAceAssetReferenceWarning[] = [];
  const scriptTexts = await readScriptTexts({
    scripts: dataFileValue(dataFiles, SCRIPTS_FILENAME),
    runtime,
    warnings,
  });
  const collector = new VxAceAssetReferenceCollector(dataFiles, scriptTexts);
  const result = collector.collect();

  return {
    references: result.references,
    warnings: [...warnings, ...result.warnings],
  };
};

const readDataFileFromSource = async (
  source: ConversionSource,
  filename: string,
  warnings: VxAceAssetReferenceWarning[],
  sourceFilename = filename,
): Promise<RubyMarshalValue | undefined> => {
  const relativePath = `Data/${sourceFilename}`;

  if (!(await source.fileExists(relativePath))) {
    warnings.push({
      code: 'missing-data-file',
      file: filename,
      message: `VX Ace data file was not found: ${filename}`,
    });
    return undefined;
  }

  try {
    return parseRubyMarshal(await source.readFile(relativePath));
  } catch (error) {
    warnings.push({
      code: 'invalid-rvdata2',
      file: filename,
      message: `failed to read VX Ace data file ${filename}: ${errorMessage(error)}`,
    });
    return undefined;
  }
};

const readOptionalScriptsDataFileFromSource = async (
  source: ConversionSource,
  warnings: VxAceAssetReferenceWarning[],
): Promise<RubyMarshalValue | undefined> => {
  const relativePath = `Data/${SCRIPTS_FILENAME}`;

  if (!(await source.fileExists(relativePath))) return undefined;
  try {
    return parseRubyMarshal(await source.readFile(relativePath), { stringMode: 'bytes' });
  } catch (error) {
    warnings.push({
      code: 'invalid-rvdata2',
      file: SCRIPTS_FILENAME,
      message: `failed to read VX Ace data file ${SCRIPTS_FILENAME}: ${errorMessage(error)}`,
    });
    return undefined;
  }
};

const readMapFilenamesFromSourceFiles = (sourceFiles: string[]) => {
  return sourceFiles
    .map((file) => {
      const match = /^Data\/(Map\d{3}\.rvdata2)$/i.exec(file);
      if (!match) return null;

      const mapId = /^map(\d{3})\.rvdata2$/i.exec(match[1]);
      if (!mapId) return null;
      const id = mapId[1];
      if (id === undefined) return null;

      return {
        sourceFilename: match[1],
        canonicalFilename: `Map${id}.rvdata2`,
      };
    })
    .filter((filename): filename is { sourceFilename: string; canonicalFilename: string } => filename !== null)
    .sort(
      (left, right) =>
        left.canonicalFilename.localeCompare(right.canonicalFilename) ||
        left.sourceFilename.localeCompare(right.sourceFilename),
    );
};

const readScriptTexts = async (options: {
  scripts: RubyMarshalValue | undefined;
  runtime: ConversionRuntime;
  warnings: VxAceAssetReferenceWarning[];
}) => {
  const { runtime, scripts, warnings } = options;
  if (scripts === undefined) return [];

  if (!isRubyArray(scripts)) {
    warnings.push({
      code: 'unexpected-data-shape',
      file: SCRIPTS_FILENAME,
      message: `unexpected VX Ace data shape in ${SCRIPTS_FILENAME}: expected array, got ${rubyValueType(scripts)}`,
    });
    return [];
  }

  const scriptTexts: string[] = [];
  for (const entry of scripts.items) {
    const scriptEntry = rubyArrayItems(entry);
    const compressed = scriptEntry[2];
    if (compressed === undefined) continue;

    const bytes = rubyBytes(compressed);
    if (!bytes) {
      warnings.push({
        code: 'unexpected-data-shape',
        file: SCRIPTS_FILENAME,
        message: `unexpected VX Ace script entry shape in ${SCRIPTS_FILENAME}: expected compressed bytes, got ${rubyValueType(
          compressed,
        )}`,
      });
      continue;
    }

    try {
      scriptTexts.push(new TextDecoder().decode(await runtime.inflate(bytes.bytes)));
    } catch (error) {
      warnings.push({
        code: 'invalid-script-body',
        file: SCRIPTS_FILENAME,
        message: `failed to inflate VX Ace script body: ${errorMessage(error)}`,
      });
    }
  }

  return scriptTexts;
};

class VxAceAssetReferenceCollector {
  private readonly references = new Set<string>();
  private readonly warnings: VxAceAssetReferenceWarning[] = [];

  constructor(
    private readonly dataFiles: VxAceDataFiles,
    private readonly scriptTexts: string[],
  ) {}

  collect(): VxAceAssetReferenceResult {
    this.collectDefaultScriptAssets();
    this.collectDatabaseAssets();
    this.collectMapAssets();
    this.collectScriptLiteralAssets();

    return {
      references: [...this.references].sort((left, right) => left.localeCompare(right)),
      warnings: this.warnings,
    };
  }

  private collectDefaultScriptAssets() {
    for (const name of DEFAULT_SYSTEM_ASSET_NAMES) {
      this.add(`Graphics/System/${name}`);
    }
  }

  private collectDatabaseAssets() {
    const system = this.data('System.rvdata2');
    if (system !== undefined) {
      if (isRubyObject(system)) {
        this.collectSystemAssets(system);
      } else {
        this.warnUnexpectedDataShape('System.rvdata2', 'object', system);
      }
    }

    this.eachArrayEntry('Actors.rvdata2', (actor) => this.collectActorAssets(actor));
    this.eachArrayEntry('Enemies.rvdata2', (enemy) => this.collectEnemyAssets(enemy));
    this.eachArrayEntry('Tilesets.rvdata2', (tileset) => this.collectTilesetAssets(tileset));
    this.eachArrayEntry('Animations.rvdata2', (animation) => this.collectAnimationAssets(animation));

    for (const filename of ['CommonEvents.rvdata2', 'Troops.rvdata2']) {
      this.eachEventCommand(this.data(filename), (command) => this.collectEventCommandAssets(command));
    }
  }

  private collectSystemAssets(systemValue: RubyMarshalValue) {
    const system = rubyObject(systemValue);
    if (!system) return;

    for (const sound of rubyArrayItems(ivar(system, '@sounds'))) this.addAudio(sound);

    this.addAudio(ivar(system, '@title_bgm'));
    this.addAudio(ivar(system, '@battle_bgm'));
    this.addAudio(ivar(system, '@battle_end_me'));
    this.addAudio(ivar(system, '@gameover_me'));

    for (const name of ['@boat', '@ship', '@airship']) {
      const vehicle = rubyObject(ivar(system, name));
      if (!vehicle) continue;

      this.add(`Graphics/Characters/${rubyString(ivar(vehicle, '@character_name'))}`);
      this.addAudio(ivar(vehicle, '@bgm'));
    }

    this.add(`Graphics/Titles1/${rubyString(ivar(system, '@title1_name'))}`);
    this.add(`Graphics/Titles2/${rubyString(ivar(system, '@title2_name'))}`);
    this.add(`Graphics/Battlebacks1/${rubyString(ivar(system, '@battleback1_name'))}`);
    this.add(`Graphics/Battlebacks2/${rubyString(ivar(system, '@battleback2_name'))}`);
    this.add(`Graphics/Battlers/${rubyString(ivar(system, '@battler_name'))}`);
  }

  private collectActorAssets(actorValue: RubyMarshalValue) {
    const actor = rubyObject(actorValue);
    if (!actor) return;

    this.add(`Graphics/Characters/${rubyString(ivar(actor, '@character_name'))}`);
    this.add(`Graphics/Faces/${rubyString(ivar(actor, '@face_name'))}`);
  }

  private collectEnemyAssets(enemyValue: RubyMarshalValue) {
    const enemy = rubyObject(enemyValue);
    if (!enemy) return;

    this.add(`Graphics/Battlers/${rubyString(ivar(enemy, '@battler_name'))}`);
  }

  private collectTilesetAssets(tilesetValue: RubyMarshalValue) {
    const tileset = rubyObject(tilesetValue);
    if (!tileset) return;

    for (const name of rubyArrayItems(ivar(tileset, '@tileset_names'))) {
      this.add(`Graphics/Tilesets/${rubyString(name)}`);
    }
  }

  private collectAnimationAssets(animationValue: RubyMarshalValue) {
    const animation = rubyObject(animationValue);
    if (!animation) return;

    this.add(`Graphics/Animations/${rubyString(ivar(animation, '@animation1_name'))}`);
    this.add(`Graphics/Animations/${rubyString(ivar(animation, '@animation2_name'))}`);

    for (const timingValue of rubyArrayItems(ivar(animation, '@timings'))) {
      const timing = rubyObject(timingValue);
      if (timing) this.addAudio(ivar(timing, '@se'));
    }
  }

  private collectMapAssets() {
    for (const filename of dataFileKeys(this.dataFiles)
      .filter((name) => MAP_FILENAME_PATTERN.test(name))
      .sort((left, right) => left.localeCompare(right))) {
      const value = this.data(filename);
      const map = rubyObject(value);
      if (!map) {
        if (value !== undefined) this.warnUnexpectedDataShape(filename, 'object', value);
        continue;
      }

      this.add(`Graphics/Battlebacks1/${rubyString(ivar(map, '@battleback1_name'))}`);
      this.add(`Graphics/Battlebacks2/${rubyString(ivar(map, '@battleback2_name'))}`);
      this.add(`Graphics/Parallaxes/${rubyString(ivar(map, '@parallax_name'))}`);
      this.addAudio(ivar(map, '@bgm'));
      this.addAudio(ivar(map, '@bgs'));

      for (const eventValue of rubyHashValues(ivar(map, '@events'))) {
        const event = rubyObject(eventValue);
        if (!event) continue;

        for (const pageValue of rubyArrayItems(ivar(event, '@pages'))) {
          const page = rubyObject(pageValue);
          if (!page) continue;

          const graphic = rubyObject(ivar(page, '@graphic'));
          if (graphic) this.add(`Graphics/Characters/${rubyString(ivar(graphic, '@character_name'))}`);

          this.eachEventCommand(ivar(page, '@list'), (command) => this.collectEventCommandAssets(command));
          this.eachEventCommand(ivar(page, '@move_route'), (command) => this.collectEventCommandAssets(command));
        }
      }
    }
  }

  private collectScriptLiteralAssets() {
    for (const scriptText of this.scriptTexts) {
      for (const reference of collectVxAceScriptLiteralAssetReferences(scriptText)) {
        this.add(reference);
      }
    }
  }

  private eachEventCommand(
    value: RubyMarshalValue | undefined,
    callback: (command: RubyMarshalObject) => void,
    seen = new Set<RubyMarshalObject>(),
  ) {
    if (value === undefined || value === null) return;

    if (isRubyArray(value)) {
      for (const item of value.items) this.eachEventCommand(item, callback, seen);
      return;
    }

    if (isRubyHash(value)) {
      for (const entry of value.entries) this.eachEventCommand(entry.value, callback, seen);
      return;
    }

    if (!isRubyObject(value) || seen.has(value)) return;

    seen.add(value);
    if (value.className === 'RPG::EventCommand' || value.className === 'RPG::MoveCommand') {
      callback(value);
      return;
    }

    if (value.className === 'RPG::MoveRoute') {
      this.eachEventCommand(ivar(value, '@list'), callback, seen);
      return;
    }

    for (const nested of value.ivars.values()) {
      this.eachEventCommand(nested, callback, seen);
    }
  }

  private collectEventCommandAssets(command: RubyMarshalObject) {
    const parameters = rubyArrayItems(ivar(command, '@parameters'));
    const code = rubyNumber(ivar(command, '@code'));

    if (command.className === 'RPG::MoveCommand') {
      if (code === 44) this.addAudio(parameters[0]);
      return;
    }

    if (command.className !== 'RPG::EventCommand') return;

    switch (code) {
      case 101:
        this.add(`Graphics/Faces/${rubyString(parameters[0])}`);
        break;
      case 132:
      case 133:
      case 241:
      case 245:
      case 249:
      case 250:
        this.addAudio(parameters[0]);
        break;
      case 139:
        this.addAudio(parameters[1]);
        break;
      case 205:
        this.eachEventCommand(parameters[1], (nestedCommand) => this.collectEventCommandAssets(nestedCommand));
        break;
      case 231:
        this.add(`Graphics/Pictures/${rubyString(parameters[1])}`);
        break;
      case 261:
        this.add(`Movies/${rubyString(parameters[0])}`);
        break;
      case 283:
        this.add(`Graphics/Battlebacks1/${rubyString(parameters[0])}`);
        this.add(`Graphics/Battlebacks2/${rubyString(parameters[1])}`);
        break;
      case 284:
        this.add(`Graphics/Parallaxes/${rubyString(parameters[0])}`);
        break;
      case 322:
        this.add(`Graphics/Characters/${rubyString(parameters[1])}`);
        this.add(`Graphics/Faces/${rubyString(parameters[3])}`);
        break;
    }
  }

  private addAudio(value: RubyMarshalValue | undefined) {
    const audio = rubyObject(value);
    if (!audio) return;

    const folder = AUDIO_CLASS_FOLDERS[audio.className];
    if (!folder) return;

    this.add(`Audio/${folder}/${rubyString(ivar(audio, '@name'))}`);
  }

  private add(value: string) {
    const normalized = normalizeLogicalPath(value);
    if (!normalized || normalized.endsWith('/')) return;

    this.references.add(normalized);
  }

  private data(filename: string) {
    return dataFileValue(this.dataFiles, filename);
  }

  private eachArrayEntry(filename: string, callback: (value: RubyMarshalValue) => void) {
    const value = this.data(filename);
    if (value === undefined) return;

    if (!isRubyArray(value)) {
      this.warnUnexpectedDataShape(filename, 'array', value);
      return;
    }

    for (const item of value.items) {
      if (item !== null) callback(item);
    }
  }

  private warnUnexpectedDataShape(filename: string, expected: string, actual: RubyMarshalValue) {
    this.warnings.push({
      code: 'unexpected-data-shape',
      file: filename,
      message: `unexpected VX Ace data shape in ${filename}: expected ${expected}, got ${rubyValueType(actual)}`,
    });
  }
}

const rubyArrayItems = (value: RubyMarshalValue | undefined): RubyMarshalValue[] => {
  if (!isRubyArray(value)) return [];
  return value.items.filter((item) => item !== null);
};

const rubyHashValues = (value: RubyMarshalValue | undefined): RubyMarshalValue[] => {
  if (!isRubyHash(value)) return [];
  return value.entries.map((entry) => entry.value).filter((item) => item !== null);
};

const rubyObject = (value: RubyMarshalValue | undefined): RubyMarshalObject | undefined => {
  if (!isRubyObject(value)) return undefined;
  return value;
};

const rubyBytes = (value: RubyMarshalValue | undefined): RubyMarshalBytes | undefined => {
  if (!isRubyBytes(value)) return undefined;
  return value;
};

const rubyString = (value: RubyMarshalValue | undefined) => {
  return typeof value === 'string' ? value : '';
};

const rubyNumber = (value: RubyMarshalValue | undefined) => {
  return typeof value === 'number' ? value : undefined;
};

const rubyValueType = (value: RubyMarshalValue) => {
  if (value === null) return 'nil';
  if (isRubyArray(value)) return 'array';
  if (isRubyHash(value)) return 'hash';
  if (isRubyObject(value)) return `object ${value.className}`;
  if (typeof value === 'object') return value.type;
  return typeof value;
};

const ivar = (object: RubyMarshalObject, name: string) => {
  return getRubyIvar(object, name);
};

const normalizeLogicalPath = (value: string) => {
  return value.trim().replaceAll('\\', '/').replace(ASSET_EXTENSION_PATTERN, '');
};

type AddReference = (value: string) => void;

const collectCacheLiteralAssetReferences = (scriptText: string, add: AddReference) => {
  const cacheMethods = Object.keys(CACHE_FOLDERS).join('|');
  const pattern = new RegExp(String.raw`Cache\.(${cacheMethods})\s*\(\s*(['"])((?:\\.|(?!\2).)*)\2\s*(?=[,)])`, 'g');

  for (const match of scriptText.matchAll(pattern)) {
    const folder = CACHE_FOLDERS[match[1] ?? ''];
    const name = match[3];
    if (folder && name !== undefined) add(`${folder}/${unescapeRubyStringLiteral(name)}`);
  }
};

const collectTransitionLiteralAssetReferences = (scriptText: string, add: AddReference) => {
  const pattern = /Graphics\.transition\s*\([^\n]*?(['"])(Graphics\/(?:\\.|(?!\1).)*)\1\s*(?=[,)])/g;

  for (const match of scriptText.matchAll(pattern)) {
    const name = match[2];
    if (name !== undefined) add(unescapeRubyStringLiteral(name));
  }
};

const collectAudioLiteralAssetReferences = (scriptText: string, add: AddReference) => {
  const rpgAudioPattern = /RPG::(BGM|BGS|ME|SE)\.new\s*\(\s*(['"])((?:\\.|(?!\2).)*)\2\s*(?=[,)])/g;
  for (const match of scriptText.matchAll(rpgAudioPattern)) {
    const folder = match[1];
    const name = match[3];
    if (folder !== undefined && name !== undefined) add(`Audio/${folder}/${unescapeRubyStringLiteral(name)}`);
  }

  const audioPlayPattern =
    /Audio\.(?:bgm|bgs|me|se)_play\s*\(\s*(['"])Audio\/(BGM|BGS|ME|SE)\/((?:\\.|(?!\1).)*)\1\s*(?=[,)])/g;
  for (const match of scriptText.matchAll(audioPlayPattern)) {
    const folder = match[2];
    const name = match[3];
    if (folder !== undefined && name !== undefined) add(`Audio/${folder}/${unescapeRubyStringLiteral(name)}`);
  }
};

const unescapeRubyStringLiteral = (value: string) => {
  return value.replace(/\\(['"\\])/g, '$1');
};

const dataFileKeys = (dataFiles: VxAceDataFiles) => {
  if (isDataFileMap(dataFiles)) return [...dataFiles.keys()];
  return Object.keys(dataFiles);
};

const dataFileValue = (dataFiles: VxAceDataFiles, filename: string) => {
  if (isDataFileMap(dataFiles)) return dataFiles.get(filename);
  return dataFiles[filename];
};

const isDataFileMap = (dataFiles: VxAceDataFiles): dataFiles is ReadonlyMap<string, RubyMarshalValue> => {
  return dataFiles instanceof Map;
};

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

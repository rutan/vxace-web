import { clampUnit } from './utils';

export type MusicLoopMetadata = {
  loopStart: number;
  loopLength: number;
  sampleRate: number;
};

type DecodedAudioAsset = {
  buffer: AudioBuffer;
  loopMetadata: MusicLoopMetadata | null;
};

type PlayOptions = {
  deferStart?: boolean;
  loop?: boolean;
  onEnded?: () => void;
};

type AudioContextFactory = () => AudioContext;

export type WebAudioSource = {
  key: string;
  label: string;
  loadBytes: () => Promise<ArrayBuffer>;
};

const assetCache = new WeakMap<AudioContext, Map<string, Promise<DecodedAudioAsset>>>();

export class WebAudioTrack {
  private readonly _audioContext: AudioContextFactory;
  private _sourceKey: string | null = null;
  private _buffer: AudioBuffer | null = null;
  private _sourceNode: AudioBufferSourceNode | null = null;
  private _gainNode: GainNode | null = null;
  private _loopStart = 0;
  private _loopEnd = 0;
  private _startedAt = 0;
  private _offset = 0;
  private _volume = 1;
  private _playbackRate = 1;
  private _paused = true;
  private _loop = true;
  private _onEnded: (() => void) | null = null;
  private _fadeTimer: number | null = null;
  private _requestId = 0;

  constructor(audioContext: AudioContextFactory) {
    this._audioContext = audioContext;
  }

  get sourceKey() {
    return this._sourceKey;
  }

  get paused() {
    return this._paused;
  }

  async play(
    source: WebAudioSource,
    volume: number,
    pitch: number,
    posSeconds: number | null,
    options: PlayOptions = {},
  ) {
    const sameSource = this._sourceKey === source.key && this._buffer != null;
    const shouldSeek = posSeconds != null && posSeconds > 0;
    this._loop = options.loop ?? true;
    this._onEnded = options.onEnded ?? null;

    this._clearFade();

    if (sameSource && !shouldSeek) {
      this._offset = this.positionSeconds();
      this._startedAt = this._audioContext().currentTime;
      this._setVolumeAndPitch(volume, pitch);
      this._paused = options.deferStart === true;
      this._applyLiveSettings();
      if (!this._paused && !this._sourceNode) this._startSource(this._offset);
      return;
    }

    this._setVolumeAndPitch(volume, pitch);
    const requestId = ++this._requestId;
    const context = this._audioContext();
    let asset: DecodedAudioAsset;
    try {
      asset = await loadDecodedAudioAsset(context, source);
    } catch (error) {
      if (requestId !== this._requestId) return;
      throw error;
    }
    if (requestId !== this._requestId) return;

    this._stopSource();
    this._sourceKey = source.key;
    this._buffer = asset.buffer;
    this._loopStart = 0;
    this._loopEnd = asset.buffer.duration;

    if (this._loop && asset.loopMetadata) {
      const loopStart = asset.loopMetadata.loopStart / asset.loopMetadata.sampleRate;
      const loopEnd = (asset.loopMetadata.loopStart + asset.loopMetadata.loopLength) / asset.loopMetadata.sampleRate;
      if (loopEnd > loopStart && loopEnd <= asset.buffer.duration) {
        this._loopStart = loopStart;
        this._loopEnd = loopEnd;
      }
    }

    this._offset = this._normalizeOffset(posSeconds ?? 0);
    this._paused = options.deferStart === true;
    if (!this._paused) this._startSource(this._offset);
  }

  stop() {
    this._requestId += 1;
    this._clearFade();
    this._stopSource();
    this._disconnectGain();
    this._sourceKey = null;
    this._buffer = null;
    this._offset = 0;
    this._loopStart = 0;
    this._loopEnd = 0;
    this._paused = true;
    this._onEnded = null;
  }

  fade(time: number) {
    this._clearFade();
    const duration = Math.max(0, Number(time) || 0);
    if (duration <= 0) {
      this.stop();
      return;
    }

    const gain = this._gainNode?.gain;
    if (!gain) return;

    const context = this._audioContext();
    const now = context.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(0, now + duration / 1000);
    this._fadeTimer = window.setTimeout(() => this.stop(), duration);
  }

  pause() {
    if (this._paused || !this._sourceNode) return false;

    this._offset = this.positionSeconds();
    this._stopSource();
    this._paused = true;
    return true;
  }

  resume() {
    if (!this._paused || !this._buffer) return;

    this._paused = false;
    this._startSource(this._offset);
  }

  positionSeconds() {
    if (!this._buffer) return 0;
    if (this._paused || !this._sourceNode) return this._offset;

    const elapsed = (this._audioContext().currentTime - this._startedAt) * this._playbackRate;
    return this._normalizeOffset(this._offset + elapsed);
  }

  private _setVolumeAndPitch(volume: number, pitch: number) {
    this._volume = clampUnit((Number(volume) || 0) / 100);
    this._playbackRate = Math.max(0.5, Math.min(4, (Number(pitch) || 100) / 100));
  }

  private _applyLiveSettings() {
    if (this._gainNode) this._gainNode.gain.value = this._volume;
    if (this._sourceNode) this._sourceNode.playbackRate.value = this._playbackRate;
  }

  private _startSource(offset: number) {
    const buffer = this._buffer;
    if (!buffer) return;

    this._stopSource();
    const context = this._audioContext();
    const sourceNode = context.createBufferSource();
    const gainNode = this._gainNode ?? context.createGain();

    sourceNode.buffer = buffer;
    sourceNode.loop = this._loop;
    sourceNode.loopStart = this._loopStart;
    sourceNode.loopEnd = this._loopEnd;
    sourceNode.playbackRate.value = this._playbackRate;
    sourceNode.onended = () => {
      if (this._sourceNode !== sourceNode || this._loop || this._paused) return;

      this._offset = this.positionSeconds();
      sourceNode.onended = null;
      sourceNode.disconnect();
      this._sourceNode = null;
      this._paused = true;
      this._onEnded?.();
    };
    gainNode.gain.value = this._volume;
    sourceNode.connect(gainNode);
    gainNode.connect(context.destination);
    sourceNode.start(0, this._normalizeOffset(offset));

    this._sourceNode = sourceNode;
    this._gainNode = gainNode;
    this._startedAt = context.currentTime;
  }

  private _stopSource() {
    if (!this._sourceNode) return;

    try {
      this._sourceNode.onended = null;
      this._sourceNode.stop();
    } catch {
      // AudioBufferSourceNode may already have been stopped by the browser.
    }
    this._sourceNode.disconnect();
    this._sourceNode = null;
  }

  private _disconnectGain() {
    if (!this._gainNode) return;

    this._gainNode.disconnect();
    this._gainNode = null;
  }

  private _clearFade() {
    if (this._fadeTimer == null) return;

    window.clearTimeout(this._fadeTimer);
    this._fadeTimer = null;
    const gain = this._gainNode?.gain;
    if (gain) gain.cancelScheduledValues(this._audioContext().currentTime);
  }

  private _normalizeOffset(value: number) {
    if (!this._buffer) return 0;

    const duration = this._buffer.duration;
    const offset = Math.max(0, Number(value) || 0);
    if (this._loopEnd > this._loopStart && offset >= this._loopEnd) {
      return this._loopStart + ((offset - this._loopStart) % (this._loopEnd - this._loopStart));
    }

    return Math.min(offset, duration);
  }
}

const loadDecodedAudioAsset = (context: AudioContext, source: WebAudioSource) => {
  let contextCache = assetCache.get(context);
  if (!contextCache) {
    contextCache = new Map();
    assetCache.set(context, contextCache);
  }

  const cached = contextCache.get(source.key);
  if (cached) return cached;

  const promise = (async (): Promise<DecodedAudioAsset> => {
    const arrayBuffer = await source.loadBytes();
    const bytes = new Uint8Array(arrayBuffer);
    const loopMetadata = readOggLoopMetadata(bytes);
    const buffer = await context.decodeAudioData(arrayBuffer.slice(0));
    return { buffer, loopMetadata };
  })();
  promise.catch(() => contextCache.delete(source.key));
  contextCache.set(source.key, promise);
  return promise;
};

const readOggLoopMetadata = (bytes: Uint8Array): MusicLoopMetadata | null => {
  const sampleRate = readVorbisSampleRate(bytes);
  const comments = readVorbisComments(bytes);
  const loopStart = readLoopComment(comments, 'LOOPSTART');
  const loopLength = readLoopComment(comments, 'LOOPLENGTH');

  if (!sampleRate || loopStart == null || loopLength == null || loopLength <= 0) return null;

  return { loopStart, loopLength, sampleRate };
};

const readVorbisSampleRate = (bytes: Uint8Array) => {
  const headerIndex = findBytePattern(bytes, vorbisPacketPattern(1));
  if (headerIndex < 0 || headerIndex + 16 > bytes.length) return null;

  return readUint32Le(bytes, headerIndex + 12);
};

const readVorbisComments = (bytes: Uint8Array) => {
  const headerIndex = findBytePattern(bytes, vorbisPacketPattern(3));
  if (headerIndex < 0) return new Map<string, string>();

  const decoder = new TextDecoder();
  const comments = new Map<string, string>();
  let offset = headerIndex + 7;
  const vendorLength = readUint32Le(bytes, offset);
  if (vendorLength == null) return comments;

  offset += 4 + vendorLength;
  const commentCount = readUint32Le(bytes, offset);
  if (commentCount == null) return comments;

  offset += 4;
  for (let index = 0; index < commentCount; index += 1) {
    const commentLength = readUint32Le(bytes, offset);
    if (commentLength == null) break;

    offset += 4;
    if (offset + commentLength > bytes.length) break;

    const comment = decoder.decode(bytes.slice(offset, offset + commentLength));
    const separatorIndex = comment.indexOf('=');
    if (separatorIndex > 0) {
      comments.set(comment.slice(0, separatorIndex).toUpperCase(), comment.slice(separatorIndex + 1));
    }
    offset += commentLength;
  }

  return comments;
};

const readLoopComment = (comments: Map<string, string>, key: string) => {
  const value = comments.get(key);
  if (value == null) return null;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const vorbisPacketPattern = (packetType: number) => {
  return new Uint8Array([packetType, 0x76, 0x6f, 0x72, 0x62, 0x69, 0x73]);
};

const findBytePattern = (bytes: Uint8Array, pattern: Uint8Array) => {
  for (let index = 0; index <= bytes.length - pattern.length; index += 1) {
    let matches = true;
    for (let offset = 0; offset < pattern.length; offset += 1) {
      if (bytes[index + offset] !== pattern[offset]) {
        matches = false;
        break;
      }
    }
    if (matches) return index;
  }

  return -1;
};

const readUint32Le = (bytes: Uint8Array, offset: number) => {
  if (offset < 0 || offset + 4 > bytes.length) return null;

  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
};

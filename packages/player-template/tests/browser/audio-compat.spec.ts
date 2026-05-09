import { expect, test } from '@playwright/test';
import { loadGame } from './helpers';

test.describe('audio compatibility', () => {
  test('stops Web Audio sound effects', async ({ page }) => {
    await page.addInitScript(() => {
      class FakeAudioParam {
        value = 1;
      }

      class FakeGainNode {
        gain = new FakeAudioParam();

        connect() {}

        disconnect() {}
      }

      class FakeBufferSourceNode {
        playbackRate = new FakeAudioParam();
        started = false;
        stopped = false;

        connect() {}

        disconnect() {}

        start() {
          this.started = true;
        }

        stop() {
          this.stopped = true;
        }
      }

      class FakeAudioContext {
        static instances: FakeAudioContext[] = [];

        currentTime = 0;
        destination = {};
        state = 'running';
        readonly sources: FakeBufferSourceNode[] = [];

        constructor() {
          FakeAudioContext.instances.push(this);
        }

        createBufferSource() {
          const source = new FakeBufferSourceNode();
          this.sources.push(source);
          return source;
        }

        createGain() {
          return new FakeGainNode();
        }

        decodeAudioData() {
          return Promise.resolve({ duration: 1, sampleRate: 44_100 });
        }

        resume() {
          return Promise.resolve();
        }
      }

      (window as any).Audio = class {
        constructor() {
          throw new Error('HTML Audio should not be used');
        }
      };
      (window as any).AudioContext = FakeAudioContext;
      (window as any).__fakeAudioContexts = FakeAudioContext.instances;
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (new URL(url, window.location.href).pathname.endsWith('.ogg')) {
          return Promise.resolve(new Response(new Uint8Array([1, 2, 3]).buffer));
        }

        return originalFetch(input, init);
      };
    });

    await loadGame(page, { gameDir: 'demo', guest: false, settleMs: 0, canvasTimeout: 20_000 });

    const result = await page.evaluate(() => {
      const app = (window as any).rubyBridge.app;
      app.playAudio('se', 'Audio/SE/Decision3', 100, 100, 0);

      return new Promise((resolve) => {
        window.setTimeout(() => {
          const context = (window as any).__fakeAudioContexts[0];
          const se = context.sources[0];
          app.stopAudio('se');
          resolve({
            started: se.started,
            stopped: se.stopped,
            sourceCount: context.sources.length,
            soundEffectCount: app._soundEffects.size,
            lastBridgeEvent: app.debugSnapshot().lastBridgeEvent,
          });
        }, 50);
      });
    });

    expect(result).toMatchObject({
      started: true,
      stopped: true,
      sourceCount: 1,
      soundEffectCount: 0,
      lastBridgeEvent: 'stopAudio(se)',
    });
  });
  test('does not keep retrying unrecoverable Web Audio BGM failures', async ({ page }) => {
    await page.addInitScript(() => {
      class FakeAudioContext {
        currentTime = 0;
        destination = {};
        state = 'running';

        createBufferSource() {
          return {};
        }

        createGain() {
          return {};
        }

        decodeAudioData() {
          return Promise.reject(new DOMException('decode failed', 'NotSupportedError'));
        }

        resume() {
          return Promise.resolve();
        }
      }

      (window as any).AudioContext = FakeAudioContext;
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (new URL(url, window.location.href).pathname.endsWith('.ogg')) {
          return Promise.resolve(new Response(new Uint8Array([1, 2, 3]).buffer));
        }

        return originalFetch(input, init);
      };
    });

    await loadGame(page, { gameDir: 'demo', guest: false, settleMs: 0, canvasTimeout: 20_000 });

    const result = await page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      app.playAudio('bgm', 'Audio/BGM/Theme1', 100, 100, 0);
      await new Promise((resolve) => window.setTimeout(resolve, 50));

      return {
        lastBridgeEvent: app.debugSnapshot().lastBridgeEvent,
      };
    });

    expect(result.lastBridgeEvent).toContain('playAudio(bgm,Audio/BGM/Theme1) failed');
  });

  test('resumes paused BGM when ME decode fails', async ({ page }) => {
    await page.addInitScript(() => {
      class FakeAudioParam {
        value = 1;
      }

      class FakeGainNode {
        gain = new FakeAudioParam();

        connect() {}

        disconnect() {}
      }

      class FakeBufferSourceNode {
        playbackRate = new FakeAudioParam();
        started = false;
        stopped = false;
        startOffset = 0;

        connect() {}

        disconnect() {}

        start(_when = 0, offset = 0) {
          this.started = true;
          this.startOffset = offset;
        }

        stop() {
          this.stopped = true;
        }
      }

      class FakeAudioContext {
        static instances: FakeAudioContext[] = [];

        currentTime = 0;
        destination = {};
        state = 'running';
        readonly sources: FakeBufferSourceNode[] = [];

        constructor() {
          FakeAudioContext.instances.push(this);
        }

        createBufferSource() {
          const source = new FakeBufferSourceNode();
          this.sources.push(source);
          return source;
        }

        createGain() {
          return new FakeGainNode();
        }

        decodeAudioData(arrayBuffer: ArrayBuffer) {
          if (new Uint8Array(arrayBuffer)[0] === 9) {
            return Promise.reject(new DOMException('decode failed', 'NotSupportedError'));
          }

          return Promise.resolve({ duration: 20, sampleRate: 44_100 });
        }

        resume() {
          this.state = 'running';
          return Promise.resolve();
        }
      }

      (window as any).AudioContext = FakeAudioContext;
      (window as any).__fakeAudioContexts = FakeAudioContext.instances;
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        const path = new URL(url, window.location.href).pathname;
        const payload = (window as any).__fakeAudioPayloads?.[path];
        if (payload != null && path.endsWith('.ogg')) {
          return Promise.resolve(new Response(new Uint8Array([payload]).buffer));
        }
        if (path.endsWith('.ogg')) {
          return Promise.resolve(new Response(new Uint8Array([1]).buffer));
        }

        return originalFetch(input, init);
      };
    });

    await loadGame(page, { gameDir: 'demo', guest: false, settleMs: 0, canvasTimeout: 20_000 });

    const result = await page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      const resolvePublicPath = (requestedPath: string) => {
        const source = app._assetProvider.resolveAsset(requestedPath, 'audio');
        if (!source || source.data.kind !== 'file') throw new Error(`audio source not found: ${requestedPath}`);
        return new URL(encodeURI(`${app._assetProvider.manifest.gameDir}/${source.data.path}`), window.location.href)
          .pathname;
      };
      (window as any).__fakeAudioPayloads = {
        [resolvePublicPath('Audio/BGM/Field1')]: 1,
        [resolvePublicPath('Audio/ME/Gameover1')]: 9,
      };

      app.playAudio('bgm', 'Audio/BGM/Field1', 80, 100, 3000);
      await new Promise((resolve) => window.setTimeout(resolve, 50));

      const context = (window as any).__fakeAudioContexts[0];
      const initialBgmSource = context.sources[0];
      context.currentTime = 2;
      app.playAudio('me', 'Audio/ME/Gameover1', 100, 100, 0);
      await new Promise((resolve) => window.setTimeout(resolve, 50));

      const resumedBgmSource = context.sources[1];
      return {
        initialBgmStopped: initialBgmSource.stopped,
        resumedBgmStarted: resumedBgmSource?.started,
        resumedBgmOffset: resumedBgmSource?.startOffset,
        sourceCount: context.sources.length,
        lastBridgeEvent: app.debugSnapshot().lastBridgeEvent,
      };
    });

    expect(result.initialBgmStopped).toBe(true);
    expect(result.resumedBgmStarted).toBe(true);
    expect(result.resumedBgmOffset).toBeCloseTo(5);
    expect(result.sourceCount).toBe(2);
    expect(result.lastBridgeEvent).toContain('playAudio(me,Audio/ME/Gameover1) failed');
  });

  test('applies RPG Maker OGG loop tags with Web Audio and resumes BGM after ME', async ({ page }) => {
    await page.addInitScript(() => {
      class FakeAudioParam {
        value = 1;

        cancelScheduledValues() {}

        setValueAtTime(value: number) {
          this.value = value;
        }

        linearRampToValueAtTime(value: number) {
          this.value = value;
        }
      }

      class FakeGainNode {
        gain = new FakeAudioParam();

        connect() {}

        disconnect() {}
      }

      class FakeBufferSourceNode {
        buffer: { duration: number; sampleRate: number } | null = null;
        loop = false;
        loopStart = 0;
        loopEnd = 0;
        playbackRate = new FakeAudioParam();
        onended: (() => void) | null = null;
        started = false;
        stopped = false;
        startOffset = 0;

        connect() {}

        disconnect() {}

        start(_when = 0, offset = 0) {
          this.started = true;
          this.startOffset = offset;
        }

        stop() {
          this.stopped = true;
        }

        emitEnded() {
          this.onended?.();
        }
      }

      class FakeAudioContext {
        static instances: FakeAudioContext[] = [];

        currentTime = 0;
        destination = {};
        state = 'running';
        readonly sources: FakeBufferSourceNode[] = [];
        readonly gains: FakeGainNode[] = [];

        constructor() {
          FakeAudioContext.instances.push(this);
        }

        createBufferSource() {
          const source = new FakeBufferSourceNode();
          this.sources.push(source);
          return source;
        }

        createGain() {
          const gain = new FakeGainNode();
          this.gains.push(gain);
          return gain;
        }

        decodeAudioData() {
          return Promise.resolve({ duration: 20, sampleRate: 48_000 });
        }

        resume() {
          this.state = 'running';
          return Promise.resolve();
        }
      }

      const encodeAscii = (value: string) => {
        return Array.from(value).map((character) => character.charCodeAt(0));
      };
      const uint32Le = (value: number) => [value & 255, (value >> 8) & 255, (value >> 16) & 255, (value >> 24) & 255];
      const commentBytes = (value: string) => [...uint32Le(value.length), ...encodeAscii(value)];
      const vendor = 'vxace-web-test';
      const loopedOgg = new Uint8Array([
        1,
        ...encodeAscii('vorbis'),
        0,
        0,
        0,
        0,
        2,
        ...uint32Le(44_100),
        0,
        0,
        0,
        0,
        3,
        ...encodeAscii('vorbis'),
        ...uint32Le(vendor.length),
        ...encodeAscii(vendor),
        ...uint32Le(2),
        ...commentBytes('LOOPSTART=44100'),
        ...commentBytes('LOOPLENGTH=88200'),
      ]).buffer;
      const plainOgg = new Uint8Array([1, ...encodeAscii('vorbis'), 0, 0, 0, 0, 2, ...uint32Le(44_100)]).buffer;
      const originalFetch = window.fetch.bind(window);

      (window as any).Audio = class {
        constructor() {
          throw new Error('HTML Audio should not be used');
        }
      };
      (window as any).AudioContext = FakeAudioContext;
      (window as any).__fakeAudioContexts = FakeAudioContext.instances;
      window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        const path = new URL(url, window.location.href).pathname;
        const payload = (window as any).__fakeAudioPayloads?.[path];
        if (payload === 'looped' && path.endsWith('.ogg')) return Promise.resolve(new Response(loopedOgg.slice(0)));
        if (payload === 'plain' && path.endsWith('.ogg')) return Promise.resolve(new Response(plainOgg.slice(0)));
        if (path.endsWith('.ogg')) return Promise.resolve(new Response(plainOgg.slice(0)));

        return originalFetch(input, init);
      };
    });

    await loadGame(page, {
      gameDir: 'demo',
      guest: false,
      settleMs: 0,
      canvasTimeout: 20_000,
      assertNoRuntimeError: false,
    });

    const result = await page.evaluate(async () => {
      const app = (window as any).rubyBridge.app;
      const resolvePublicPath = (requestedPath: string) => {
        const source = app._assetProvider.resolveAsset(requestedPath, 'audio');
        if (!source || source.data.kind !== 'file') throw new Error(`audio source not found: ${requestedPath}`);
        return new URL(encodeURI(`${app._assetProvider.manifest.gameDir}/${source.data.path}`), window.location.href)
          .pathname;
      };
      (window as any).__fakeAudioPayloads = {
        [resolvePublicPath('Audio/BGM/Field1')]: 'looped',
      };
      const waitAudio = () => new Promise((resolve) => window.setTimeout(resolve, 50));

      app.playAudio('bgm', 'Audio/BGM/Field1', 80, 120, 1234);
      await waitAudio();

      const context = (window as any).__fakeAudioContexts[0];
      const bgmSource = context.sources[0];
      const initialBgmVolume = context.gains[0].gain.value;
      const initialBgmPos = app.audioPos('bgm');
      context.currentTime = 2;
      const loopedBgmPos = app.audioPos('bgm');

      app.playAudio('bgm', 'Audio/BGM/Field1', 25, 80, 2500);
      await waitAudio();
      const seekedBgmSource = context.sources[1];
      const sameBgmRgssPos = app.audioPos('bgm');

      app.playAudio('bgm', 'Audio/BGM/Field1', 40, 110);
      const sameBgmOmittedSourceCount = context.sources.length;
      const sameBgmOmittedPlaybackRate = seekedBgmSource.playbackRate.value;
      const sameBgmOmittedVolume = context.gains[0].gain.value;

      app.playAudio('bgm', 'Audio/BGM/Field1', 50, 105, 0);
      const sameBgmZeroSourceCount = context.sources.length;
      const sameBgmZeroPlaybackRate = seekedBgmSource.playbackRate.value;
      const sameBgmZeroVolume = context.gains[0].gain.value;

      context.currentTime = 3;
      app.playAudio('me', 'Audio/ME/Victory1', 100, 100, 0);
      await waitAudio();
      const me = context.sources[2];
      const pausedDuringMe = seekedBgmSource.stopped;
      me.emitEnded();
      const resumedBgmSource = context.sources[3];

      app.playAudio('me', 'Audio/ME/Gameover1', 100, 100, 0);
      app.playAudio('bgm', 'Audio/BGM/Ship', 70, 100, 5000);
      await waitAudio();
      const secondMe = context.sources[4];
      const replacementBgmSourceCountDuringMe = context.sources.length;
      secondMe.emitEnded();
      const replacementBgmSource = context.sources[5];

      app.playAudio('bgs', 'Audio/BGM/Airship', 55, 90, 2500);
      await waitAudio();
      const bgsSource = context.sources[context.sources.length - 1];
      const initialBgsPos = app.audioPos('bgs');
      app.playAudio('bgs', 'Audio/BGM/Airship', 30, 150, 8750);
      await waitAudio();
      const seekedBgsSource = context.sources[context.sources.length - 1];
      const sameBgsRgssPos = app.audioPos('bgs');
      app.playAudio('bgs', 'Audio/BGM/Airship', 45, 95);
      const sameBgsOmittedSourceCount = context.sources.length;
      const sameBgsOmittedPlaybackRate = seekedBgsSource.playbackRate.value;
      const sameBgsOmittedVolume = app._musicAudio.bgs._gainNode.gain.value;
      app.playAudio('bgs', 'Audio/BGM/Airship', 65, 105, 0);
      const sameBgsZeroSourceCount = context.sources.length;
      const sameBgsZeroPlaybackRate = seekedBgsSource.playbackRate.value;
      const sameBgsZeroVolume = app._musicAudio.bgs._gainNode.gain.value;

      return {
        bgmLoop: bgmSource.loop,
        bgmLoopStart: bgmSource.loopStart,
        bgmLoopEnd: bgmSource.loopEnd,
        bgmStartOffset: bgmSource.startOffset,
        bgmPlaybackRate: bgmSource.playbackRate.value,
        bgmVolume: initialBgmVolume,
        initialBgmPos,
        loopedBgmPos,
        seekedBgmStartOffset: seekedBgmSource.startOffset,
        sameBgmRgssPos,
        sameBgmOmittedSourceCount,
        sameBgmOmittedPlaybackRate,
        sameBgmOmittedVolume,
        sameBgmZeroSourceCount,
        sameBgmZeroPlaybackRate,
        sameBgmZeroVolume,
        pausedDuringMe,
        resumedAfterMe: resumedBgmSource.started,
        resumedAfterMeOffset: resumedBgmSource.startOffset,
        replacementBgmSourceCountDuringMe,
        replacementBgmResumedAfterMe: replacementBgmSource.started,
        replacementBgmStartOffset: replacementBgmSource.startOffset,
        initialBgsStartOffset: bgsSource.startOffset,
        initialBgsPos,
        seekedBgsStartOffset: seekedBgsSource.startOffset,
        sameBgsRgssPos,
        sameBgsOmittedSourceCount,
        sameBgsOmittedPlaybackRate,
        sameBgsOmittedVolume,
        sameBgsZeroSourceCount,
        sameBgsZeroPlaybackRate,
        sameBgsZeroVolume,
      };
    });

    expect(result.bgmLoop).toBe(true);
    expect(result.bgmLoopStart).toBeCloseTo(1);
    expect(result.bgmLoopEnd).toBeCloseTo(3);
    expect(result.bgmStartOffset).toBeCloseTo(1.234);
    expect(result.bgmPlaybackRate).toBeCloseTo(1.2);
    expect(result.bgmVolume).toBeCloseTo(0.8);
    expect(result.initialBgmPos).toBeCloseTo(1234);
    expect(result.loopedBgmPos).toBeCloseTo(1634);
    expect(result.seekedBgmStartOffset).toBeCloseTo(2.5);
    expect(result.sameBgmRgssPos).toBeCloseTo(2500);
    expect(result.sameBgmOmittedSourceCount).toBe(2);
    expect(result.sameBgmOmittedPlaybackRate).toBeCloseTo(1.1);
    expect(result.sameBgmOmittedVolume).toBeCloseTo(0.4);
    expect(result.sameBgmZeroSourceCount).toBe(2);
    expect(result.sameBgmZeroPlaybackRate).toBeCloseTo(1.05);
    expect(result.sameBgmZeroVolume).toBeCloseTo(0.5);
    expect(result.pausedDuringMe).toBe(true);
    expect(result.resumedAfterMe).toBe(true);
    expect(result.resumedAfterMeOffset).toBeCloseTo(1.55);
    expect(result.replacementBgmSourceCountDuringMe).toBe(5);
    expect(result.replacementBgmResumedAfterMe).toBe(true);
    expect(result.replacementBgmStartOffset).toBeCloseTo(5);
    expect(result.initialBgsStartOffset).toBeCloseTo(2.5);
    expect(result.initialBgsPos).toBeCloseTo(2500);
    expect(result.seekedBgsStartOffset).toBeCloseTo(8.75);
    expect(result.sameBgsRgssPos).toBeCloseTo(8750);
    expect(result.sameBgsOmittedSourceCount).toBe(8);
    expect(result.sameBgsOmittedPlaybackRate).toBeCloseTo(0.95);
    expect(result.sameBgsOmittedVolume).toBeCloseTo(0.45);
    expect(result.sameBgsZeroSourceCount).toBe(8);
    expect(result.sameBgsZeroPlaybackRate).toBeCloseTo(1.05);
    expect(result.sameBgsZeroVolume).toBeCloseTo(0.65);
  });

  test('treats Ruby BGM and BGS positions as RGSS milliseconds', async ({ page }) => {
    await page.addInitScript(() => {
      class FakeAudioParam {
        value = 1;

        cancelScheduledValues() {}

        setValueAtTime(value: number) {
          this.value = value;
        }

        linearRampToValueAtTime(value: number) {
          this.value = value;
        }
      }

      class FakeGainNode {
        gain = new FakeAudioParam();

        connect() {}

        disconnect() {}
      }

      class FakeBufferSourceNode {
        playbackRate = new FakeAudioParam();
        startOffset = 0;

        connect() {}

        disconnect() {}

        start(_when = 0, offset = 0) {
          this.startOffset = offset;
        }

        stop() {}
      }

      class FakeAudioContext {
        static instances: FakeAudioContext[] = [];

        currentTime = 0;
        destination = {};
        state = 'running';
        readonly sources: FakeBufferSourceNode[] = [];
        readonly gains: FakeGainNode[] = [];

        constructor() {
          FakeAudioContext.instances.push(this);
        }

        createBufferSource() {
          const source = new FakeBufferSourceNode();
          this.sources.push(source);
          return source;
        }

        createGain() {
          const gain = new FakeGainNode();
          this.gains.push(gain);
          return gain;
        }

        decodeAudioData() {
          return Promise.resolve({ duration: 20, sampleRate: 44_100 });
        }

        resume() {
          this.state = 'running';
          return Promise.resolve();
        }
      }

      (window as any).Audio = class {
        constructor() {
          throw new Error('HTML Audio should not be used');
        }
      };
      (window as any).AudioContext = FakeAudioContext;
      (window as any).__fakeAudioContexts = FakeAudioContext.instances;
      const originalFetch = window.fetch.bind(window);
      const audioBytes = new Uint8Array([1, 118, 111, 114, 98, 105, 115, 0, 0, 0, 0, 2, 68, 172, 0, 0]).buffer;
      window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (new URL(url, window.location.href).pathname.endsWith('.ogg')) {
          return Promise.resolve(new Response(audioBytes.slice(0)));
        }

        return originalFetch(input, init);
      };
    });

    await loadGame(page, { gameDir: 'demo', guest: false, settleMs: 0, canvasTimeout: 20_000 });

    const result = await page.evaluate(async () => {
      const rubyManager = (window as any).rubyBridge.rubyManager;
      const app = (window as any).rubyBridge.app;
      const assetProvider = app._assetProvider;
      const originalResolveAsset = assetProvider.resolveAsset.bind(assetProvider);
      assetProvider.resolveAsset = (requestedPath: string, expectedType?: string) => {
        if (requestedPath === 'Audio/BGS/River') return originalResolveAsset('Audio/BGM/Ship', expectedType);
        return originalResolveAsset(requestedPath, expectedType);
      };
      const waitAudio = () => new Promise((resolve) => window.setTimeout(resolve, 50));

      await rubyManager.evalAsync("RPG::BGM.new('Theme1', 60, 120).play(4321)", 'test-ruby-bgm-play-pos');
      await waitAudio();
      const context = (window as any).__fakeAudioContexts[0];
      const bgmInitialPos = Number((window as any).rubyBridge.app.audioPos('bgm'));
      context.currentTime = (6.789 - 4.321) / 1.2;
      await rubyManager.evalAsync('$test_bgm_last = RPG::BGM.last', 'test-ruby-bgm-last');
      const bgmLastPos = Number(
        (await rubyManager.evalAsync('$test_bgm_last.pos', 'test-ruby-bgm-last-pos')).toString(),
      );
      await rubyManager.evalAsync('$test_bgm_last.replay', 'test-ruby-bgm-replay');
      await waitAudio();
      const bgmReplayPos = Number((window as any).rubyBridge.app.audioPos('bgm'));
      const bgmSourceCountAfterReplay = context.sources.length;
      const bgmPlaybackRateAfterReplay = context.sources[1].playbackRate.value;
      const bgmVolumeAfterReplay = context.gains[0].gain.value;

      context.currentTime += (9.25 - 6.789) / 1.2;
      await rubyManager.evalAsync("RPG::BGM.new('Theme1', 35, 80).play", 'test-ruby-bgm-play-omitted-pos');
      const bgmOmittedPos = Number((window as any).rubyBridge.app.audioPos('bgm'));
      const bgmOmittedPlaybackRate = context.sources[1].playbackRate.value;
      const bgmOmittedVolume = context.gains[0].gain.value;

      context.currentTime += (10.5 - 9.25) / 0.8;
      await rubyManager.evalAsync("RPG::BGM.new('Theme1', 45, 95).play(0)", 'test-ruby-bgm-play-zero-pos');
      const bgmZeroPos = Number((window as any).rubyBridge.app.audioPos('bgm'));
      const bgmZeroPlaybackRate = context.sources[1].playbackRate.value;
      const bgmZeroVolume = context.gains[0].gain.value;

      await rubyManager.evalAsync("RPG::BGS.new('River', 55, 90).play(2500)", 'test-ruby-bgs-play-pos');
      await waitAudio();
      const bgsInitialPos = Number((window as any).rubyBridge.app.audioPos('bgs'));
      context.currentTime += (8.75 - 2.5) / 0.9;
      await rubyManager.evalAsync('$test_bgs_last = RPG::BGS.last', 'test-ruby-bgs-last');
      const bgsLastPos = Number(
        (await rubyManager.evalAsync('$test_bgs_last.pos', 'test-ruby-bgs-last-pos')).toString(),
      );
      await rubyManager.evalAsync('$test_bgs_last.replay', 'test-ruby-bgs-replay');
      await waitAudio();
      const bgsReplayPos = Number((window as any).rubyBridge.app.audioPos('bgs'));
      const bgsSourceCountAfterReplay = context.sources.length;
      const bgsPlaybackRateAfterReplay = context.sources[3].playbackRate.value;
      const bgsVolumeAfterReplay = context.gains[1].gain.value;

      context.currentTime += (11.125 - 8.75) / 0.9;
      await rubyManager.evalAsync("RPG::BGS.new('River', 40, 130).play", 'test-ruby-bgs-play-omitted-pos');
      const bgsOmittedPos = Number((window as any).rubyBridge.app.audioPos('bgs'));
      const bgsOmittedPlaybackRate = context.sources[3].playbackRate.value;
      const bgsOmittedVolume = context.gains[1].gain.value;

      context.currentTime += (12.25 - 11.125) / 1.3;
      await rubyManager.evalAsync("RPG::BGS.new('River', 75, 110).play(0)", 'test-ruby-bgs-play-zero-pos');
      const bgsZeroPos = Number((window as any).rubyBridge.app.audioPos('bgs'));
      const bgsZeroPlaybackRate = context.sources[3].playbackRate.value;
      const bgsZeroVolume = context.gains[1].gain.value;

      return {
        bgmInitialPos,
        bgmLastPos,
        bgmReplayPos,
        bgmSourceCountAfterReplay,
        bgmPlaybackRateAfterReplay,
        bgmVolumeAfterReplay,
        bgmOmittedPos,
        bgmOmittedPlaybackRate,
        bgmOmittedVolume,
        bgmZeroPos,
        bgmZeroPlaybackRate,
        bgmZeroVolume,
        bgsInitialPos,
        bgsLastPos,
        bgsReplayPos,
        bgsSourceCountAfterReplay,
        bgsPlaybackRateAfterReplay,
        bgsVolumeAfterReplay,
        bgsOmittedPos,
        bgsOmittedPlaybackRate,
        bgsOmittedVolume,
        bgsZeroPos,
        bgsZeroPlaybackRate,
        bgsZeroVolume,
      };
    });

    expect(result.bgmInitialPos).toBeCloseTo(4321);
    expect(result.bgmLastPos).toBeCloseTo(6789);
    expect(result.bgmReplayPos).toBeCloseTo(6789);
    expect(result.bgmSourceCountAfterReplay).toBe(2);
    expect(result.bgmPlaybackRateAfterReplay).toBeCloseTo(1.2);
    expect(result.bgmVolumeAfterReplay).toBeCloseTo(0.6);
    expect(result.bgmOmittedPos).toBeCloseTo(9250);
    expect(result.bgmOmittedPlaybackRate).toBeCloseTo(0.8);
    expect(result.bgmOmittedVolume).toBeCloseTo(0.35);
    expect(result.bgmZeroPos).toBeCloseTo(10500);
    expect(result.bgmZeroPlaybackRate).toBeCloseTo(0.95);
    expect(result.bgmZeroVolume).toBeCloseTo(0.45);
    expect(result.bgsInitialPos).toBeCloseTo(2500);
    expect(result.bgsLastPos).toBeCloseTo(8750);
    expect(result.bgsReplayPos).toBeCloseTo(8750);
    expect(result.bgsSourceCountAfterReplay).toBe(4);
    expect(result.bgsPlaybackRateAfterReplay).toBeCloseTo(0.9);
    expect(result.bgsVolumeAfterReplay).toBeCloseTo(0.55);
    expect(result.bgsOmittedPos).toBeCloseTo(11125);
    expect(result.bgsOmittedPlaybackRate).toBeCloseTo(1.3);
    expect(result.bgsOmittedVolume).toBeCloseTo(0.4);
    expect(result.bgsZeroPos).toBeCloseTo(12250);
    expect(result.bgsZeroPlaybackRate).toBeCloseTo(1.1);
    expect(result.bgsZeroVolume).toBeCloseTo(0.75);
  });
});

import { expect, test } from '@playwright/test';
import { expectGameCanvas, loadGame } from './helpers';

test.describe('save storage', () => {
  test('uses a custom save storage adapter registered before boot', async ({ page }) => {
    await page.addInitScript(() => {
      const records = new Map<string, { base64: string; updatedAt: string }>();
      const calls: string[] = [];
      (window as any).__customSaveStorageCalls = calls;
      (window as any).RPGVXAceWeb = {
        saveStorageAdapter: {
          async saveBinaryBase64(gameId: string, filename: string, base64: string) {
            calls.push(`save:${gameId}:${filename}`);
            records.set(`${gameId}/${filename}`, {
              base64,
              updatedAt: '2026-05-07T00:00:00.000Z',
            });
          },

          async loadSavedBinaryBase64(gameId: string, filename: string) {
            calls.push(`load:${gameId}:${filename}`);
            return records.get(`${gameId}/${filename}`)?.base64 ?? null;
          },

          async getSavedDataInfo(gameId: string, filename: string) {
            calls.push(`info:${gameId}:${filename}`);
            const record = records.get(`${gameId}/${filename}`);
            return record ? { filename, updatedAt: record.updatedAt } : null;
          },

          async listSavedData(gameId: string) {
            calls.push(`list:${gameId}`);
            const prefix = `${gameId}/`;
            return Array.from(records.entries())
              .filter(([key]) => key.startsWith(prefix))
              .map(([key, record]) => ({
                filename: key.slice(prefix.length),
                updatedAt: record.updatedAt,
              }));
          },

          async deleteSavedData(gameId: string, filename: string) {
            calls.push(`delete:${gameId}:${filename}`);
            records.delete(`${gameId}/${filename}`);
          },
        },
      };
    });
    await loadGame(page, { gameDir: 'minimal', guest: false, settleMs: 0, assertNoRuntimeError: false });

    const result = await page.evaluate(async () => {
      const bridge = (window as any).rubyBridge;
      await bridge.utils.saveBinaryBase64(bridge.gameId, './Profile\\slot.dat', 'ZGlyZWN0LXNhdmU=');
      const directRead = await bridge.utils.loadSavedBinaryBase64(bridge.gameId, 'Profile/slot.dat');

      await bridge.rubyManager.evalAsync(
        'File.open("Save05.rvdata2", "wb") { |file| file.write("ruby-save") }',
        'test-custom-save-adapter-ruby-write',
      );

      return {
        directRead,
        rubyRead: await bridge.utils.loadSavedBinaryBase64(bridge.gameId, 'Save05.rvdata2'),
        info: await bridge.utils.getSavedDataInfo(bridge.gameId, 'Save05.rvdata2'),
        list: await bridge.utils.listSavedData(bridge.gameId),
        calls: (window as any).__customSaveStorageCalls,
      };
    });

    expect(result).toEqual({
      directRead: 'ZGlyZWN0LXNhdmU=',
      rubyRead: 'cnVieS1zYXZl',
      info: {
        filename: 'Save05.rvdata2',
        updatedAt: '2026-05-07T00:00:00.000Z',
      },
      list: [
        {
          filename: 'Profile/slot.dat',
          updatedAt: '2026-05-07T00:00:00.000Z',
        },
        {
          filename: 'Save05.rvdata2',
          updatedAt: '2026-05-07T00:00:00.000Z',
        },
      ],
      calls: [
        'save:local:minimal:Profile/slot.dat',
        'load:local:minimal:Profile/slot.dat',
        'save:local:minimal:Save05.rvdata2',
        'load:local:minimal:Save05.rvdata2',
        'info:local:minimal:Save05.rvdata2',
        'list:local:minimal',
      ],
    });
  });

  test('persists base64 data by manifest id and filename', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', settleMs: 0, assertNoRuntimeError: false });

    const firstRead = await page.evaluate(async () => {
      const bridge = (window as any).rubyBridge;
      await bridge.utils.deleteSavedData(bridge.gameId, 'Save01.rvdata2');
      await bridge.utils.saveBinaryBase64(bridge.gameId, 'Save01.rvdata2', 'bWFyc2hhbC1kYXRh');
      return bridge.utils.loadSavedBinaryBase64(bridge.gameId, 'Save01.rvdata2');
    });

    expect(firstRead).toBe('bWFyc2hhbC1kYXRh');

    await page.reload({ waitUntil: 'load' });
    await expectGameCanvas(page);

    const secondRead = await page.evaluate(async () => {
      const bridge = (window as any).rubyBridge;
      return bridge.utils.loadSavedBinaryBase64(bridge.gameId, 'Save01.rvdata2');
    });

    expect(secondRead).toBe('bWFyc2hhbC1kYXRh');
  });

  test('separates saved data for different manifest ids with the same game directory', async ({ page }) => {
    let manifestId = 'local:save-scope-a';
    await page.route('**/minimal/manifest.json', async (route) => {
      const response = await route.fetch();
      const manifest = await response.json();
      manifest.id = manifestId;
      await route.fulfill({ json: manifest });
    });

    await loadGame(page, { gameDir: 'minimal', settleMs: 0, assertNoRuntimeError: false });
    await page.evaluate(async () => {
      const bridge = (window as any).rubyBridge;
      await bridge.utils.deleteSavedData('local:save-scope-a', 'Shared.rvdata2');
      await bridge.utils.deleteSavedData('local:save-scope-b', 'Shared.rvdata2');
      await bridge.utils.saveBinaryBase64(bridge.gameId, 'Shared.rvdata2', 'c2NvcGUtYQ==');
    });

    manifestId = 'local:save-scope-b';
    await loadGame(page, { gameDir: 'minimal', settleMs: 0, assertNoRuntimeError: false });

    const reads = await page.evaluate(async () => {
      const bridge = (window as any).rubyBridge;
      const beforeWrite = await bridge.utils.loadSavedBinaryBase64(bridge.gameId, 'Shared.rvdata2');
      await bridge.utils.saveBinaryBase64(bridge.gameId, 'Shared.rvdata2', 'c2NvcGUtYg==');
      return {
        currentGameDir: bridge.gameDir,
        currentGameId: bridge.gameId,
        beforeWrite,
        scopedA: await bridge.utils.loadSavedBinaryBase64('local:save-scope-a', 'Shared.rvdata2'),
        scopedB: await bridge.utils.loadSavedBinaryBase64('local:save-scope-b', 'Shared.rvdata2'),
      };
    });

    expect(reads).toEqual({
      currentGameDir: 'minimal',
      currentGameId: 'local:save-scope-b',
      beforeWrite: null,
      scopedA: 'c2NvcGUtYQ==',
      scopedB: 'c2NvcGUtYg==',
    });
  });

  test('persists VXAce save file writes from Ruby File APIs', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', guest: false, settleMs: 0, assertNoRuntimeError: false });

    const firstRead = await page.evaluate(async () => {
      const bridge = (window as any).rubyBridge;
      await bridge.utils.deleteSavedData(bridge.gameId, 'Save03.rvdata2');

      await bridge.rubyManager.evalAsync(
        'File.open("Save03.rvdata2", "wb") { |file| Marshal.dump({ value: "from-ruby" }, file) }',
        'test-ruby-save-file',
      );

      return bridge.utils.loadSavedBinaryBase64(bridge.gameId, 'Save03.rvdata2');
    });

    expect(firstRead).toEqual(expect.any(String));
    expect(firstRead.length).toBeGreaterThan(0);

    await loadGame(page, { gameDir: 'minimal', guest: false, settleMs: 0, assertNoRuntimeError: false });

    const rubyRead = await page.evaluate(async () => {
      const bridge = (window as any).rubyBridge;
      (window as any).__rubySaveFileReadOk = false;
      await bridge.rubyManager.evalAsync(
        [
          'loaded = nil',
          'File.open("Save03.rvdata2", "rb") { |file| loaded = Marshal.load(file)[:value] }',
          'raise "missing saved file" unless Dir.glob("Save*.rvdata2").include?("Save03.rvdata2")',
          'raise "missing saved mtime" unless File.mtime("Save03.rvdata2").is_a?(Time)',
          'raise "unexpected saved value" unless loaded == "from-ruby"',
          'JS.global[:__rubySaveFileReadOk] = true',
        ].join('\n'),
        'test-ruby-load-file',
      );

      return (window as any).__rubySaveFileReadOk;
    });

    expect(rubyRead).toBe(true);
  });

  test('persists arbitrary relative file writes from Ruby File APIs', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', guest: false, settleMs: 0, assertNoRuntimeError: false });

    const rubyRead = await page.evaluate(async () => {
      const bridge = (window as any).rubyBridge;
      await bridge.utils.deleteSavedData(bridge.gameId, 'Profile/slot.dat');
      (window as any).__rubyVirtualFileReadOk = false;

      await bridge.rubyManager.evalAsync(
        [
          'File.open("Profile/slot.dat", "wb") { |file| file.write("custom-save") }',
          'loaded = File.open("Profile/slot.dat", "rb") { |file| file.read }',
          'raise "missing custom saved file" unless Dir.glob("Profile/*.dat").include?("Profile/slot.dat")',
          'raise "unexpected custom saved value" unless loaded == "custom-save"',
          'JS.global[:__rubyVirtualFileReadOk] = true',
        ].join('\n'),
        'test-ruby-custom-virtual-file',
      );

      return (window as any).__rubyVirtualFileReadOk;
    });

    expect(rubyRead).toBe(true);
  });

  test('File.open and load_data fall back to packaged game data when no save exists', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', guest: false, settleMs: 0, assertNoRuntimeError: false });

    const rubyRead = await page.evaluate(async () => {
      const bridge = (window as any).rubyBridge;
      await bridge.utils.deleteSavedData(bridge.gameId, 'Data/Actors.rvdata2');
      (window as any).__rubyPackagedDataReadOk = false;

      await bridge.rubyManager.evalAsync(
        [
          'header = File.open("Data/Actors.rvdata2", "rb") { |file| file.read(2).bytes }',
          'actors = load_data("Data/Actors.rvdata2")',
          'raise "unexpected marshal header" unless header == [4, 8]',
          'raise "unexpected actors data" unless actors.is_a?(Array) && actors.length > 1',
          'JS.global[:__rubyPackagedDataReadOk] = true',
        ].join('\n'),
        'test-ruby-packaged-data-fallback',
      );

      return (window as any).__rubyPackagedDataReadOk;
    });

    expect(rubyRead).toBe(true);
  });

  test('packaged data network failures show retry UI and resume Ruby load_data', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', guest: false, settleMs: 0, assertNoRuntimeError: false });

    let requestCount = 0;
    await page.route(
      (url) => url.pathname.includes('/minimal/Data/') && url.pathname.endsWith('.rvdata2'),
      async (route) => {
        requestCount += 1;
        if (requestCount === 1) {
          await route.abort('failed');
          return;
        }

        await route.continue();
      },
    );

    const resultPromise = page.evaluate(async () => {
      const bridge = (window as any).rubyBridge;
      const result = await bridge.rubyManager.evalAsync(
        [
          'actors = load_data("Data/Actors.rvdata2")',
          'raise "actors did not load" unless actors',
          'JS.global[:rubyBridge][:app].debugSnapshot()[:resourceErrorOpen]',
        ].join('\n'),
        'test-load-data-resource-retry',
      );

      return result.toString();
    });

    await expect(page.locator('.resource-error')).toBeVisible();
    await expect(page.locator('.resource-error__title')).toContainText('Data/Actors.rvdata2');
    await page.locator('.resource-error__retry').click();

    await expect(resultPromise).resolves.toBe('false');
    expect(requestCount).toBe(2);
    await expect(page.locator('.resource-error')).toBeHidden();
  });

  test('saved files take priority over packaged game data with the same path', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', guest: false, settleMs: 0, assertNoRuntimeError: false });

    const rubyRead = await page.evaluate(async () => {
      const bridge = (window as any).rubyBridge;
      await bridge.utils.deleteSavedData(bridge.gameId, 'Data/Actors.rvdata2');
      (window as any).__rubyOverlayPriorityOk = false;

      try {
        await bridge.rubyManager.evalAsync(
          [
            'save_data({ value: "from-save-data" }, "Data/Actors.rvdata2")',
            'loaded = load_data("Data/Actors.rvdata2")',
            'raise "load_data did not prefer saved data" unless loaded[:value] == "from-save-data"',
            'File.open("Data/Actors.rvdata2", "wb") { |file| file.write("from-file-open") }',
            'raw = File.open("Data/Actors.rvdata2", "rb") { |file| file.read }',
            'raise "File.open did not prefer saved data" unless raw == "from-file-open"',
            'JS.global[:__rubyOverlayPriorityOk] = true',
          ].join('\n'),
          'test-ruby-saved-data-overlay-priority',
        );

        return (window as any).__rubyOverlayPriorityOk;
      } finally {
        await bridge.utils.deleteSavedData(bridge.gameId, 'Data/Actors.rvdata2');
      }
    });

    expect(rubyRead).toBe(true);
  });

  test('Ruby file existence APIs see saved files and packaged resources', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', guest: false, settleMs: 0, assertNoRuntimeError: false });

    const result = await page.evaluate(async () => {
      const bridge = (window as any).rubyBridge;
      await bridge.utils.deleteSavedData(bridge.gameId, 'Profile/existence.dat');

      try {
        return JSON.parse(
          (
            await bridge.rubyManager.evalAsync(
              [
                'require "json"',
                'File.open("Profile/existence.dat", "wb") { |file| file.write("exists") }',
                'checks = {',
                '  saved_file_exist: File.exist?("Profile/existence.dat"),',
                '  saved_file_test_exist: FileTest.exist?("Profile/existence.dat"),',
                '  saved_file_file: File.file?("Profile/existence.dat"),',
                '  saved_file_test_file: FileTest.file?("Profile/existence.dat"),',
                '  packaged_file_exist: File.exist?("Data/Actors.rvdata2"),',
                '  packaged_file_test_exist: FileTest.exist?("Data/Actors.rvdata2"),',
                '  packaged_file_file: File.file?("Data/Actors.rvdata2"),',
                '  missing_file_exist: File.exist?("Profile/missing.dat"),',
                '  missing_file_test_exist: FileTest.exist?("Profile/missing.dat"),',
                '  invalid_relative_exist: File.exist?("../Data/Actors.rvdata2"),',
                '  absolute_exist: File.exist?("/Data/Actors.rvdata2")',
                '}',
                'checks[:saved_file_exists_alias] = File.exists?("Profile/existence.dat") if File.respond_to?(:exists?)',
                'checks[:saved_file_test_exists_alias] = FileTest.exists?("Profile/existence.dat") if FileTest.respond_to?(:exists?)',
                'checks.to_json',
              ].join('\n'),
              'test-ruby-virtual-file-existence-apis',
            )
          ).toString(),
        );
      } finally {
        await bridge.utils.deleteSavedData(bridge.gameId, 'Profile/existence.dat');
      }
    });

    expect(result).toMatchObject({
      saved_file_exist: true,
      saved_file_test_exist: true,
      saved_file_file: true,
      saved_file_test_file: true,
      packaged_file_exist: true,
      packaged_file_test_exist: true,
      packaged_file_file: true,
      missing_file_exist: false,
      missing_file_test_exist: false,
      invalid_relative_exist: false,
      absolute_exist: false,
    });
    expect(result.saved_file_exists_alias ?? true).toBe(true);
    expect(result.saved_file_test_exists_alias ?? true).toBe(true);
  });

  test('File.open does not fetch missing virtual files', async ({ page }) => {
    await loadGame(page, { gameDir: 'minimal', guest: false, settleMs: 0, assertNoRuntimeError: false });

    let missingSaveFetches = 0;
    await page.route('**/minimal/Save04.rvdata2', async (route) => {
      missingSaveFetches += 1;
      await route.continue();
    });

    const rubyRead = await page.evaluate(async () => {
      const bridge = (window as any).rubyBridge;
      await bridge.utils.deleteSavedData(bridge.gameId, 'Save04.rvdata2');
      (window as any).__rubyMissingVirtualFileError = null;

      await bridge.rubyManager.evalAsync(
        [
          'begin',
          '  File.open("Save04.rvdata2", "rb") { |file| file.read }',
          '  raise "expected missing save to fail"',
          'rescue Exception => error',
          '  JS.global[:__rubyMissingVirtualFileError] = { class_name: error.class.to_s, message: error.message }',
          'end',
        ].join('\n'),
        'test-ruby-missing-virtual-file',
      );

      return (window as any).__rubyMissingVirtualFileError;
    });

    expect(rubyRead).toEqual({
      class_name: 'Errno::ENOENT',
      message: expect.stringContaining('Save04.rvdata2'),
    });
    expect(missingSaveFetches).toBe(0);
  });
});

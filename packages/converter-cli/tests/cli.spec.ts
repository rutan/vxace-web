import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { runCli } from '../src/cli';

const temporaryRoots: string[] = [];

describe('runCli', () => {
  afterEach(async () => {
    await Promise.all(temporaryRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  test('converts a VX Ace game directory to a browser distribution', async () => {
    const root = await createTemporaryRoot();
    const srcDir = path.join(root, 'game-src');
    const outDir = path.join(root, 'dist');
    const templateDir = path.join(root, 'template');
    await writeFile(srcDir, 'Game.ini', '[Game]\nTitle=CLI Fixture\n');
    await writeFile(srcDir, 'Graphics/Characters/Hero.png', 'hero image');
    await writeFile(templateDir, 'index.html', '<!doctype html>\n');

    const { io, output } = createIo();
    const exitCode = await runCli(
      [srcDir, '--out', outDir, '--template-dir', templateDir, '--game-id', 'com.example.cli-fixture'],
      io,
    );

    expect(exitCode).toBe(0);
    await expect(fs.readFile(path.join(outDir, 'index.html'), 'utf8')).resolves.toBe('<!doctype html>\n');
    await expect(fs.readFile(path.join(outDir, 'game/Game.ini'), 'utf8')).resolves.toBe('[Game]\nTitle=CLI Fixture\n');
    const manifest = JSON.parse(await fs.readFile(path.join(outDir, 'game/manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({
      id: 'com.example.cli-fixture',
      metadata: {
        title: 'CLI Fixture',
      },
    });
    expect(output.stdout).toContain('Converted:');
    expect(output.stderr).toBe('');
  });

  test('rejects a non-empty output directory unless clean is specified', async () => {
    const root = await createTemporaryRoot();
    const srcDir = path.join(root, 'game-src');
    const outDir = path.join(root, 'dist');
    const templateDir = path.join(root, 'template');
    await writeFile(srcDir, 'Game.ini', '[Game]\nTitle=CLI Fixture\n');
    await writeFile(templateDir, 'index.html', '<!doctype html>\n');
    await writeFile(outDir, 'old.txt', 'old');

    const { io, output } = createIo();
    const exitCode = await runCli(
      [srcDir, '--out', outDir, '--template-dir', templateDir, '--game-id', 'com.example.cli-fixture'],
      io,
    );

    expect(exitCode).toBe(1);
    expect(output.stderr).toContain('Output directory is not empty');
    await expect(fs.readFile(path.join(outDir, 'old.txt'), 'utf8')).resolves.toBe('old');
  });

  test('rejects output directories that contain the source directory before cleaning', async () => {
    const root = await createTemporaryRoot();
    const srcDir = path.join(root, 'dist/game-src');
    const outDir = path.join(root, 'dist');
    const templateDir = path.join(root, 'template');
    await writeFile(srcDir, 'Game.ini', '[Game]\nTitle=CLI Fixture\n');
    await writeFile(templateDir, 'index.html', '<!doctype html>\n');

    const { io, output } = createIo();
    const exitCode = await runCli(
      [srcDir, '--out', outDir, '--template-dir', templateDir, '--game-id', 'com.example.cli-fixture', '--clean'],
      io,
    );

    expect(exitCode).toBe(1);
    expect(output.stderr).toContain('Output directory must not contain the source directory');
    await expect(fs.readFile(path.join(srcDir, 'Game.ini'), 'utf8')).resolves.toContain('CLI Fixture');
  });

  test('prints detailed JSON reports when requested', async () => {
    const root = await createTemporaryRoot();
    const srcDir = path.join(root, 'game-src');
    const outDir = path.join(root, 'dist');
    const templateDir = path.join(root, 'template');
    await writeFile(srcDir, 'Game.ini', '[Game]\nTitle=CLI Fixture\n');
    await writeFile(srcDir, 'Save01.rvdata2', 'save data');
    await writeFile(templateDir, 'index.html', '<!doctype html>\n');

    const { io, output } = createIo();
    const exitCode = await runCli(
      [
        srcDir,
        '--out',
        outDir,
        '--template-dir',
        templateDir,
        '--game-id',
        'com.example.cli-fixture',
        '--exclude-source',
        'Save*.rvdata2',
        '--json',
      ],
      io,
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.stdout)).toMatchObject({
      summary: {
        gameId: 'com.example.cli-fixture',
        title: 'CLI Fixture',
        omittedFiles: [
          {
            sourcePath: 'Save01.rvdata2',
            reason: 'source-file',
          },
        ],
      },
      result: {
        status: 'success',
        game: {
          gameId: 'com.example.cli-fixture',
        },
        output: {
          manifestPath: 'game/manifest.json',
        },
        files: expect.arrayContaining([
          expect.objectContaining({
            sourcePath: 'Save01.rvdata2',
            action: 'omitted',
            reason: 'source-exclude-pattern',
          }),
        ]),
      },
    });
    await expect(fs.access(path.join(outDir, 'game/Save01.rvdata2'))).rejects.toThrow();
  });

  test('injects HTML files into the player template', async () => {
    const root = await createTemporaryRoot();
    const srcDir = path.join(root, 'game-src');
    const outDir = path.join(root, 'dist');
    const templateDir = path.join(root, 'template');
    const injectionDir = path.join(root, 'injections');
    const analyticsPath = path.join(injectionDir, 'analytics.html');
    const embedPath = path.join(injectionDir, 'embed.html');
    await writeFile(srcDir, 'Game.ini', '[Game]\nTitle=CLI Fixture\n');
    await writeFile(templateDir, 'index.html', '<head>\n<!-- USER-SCRIPT -->\n</head>\n');
    await writeFile(injectionDir, 'analytics.html', '<script src="analytics.js"></script>');
    await writeFile(injectionDir, 'embed.html', '<meta name="demo" content="fixture" />');

    const { io, output } = createIo();
    const exitCode = await runCli(
      [
        srcDir,
        '--out',
        outDir,
        '--template-dir',
        templateDir,
        '--game-id',
        'com.example.cli-fixture',
        '--inject-html',
        analyticsPath,
        '--inject-html',
        embedPath,
      ],
      io,
    );

    expect(exitCode).toBe(0);
    expect(output.stderr).toBe('');
    await expect(fs.readFile(path.join(outDir, 'index.html'), 'utf8')).resolves.toBe(
      '<head>\n<script src="analytics.js"></script>\n<meta name="demo" content="fixture" />\n</head>\n',
    );
  });

  test('excludes source files from human summaries', async () => {
    const root = await createTemporaryRoot();
    const srcDir = path.join(root, 'game-src');
    const outDir = path.join(root, 'dist');
    const templateDir = path.join(root, 'template');
    await writeFile(srcDir, 'Game.ini', '[Game]\nTitle=CLI Fixture\n');
    await writeFile(srcDir, 'Save01.rvdata2', 'save data');
    await writeFile(srcDir, 'Profile/slot.dat', 'custom save data');
    await writeFile(templateDir, 'index.html', '<!doctype html>\n');

    const { io, output } = createIo();
    const exitCode = await runCli(
      [
        srcDir,
        '--out',
        outDir,
        '--template-dir',
        templateDir,
        '--game-id',
        'com.example.cli-fixture',
        '--exclude-source',
        'Save*.rvdata2',
        '--exclude-source',
        'Profile/**',
      ],
      io,
    );

    expect(exitCode).toBe(0);
    expect(output.stdout).toContain('Save01.rvdata2 (excluded source file)');
    expect(output.stdout).toContain('Profile/slot.dat (excluded source file)');
    await expect(fs.access(path.join(outDir, 'game/Save01.rvdata2'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, 'game/Profile/slot.dat'))).rejects.toThrow();
  });

  test('converts game files directly to the output directory when no-template is requested', async () => {
    const root = await createTemporaryRoot();
    const srcDir = path.join(root, 'game-src');
    const outDir = path.join(root, 'game-out');
    await writeFile(srcDir, 'Game.ini', '[Game]\nTitle=CLI Fixture\n');

    const { io, output } = createIo();
    const exitCode = await runCli(
      [srcDir, '--out', outDir, '--game-id', 'com.example.cli-fixture', '--no-template'],
      io,
    );

    expect(exitCode).toBe(0);
    await expect(fs.readFile(path.join(outDir, 'Game.ini'), 'utf8')).resolves.toBe('[Game]\nTitle=CLI Fixture\n');
    await expect(fs.readFile(path.join(outDir, 'manifest.json'), 'utf8')).resolves.toContain('com.example.cli-fixture');
    await expect(fs.access(path.join(outDir, 'index.html'))).rejects.toThrow();
    await expect(fs.access(path.join(outDir, 'game/manifest.json'))).rejects.toThrow();
    expect(output.stdout).toContain('Converted:');
    expect(output.stderr).toBe('');
  });
});

const createIo = () => {
  const output = {
    stdout: '',
    stderr: '',
  };

  return {
    output,
    io: {
      stdout: {
        write(value: string) {
          output.stdout += value;
          return true;
        },
      },
      stderr: {
        write(value: string) {
          output.stderr += value;
          return true;
        },
      },
    },
  };
};

const createTemporaryRoot = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vxace-cli-'));
  temporaryRoots.push(root);
  return root;
};

const writeFile = async (root: string, relativePath: string, content: string) => {
  const target = path.join(root, relativePath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content);
};

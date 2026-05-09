import { createReadStream } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Plugin } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLE_DIR = path.resolve(__dirname, '../../../../example');

export const exampleGamePlugin = () => {
  return {
    name: 'example-game-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const filePath = resolveExampleFilePath(req.url);

        if (!isStaticRequestMethod(req.method) || filePath == null) {
          next();
          return;
        }

        void fs
          .stat(filePath)
          .then((stat) => {
            if (!stat.isFile()) {
              next();
              return;
            }

            res.statusCode = 200;
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Content-Length', stat.size);
            res.setHeader('Content-Type', getContentType(filePath));

            if (req.method === 'HEAD') {
              res.end();
              return;
            }

            createReadStream(filePath).on('error', next).pipe(res);
          })
          .catch((error: unknown) => {
            if (isMissingFileError(error)) {
              next();
              return;
            }

            next(error);
          });
      });
    },
  } satisfies Plugin;
};

const isStaticRequestMethod = (method: string | undefined) => method === 'GET' || method === 'HEAD';

const resolveExampleFilePath = (url: string | undefined) => {
  if (url == null || url.startsWith('//')) return null;

  let pathname: string;
  try {
    pathname = new URL(url, 'http://example.local').pathname;
  } catch {
    return null;
  }

  let decodedPathname: string;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relativePath = decodedPathname.replace(/^\/+/, '');
  if (relativePath === '') return null;

  const resolvedPath = path.resolve(EXAMPLE_DIR, relativePath);
  const exampleRoot = `${path.resolve(EXAMPLE_DIR)}${path.sep}`;

  return resolvedPath.startsWith(exampleRoot) ? resolvedPath : null;
};

const getContentType = (filePath: string) => {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.bmp':
      return 'image/bmp';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.gif':
      return 'image/gif';
    case '.html':
      return 'text/html; charset=utf-8';
    case '.ini':
    case '.log':
    case '.md':
    case '.txt':
      return 'text/plain; charset=utf-8';
    case '.jpeg':
    case '.jpg':
      return 'image/jpeg';
    case '.js':
    case '.mjs':
      return 'text/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.m4a':
      return 'audio/mp4';
    case '.mp3':
      return 'audio/mpeg';
    case '.mp4':
      return 'video/mp4';
    case '.ogg':
      return 'audio/ogg';
    case '.otf':
      return 'font/otf';
    case '.png':
      return 'image/png';
    case '.ttf':
      return 'font/ttf';
    case '.wav':
      return 'audio/wav';
    case '.wma':
      return 'audio/x-ms-wma';
    case '.webm':
      return 'video/webm';
    case '.webp':
      return 'image/webp';
    case '.woff':
      return 'font/woff';
    case '.woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
};

const isMissingFileError = (error: unknown) =>
  isNodeError(error) && (error.code === 'ENOENT' || error.code === 'ENOTDIR');

const isNodeError = (error: unknown): error is NodeJS.ErrnoException => error instanceof Error && 'code' in error;

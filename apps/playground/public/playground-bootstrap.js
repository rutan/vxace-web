(function () {
  const READY_MESSAGE = 'vxace-playground-ready';
  const CONFIG_MESSAGE = 'vxace-playground-config';

  const stripPrefix = (path, prefix) => {
    const normalizedPrefix = prefix.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
    if (!normalizedPrefix) return path;

    return path.toLowerCase().startsWith(normalizedPrefix.toLowerCase()) ? path.slice(normalizedPrefix.length) : path;
  };

  const getFrameDirectory = () => {
    const path = window.location.pathname.replace(/\\/g, '/').replace(/^\/+/, '');
    const index = path.lastIndexOf('/');
    return index >= 0 ? path.slice(0, index + 1) : '';
  };

  const normalizeLocalPath = (value) => {
    return String(value)
      .replace(/\\/g, '/')
      .replace(/^\.\//, '')
      .replace(/^\/+/, '')
      .replace(/\/+/g, '/')
      .normalize('NFC');
  };

  const normalizePath = (value) => {
    let path = value;

    if (typeof value !== 'string') {
      if (value && typeof value.url === 'string') {
        path = value.url;
      } else {
        path = String(value);
      }
    }

    try {
      path = new URL(path, window.location.href).pathname;
    } catch {
      path = String(path);
    }

    try {
      path = decodeURIComponent(path);
    } catch {
      // Keep the original path if it is not valid percent-encoding.
    }

    path = path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
    path = stripPrefix(path, `${getFrameDirectory()}game/`);
    path = stripPrefix(path, 'game/');

    return path.normalize('NFC');
  };

  const state = {
    config: null,
    fileMap: new Map(),
  };

  const configPromise = new Promise((resolve) => {
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin || event.data?.type !== CONFIG_MESSAGE) return;

      const payload = event.data.payload;
      state.config = payload;
      state.fileMap = new Map(payload.files.map((entry) => [normalizeLocalPath(entry.path), entry.file]));
      resolve(payload);
    });
  });

  window.RPGVXAceWeb = window.RPGVXAceWeb || {};
  window.RPGVXAceWeb.resolveManifest = async () => {
    const config = await configPromise;
    return config.manifest;
  };
  window.RPGVXAceWeb.resourceFetchAdapter = {
    async fetch(input, init) {
      await configPromise;
      const path = normalizePath(input);
      const file = state.fileMap.get(path);
      if (!file) return window.fetch(input, init);

      return new Response(file, {
        headers: {
          'content-type': file.type || getContentType(path),
          'content-length': String(file.size),
        },
      });
    },
  };

  window.parent.postMessage({ type: READY_MESSAGE }, window.location.origin);

  function getContentType(path) {
    const extension = path.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'bmp':
        return 'image/bmp';
      case 'ogg':
        return 'audio/ogg';
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      case 'm4a':
        return 'audio/mp4';
      case 'mp4':
        return 'video/mp4';
      case 'webm':
        return 'video/webm';
      case 'ttf':
        return 'font/ttf';
      case 'otf':
        return 'font/otf';
      case 'woff':
        return 'font/woff';
      case 'woff2':
        return 'font/woff2';
      default:
        return 'application/octet-stream';
    }
  }
})();

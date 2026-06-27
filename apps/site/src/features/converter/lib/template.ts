export interface TemplateManifest {
  files: string[];
}

const HTML_INJECTION_MARKER = '<!-- USER-SCRIPT -->';

export const loadTemplateFiles = async (options: { injectHtml?: string }) => {
  const manifest = await fetchJson<TemplateManifest>('template-manifest.json');
  const files: { path: string; content: Uint8Array }[] = [];

  for (const path of manifest.files) {
    const response = await fetch(assetUrl(`template/${path}`));
    if (!response.ok) throw new Error(`failed to load player template file: ${path}`);

    if (path === 'index.html' && options.injectHtml !== undefined) {
      const html = await response.text();
      files.push({
        path,
        content: new TextEncoder().encode(injectHtml(html, options.injectHtml)),
      });
      continue;
    }

    files.push({
      path,
      content: new Uint8Array(await response.arrayBuffer()),
    });
  }

  return files;
};

const injectHtml = (html: string, snippet: string) => {
  if (!html.includes(HTML_INJECTION_MARKER)) {
    throw new Error(`HTML injection marker was not found: ${HTML_INJECTION_MARKER}`);
  }

  return html.replace(HTML_INJECTION_MARKER, snippet);
};

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(assetUrl(path));
  if (!response.ok) throw new Error(`failed to load ${path}`);
  return (await response.json()) as T;
};

export const converterAssetUrl = (path: string) => {
  return `${import.meta.env.BASE_URL}converter-assets/${path.replace(/^\/+/, '')}`;
};

const assetUrl = converterAssetUrl;

import { resourceRetryManager, RetryableResourceLoadError, type ResourceLoadContext } from './resourceRetry';

type FetchParameter = Parameters<typeof fetch>;
type ResourceFetchOptions = Partial<ResourceLoadContext>;

export type ResourceFetchContext = ResourceLoadContext;

export type ResourceFetchAdapter = {
  fetch(
    input: FetchParameter[0],
    init: FetchParameter[1] | undefined,
    context: ResourceFetchContext,
  ): Promise<Response>;
};

const defaultResourceFetchAdapter: ResourceFetchAdapter = {
  fetch: (input, init) => fetch(input, init),
};

let resourceFetchAdapter: ResourceFetchAdapter = defaultResourceFetchAdapter;

export function configureResourceFetchAdapter(adapter: ResourceFetchAdapter | null) {
  if (adapter === null) {
    resourceFetchAdapter = defaultResourceFetchAdapter;
    return;
  }

  assertResourceFetchAdapter(adapter);
  resourceFetchAdapter = adapter;
}

export function fetchText(input: FetchParameter[0], init?: FetchParameter[1], context?: ResourceFetchOptions) {
  return fetchResource(input, init, context).then((resp) => resp.text());
}

export function fetchBinaryBase64(input: FetchParameter[0], init?: FetchParameter[1], context?: ResourceFetchOptions) {
  return fetchResource(input, init, context)
    .then((resp) => resp.arrayBuffer())
    .then((arrayBuffer) => ab2base64(arrayBuffer));
}

export function fetchArrayBuffer(input: FetchParameter[0], init?: FetchParameter[1], context?: ResourceFetchOptions) {
  return fetchResource(input, init, context).then((resp) => resp.arrayBuffer());
}

export function fetchBlob(input: FetchParameter[0], init?: FetchParameter[1], context?: ResourceFetchOptions) {
  return fetchResource(input, init, context).then((resp) => resp.blob());
}

function fetchResource(input: FetchParameter[0], init?: FetchParameter[1], context?: ResourceFetchOptions) {
  const url = formatFetchUrl(input);
  const resourceContext: ResourceFetchContext = {
    kind: context?.kind ?? 'data',
    url: context?.url ?? url,
    label: context?.label,
  };

  return resourceRetryManager.load(resourceContext, async () => {
    let response: Response;
    try {
      response = await resourceFetchAdapter.fetch(input, init, resourceContext);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new RetryableResourceLoadError(`network request failed: ${detail}`, { url });
    }

    return ensureOk(response, url);
  });
}

function assertResourceFetchAdapter(value: ResourceFetchAdapter) {
  if (typeof value.fetch !== 'function') {
    throw new TypeError('invalid resource fetch adapter: missing fetch');
  }
}

function ensureOk(response: Response, requestUrl: string) {
  if (response.ok) return response;

  const statusText = response.statusText ? ` ${response.statusText}` : '';
  const url = response.url ? ` for ${response.url}` : '';
  const message = `fetch failed with HTTP ${response.status}${statusText}${url}`;
  if (isRetryableHttpStatus(response.status)) {
    throw new RetryableResourceLoadError(message, { url: response.url || requestUrl, status: response.status });
  }

  throw new Error(message);
}

function isRetryableHttpStatus(status: number) {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

function formatFetchUrl(input: FetchParameter[0]) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url;

  return 'unknown request';
}

function ab2base64(arrayBuffer: ArrayBuffer) {
  const buffer: string[] = [];

  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytes.byteLength; ++i) {
    buffer.push(String.fromCharCode(bytes[i]));
  }

  return btoa(buffer.join(''));
}

export class RequestError extends Error {
  constructor(code) { super(code); this.code = code; }
}

// A 2xx HTML page or an opaque response is not evidence of delivery.
export async function sendRequest(endpoint, payload, { timeout = 12000, fetcher = fetch } = {}) {
  if (!endpoint) throw new RequestError('unconfigured');
  let target;
  try { target = new URL(endpoint); } catch { throw new RequestError('configuration'); }
  if (target.protocol !== 'https:' || target.username || target.password) throw new RequestError('configuration');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetcher(target.href, {
      method: 'POST', mode: 'cors', credentials: 'omit', redirect: 'error',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload), signal: controller.signal,
    });
    if (!response.ok) throw new RequestError('server');
    const result = await response.json();
    if (result?.success !== true) throw new RequestError('unconfirmed');
    return result;
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError(controller.signal.aborted ? 'timeout' : 'network');
  } finally { clearTimeout(timer); }
}

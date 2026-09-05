const PLUGIN_CLIENT = 'valuesignal-cursor-plugin/1.0.11';

const DEFAULT_API_BASE = 'https://app.valuesignal.ai';

/** Hosts the plugin will talk to over plain HTTP — local development only. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', '0.0.0.0']);

/** Production domain suffix. Anything else must be opted into explicitly. */
const ALLOWED_SUFFIX = '.valuesignal.ai';
const ALLOWED_APEX = 'valuesignal.ai';

function extraAllowedHosts() {
  // Escape hatch for self-hosted / staging deployments. Comma-separated
  // hostnames, e.g. VALUESIGNAL_API_ALLOWED_HOSTS="vs.internal.acme.com".
  return (process.env.VALUESIGNAL_API_ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * S4: validate VALUESIGNAL_API_BASE before any credential is attached to a
 * request. The MCP env is editable by anything that can write the workspace's
 * mcp.json, so an unvalidated base URL is a bearer-token exfiltration path:
 * point it at http://attacker.example and the plugin posts the user's PAT
 * there in an Authorization header, in cleartext.
 *
 * Rules:
 *   - must parse as a URL
 *   - http:// only for loopback hosts
 *   - https:// otherwise, and the host must be valuesignal.ai, a subdomain of
 *     it, or explicitly listed in VALUESIGNAL_API_ALLOWED_HOSTS
 */
export function assertAllowedApiBase(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      `VALUESIGNAL_API_BASE is not a valid URL: ${JSON.stringify(raw)}. ` +
        `Remove it to use the default (${DEFAULT_API_BASE}).`
    );
  }

  const host = url.hostname.toLowerCase();
  const isLocal = LOCAL_HOSTS.has(host);

  if (url.protocol === 'http:') {
    if (!isLocal) {
      throw new Error(
        `VALUESIGNAL_API_BASE must use https:// (got ${url.protocol}//${host}). ` +
          'Plain HTTP would send your API token in cleartext. ' +
          'http:// is permitted only for localhost during development.'
      );
    }
    return url;
  }

  if (url.protocol !== 'https:') {
    throw new Error(
      `VALUESIGNAL_API_BASE must use https:// (got ${url.protocol}). ` +
        `Remove it to use the default (${DEFAULT_API_BASE}).`
    );
  }

  const allowed =
    isLocal ||
    host === ALLOWED_APEX ||
    host.endsWith(ALLOWED_SUFFIX) ||
    extraAllowedHosts().includes(host);

  if (!allowed) {
    throw new Error(
      `VALUESIGNAL_API_BASE points at an unrecognized host (${host}). ` +
        'The plugin sends your API token to this address, so it will only talk to ' +
        `${ALLOWED_APEX} by default. If this host is intentional (self-hosted or ` +
        `staging), add it to VALUESIGNAL_API_ALLOWED_HOSTS.`
    );
  }

  return url;
}

export function getApiBase() {
  const raw = (process.env.VALUESIGNAL_API_BASE || DEFAULT_API_BASE).trim();
  assertAllowedApiBase(raw);
  return raw.replace(/\/$/, '').replace(/\/api$/, '');
}

export function getJwt() {
  return (
    process.env.VALUESIGNAL_JWT_TOKEN?.trim() ||
    process.env.VALUESIGNAL_JWT?.trim() ||
    ''
  );
}

export function getPluginClientHeader() {
  return PLUGIN_CLIENT;
}

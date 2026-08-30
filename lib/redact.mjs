/**
 * Client-side credential redaction (B3, client half).
 *
 * Runs on the developer's machine BEFORE a capture is serialized, so a secret
 * that appears in a prompt or an agent response never crosses the network at
 * all. The server applies the same classes again in
 * mcp-server/src/utils/captureSanitizer.ts — that is defence in depth, not
 * redundancy: this file is the only layer that protects a secret from ever
 * leaving the machine.
 *
 * KEEP IN SYNC with captureSanitizer.ts. This plugin ships as its own public
 * repo, so the patterns are duplicated deliberately rather than imported.
 *
 * Scope note: credentials only. PII (email / phone / SSN / card) is left to
 * the server, which already redacts it before persistence; doing it twice here
 * would strip content the user expects to be scored without adding protection.
 */

const PRIVATE_KEY_PATTERN =
  /-----BEGIN (?:[A-Z0-9 ]{0,32} )?PRIVATE KEY(?: BLOCK)?-----[\s\S]{0,16384}?-----END (?:[A-Z0-9 ]{0,32} )?PRIVATE KEY(?: BLOCK)?-----/g;

const API_KEY_PATTERN = new RegExp(
  [
    'sk-ant-[A-Za-z0-9_-]{16,256}',
    'sk-proj-[A-Za-z0-9_-]{16,256}',
    'sk-[A-Za-z0-9]{20,256}',
    'AIza[A-Za-z0-9_-]{30,64}',
    'ya29\\.[A-Za-z0-9_-]{20,512}',
    '(?:AKIA|ASIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA)[A-Z0-9]{16}',
    'gh[pousr]_[A-Za-z0-9]{20,255}',
    'github_pat_[A-Za-z0-9_]{20,255}',
    'glpat-[A-Za-z0-9_-]{16,64}',
    'xox[abprs]-[A-Za-z0-9-]{10,255}',
    'xapp-[0-9]-[A-Za-z0-9-]{10,255}',
    '(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,255}',
    'SG\\.[A-Za-z0-9_-]{16,64}\\.[A-Za-z0-9_-]{16,64}',
    'npm_[A-Za-z0-9]{30,64}',
    'hf_[A-Za-z0-9]{20,64}',
    'dop_v1_[a-f0-9]{32,128}',
    'shpat_[a-fA-F0-9]{32}',
    'vs_pat_[A-Za-z0-9_-]{16,255}',
  ].join('|'),
  'g'
);

const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]{10,4096}\.[A-Za-z0-9_-]{10,8192}(?:\.[A-Za-z0-9_-]{0,4096})?/g;

const AUTH_HEADER_PATTERN =
  /\b(authorization|proxy-authorization|x-api-key|x-auth-token|x-access-token|api[_-]?key|apikey)(\s*["']?\s*[:=]\s*["']?\s*)(?:(bearer|basic|token|apikey)\s+)?([A-Za-z0-9._\-+/=]{8,4096})/gi;

const CONNECTION_STRING_PATTERN =
  /\b([a-zA-Z][a-zA-Z0-9+.-]{1,20}:\/\/)([^\s:@/]{1,128}):([^\s@/]{1,256})@/g;

const ASSIGNMENT_PATTERN =
  /(?<![\w-])([A-Za-z][A-Za-z0-9_.-]{0,63})(\s*["']?\s*(?:=>|:=|[:=])\s*["'`]?)([^\s"'`,;)}\]]{12,512})/g;

const SECRET_KEY_NAME =
  /(?:api[_-]?key|apikey|secret|token|password|passwd|pwd|credential|access[_-]?key|private[_-]?key|auth[_-]?key|client[_-]?secret|session[_-]?key|signing[_-]?key|encryption[_-]?key|master[_-]?key|webhook[_-]?secret)/i;

const ENV_SECRET_KEY_NAME =
  /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*_(?:KEY|SECRET|TOKEN|PASSWORD|PASS|PWD|CREDENTIAL|CREDENTIALS|DSN|URI|URL)$/;

const PLACEHOLDER_VALUE_PATTERN =
  /^(?:x{3,}|\*{3,}|\.{3,}|-{3,}|_{3,}|<.{0,120}>|\$\{.{0,120}\}?|\$[A-Z_][A-Z0-9_]{0,60}|process\.env\..{0,80}|import\.meta\.env\..{0,80}|your[_-]?.{0,60}|my[_-]?.{0,60}|some[_-]?.{0,60}|example.{0,60}|placeholder.{0,60}|changeme.{0,60}|todo.{0,60}|redacted.{0,60}|null|undefined|true|false|none|n\/a)$/i;

const REDACTION_MARKER_PATTERN = /^\[[A-Z_]+_REDACTED/;
const NUMERIC_VALUE_PATTERN = /^\d+(?:\.\d+)?$/;

function looksLikeSecretKeyName(key) {
  if (ENV_SECRET_KEY_NAME.test(key)) {
    if (/_(?:URI|URL|DSN)$/.test(key)) return false;
    return true;
  }
  return SECRET_KEY_NAME.test(key);
}

function cloneRegex(pattern) {
  return new RegExp(pattern.source, pattern.flags);
}

/**
 * @param {string|null|undefined} input
 * @returns {{ text: string|null, count: number }}
 */
export function redactCredentials(input) {
  if (input === null || input === undefined) return { text: null, count: 0 };
  if (typeof input !== 'string') return { text: input, count: 0 };

  let count = 0;
  let text = input;

  const swap = (pattern, replacement) => {
    text = text.replace(cloneRegex(pattern), () => {
      count += 1;
      return replacement;
    });
  };

  swap(PRIVATE_KEY_PATTERN, '[PRIVATE_KEY_REDACTED]');
  swap(API_KEY_PATTERN, '[API_KEY_REDACTED]');
  swap(JWT_PATTERN, '[JWT_REDACTED]');

  text = text.replace(cloneRegex(AUTH_HEADER_PATTERN), (match, name, sep, scheme, value) => {
    if (REDACTION_MARKER_PATTERN.test(value)) return match;
    if (PLACEHOLDER_VALUE_PATTERN.test(value)) return match;
    if (NUMERIC_VALUE_PATTERN.test(value)) return match;
    if (/^https?:\/\//i.test(value)) return match;
    count += 1;
    return `${name}${sep}${scheme ? `${scheme} ` : ''}[AUTH_REDACTED]`;
  });

  text = text.replace(cloneRegex(CONNECTION_STRING_PATTERN), (_match, scheme) => {
    count += 1;
    return `${scheme}[CREDENTIALS_REDACTED]@`;
  });

  text = text.replace(cloneRegex(ASSIGNMENT_PATTERN), (match, key, sep, value) => {
    if (!looksLikeSecretKeyName(key)) return match;
    if (REDACTION_MARKER_PATTERN.test(value)) return match;
    if (PLACEHOLDER_VALUE_PATTERN.test(value)) return match;
    if (NUMERIC_VALUE_PATTERN.test(value)) return match;
    if (/^https?:\/\//i.test(value)) return match;
    count += 1;
    return `${key}${sep}[SECRET_REDACTED]`;
  });

  return { text, count };
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Walk any JSON-shaped value, redacting credential strings and any string
 * value sitting under a secret-named key.
 * @returns {{ value: any, count: number }}
 */
export function redactCredentialsDeep(value) {
  let count = 0;

  const walk = (node) => {
    if (typeof node === 'string') {
      const result = redactCredentials(node);
      count += result.count;
      return result.text;
    }
    if (Array.isArray(node)) return node.map(walk);
    if (isPlainObject(node)) {
      const out = {};
      for (const [key, entry] of Object.entries(node)) {
        if (
          typeof entry === 'string' &&
          looksLikeSecretKeyName(key) &&
          entry.length >= 8 &&
          !REDACTION_MARKER_PATTERN.test(entry) &&
          !PLACEHOLDER_VALUE_PATTERN.test(entry) &&
          !NUMERIC_VALUE_PATTERN.test(entry)
        ) {
          count += 1;
          out[key] = '[SECRET_REDACTED]';
          continue;
        }
        out[key] = walk(entry);
      }
      return out;
    }
    return node;
  };

  const result = walk(value);
  return { value: result, count };
}

import { randomUUID } from 'crypto';
import { getApiBase, getJwt, getPluginClientHeader } from './config.mjs';

export function buildCaptureEvent({
  userId,
  workspaceId,
  sessionId,
  messageIndex = 0,
  userPrompt,
  systemResponse,
  model = null,
  provider = 'cursor',
  projectRef = null,
}) {
  const sid = sessionId || `cursor-${randomUUID()}`;
  return {
    eventId: `evt_${randomUUID()}`,
    idempotencyKey: `cursor-${randomUUID()}`,
    traceId: `trace_${randomUUID()}`,
    source: 'cursor',
    sourceSubtype: 'cursor-marketplace',
    workspaceId,
    userId,
    sessionId: sid,
    sessionOrigin: 'client-provided',
    eventType: 'message.captured',
    messageIndex,
    capturedAt: new Date().toISOString(),
    payload: {
      userPrompt: userPrompt || '',
      systemResponse: systemResponse || '',
      model,
      provider,
      conversationId: sid,
      // Repo identity declared by tooling at the moment of work: binds this
      // capture to the workspace's project for project-scoped certifications.
      ...(projectRef ? { projectRef } : {}),
      interactionMetadata: {
        source_type: 'chat_page',
        operatorIntent: 'user_authored',
        validationMode: 'system_derived',
      },
    },
    metadata: {
      client: getPluginClientHeader(),
    },
  };
}

export async function postCursorIngress(event) {
  const jwt = getJwt();
  if (!jwt) {
    throw new Error(
      'VALUESIGNAL_JWT_TOKEN is not set. Generate a token at https://app.valuesignal.ai/account-settings.html (Integrations & API tokens) and paste it into MCP env (see plugin README).'
    );
  }

  const apiBase = getApiBase();
  const rawPayload = JSON.stringify(event);
  const res = await fetch(`${apiBase}/api/ingress/cursor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      'x-vs-plugin-client': getPluginClientHeader(),
    },
    body: rawPayload,
  });

  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    const msg = body?.error || body?.reason || res.statusText || `HTTP ${res.status}`;
    throw new Error(`Ingress failed (${res.status}): ${msg}`);
  }

  return body;
}

/**
 * Mint a proof-of-work certification (vs.proof.v1). Returns the server body:
 * certId, verifyUrl, publicUrl, expiry, and the `.valuesignal/` file contents
 * for the agent to write into the candidate's repo.
 */
export async function postProofCert({ scope, projectRef } = {}) {
  const jwt = getJwt();
  if (!jwt) {
    throw new Error(
      'VALUESIGNAL_JWT_TOKEN is not set. Generate a token at https://app.valuesignal.ai/account-settings.html (Integrations & API tokens) and paste it into MCP env (see plugin README).'
    );
  }

  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/api/proof/cert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      'x-vs-plugin-client': getPluginClientHeader(),
    },
    body: JSON.stringify(scope === 'project' && projectRef ? { scope, projectRef } : {}),
  });

  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    const msg = body?.message || body?.error || body?.reason || res.statusText || `HTTP ${res.status}`;
    throw new Error(`Proof certification failed (${res.status}): ${msg}`);
  }

  return body;
}

export function decodeJwtSub(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');
  const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4);
  const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  if (!payload?.sub) throw new Error('JWT missing sub');
  return payload.sub;
}

function looksLikeJwt(token) {
  return typeof token === 'string' && token.split('.').length === 3 && !token.startsWith('vs_pat_');
}

// Per-process cache so a scoped PAT only needs one whoami round-trip.
const userIdCache = new Map();

/**
 * Resolve the ValueSignal user id for the configured credential.
 *   - Session JWT: decoded locally (no network), preserving existing behavior.
 *   - Scoped PAT (`vs_pat_…`): resolved via the ingress `whoami` endpoint,
 *     since a PAT carries no decodable claims.
 */
export async function resolveUserId(token) {
  if (looksLikeJwt(token)) {
    return decodeJwtSub(token);
  }

  if (userIdCache.has(token)) {
    return userIdCache.get(token);
  }

  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/api/ingress/whoami`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-vs-plugin-client': getPluginClientHeader(),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Could not resolve account from token (${res.status}): ${text || res.statusText}`);
  }
  const body = await res.json().catch(() => ({}));
  if (!body?.userId) throw new Error('whoami did not return a userId');
  userIdCache.set(token, body.userId);
  return body.userId;
}

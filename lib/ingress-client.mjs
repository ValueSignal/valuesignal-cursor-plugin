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
      'VALUESIGNAL_JWT_TOKEN is not set. Log in at https://app.valuesignal.ai and paste your token into MCP env (see plugin README).'
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

export function decodeJwtSub(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');
  const payloadB64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4);
  const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  if (!payload?.sub) throw new Error('JWT missing sub');
  return payload.sub;
}

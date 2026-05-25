#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { buildCaptureEvent, decodeJwtSub, postCursorIngress } from '../lib/ingress-client.mjs';
import { getApiBase, getJwt } from '../lib/config.mjs';

const server = new Server(
  { name: 'valuesignal', version: '1.0.2' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'valuesignal_auth_status',
      description:
        'Check whether VALUESIGNAL_JWT_TOKEN is configured and which API base is used.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'valuesignal_capture_turn',
      description:
        'Send one AI turn (user prompt + assistant response) to ValueSignal ingress for scoring.',
      inputSchema: {
        type: 'object',
        properties: {
          userPrompt: { type: 'string', description: 'User message text' },
          systemResponse: { type: 'string', description: 'Assistant message text' },
          sessionId: {
            type: 'string',
            description: 'Optional stable session id for this conversation',
          },
          messageIndex: {
            type: 'number',
            description: 'Turn index within session (default 0)',
          },
        },
        required: ['userPrompt', 'systemResponse'],
      },
    },
    {
      name: 'valuesignal_dashboard_url',
      description: 'Return the URL to open your ValueSignal logbook in the browser.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'valuesignal_auth_status') {
    const jwt = getJwt();
    const apiBase = getApiBase();
    if (!jwt) {
      return {
        content: [
          {
            type: 'text',
            text: [
              'Not authenticated.',
              '1. Log in at https://app.valuesignal.ai/login.html',
              '2. DevTools console: sessionStorage.getItem("valueSignalToken")',
              '3. Cursor Settings → MCP → valuesignal → env VALUESIGNAL_JWT_TOKEN',
            ].join('\n'),
          },
        ],
      };
    }
    let userId = 'unknown';
    try {
      userId = decodeJwtSub(jwt);
    } catch {
      /* ignore */
    }
    return {
      content: [
        {
          type: 'text',
          text: `Configured. API: ${apiBase}\nUser id: ${userId}`,
        },
      ],
    };
  }

  if (name === 'valuesignal_dashboard_url') {
    const base = getApiBase().replace(/\/api$/, '');
    const web =
      base.includes('app.valuesignal.ai') || base.includes('valuesignal.ai')
        ? 'https://app.valuesignal.ai/user-dashboard.html'
        : `${base}/user-dashboard.html`;
    return {
      content: [{ type: 'text', text: web }],
    };
  }

  if (name === 'valuesignal_capture_turn') {
    const jwt = getJwt();
    const userId = decodeJwtSub(jwt);
    const event = buildCaptureEvent({
      userId,
      workspaceId: userId,
      sessionId: args?.sessionId,
      messageIndex: Number.isFinite(args?.messageIndex) ? args.messageIndex : 0,
      userPrompt: String(args?.userPrompt || ''),
      systemResponse: String(args?.systemResponse || ''),
    });
    const result = await postCursorIngress(event);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ok: true,
              status: result.accepted ? 'accepted' : result.status || result,
              duplicate: Boolean(result.duplicate),
              traceId: result.traceId,
              sessionId: event.sessionId,
              capturedAt: event.capturedAt,
              evidenceType: result.evidenceType,
              trustTier: result.trustTier,
              scoresPersisted: result.scoresPersisted ?? null,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { buildCaptureEvent, resolveUserId, postCursorIngress, postProofCert } from '../lib/ingress-client.mjs';
import { getApiBase, getJwt } from '../lib/config.mjs';
import { detectWorkspaceProjectRef, normalizeProjectRef } from '../lib/project-ref.mjs';

const server = new Server(
  { name: 'valuesignal', version: '1.0.7' },
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
    {
      name: 'valuesignal_build_proof',
      description:
        'Mint a verifiable ValueSignal Proof of Work certification (vs.proof.v1) from your captured AI work. Returns the .valuesignal/ folder file contents to commit into a repo plus a public verify URL a screening partner can check. By default certifies the whole profile; pass scope "project" to certify only work bound to this workspace\u2019s repo (detected from the git origin remote) — the cert then discloses only project-relevant signal and the verifier enforces repo identity.',
      inputSchema: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            enum: ['whole_profile', 'project'],
            description: 'Certification scope (default whole_profile)',
          },
          projectRef: {
            type: 'string',
            description:
              'Repo to bind a project-scoped cert to (git remote URL or host/owner/repo). Defaults to this workspace\u2019s origin remote.',
          },
        },
      },
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
              '1. Log in at https://app.valuesignal.ai',
              '2. Account Settings → Integrations & API tokens → Generate token',
              '3. Cursor Settings → MCP → valuesignal → env VALUESIGNAL_JWT_TOKEN',
            ].join('\n'),
          },
        ],
      };
    }
    let userId = 'unknown';
    try {
      userId = await resolveUserId(jwt);
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
    const userId = await resolveUserId(jwt);
    const projectRef = await detectWorkspaceProjectRef();
    const event = buildCaptureEvent({
      userId,
      workspaceId: userId,
      sessionId: args?.sessionId,
      messageIndex: Number.isFinite(args?.messageIndex) ? args.messageIndex : 0,
      userPrompt: String(args?.userPrompt || ''),
      systemResponse: String(args?.systemResponse || ''),
      projectRef,
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
              projectRef: event.payload.projectRef || null,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (name === 'valuesignal_build_proof') {
    let scope = args?.scope === 'project' ? 'project' : 'whole_profile';
    let projectRef = null;
    if (scope === 'project') {
      projectRef = normalizeProjectRef(args?.projectRef) || (await detectWorkspaceProjectRef());
      if (!projectRef) {
        return {
          content: [
            {
              type: 'text',
              text: 'Project-scoped certification needs a repo identity, but this workspace has no git origin remote and no projectRef was provided. Pass projectRef (e.g. github.com/owner/repo) or run from a repo with a remote — or mint with scope "whole_profile".',
            },
          ],
        };
      }
    }
    const result = await postProofCert({ scope, projectRef });
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ok: true,
              certId: result.certId,
              schemaVersion: result.schemaVersion,
              issuedAt: result.issuedAt,
              expiresAt: result.expiresAt,
              verifyUrl: result.verifyUrl,
              publicUrl: result.publicUrl,
              scope: result.proof?.scope || scope,
              project: result.proof?.project || null,
              summary: {
                proofType: result.proof?.proofType,
                overallSignal: result.proof?.overallSignal,
                sessions: result.proof?.sessions,
                signals: result.proof?.signals,
                domains: (result.proof?.topDomains || []).map((d) => d.label),
              },
              files: result.files,
              nextStep:
                'Write each entry in `files` to the repo (paths are relative to the repo root), then commit VERIFICATION.md and the .valuesignal/ folder. The verifyUrl lets any screening partner confirm this certification is authentic, unrevoked, and fresh.',
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

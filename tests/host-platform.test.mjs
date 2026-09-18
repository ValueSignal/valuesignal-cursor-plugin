import assert from 'node:assert/strict';
import { getPluginClientHeader, getPluginHost } from '../lib/config.mjs';
import { buildCaptureEvent } from '../lib/ingress-client.mjs';

const originalHost = process.env.VALUESIGNAL_HOST;
const originalClaudeCode = process.env.CLAUDECODE;
const originalCodexThreadId = process.env.CODEX_THREAD_ID;

function setOptionalEnv(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function setHostEnvironment(host, claudeCode, codexThreadId) {
  setOptionalEnv('VALUESIGNAL_HOST', host);
  setOptionalEnv('CLAUDECODE', claudeCode);
  setOptionalEnv('CODEX_THREAD_ID', codexThreadId);
}

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`PASS ${name}`);
}

try {
  check('Cursor is the backward-compatible default host', () => {
    setHostEnvironment(undefined, undefined);
    assert.equal(getPluginHost(), 'cursor');
    assert.equal(getPluginClientHeader(), 'valuesignal-plugin/1.0.14 (cursor)');
  });

  check('Claude Code is detected from its process environment', () => {
    setHostEnvironment(undefined, '1');
    assert.equal(getPluginHost(), 'claude-code');
  });

  check('Codex is detected from its task environment', () => {
    setHostEnvironment(undefined, undefined, 'thread-1');
    assert.equal(getPluginHost(), 'codex');
    assert.equal(getPluginClientHeader(), 'valuesignal-plugin/1.0.14 (codex)');
  });

  check('an explicit known host takes precedence', () => {
    setHostEnvironment('codex', '1');
    assert.equal(getPluginHost(), 'codex');
    assert.equal(getPluginClientHeader(), 'valuesignal-plugin/1.0.14 (codex)');
  });

  check('unknown explicit hosts cannot escape the supported platform set', () => {
    setHostEnvironment('unknown-agent', undefined);
    assert.equal(getPluginHost(), 'cursor');
  });

  check('capture events keep the shared wire route and declare the actual host', () => {
    setHostEnvironment('claude-code', undefined);
    const event = buildCaptureEvent({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      userPrompt: 'Plan the migration',
      systemResponse: 'Here is the plan',
    });

    assert.equal(event.source, 'cursor');
    assert.equal(event.host, 'claude-code');
    assert.equal(event.sourceSubtype, 'claude-code-marketplace');
    assert.equal(event.payload.provider, 'claude-code');
    assert.match(event.sessionId, /^claude-code-/);
    assert.match(event.idempotencyKey, /^claude-code-/);
    assert.equal(event.metadata.client, 'valuesignal-plugin/1.0.14 (claude-code)');
    assert.equal('validationMode' in event.payload.interactionMetadata, false);
  });
} finally {
  setOptionalEnv('VALUESIGNAL_HOST', originalHost);
  setOptionalEnv('CLAUDECODE', originalClaudeCode);
  setOptionalEnv('CODEX_THREAD_ID', originalCodexThreadId);
}

console.log(`\n${passed} host-platform tests passed.`);

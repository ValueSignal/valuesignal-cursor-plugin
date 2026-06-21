# ValueSignal for Cursor

Turn your real Cursor AI work into a verified builder profile — measured skill signals in your logbook, private by default, shareable as proof of work.

## What you're building

Every turn you capture is evidence. Over a few real sessions that evidence compounds into a profile that reflects how you actually work with AI:

1. **Capture** — send meaningful AI turns to ValueSignal as you work (manually via the `valuesignal_capture_turn` tool).
2. **Signals accrue** — each capture is scored into skill and behavior signals. Individual turns score on capture; the profile gets meaningful as volume builds across multiple real sessions, so capture regularly rather than once.
3. **Your Domain Signal + skill profile** — signals roll up into your strongest domains and a skill signature you can see in the logbook.
4. **Proof of Work** — when you're ready, share a public Proof of Work artifact built from that verified activity.

Private by default: nothing is shared until you choose to. Recruiter discovery is invite-only today, so building your profile now is about owning a verifiable record of your AI work — not broadcasting it.

## Requirements

- ValueSignal account (https://app.valuesignal.ai)
- Node.js 18+
- Production API must have `INGRESS_CURSOR_PLUGIN_JWT_ONLY=true` (ValueSignal server env)

## Setup

Use a scoped API token so you don't have to re-paste credentials. It only
permits capturing AI activity (not account/billing access) and is revocable.

1. **Log in** at https://app.valuesignal.ai
2. **Account Settings → Integrations & API tokens → Generate token**, then copy
   the `vs_pat_…` value (shown once)
3. **Cursor → Settings → Features → Model Context Protocol → valuesignal → Edit**
4. Add env var:
   - `VALUESIGNAL_JWT_TOKEN` = paste the token
   - Optional: `VALUESIGNAL_API_BASE` = `https://app.valuesignal.ai`
5. Enable the MCP server and reload Cursor (**Developer: Reload Window**)

> A short-lived browser session token (`sessionStorage.getItem('valueSignalToken')`)
> still works as a fallback, but it expires and must be re-pasted. Prefer the API token.

## MCP tools

| Tool | Purpose |
|------|---------|
| `valuesignal_auth_status` | Verify JWT and API base |
| `valuesignal_capture_turn` | Send one user/assistant turn to ingress |
| `valuesignal_dashboard_url` | Logbook URL |

## Local test (plugin folder)

```bash
cd cursor-plugin/valuesignal
npm install
VALUESIGNAL_JWT_TOKEN=... node mcp/server.mjs
```

## Security and data handling

- **Open source in this repo:** MCP server, skills, rules, and commands only. The ValueSignal API and scoring stack are proprietary and not published here.
- **Network:** The MCP server sends HTTPS requests only to `VALUESIGNAL_API_BASE` (default `https://app.valuesignal.ai`) when the user runs capture or auth tools. No other outbound endpoints.
- **Credentials:** Users set `VALUESIGNAL_JWT_TOKEN` in Cursor MCP settings — preferably a scoped, revocable API token (`vs_pat_…`) generated in Account Settings, which is limited to activity capture (no account/billing access). A short-lived browser session token also works as a fallback. Tokens are not stored in the repository.
- **Capture:** Users control what is submitted via `valuesignal_capture_turn`. The bundled rule blocks exfiltration of API keys, passwords, and `.env` content.
- **Details:** See [SECURITY.md](./SECURITY.md).

## Privacy

Do not capture secrets, tokens, or credentials. See `rules/valuesignal-privacy.mdc`.

## CI

GitHub Actions runs `npm ci` and `node scripts/validate-plugin.mjs` on every push to `main`.

## License

MIT (plugin package only). ValueSignal scoring backend and capture semantics are proprietary.

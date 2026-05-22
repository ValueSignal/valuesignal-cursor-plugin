# ValueSignal for Cursor

Capture AI-assisted work from Cursor into [ValueSignal](https://valuesignal.ai) — measured signals in your logbook, private by default.

## Requirements

- ValueSignal account (https://app.valuesignal.ai)
- Node.js 18+
- Production API must have `INGRESS_CURSOR_PLUGIN_JWT_ONLY=true` (ValueSignal server env)

## Setup

1. **Log in** at https://app.valuesignal.ai/login.html
2. Browser console:
   ```javascript
   sessionStorage.getItem('valueSignalToken')
   ```
3. **Cursor → Settings → Features → Model Context Protocol → valuesignal → Edit**
4. Add env var:
   - `VALUESIGNAL_JWT_TOKEN` = paste token
   - Optional: `VALUESIGNAL_API_BASE` = `https://app.valuesignal.ai`
5. Enable the MCP server and reload Cursor (**Developer: Reload Window**)

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
- **Credentials:** Users set `VALUESIGNAL_JWT_TOKEN` in Cursor MCP settings (from their ValueSignal login). Tokens are not stored in the repository.
- **Capture:** Users control what is submitted via `valuesignal_capture_turn`. The bundled rule blocks exfiltration of API keys, passwords, and `.env` content.
- **Details:** See [SECURITY.md](./SECURITY.md).

## Privacy

Do not capture secrets, tokens, or credentials. See `rules/valuesignal-privacy.mdc`.

## CI

GitHub Actions runs `npm ci` and `node scripts/validate-plugin.mjs` on every push to `main`.

## License

MIT (plugin package only). ValueSignal scoring backend and capture semantics are proprietary.

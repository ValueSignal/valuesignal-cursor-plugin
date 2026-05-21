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

## Privacy

Do not capture secrets, tokens, or credentials. See `rules/valuesignal-privacy.mdc`.

## License

MIT (plugin package only). ValueSignal scoring backend and capture semantics are proprietary.

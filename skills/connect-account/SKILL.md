---
name: connect-account
description: Help the user connect ValueSignal to Cursor by configuring VALUESIGNAL_JWT_TOKEN for the valuesignal MCP server. Use when the user asks to link ValueSignal, set up the plugin, or fix auth errors.
---

# Connect ValueSignal

1. Ask the user to log in at https://app.valuesignal.ai/login.html
2. In the browser console, run: `sessionStorage.getItem('valueSignalToken')`
3. In Cursor: **Settings → Features → MCP → valuesignal → Edit**
4. Add environment variable: `VALUESIGNAL_JWT_TOKEN` = the token (no quotes in UI if possible)
5. Restart MCP or run **Developer: Reload Window**
6. Run the MCP tool `valuesignal_auth_status` to confirm

Never paste tokens into chat logs or commit them to git.

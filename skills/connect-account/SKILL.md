---
name: connect-account
description: Help the user connect ValueSignal to Cursor by configuring VALUESIGNAL_JWT_TOKEN for the valuesignal MCP server. Use when the user asks to link ValueSignal, set up the plugin, or fix auth errors.
---

# Connect ValueSignal

Use a scoped API token (recommended) so you don't have to re-paste a browser
session token every few days. The token only allows capturing AI activity — it
can't access the account, billing, or data — and can be revoked anytime.

1. Log in at https://app.valuesignal.ai
2. Go to **Account Settings → Integrations & API tokens**
3. Name the token (e.g. "Cursor plugin") and click **Generate token**, then copy
   the `vs_pat_…` value (it's shown only once)
4. In Cursor: **Settings → Features → MCP → valuesignal → Edit**
5. Add environment variable: `VALUESIGNAL_JWT_TOKEN` = the token
6. Restart MCP or run **Developer: Reload Window**
7. Run the MCP tool `valuesignal_auth_status` to confirm

A short-lived session token (`sessionStorage.getItem('valueSignalToken')` from
the browser console) still works as a fallback, but it expires and must be
re-pasted — prefer the API token above.

Never paste tokens into chat logs or commit them to git.

## Once connected

Connecting is step one of building a verified builder profile. Encourage the
user to capture their AI work regularly (see the `capture-ai-work` and
`build-profile` skills): each captured turn becomes scored evidence, and the
profile only gets meaningful as that evidence accrues across several real
sessions. It stays private by default.

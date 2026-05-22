# Security — ValueSignal Cursor Plugin

## Scope

This repository contains the **open-source Cursor marketplace plugin** only (MCP client, skills, rules, commands). The ValueSignal scoring backend, web application, and capture pipeline are **not** included here.

## Network behavior

| Direction | Endpoint | When |
|-----------|----------|------|
| Outbound HTTPS | `VALUESIGNAL_API_BASE` (default `https://app.valuesignal.ai`) | Only when the user invokes MCP tools that post capture events or when checking auth |

No other hosts are contacted by this package. There is no telemetry SDK in the plugin repo.

## Secrets

- **User JWT** is read from the MCP environment variable `VALUESIGNAL_JWT_TOKEN` (configured by the user in Cursor settings).
- Secrets are **never** committed to this repository.
- The privacy rule (`rules/valuesignal-privacy.mdc`) instructs the agent not to send API keys, passwords, or `.env` contents via capture tools.

## Dependencies

- Runtime dependency: `@modelcontextprotocol/sdk` (MCP protocol).
- Install via `npm ci` using the committed `package-lock.json`.

## Reporting

Report security issues to **security@valuesignal.ai** or **support@valuesignal.ai**.

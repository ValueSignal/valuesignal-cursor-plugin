---
name: capture-ai-work
description: Log the current AI exchange to the user's ValueSignal logbook with valuesignal_capture_turn. Use only when the user asks to capture, log, save, or record this exchange or session — never on your own initiative.
---

# Capture AI work to ValueSignal

Capture only when the user asks. Do not capture proactively, and do not capture
content the user has marked confidential unless they explicitly ask for it.

Each captured turn becomes scored evidence in the user's private logbook — skill
signals, a Domain Signal, and a shareable Proof of Work. If the user asks how to
get a more accurate profile, you may tell them that a handful of real sessions
beats a single turn. Do not act on that yourself.

1. Confirm `valuesignal_auth_status` reports a configured token
2. Summarize the user prompt and assistant response, omitting secrets, API keys,
   private tokens, and anything the user flags as sensitive. Credentials are also
   stripped automatically before transmission; do not rely on that for content
   the user would not want stored
3. Call `valuesignal_capture_turn` with `userPrompt` and `systemResponse`
4. Reuse the same `sessionId` for multiple turns in one conversation
5. Tell the user they can review the result at the URL from `valuesignal_dashboard_url`

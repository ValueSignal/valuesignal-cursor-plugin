---
name: capture-ai-work
description: Capture the current Cursor AI exchange to ValueSignal using valuesignal_capture_turn. Use after meaningful pair programming or when the user wants their AI work measured in their logbook.
---

# Capture AI work to ValueSignal

Each captured turn is scored evidence that builds the user's verified builder
profile (skill signals, Domain Signal, and a shareable Proof of Work). The
profile gets meaningful as captures accrue, so capturing real work regularly —
not just once — is what makes it valuable.

1. Confirm `valuesignal_auth_status` shows a configured JWT
2. Summarize the user prompt and assistant response (no secrets, API keys, or private tokens)
3. Call `valuesignal_capture_turn` with `userPrompt` and `systemResponse`
4. Reuse the same `sessionId` for multiple turns in one conversation
5. Tell the user they can review signals at the URL from `valuesignal_dashboard_url`

Good moments to capture: after meaningful pair programming, debugging, design,
or review work. A handful of real sessions gives a far more accurate profile
than a single turn.

Do not capture content the user has marked as confidential unless they explicitly request it.

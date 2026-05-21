---
name: capture-ai-work
description: Capture the current Cursor AI exchange to ValueSignal using valuesignal_capture_turn. Use after meaningful pair programming or when the user wants their AI work measured in their logbook.
---

# Capture AI work to ValueSignal

1. Confirm `valuesignal_auth_status` shows a configured JWT
2. Summarize the user prompt and assistant response (no secrets, API keys, or private tokens)
3. Call `valuesignal_capture_turn` with `userPrompt` and `systemResponse`
4. Reuse the same `sessionId` for multiple turns in one conversation
5. Tell the user they can review signals at the URL from `valuesignal_dashboard_url`

Do not capture content the user has marked as confidential unless they explicitly request it.

---
name: build-profile
description: Explain and guide building a ValueSignal builder profile from captured Cursor AI work. Use when the user asks what ValueSignal builds, how to grow their profile or proof of work, how their AI activity becomes skills, or when their signals/profile will be meaningful.
---

# Build your ValueSignal builder profile

ValueSignal turns the AI work you actually do in Cursor into a verified builder
profile. Nothing is self-reported — every signal traces back to captured work.

## The arc

1. **Connect** — configure the `VALUESIGNAL_JWT_TOKEN` (see the `connect-account`
   skill). Prefer a scoped `vs_pat_…` API token.
2. **Capture** — send meaningful AI turns with `valuesignal_capture_turn` (see the
   `capture-ai-work` skill). Each turn is scored evidence.
3. **Signals accrue** — captures roll up into skill signals, a skill signature,
   and your strongest **Domain Signals**. Individual turns score on capture; the
   overall profile sharpens as volume grows.
4. **Proof of Work** — once there's enough verified activity, the user can share a
   public Proof of Work artifact from their logbook.

## How to guide the user

- **Set expectations honestly.** One capture is a data point, not a profile.
  Encourage capturing across several real sessions (debugging, building, design,
  review) before judging how the profile reads.
- **Make it a habit, not a chore.** Suggest capturing at natural stopping points
  after meaningful AI work, reusing one `sessionId` per conversation.
- **Point to the logbook.** Use `valuesignal_dashboard_url` so they can watch
  signals and Domain Signals build up over time.
- **Privacy first.** The profile is private by default; nothing is shared until
  they choose to generate and share a Proof of Work link.

## What to avoid claiming

- Do not promise recruiter outreach or guaranteed discovery — recruiter access
  is invite-only today. Frame the value as owning a verifiable, shareable record
  of real AI work, with sharing fully under the user's control.
- Never capture secrets, credentials, or content marked confidential.

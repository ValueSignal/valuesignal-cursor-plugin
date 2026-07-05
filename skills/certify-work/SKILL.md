---
name: certify-work
description: Mint a verifiable ValueSignal Proof of Work certification and commit it into the current repo as a .valuesignal/ folder. Use when the user wants to certify their AI work for a screening process, add proof of work to a repo, or generate a verification a recruiter or partner can check.
---

# Certify your work into the repo

This turns the user's captured ValueSignal evidence into a committable
certification (`vs.proof.v1`) that a screening partner can verify with one
unauthenticated HTTP GET — a proof step before a code-repo scan.

## Steps

1. Confirm auth with `valuesignal_auth_status`. If not configured, follow the
   `connect-account` skill first.
2. If the user just finished meaningful work in this session, offer to capture
   it first (`capture-ai-work` skill) so the certification reflects it.
3. Ask which scope the user wants (or infer from their phrasing):
   - **Whole profile** (default): call `valuesignal_build_proof` with no
     arguments. Attests their validated AI work overall.
   - **This repo / this project**: call `valuesignal_build_proof` with
     `{ "scope": "project" }`. The repo identity is detected from this
     workspace's git origin remote (pass `projectRef` explicitly to override).
     Claims then cover only work bound to this repo — captures made here via
     the plugin bind automatically; older threads can be assigned to the
     project from the ValueSignal logbook. Scoped disclosure is the point:
     the cert reveals only project-relevant signal.
   The tool mints the certification server-side and returns:
   - `files`: a root-level `VERIFICATION.md` (human-readable) and
     `.valuesignal/proof.json` (machine-readable) to write, paths relative to
     the repo root
   - `verifyUrl`: the public verification endpoint for this certificate
   - `publicUrl`: the live shareable Proof of Work page
   - `summary`: proof type, overall signal, sessions/signals, domains
4. Write each entry in `files` to the repo exactly as returned. Do not edit
   the contents — the certificate's `payloadHash` makes edits detectable.
5. Offer to commit both artifacts (e.g.
   `git add VERIFICATION.md .valuesignal && git commit -m "Add ValueSignal proof of work certification"`).
6. Tell the user their certification is valid through the returned
   `expiresAt` date and that anyone can confirm it at `verifyUrl`.

## Notes

- Minting requires at least one scored conversation; if the server returns
  `not_ready`, guide the user to capture work first.
- Minting enables the user's public share link (it reuses an existing link if
  one is already active). Mention this — the proof references their live page.
- Certificates expire after 90 days; re-run this skill to mint a fresh one
  before a new screening round.
- A whole-profile certification covers the holder's whole profile, not this
  specific repo — say so if asked. A project-scoped certification is bound to
  this repo's identity: verifiers check the cert sits in the repo it was
  minted for, so never copy a project cert into a different repository.
- If a project mint returns `not_ready`, the user has no scored work bound to
  this repo yet: capture work here first, or assign existing threads to the
  project in their logbook, or fall back to whole-profile scope.
- Never modify `proof.json` by hand; a tampered copy will fail the partner's
  hash comparison against the verify API.

# Specification

## Summary
**Goal:** Prevent WebRTC “connecting” stalls by making matchmaking non-trapping, adding persistent presence/matchmaking state, and improving timeout handling and diagnostics.

**Planned changes:**
- Update backend matchmaking API to return a safe “no peer available” result when no eligible peers exist, and keep explicit errors for not onboarded/not active.
- Implement stable, persistent backend state for online/active presence, waiting-to-match queue/pool, and active pairings, including join/leave/next/end flows.
- Add backend signaling/session cleanup and expiration rules to prevent stale signaling data from blocking new connection attempts.
- Fix frontend WebRTC timeout/retry flow so connection attempts fail visibly (instead of hanging) and reset to a recoverable state before retrying.
- Improve Matching page status messaging and add a toggleable diagnostics panel showing current WebRTC diagnostic fields.
- Add a conditional Motoko state migration (only if needed due to state layout changes) to preserve existing data across upgrades.

**User-visible outcome:** Users can reliably search for and connect to random peers without getting stuck on “connecting”; when no one is available or a connection times out, the UI shows a clear message and offers retry/next, with optional diagnostics for troubleshooting.

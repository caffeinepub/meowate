# Specification

## Summary
**Goal:** Reduce WebRTC matchmaking “failed to match” errors on restrictive networks by forcing voice calls to use TURN relay candidates only.

**Planned changes:**
- Update `frontend/src/hooks/useWebRTC.ts` so `RTCPeerConnection` is created with an `RTCConfiguration` that enforces TURN-only (relay-only) ICE (e.g., `iceTransportPolicy: "relay"`).
- Ensure connection diagnostics reflect relay usage during connection attempts (e.g., `usingTurnServer` becomes true when relay candidates are used).
- Preserve existing matchmaking connection timeout/error handling so the UI still exits “connecting” if a relay connection cannot be established.

**User-visible outcome:** Voice matchmaking is more reliable on restrictive networks (e.g., double NAT) by using TURN relays instead of attempting direct P2P connections.

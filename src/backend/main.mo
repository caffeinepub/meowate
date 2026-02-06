import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import OutCall "http-outcalls/outcall";
import Stripe "stripe/stripe";
import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Debug "mo:base/Debug";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Int "mo:base/Int";
import Array "mo:base/Array";

actor Meowate {
  // Authorization
  let accessControlState = AccessControl.initState();

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // Storage
  let storage = Storage.new();
  include MixinStorage(storage);

  // Data Types
  public type UserProfile = {
    name : Text;
    age : Nat;
    bio : Text;
    profilePicture : ?Storage.ExternalBlob;
    kycVerified : Bool;
    location : Text;
    preferences : UserPreferences;
    onboardingComplete : Bool;
  };

  public type UserPreferences = {
    voiceEnabled : Bool;
    videoEnabled : Bool;
    privacyLevel : Text;
    globalMatching : Bool;
  };

  public type Match = {
    user1 : Principal;
    user2 : Principal;
    timestamp : Time.Time;
    isActive : Bool;
  };

  public type FriendRequest = {
    from : Principal;
    to : Principal;
    status : { #pending; #accepted; #rejected };
    timestamp : Time.Time;
  };

  public type Subscription = {
    user : Principal;
    type_ : SubscriptionType;
    startDate : Time.Time;
    endDate : ?Time.Time;
    isActive : Bool;
  };

  public type SubscriptionType = {
    #basicPremium;
    #globalMatching;
    #adFree;
    #videoCalling;
    #premiumBundle;
  };

  public type RazorpayConfiguration = {
    apiKey : Text;
    secretKey : Text;
  };

  public type RazorpayOrder = {
    id : Text;
    amount : Nat;
    currency : Text;
    status : Text;
    created_at : Time.Time;
    owner : Principal;
  };

  public type RazorpayPayment = {
    orderId : Text;
    paymentId : Text;
    signature : Text;
    status : Text;
  };

  public type ActiveUser = {
    principal : Principal;
    lastActive : Time.Time;
  };

  public type SignalingData = {
    offer : ?Text;
    answer : ?Text;
    iceCandidates : [Text];
    lastUpdated : Time.Time;
  };

  public type YoutubeSessionState = {
    videoId : Text;
    playbackPosition : Nat;
    isPlaying : Bool;
    version : Nat;
    lastUpdated : Time.Time;
  };

  public type MatchmakingStatus = {
    isActiveUser : Bool;
    hasOnboarding : Bool;
    message : Text;
  };

  public type MatchmakingPoolEntry = {
    principal : Principal;
    timeJoined : Time.Time;
    isActive : Bool;
  };

  public type Pairing = {
    user1 : Principal;
    user2 : Principal;
    timestamp : Time.Time;
    isActive : Bool;
  };

  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  transient let textMap = OrderedMap.Make<Text>(Text.compare);

  var userProfiles = principalMap.empty<UserProfile>();
  var matches = textMap.empty<Match>();
  var friendRequests = textMap.empty<FriendRequest>();
  var subscriptions = textMap.empty<Subscription>();
  var razorpayConfig : ?RazorpayConfiguration = null;
  var razorpayOrders = textMap.empty<RazorpayOrder>();
  var razorpayPayments = textMap.empty<RazorpayPayment>();
  var stripeConfig : ?Stripe.StripeConfiguration = null;
  var activeUsers = principalMap.empty<ActiveUser>();
  var signalingStorage = textMap.empty<SignalingData>();
  var youtubeSessions = textMap.empty<YoutubeSessionState>();

  var matchmakingPool = principalMap.empty<MatchmakingPoolEntry>();
  var currentPairings = textMap.empty<Pairing>();

  // Helper function to check if user has completed onboarding
  private func hasCompletedOnboarding(user : Principal) : Bool {
    switch (principalMap.get(userProfiles, user)) {
      case null false;
      case (?profile) profile.onboardingComplete;
    };
  };

  // Helper function to check if user is currently active
  private func isUserActive(user : Principal) : Bool {
    let now = Time.now();
    let activeThreshold = 5 * 60 * 1_000_000_000; // 5 minutes in nanoseconds

    switch (principalMap.get(activeUsers, user)) {
      case null false;
      case (?activeUser) {
        now - activeUser.lastActive <= activeThreshold
      };
    };
  };

  // Helper function to check if user is in matchmaking pool
  private func isUserInMatchmakingPool(user : Principal) : Bool {
    switch (principalMap.get(matchmakingPool, user)) {
      case null false;
      case (?entry) entry.isActive;
    };
  };

  // Helper function to check if user has active subscription of a type
  private func hasActiveSubscription(user : Principal, subType : SubscriptionType) : Bool {
    switch (textMap.get(subscriptions, Principal.toText(user))) {
      case null false;
      case (?sub) {
        sub.isActive and sub.type_ == subType
      };
    };
  };

  // Helper function to verify signaling session participants
  private func isSignalingParticipant(caller : Principal, peer : Principal, signalingKey : Text) : Bool {
    let expectedKey1 = Text.concat(Principal.toText(caller), Principal.toText(peer));
    let expectedKey2 = Text.concat(Principal.toText(peer), Principal.toText(caller));
    signalingKey == expectedKey1 or signalingKey == expectedKey2;
  };

  // Helper function to check if a peer is eligible for matching
  private func isEligiblePeer(peer : Principal) : Bool {
    hasCompletedOnboarding(peer) and isUserActive(peer) and isUserInMatchmakingPool(peer);
  };

  // Helper function to check if two users are currently paired
  private func areCurrentlyPaired(user1 : Principal, user2 : Principal) : Bool {
    let pairingKey = Text.concat(Principal.toText(user1), Principal.toText(user2));
    switch (textMap.get(currentPairings, pairingKey)) {
      case null false;
      case (?pairing) pairing.isActive;
    };
  };

  // Helper function to generate a pairing key for two users
  private func generatePairingKey(user1 : Principal, user2 : Principal) : Text {
    Text.concat(Principal.toText(user1), Principal.toText(user2));
  };

  // Helper function to deactivate previous pairings for a user
  private func deactivatePreviousPairings(user : Principal) {
    let allPairings = Iter.toArray(textMap.entries(currentPairings));
    for ((key, pairing) in allPairings.vals()) {
      if ((pairing.user1 == user or pairing.user2 == user) and pairing.isActive) {
        let updatedPairing = { pairing with isActive = false };
        currentPairings := textMap.put(currentPairings, key, updatedPairing);
      };
    };
  };

  // Helper function to filter eligible pairs
  private func filterEligiblePairs(activeEntries : [(Principal, MatchmakingPoolEntry)], caller : Principal) : [Principal] {
    let now = Time.now();
    let activeThreshold = 5 * 60 * 1_000_000_000; // 5 minutes in nanoseconds

    Array.map<(Principal, MatchmakingPoolEntry), Principal>(
      Array.filter<(Principal, MatchmakingPoolEntry)>(
        activeEntries,
        func((user, poolEntry)) {
          user != caller and isEligiblePeer(user) and (now - poolEntry.timeJoined) <= activeThreshold
        },
      ),
      func((user, _)) { user },
    );
  };

  // END: Helper Functions for Authorization and State Verification

  // BEGIN: WebRTC Matching and Signaling System

  public query ({ caller }) func isVoiceReady() : async Bool {
    let hasOnboarding = hasCompletedOnboarding(caller);
    let isActive = isUserActive(caller);

    hasOnboarding and isActive;
  };

  public shared ({ caller }) func joinMatchmakingPool() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can join the matchmaking pool");
    };
    if (not hasCompletedOnboarding(caller)) {
      Debug.trap("Complete onboarding before joining the pool");
    };
    if (not isUserActive(caller)) {
      Debug.trap("Become active to join the matchmaking pool");
    };

    matchmakingPool := principalMap.put(matchmakingPool, caller, {
      principal = caller;
      timeJoined = Time.now();
      isActive = true;
    });
  };

  public shared ({ caller }) func leaveMatchmakingPool() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can leave the pool");
    };

    matchmakingPool := principalMap.put(matchmakingPool, caller, {
      principal = caller;
      timeJoined = Time.now();
      isActive = false;
    });
  };

  public query ({ caller }) func isInMatchmakingPool() : async Bool {
    let isActive = isUserActive(caller);
    let isOnboarding = hasCompletedOnboarding(caller);

    if (not (isActive and isOnboarding)) {
      Debug.trap("Complete onboarding and become active before matching");
    };

    isUserInMatchmakingPool(caller);
  };

  public shared ({ caller }) func findRandomPeer() : async ?Principal {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can find peers");
    };
    if (not hasCompletedOnboarding(caller)) {
      Debug.trap("Complete onboarding before finding peers");
    };
    if (not isUserActive(caller)) {
      Debug.trap("Become active to find eligible peers");
    };
    if (not isUserInMatchmakingPool(caller)) {
      Debug.trap("Join the matchmaking pool before finding random peers. You are automatically removed from the pool if inactive for some time, or after every successful or failed connection attempt");
    };

    let eligiblePeers = filterEligiblePairs(Iter.toArray(principalMap.entries(matchmakingPool)), caller);
    switch (eligiblePeers.size()) {
      case (0) null; // Return null when no peers are available
      case (_) ?eligiblePeers[0];
    };
  };

  public shared ({ caller }) func matchWithPeer(peer : Principal) : async Text {
    let createPairing = func(user1 : Principal, user2 : Principal) : Pairing {
      { user1; user2; timestamp = Time.now(); isActive = true };
    };

    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create matches");
    };
    if (not hasCompletedOnboarding(caller)) {
      Debug.trap("Complete onboarding before matching with others");
    };
    if (not isUserActive(caller)) {
      Debug.trap("Become active to match with others");
    };
    if (not isUserInMatchmakingPool(caller)) {
      Debug.trap("Join the matchmaking pool before matching with others");
    };

    // Validate peer eligibility
    if (not (AccessControl.hasPermission(accessControlState, peer, #user) and hasCompletedOnboarding(peer) and isUserActive(peer) and isUserInMatchmakingPool(peer))) {
      Debug.trap("Invalid peer: Must be a registered, onboarded, and active user who is waiting in the matching pool");
    };

    // Remove previous pairings for both users before creating a new one
    deactivatePreviousPairings(caller);
    deactivatePreviousPairings(peer);

    // Create new pairing in format {caller|peer}
    let pairingKey = generatePairingKey(caller, peer);
    currentPairings := textMap.put(currentPairings, pairingKey, createPairing(caller, peer));

    // Create reverse pairing in format {peer|caller}
    let reversePairingKey = generatePairingKey(peer, caller);
    currentPairings := textMap.put(currentPairings, reversePairingKey, createPairing(peer, caller));

    // Remove both users from the matchmaking pool after successful pairing
    matchmakingPool := principalMap.delete(matchmakingPool, caller);
    matchmakingPool := principalMap.delete(matchmakingPool, peer);

    pairingKey; // Return the pairing key as confirmation
  };

  public shared ({ caller }) func nextPeer() : async ?Principal {
    let removePreviousPairings = func(user : Principal) {
      let allPairings = Iter.toArray(textMap.entries(currentPairings));
      for ((key, pairing) in allPairings.vals()) {
        if ((pairing.user1 == user or pairing.user2 == user) and pairing.isActive) {
          currentPairings := textMap.delete(currentPairings, key);
        };
      };
    };

    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can find next peer");
    };
    // Validate caller's current status
    if (not hasCompletedOnboarding(caller)) {
      Debug.trap("Complete onboarding before seeking next peer");
    };
    if (not isUserActive(caller)) {
      Debug.trap("Become active to find next peer");
    };
    if (not isUserInMatchmakingPool(caller)) {
      Debug.trap("Join the matchmaking pool before searching for next peer");
    };

    // Remove previous pairings
    removePreviousPairings(caller);

    // Check if previous pairing exists
    if (textMap.size(currentPairings) == 1) {
      let firstEntry = Iter.toArray(textMap.entries(currentPairings));
      switch (firstEntry.size()) {
        case (0) {
          let eligiblePeers = filterEligiblePairs(Iter.toArray(principalMap.entries(matchmakingPool)), caller);
          Debug.print("Random eligible peer size: " # debug_show (eligiblePeers.size()));
          switch (eligiblePeers.size()) {
            case (0) return null; // Return null when no peers are available
            case (_) return ?eligiblePeers[0];
          };
        };
        case (_) {
          let eligiblePeers = filterEligiblePairs(Iter.toArray(principalMap.entries(matchmakingPool)), caller);
          switch (eligiblePeers.size()) {
            case (0) return null;
            case (_) return ?eligiblePeers[0];
          };
        };
      };
    } else {
      let eligiblePeers = filterEligiblePairs(Iter.toArray(principalMap.entries(matchmakingPool)), caller);
      Debug.print("Eligible peers size: " # debug_show (eligiblePeers.size()));
      if (eligiblePeers.size() == 0) return null; // Return null explicitly if no peers found
      if (eligiblePeers.size() > 0) return ?eligiblePeers[0];
    };
    // In case all logic fails, return null
    null;
  };

  // Helper function to remove a user from the matchmaking pool
  func removeFromPool(user : Principal) {
    matchmakingPool := principalMap.delete(matchmakingPool, user);
  };

  // Helper function to get the peer from a pairing
  func getPeerFromPairing(user : Principal) : Principal {
    switch (textMap.get(currentPairings, Principal.toText(user))) {
      case (?pairing) if (pairing.user1 == user) pairing.user2 else pairing.user1;
      case null user;
    };
  };

  public shared ({ caller }) func terminateSession(peer : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can terminate sessions");
    };

    let signalingKey1 = Text.concat(Principal.toText(caller), Principal.toText(peer));
    let signalingKey2 = Text.concat(Principal.toText(peer), Principal.toText(caller));

    // Clean up all signaling state related to the peer
    signalingStorage := textMap.delete(signalingStorage, signalingKey1);
    signalingStorage := textMap.delete(signalingStorage, signalingKey2);

    // Clean up activity record
    activeUsers := principalMap.delete(activeUsers, caller);

    // Clean up YouTube session if exists
    let sessionKey1 = createYouTubeSessionKey(caller, peer);
    let sessionKey2 = createYouTubeSessionKey(peer, caller);
    youtubeSessions := textMap.delete(youtubeSessions, sessionKey1);
    youtubeSessions := textMap.delete(youtubeSessions, sessionKey2);
  };

  // END: WebRTC Matching and Signaling System

  // BEGIN: User Profile Management

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can access profiles");
    };
    principalMap.get(userProfiles, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.isAdmin(accessControlState, caller) or caller == user)) {
      Debug.trap("Unauthorized: Can only view your own profile");
    };
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  public shared ({ caller }) func completeOnboarding() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can complete onboarding");
    };

    switch (principalMap.get(userProfiles, caller)) {
      case null Debug.trap("User profile not found");
      case (?profile) {
        let updatedProfile = { profile with onboardingComplete = true };
        userProfiles := principalMap.put(userProfiles, caller, updatedProfile);
      };
    };
  };

  // END: User Profile Management

  // Real-time Presence System
  public shared ({ caller }) func updateActivity() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can update activity");
    };

    // Verify user has completed onboarding before tracking activity
    if (not hasCompletedOnboarding(caller)) {
      Debug.trap("Unauthorized: Complete onboarding before activity tracking");
    };

    let newActiveUser : ActiveUser = {
      principal = caller;
      lastActive = Time.now();
    };

    activeUsers := principalMap.put(activeUsers, caller, newActiveUser);
  };

  public query func getActiveUserCount() : async Nat {
    let now = Time.now();
    let activeThreshold = 5 * 60 * 1_000_000_000; // 5 minutes in nanoseconds

    let activeUsersArray = Iter.toArray(principalMap.vals(activeUsers));
    let activeUsersCount = Array.filter<ActiveUser>(
      activeUsersArray,
      func(user) {
        now - user.lastActive <= activeThreshold
      },
    ).size();

    activeUsersCount;
  };

  public shared ({ caller }) func removeInactiveUsers() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can manage inactive users");
    };

    let now = Time.now();
    let inactivityThreshold = 24 * 60 * 60 * 1_000_000_000; // 24 hours in nanoseconds

    let activeUsersArray = Iter.toArray(principalMap.entries(activeUsers));
    for ((principal, user) in activeUsersArray.vals()) {
      if (now - user.lastActive > inactivityThreshold) {
        activeUsers := principalMap.delete(activeUsers, principal);
      };
    };
  };

  // WebRTC Signaling System
  public shared ({ caller }) func createOffer(peer : Principal, offer : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create offers");
    };

    // Verify caller has completed onboarding
    if (not hasCompletedOnboarding(caller)) {
      Debug.trap("Unauthorized: Complete onboarding before creating offers");
    };

    if (caller == peer) {
      Debug.trap("Cannot create offer to self");
    };

    // Verify peer is a valid user who completed onboarding
    if (not (AccessControl.hasPermission(accessControlState, peer, #user) and hasCompletedOnboarding(peer))) {
      Debug.trap("Invalid peer: Peer must be a registered, onboarded user");
    };

    // Verify peer is currently active (critical for real-time matching)
    if (not isUserActive(peer)) {
      Debug.trap("Invalid peer: Peer must be currently active for WebRTC connection");
    };

    let signalingKey = Text.concat(Principal.toText(caller), Principal.toText(peer));
    let signalingData : SignalingData = {
      offer = ?offer;
      answer = null;
      iceCandidates = [];
      lastUpdated = Time.now();
    };

    signalingStorage := textMap.put(signalingStorage, signalingKey, signalingData);
  };

  public shared ({ caller }) func sendAnswer(peer : Principal, answer : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can send answers");
    };

    // Verify caller has completed onboarding
    if (not hasCompletedOnboarding(caller)) {
      Debug.trap("Unauthorized: Complete onboarding before sending answers");
    };

    if (caller == peer) {
      Debug.trap("Cannot send answer to self");
    };

    // Verify peer is a valid user who completed onboarding
    if (not (AccessControl.hasPermission(accessControlState, peer, #user) and hasCompletedOnboarding(peer))) {
      Debug.trap("Invalid peer: Peer must be a registered, onboarded user");
    };

    let signalingKey = Text.concat(Principal.toText(peer), Principal.toText(caller));
    switch (textMap.get(signalingStorage, signalingKey)) {
      case null Debug.trap("No matching offer found for this connection");
      case (?signalingData) {
        // Verify the offer exists before allowing answer
        switch (signalingData.offer) {
          case null Debug.trap("Cannot send answer: No offer exists");
          case (?_) {
            let updatedSignalingData = {
              signalingData with
              answer = ?answer;
              lastUpdated = Time.now();
            };
            signalingStorage := textMap.put(signalingStorage, signalingKey, updatedSignalingData);
          };
        };
      };
    };
  };

  public shared ({ caller }) func exchangeCandidates(peer : Principal, candidate : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can exchange candidates");
    };

    // Verify caller has completed onboarding
    if (not hasCompletedOnboarding(caller)) {
      Debug.trap("Unauthorized: Complete onboarding before exchanging candidates");
    };

    if (caller == peer) {
      Debug.trap("Cannot exchange candidates with self");
    };

    // Verify peer is a valid user who completed onboarding
    if (not (AccessControl.hasPermission(accessControlState, peer, #user) and hasCompletedOnboarding(peer))) {
      Debug.trap("Invalid peer: Peer must be a registered, onboarded user");
    };

    // Check both possible signaling key combinations
    let signalingKey1 = Text.concat(Principal.toText(caller), Principal.toText(peer));
    let signalingKey2 = Text.concat(Principal.toText(peer), Principal.toText(caller));

    var signalingData : ?SignalingData = textMap.get(signalingStorage, signalingKey1);
    var activeKey = signalingKey1;

    if (signalingData == null) {
      signalingData := textMap.get(signalingStorage, signalingKey2);
      activeKey := signalingKey2;
    };

    switch (signalingData) {
      case null {
        // If the signaling data doesn't exist, create it.
        let newSignalingData = {
          offer = null;
          answer = null;
          iceCandidates = [candidate]; // Store the ICE candidate even without an offer yet.
          lastUpdated = Time.now();
        };
        signalingStorage := textMap.put(signalingStorage, activeKey, newSignalingData);
      };
      case (?data) {
        // If both offer and answer exist, let the ICE candidate come through as usual.
        let updatedIceCandidates = Array.append<Text>(data.iceCandidates, [candidate]);
        let updatedSignalingData = {
          data with
          iceCandidates = updatedIceCandidates;
          lastUpdated = Time.now();
        };
        signalingStorage := textMap.put(signalingStorage, activeKey, updatedSignalingData);
      };
    };
  };

  public query ({ caller }) func getSignalingState(peer : Principal) : async ?SignalingData {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can access signaling state");
    };

    // Verify caller has completed onboarding
    if (not hasCompletedOnboarding(caller)) {
      Debug.trap("Unauthorized: Complete onboarding before accessing signaling state");
    };

    // Verify peer is a valid user
    if (not (AccessControl.hasPermission(accessControlState, peer, #user))) {
      Debug.trap("Invalid peer: Peer must be a registered user");
    };

    // Check both possible signaling key combinations
    let signalingKey1 = Text.concat(Principal.toText(caller), Principal.toText(peer));
    let signalingKey2 = Text.concat(Principal.toText(peer), Principal.toText(caller));

    // Verify caller is actually a participant in the signaling session
    switch (textMap.get(signalingStorage, signalingKey1)) {
      case (?data) {
        if (isSignalingParticipant(caller, peer, signalingKey1)) {
          ?data;
        } else {
          Debug.trap("Unauthorized: Not a participant in this signaling session");
        };
      };
      case null {
        switch (textMap.get(signalingStorage, signalingKey2)) {
          case (?data) {
            if (isSignalingParticipant(caller, peer, signalingKey2)) {
              ?data;
            } else {
              Debug.trap("Unauthorized: Not a participant in this signaling session");
            };
          };
          case null null;
        };
      };
    };
  };

  public shared ({ caller }) func cleanupSignalingState(peer : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can clean up signaling state");
    };

    // Verify caller has completed onboarding
    if (not hasCompletedOnboarding(caller)) {
      Debug.trap("Unauthorized: Complete onboarding before cleaning up signaling state");
    };

    // Check both possible signaling key combinations
    let signalingKey1 = Text.concat(Principal.toText(caller), Principal.toText(peer));
    let signalingKey2 = Text.concat(Principal.toText(peer), Principal.toText(caller));

    // Verify caller is actually a participant before allowing cleanup
    let isParticipant1 = switch (textMap.get(signalingStorage, signalingKey1)) {
      case null false;
      case (?_) isSignalingParticipant(caller, peer, signalingKey1);
    };

    let isParticipant2 = switch (textMap.get(signalingStorage, signalingKey2)) {
      case null false;
      case (?_) isSignalingParticipant(caller, peer, signalingKey2);
    };

    if (not (isParticipant1 or isParticipant2)) {
      Debug.trap("Unauthorized: Can only cleanup signaling state for your own sessions");
    };

    // Clean up both possible keys
    signalingStorage := textMap.delete(signalingStorage, signalingKey1);
    signalingStorage := textMap.delete(signalingStorage, signalingKey2);
  };

  // YouTube Watch Together System
  public shared ({ caller }) func setYouTubeSessionState(peer : Principal, state : YoutubeSessionState) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can set YouTube session state");
    };

    // Verify caller has completed onboarding
    if (not hasCompletedOnboarding(caller)) {
      Debug.trap("Unauthorized: Complete onboarding before setting YouTube state");
    };

    if (caller == peer) {
      Debug.trap("Cannot set YouTube session state with self");
    };

    // Verify peer is a valid user who completed onboarding
    if (not (AccessControl.hasPermission(accessControlState, peer, #user) and hasCompletedOnboarding(peer))) {
      Debug.trap("Invalid peer: Peer must be a registered, onboarded user");
    };

    // Verify peer is currently active
    if (not isUserActive(peer)) {
      Debug.trap("Invalid peer: Peer must be currently active for YouTube session");
    };

    // Create both possible session keys
    let sessionKey1 = createYouTubeSessionKey(caller, peer);
    let sessionKey2 = createYouTubeSessionKey(peer, caller);

    // Check if a session exists with either key combination
    let existingSession1 = textMap.get(youtubeSessions, sessionKey1);
    let existingSession2 = textMap.get(youtubeSessions, sessionKey2);

    // Determine which key to use (prefer existing session key)
    let activeKey = if (existingSession1 != null) {
      sessionKey1;
    } else if (existingSession2 != null) {
      sessionKey2;
    } else {
      // No existing session, use caller-first key
      sessionKey1;
    };

    // Verify caller is a participant (either caller or peer in the session)
    if (not isYouTubeSessionParticipant(activeKey, caller, peer)) {
      Debug.trap("Unauthorized: Only participants can update the session state");
    };

    youtubeSessions := textMap.put(youtubeSessions, activeKey, state);
  };

  public query ({ caller }) func getYouTubeSessionState(peer : Principal) : async ?YoutubeSessionState {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can get YouTube session state");
    };

    // Verify caller has completed onboarding
    if (not hasCompletedOnboarding(caller)) {
      Debug.trap("Unauthorized: Complete onboarding before getting YouTube state");
    };

    // Verify peer is a valid user
    if (not (AccessControl.hasPermission(accessControlState, peer, #user))) {
      Debug.trap("Invalid peer: Peer must be a registered user");
    };

    // Check both possible session key combinations
    let sessionKey1 = createYouTubeSessionKey(caller, peer);
    let sessionKey2 = createYouTubeSessionKey(peer, caller);

    // Try to find session with either key
    switch (textMap.get(youtubeSessions, sessionKey1)) {
      case (?state) {
        // Verify caller is a participant
        if (isYouTubeSessionParticipant(sessionKey1, caller, peer)) {
          ?state;
        } else {
          Debug.trap("Unauthorized: Only participants can access the session state");
        };
      };
      case null {
        switch (textMap.get(youtubeSessions, sessionKey2)) {
          case (?state) {
            // Verify caller is a participant
            if (isYouTubeSessionParticipant(sessionKey2, caller, peer)) {
              ?state;
            } else {
              Debug.trap("Unauthorized: Only participants can access the session state");
            };
          };
          case null null;
        };
      };
    };
  };

  public shared ({ caller }) func cleanupYouTubeSessionState(peer : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can cleanup YouTube session state");
    };

    // Verify caller has completed onboarding
    if (not hasCompletedOnboarding(caller)) {
      Debug.trap("Unauthorized: Complete onboarding before cleaning up YouTube state");
    };

    // Check both possible session key combinations
    let sessionKey1 = createYouTubeSessionKey(caller, peer);
    let sessionKey2 = createYouTubeSessionKey(peer, caller);

    // Verify caller is actually a participant before allowing cleanup
    let isParticipant1 = switch (textMap.get(youtubeSessions, sessionKey1)) {
      case null false;
      case (?_) isYouTubeSessionParticipant(sessionKey1, caller, peer);
    };

    let isParticipant2 = switch (textMap.get(youtubeSessions, sessionKey2)) {
      case null false;
      case (?_) isYouTubeSessionParticipant(sessionKey2, caller, peer);
    };

    if (not (isParticipant1 or isParticipant2)) {
      Debug.trap("Unauthorized: Can only cleanup session state for your own sessions");
    };

    // Clean up both possible keys
    youtubeSessions := textMap.delete(youtubeSessions, sessionKey1);
    youtubeSessions := textMap.delete(youtubeSessions, sessionKey2);
  };

  // Helper function to create a session key for two participants with delimiter
  private func createYouTubeSessionKey(user1 : Principal, user2 : Principal) : Text {
    Text.concat(Text.concat(Principal.toText(user1), "|"), Principal.toText(user2));
  };

  // Helper function to check if a caller is a participant in a YouTube session
  private func isYouTubeSessionParticipant(sessionKey : Text, caller : Principal, peer : Principal) : Bool {
    let expectedKey1 = createYouTubeSessionKey(caller, peer);
    let expectedKey2 = createYouTubeSessionKey(peer, caller);
    sessionKey == expectedKey1 or sessionKey == expectedKey2;
  };

  // Friend System
  public shared ({ caller }) func sendFriendRequest(to : Principal) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can send friend requests");
    };

    // Verify caller has completed onboarding
    if (not hasCompletedOnboarding(caller)) {
      Debug.trap("Unauthorized: Complete onboarding before sending friend requests");
    };

    // Verify user cannot send friend request to themselves
    if (caller == to) {
      Debug.trap("Invalid request: Cannot send friend request to yourself");
    };

    // Verify target user exists and is a valid user
    if (not (AccessControl.hasPermission(accessControlState, to, #user))) {
      Debug.trap("Invalid request: Target user must be a registered user");
    };

    // Verify target user has completed onboarding
    if (not hasCompletedOnboarding(to)) {
      Debug.trap("Invalid request: Target user has not completed onboarding");
    };

    let requestId = Text.concat(Principal.toText(caller), Principal.toText(to));

    // Check if request already exists to prevent spam
    switch (textMap.get(friendRequests, requestId)) {
      case (?existing) {
        if (existing.status == #pending) {
          Debug.trap("Friend request already pending");
        };
      };
      case null {};
    };

    let newRequest : FriendRequest = {
      from = caller;
      to;
      status = #pending;
      timestamp = Time.now();
    };

    friendRequests := textMap.put(friendRequests, requestId, newRequest);
    requestId;
  };

  public shared ({ caller }) func respondToFriendRequest(requestId : Text, accept : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can respond to friend requests");
    };

    switch (textMap.get(friendRequests, requestId)) {
      case null Debug.trap("Friend request not found");
      case (?request) {
        if (request.to != caller) {
          Debug.trap("Unauthorized: Only the recipient can respond to this request");
        };

        // Verify request is still pending
        if (request.status != #pending) {
          Debug.trap("Invalid operation: Request has already been responded to");
        };

        let updatedRequest = {
          request with
          status = if (accept) #accepted else #rejected
        };

        friendRequests := textMap.put(friendRequests, requestId, updatedRequest);
      };
    };
  };

  public query ({ caller }) func getFriends() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view friends");
    };

    let userRequests = Iter.toArray(textMap.vals(friendRequests));
    let friends = Array.filter<FriendRequest>(
      userRequests,
      func(request) {
        (request.from == caller or request.to == caller) and request.status == #accepted
      },
    );
    Array.map<FriendRequest, Principal>(friends, func(request) { if (request.from == caller) request.to else request.from });
  };

  // Subscription Management
  public query func isRazorpayConfigured() : async Bool {
    razorpayConfig != null;
  };

  public shared ({ caller }) func setRazorpayConfiguration(config : RazorpayConfiguration) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can configure Razorpay");
    };
    razorpayConfig := ?config;
  };

  private func getRazorpayConfiguration() : RazorpayConfiguration {
    switch (razorpayConfig) {
      case null Debug.trap("Razorpay needs to be first configured");
      case (?value) value;
    };
  };

  public shared ({ caller }) func createRazorpayOrder(amount : Nat, currency : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create orders");
    };

    // Verify user has completed onboarding
    if (not hasCompletedOnboarding(caller)) {
      Debug.trap("Unauthorized: Complete onboarding before purchasing subscriptions");
    };

    let orderId = Text.concat(Principal.toText(caller), Int.toText(Time.now()));
    let newOrder : RazorpayOrder = {
      id = orderId;
      amount;
      currency;
      status = "created";
      created_at = Time.now();
      owner = caller;
    };

    razorpayOrders := textMap.put(razorpayOrders, orderId, newOrder);
    orderId;
  };

  public shared ({ caller }) func verifyRazorpayPayment(orderId : Text, paymentId : Text, signature : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can verify payments");
    };

    // Verify the order exists and belongs to the caller
    switch (textMap.get(razorpayOrders, orderId)) {
      case null Debug.trap("Order not found");
      case (?order) {
        // Critical: Verify order ownership
        if (order.owner != caller) {
          Debug.trap("Unauthorized: Can only verify payments for your own orders");
        };

        // Verify order hasn't already been paid
        if (order.status == "paid") {
          Debug.trap("Invalid operation: Order has already been paid");
        };

        let newPayment : RazorpayPayment = {
          orderId;
          paymentId;
          signature;
          status = "verified";
        };

        razorpayPayments := textMap.put(razorpayPayments, paymentId, newPayment);

        // Update order status to paid
        let updatedOrder = { order with status = "paid" };
        razorpayOrders := textMap.put(razorpayOrders, orderId, updatedOrder);
      };
    };
  };

  public shared ({ caller }) func addSubscription(subscription : Subscription) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can add subscriptions");
    };

    // Verify the subscription user is a valid user
    if (not (AccessControl.hasPermission(accessControlState, subscription.user, #user))) {
      Debug.trap("Invalid subscription: Target user must be a registered user");
    };

    // Verify user has completed onboarding
    if (not hasCompletedOnboarding(subscription.user)) {
      Debug.trap("Invalid subscription: User must complete onboarding first");
    };

    // Verify KYC requirement for video calling
    switch (subscription.type_) {
      case (#videoCalling or #premiumBundle) {
        switch (principalMap.get(userProfiles, subscription.user)) {
          case null Debug.trap("Invalid subscription: User profile not found");
          case (?profile) {
            if (not profile.kycVerified) {
              Debug.trap("Invalid subscription: Video calling requires KYC verification");
            };
          };
        };
      };
      case _ {};
    };

    subscriptions := textMap.put(subscriptions, Principal.toText(subscription.user), subscription);
  };

  public query ({ caller }) func getCallerSubscription() : async ?Subscription {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can view subscriptions");
    };
    // Return only the caller's subscription
    textMap.get(subscriptions, Principal.toText(caller));
  };

  // KYC Verification
  public shared ({ caller }) func updateKycStatus(user : Principal, verified : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can update KYC status");
    };

    // Verify target user is a valid user
    if (not (AccessControl.hasPermission(accessControlState, user, #user))) {
      Debug.trap("Invalid operation: Target must be a registered user");
    };

    switch (principalMap.get(userProfiles, user)) {
      case null Debug.trap("User profile not found");
      case (?profile) {
        let updatedProfile = { profile with kycVerified = verified };
        userProfiles := principalMap.put(userProfiles, user, updatedProfile);
      };
    };
  };

  // Placeholder for Ad System - accessible to all users including guests
  public query func getAds() : async [Text] {
    ["Ad 1 - Placeholder", "Ad 2 - Placeholder"];
  };

  // Stripe Integration
  public query func isStripeConfigured() : async Bool {
    stripeConfig != null;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can configure Stripe");
    };
    stripeConfig := ?config;
  };

  private func getStripeConfiguration() : Stripe.StripeConfiguration {
    switch (stripeConfig) {
      case null Debug.trap("Stripe needs to be first configured");
      case (?value) value;
    };
  };

  public func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can create checkout sessions");
    };

    // Verify user has completed onboarding
    if (not hasCompletedOnboarding(caller)) {
      Debug.trap("Unauthorized: Complete onboarding before purchasing subscriptions");
    };

    await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, successUrl, cancelUrl, transform);
  };

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };
};


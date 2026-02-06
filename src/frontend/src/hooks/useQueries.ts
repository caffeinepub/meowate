import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, Subscription, RazorpayConfiguration, SignalingData, YoutubeSessionState } from '../backend';
import { SubscriptionType } from '../backend';
import { Principal } from '@dfinity/principal';

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useCompleteOnboarding() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.completeOnboarding();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// Subscription Queries
export function useGetCallerSubscription() {
  const { actor, isFetching } = useActor();

  return useQuery<Subscription | null>({
    queryKey: ['currentUserSubscription'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerSubscription();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddSubscription() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscription: Subscription) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addSubscription(subscription);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserSubscription'] });
    },
  });
}

// Friend Queries
export function useGetFriends() {
  const { actor, isFetching } = useActor();

  return useQuery<Principal[]>({
    queryKey: ['friends'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFriends();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSendFriendRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (to: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.sendFriendRequest(to);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

export function useRespondToFriendRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, accept }: { requestId: string; accept: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.respondToFriendRequest(requestId, accept);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
  });
}

// KYC Queries
export function useUpdateKycStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, verified }: { user: Principal; verified: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateKycStatus(user, verified);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

// Ads Query
export function useGetAds() {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['ads'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAds();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Razorpay Queries
export function useIsRazorpayConfigured() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['razorpayConfigured'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isRazorpayConfigured();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetRazorpayConfiguration() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: RazorpayConfiguration) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setRazorpayConfiguration(config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['razorpayConfigured'] });
    },
  });
}

export function useCreateRazorpayOrder() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ amount, currency }: { amount: number; currency: string }) => {
      if (!actor) throw new Error('Actor not available');
      const orderId = await actor.createRazorpayOrder(BigInt(amount), currency);
      return orderId;
    },
  });
}

export function useVerifyRazorpayPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, paymentId, signature }: { orderId: string; paymentId: string; signature: string }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.verifyRazorpayPayment(orderId, paymentId, signature);
      
      // Invalidate subscription cache to fetch updated data
      await queryClient.invalidateQueries({ queryKey: ['currentUserSubscription'] });
    },
  });
}

// Real-time Presence Queries
export function useGetActiveUserCount() {
  const { actor, isFetching } = useActor();

  return useQuery<number>({
    queryKey: ['activeUserCount'],
    queryFn: async () => {
      if (!actor) return 0;
      const count = await actor.getActiveUserCount();
      return Number(count);
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000, // Poll every 5 seconds
  });
}

export function useUpdateActivity() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateActivity();
    },
  });
}

// WebRTC Matching Query
export function useFindEligiblePeer() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (): Promise<Principal | null> => {
      if (!actor) throw new Error('Actor not available');
      try {
        const peer = await actor.findRandomPeer();
        return peer;
      } catch (error: any) {
        // Parse backend error messages for actionable UI feedback
        const errorMsg = error?.message || String(error);
        
        if (errorMsg.includes('complete onboarding')) {
          throw new Error('ONBOARDING_REQUIRED');
        } else if (errorMsg.includes('must be active')) {
          throw new Error('ACTIVITY_REQUIRED');
        } else if (errorMsg.includes('No eligible peers') || errorMsg.includes('No active users')) {
          return null; // No peers available, not an error
        } else {
          throw new Error('MATCHING_ERROR');
        }
      }
    },
  });
}

// WebRTC Signaling Queries
export function useCreateOffer() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ peer, offer }: { peer: Principal; offer: string }) => {
      if (!actor) throw new Error('Actor not available');
      try {
        return await actor.createOffer(peer, offer);
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        if (errorMsg.includes('Unauthorized') || errorMsg.includes('Complete onboarding')) {
          throw new Error('AUTH_REQUIRED: Please log in and complete onboarding');
        } else if (errorMsg.includes('Invalid peer')) {
          throw new Error('PEER_INVALID: The selected peer is not available');
        }
        throw error;
      }
    },
  });
}

export function useSendAnswer() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ peer, answer }: { peer: Principal; answer: string }) => {
      if (!actor) throw new Error('Actor not available');
      try {
        return await actor.sendAnswer(peer, answer);
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        if (errorMsg.includes('Unauthorized') || errorMsg.includes('Complete onboarding')) {
          throw new Error('AUTH_REQUIRED: Please log in and complete onboarding');
        } else if (errorMsg.includes('No matching offer')) {
          throw new Error('NO_OFFER: No offer found for this connection');
        }
        throw error;
      }
    },
  });
}

export function useExchangeCandidates() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ peer, candidate }: { peer: Principal; candidate: string }) => {
      if (!actor) throw new Error('Actor not available');
      try {
        return await actor.exchangeCandidates(peer, candidate);
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        if (errorMsg.includes('Unauthorized') || errorMsg.includes('Complete onboarding')) {
          throw new Error('AUTH_REQUIRED: Please log in and complete onboarding');
        }
        throw error;
      }
    },
  });
}

export function useGetSignalingState(peer: Principal | null, enabled: boolean = true) {
  const { actor, isFetching } = useActor();

  return useQuery<SignalingData | null>({
    queryKey: ['signalingState', peer?.toString()],
    queryFn: async () => {
      if (!actor || !peer) return null;
      try {
        return await actor.getSignalingState(peer);
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        if (errorMsg.includes('Unauthorized')) {
          console.warn('Signaling state access unauthorized');
          return null;
        }
        throw error;
      }
    },
    enabled: !!actor && !isFetching && !!peer && enabled,
    refetchInterval: 1000, // Poll every second for real-time updates
  });
}

export function useCleanupSignalingState() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (peer: Principal | null) => {
      if (!actor) throw new Error('Actor not available');
      if (!peer) return; // Skip if no peer
      return actor.cleanupSignalingState(peer);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signalingState'] });
    },
  });
}

// YouTube View Together Queries
export function useGetYouTubeSessionState(peer: Principal | null, enabled: boolean = true) {
  const { actor, isFetching } = useActor();

  return useQuery<YoutubeSessionState | null>({
    queryKey: ['youtubeSession', peer?.toString()],
    queryFn: async () => {
      if (!actor || !peer) return null;
      return actor.getYouTubeSessionState(peer);
    },
    enabled: !!actor && !isFetching && !!peer && enabled,
    refetchInterval: 750, // Poll every 750ms for near-real-time sync
  });
}

export function useSetYouTubeSessionState() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ peer, state }: { peer: Principal; state: YoutubeSessionState }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.setYouTubeSessionState(peer, state);
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific peer's session
      queryClient.invalidateQueries({ queryKey: ['youtubeSession', variables.peer.toString()] });
    },
  });
}

export function useCleanupYouTubeSessionState() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (peer: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.cleanupYouTubeSessionState(peer);
    },
    onSuccess: (_, peer) => {
      // Remove the specific peer's session from cache
      queryClient.removeQueries({ queryKey: ['youtubeSession', peer.toString()] });
    },
  });
}

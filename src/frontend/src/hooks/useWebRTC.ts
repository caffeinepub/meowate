import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Principal } from '@dfinity/principal';
import { useCreateOffer, useSendAnswer, useExchangeCandidates, useGetSignalingState, useCleanupSignalingState } from './useQueries';

export type WebRTCState = 'idle' | 'requesting-permission' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebRTCConnection {
  state: WebRTCState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  connectionQuality: 'good' | 'fair' | 'poor';
  error: string | null;
  peer: Principal | null;
  diagnostics: ConnectionDiagnostics;
  micPermissionDenied: boolean;
  autoplayBlocked: boolean;
}

export interface ConnectionDiagnostics {
  signalingState: string;
  iceConnectionState: string;
  iceGatheringState: string;
  connectionState: string;
  retryAttempts: number;
  lastError: string | null;
  usingTurnServer: boolean;
  localTracksCount: number;
  remoteTracksCount: number;
}

const SIGNALING_TIMEOUT = 30000; // 30 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Enhanced ICE servers with TURN fallback for cross-NAT connectivity
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Google STUN servers
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Public TURN servers (fallback for difficult NAT scenarios)
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceTransportPolicy: 'all', // Try all connection types
  iceCandidatePoolSize: 10, // Pre-gather candidates
};

export function useWebRTC() {
  const [connection, setConnection] = useState<WebRTCConnection>({
    state: 'idle',
    localStream: null,
    remoteStream: null,
    isMuted: false,
    connectionQuality: 'good',
    error: null,
    peer: null,
    micPermissionDenied: false,
    autoplayBlocked: false,
    diagnostics: {
      signalingState: 'stable',
      iceConnectionState: 'new',
      iceGatheringState: 'new',
      connectionState: 'new',
      retryAttempts: 0,
      lastError: null,
      usingTurnServer: false,
      localTracksCount: 0,
      remoteTracksCount: 0,
    },
  });

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const iceCandidatesQueueRef = useRef<RTCIceCandidate[]>([]);
  const isOfferCreatorRef = useRef<boolean>(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const signalingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryAttemptsRef = useRef<number>(0);
  const sentCandidatesRef = useRef<Set<string>>(new Set());
  const processedCandidatesRef = useRef<Set<string>>(new Set());
  const currentStateRef = useRef<WebRTCState>('idle');
  const currentPeerRef = useRef<Principal | null>(null);
  const hasProgressRef = useRef<boolean>(false);

  const createOfferMutation = useCreateOffer();
  const sendAnswerMutation = useSendAnswer();
  const exchangeCandidatesMutation = useExchangeCandidates();
  const cleanupSignalingMutation = useCleanupSignalingState();

  // Keep refs in sync with state
  useEffect(() => {
    currentStateRef.current = connection.state;
    currentPeerRef.current = connection.peer;
  }, [connection.state, connection.peer]);

  // Poll for signaling state updates
  const { data: signalingData } = useGetSignalingState(
    connection.peer,
    connection.state === 'connecting' || connection.state === 'connected'
  );

  // Create and manage remote audio element
  useEffect(() => {
    if (!remoteAudioRef.current) {
      const audio = document.createElement('audio');
      audio.autoplay = true;
      remoteAudioRef.current = audio;
      logDiagnostics('Remote audio element created');
    }

    return () => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current = null;
      }
    };
  }, []);

  // Update diagnostics helper
  const updateDiagnostics = useCallback((updates: Partial<ConnectionDiagnostics>) => {
    setConnection(prev => ({
      ...prev,
      diagnostics: { ...prev.diagnostics, ...updates },
    }));
  }, []);

  // Log connection diagnostics
  const logDiagnostics = useCallback((message: string, data?: any) => {
    console.log(`[WebRTC Diagnostics] ${message}`, data || '');
  }, []);

  // Clear signaling timeout
  const clearSignalingTimeout = useCallback(() => {
    if (signalingTimeoutRef.current) {
      clearTimeout(signalingTimeoutRef.current);
      signalingTimeoutRef.current = null;
      logDiagnostics('Signaling timeout cleared');
    }
  }, [logDiagnostics]);

  // Start signaling timeout
  const startSignalingTimeout = useCallback(() => {
    clearSignalingTimeout();
    
    hasProgressRef.current = false;
    
    signalingTimeoutRef.current = setTimeout(() => {
      const state = currentStateRef.current;
      const hasProgress = hasProgressRef.current;
      
      logDiagnostics('Signaling timeout fired', { state, hasProgress });
      
      if (state === 'connecting' && !hasProgress) {
        logDiagnostics('Connection timeout - no progress made');
        
        setConnection(prev => ({
          ...prev,
          state: 'error',
          error: 'Connection timeout. The other user may have left or your network may be blocking the connection.',
        }));
        
        updateDiagnostics({ lastError: 'Connection timeout - no progress' });
        toast.error('Connection timeout. Please try again!');
        
        // Perform full cleanup
        performFullCleanup();
      }
    }, SIGNALING_TIMEOUT);
    
    logDiagnostics('Signaling timeout started', { timeout: SIGNALING_TIMEOUT });
  }, [clearSignalingTimeout, logDiagnostics, updateDiagnostics]);

  // Mark progress to prevent timeout
  const markProgress = useCallback(() => {
    hasProgressRef.current = true;
    logDiagnostics('Connection progress marked');
  }, [logDiagnostics]);

  // Full cleanup function
  const performFullCleanup = useCallback(() => {
    logDiagnostics('Performing full cleanup');
    
    // Clear all timers
    clearSignalingTimeout();
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    // Clean up peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.onicegatheringstatechange = null;
      peerConnectionRef.current.onsignalingstatechange = null;
      
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Clear candidate queues and deduplication sets
    iceCandidatesQueueRef.current = [];
    sentCandidatesRef.current.clear();
    processedCandidatesRef.current.clear();
    
    // Clear remote stream
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    
    // Reset refs
    isOfferCreatorRef.current = false;
    hasProgressRef.current = false;
    
    // Clean up signaling state on backend if we have a peer
    const peer = currentPeerRef.current;
    if (peer) {
      cleanupSignalingMutation.mutate(peer);
    }
    
    logDiagnostics('Full cleanup completed');
  }, [clearSignalingTimeout, cleanupSignalingMutation, logDiagnostics]);

  // Request microphone permission and get local stream
  const requestMicrophonePermission = useCallback(async () => {
    try {
      setConnection(prev => ({ ...prev, state: 'requesting-permission', error: null, micPermissionDenied: false }));

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }, 
        video: false 
      });

      localStreamRef.current = stream;
      const trackCount = stream.getAudioTracks().length;
      
      setConnection(prev => ({ 
        ...prev, 
        localStream: stream, 
        state: 'idle',
        diagnostics: { ...prev.diagnostics, localTracksCount: trackCount },
      }));

      logDiagnostics('Microphone access granted', { tracks: trackCount });
      toast.success('Microphone access granted! 🎤');
      return stream;
    } catch (error: any) {
      console.error('Microphone permission error:', error);
      const errorMessage = error.name === 'NotAllowedError' 
        ? 'Microphone permission denied. Please allow access to continue.'
        : error.name === 'NotFoundError'
        ? 'No microphone found. Please connect a microphone and try again.'
        : 'Failed to access microphone. Please check your device settings.';
      
      setConnection(prev => ({ 
        ...prev, 
        state: 'error', 
        error: errorMessage,
        micPermissionDenied: error.name === 'NotAllowedError',
      }));
      
      updateDiagnostics({ lastError: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  }, [logDiagnostics, updateDiagnostics]);

  // Resume remote audio playback (for autoplay recovery)
  const resumeRemoteAudioPlayback = useCallback(async () => {
    if (remoteAudioRef.current && remoteAudioRef.current.srcObject) {
      try {
        await remoteAudioRef.current.play();
        setConnection(prev => ({ ...prev, autoplayBlocked: false }));
        logDiagnostics('Remote audio playback resumed successfully');
        toast.success('Audio playback started! 🔊');
      } catch (err) {
        console.error('Failed to resume remote audio:', err);
        toast.error('Failed to start audio playback. Please try again.');
      }
    }
  }, [logDiagnostics]);

  // Initialize WebRTC peer connection with enhanced monitoring
  const initializePeerConnection = useCallback((peer: Principal) => {
    logDiagnostics('Initializing peer connection', { peer: peer.toString() });
    
    const peerConnection = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = peerConnection;

    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getTracks();
      tracks.forEach(track => {
        if (localStreamRef.current) {
          peerConnection.addTrack(track, localStreamRef.current);
          logDiagnostics('Local track added to peer connection', { 
            kind: track.kind, 
            enabled: track.enabled,
            id: track.id,
          });
        }
      });
      updateDiagnostics({ localTracksCount: tracks.length });
    } else {
      logDiagnostics('WARNING: No local stream available when initializing peer connection');
    }

    // Handle ICE candidates with deduplication
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateString = JSON.stringify(event.candidate.toJSON());
        
        // Deduplicate sent candidates
        if (sentCandidatesRef.current.has(candidateString)) {
          logDiagnostics('Skipping duplicate ICE candidate (already sent)');
          return;
        }
        
        sentCandidatesRef.current.add(candidateString);
        markProgress(); // Mark progress when ICE candidates are generated
        
        logDiagnostics('ICE candidate generated', { 
          type: event.candidate.type,
          protocol: event.candidate.protocol,
          address: event.candidate.address,
        });

        // Check if using TURN server
        if (event.candidate.type === 'relay') {
          updateDiagnostics({ usingTurnServer: true });
          logDiagnostics('Using TURN server for NAT traversal');
        }

        // Send ICE candidate immediately without delay
        const sendCandidate = async (retries = 3) => {
          try {
            await exchangeCandidatesMutation.mutateAsync({
              peer,
              candidate: candidateString,
            });
            logDiagnostics('ICE candidate sent to backend');
          } catch (error) {
            if (retries > 0) {
              logDiagnostics(`Failed to send ICE candidate, retrying... (${retries} attempts left)`);
              setTimeout(() => sendCandidate(retries - 1), 1000);
            } else {
              console.error('Failed to send ICE candidate after retries:', error);
            }
          }
        };
        sendCandidate();
      } else {
        logDiagnostics('ICE gathering complete (null candidate received)');
      }
    };

    // Handle incoming remote stream with audio element attachment
    peerConnection.ontrack = (event) => {
      logDiagnostics('Remote track received', { 
        streams: event.streams.length,
        track: event.track.kind,
        trackId: event.track.id,
      });
      
      markProgress(); // Mark progress when remote track is received
      
      const remoteStream = event.streams[0];
      const trackCount = remoteStream.getTracks().length;
      
      setConnection(prev => ({ 
        ...prev, 
        remoteStream,
        state: 'connected',
        diagnostics: { ...prev.diagnostics, remoteTracksCount: trackCount },
      }));

      // Attach remote stream to audio element for playback
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().then(() => {
          logDiagnostics('Remote audio playback started successfully');
          toast.success('Connected! Two-way audio active! 🎉');
          setConnection(prev => ({ ...prev, autoplayBlocked: false }));
        }).catch(err => {
          console.error('Error playing remote audio (autoplay blocked):', err);
          logDiagnostics('Autoplay blocked - user interaction required', { error: err.message });
          setConnection(prev => ({ ...prev, autoplayBlocked: true }));
          toast.error('Audio ready! Click "Start Audio" to hear your peer.');
        });
      }
      
      // Clear signaling timeout on successful connection
      clearSignalingTimeout();
      retryAttemptsRef.current = 0;
    };

    // Monitor connection state with detailed logging
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      logDiagnostics('Connection state changed', { state });
      updateDiagnostics({ connectionState: state });
      
      if (state === 'connected') {
        markProgress(); // Mark progress when connected
        setConnection(prev => ({ ...prev, state: 'connected', connectionQuality: 'good' }));
        logDiagnostics('Peer connection established successfully');
        clearSignalingTimeout();
      } else if (state === 'disconnected') {
        setConnection(prev => ({ ...prev, state: 'disconnected', connectionQuality: 'poor' }));
        logDiagnostics('Connection disconnected, attempting recovery...');
        toast.error('Connection lost. Reconnecting... 😿');
        
        // Attempt automatic reconnection
        if (retryAttemptsRef.current < MAX_RETRY_ATTEMPTS) {
          retryAttemptsRef.current++;
          updateDiagnostics({ retryAttempts: retryAttemptsRef.current });
          
          retryTimeoutRef.current = setTimeout(() => {
            logDiagnostics(`Retry attempt ${retryAttemptsRef.current}/${MAX_RETRY_ATTEMPTS}`);
            toast.info(`Reconnecting... (Attempt ${retryAttemptsRef.current}/${MAX_RETRY_ATTEMPTS}) 🔄`);
            // Trigger ICE restart
            if (peerConnectionRef.current) {
              peerConnectionRef.current.restartIce();
            }
          }, RETRY_DELAY);
        } else {
          logDiagnostics('Max retry attempts reached');
          setConnection(prev => ({ 
            ...prev, 
            state: 'error',
            error: 'Connection failed after multiple attempts. Please try again.',
          }));
          updateDiagnostics({ lastError: 'Max retry attempts exceeded' });
          toast.error('Connection failed. Please try matching again! 😿');
        }
      } else if (state === 'failed') {
        logDiagnostics('Connection failed');
        setConnection(prev => ({ 
          ...prev, 
          state: 'error',
          error: 'Connection failed. This may be due to network restrictions.',
        }));
        updateDiagnostics({ lastError: 'Connection failed' });
        toast.error('Connection failed. Check your network and try again! 😿');
      } else if (state === 'closed') {
        logDiagnostics('Connection closed');
        setConnection(prev => ({ ...prev, state: 'idle' }));
      }
    };

    // Monitor ICE connection state for quality and diagnostics
    peerConnection.oniceconnectionstatechange = () => {
      const iceState = peerConnection.iceConnectionState;
      logDiagnostics('ICE connection state changed', { iceState });
      updateDiagnostics({ iceConnectionState: iceState });
      
      if (iceState === 'checking') {
        markProgress(); // Mark progress when checking ICE
        setConnection(prev => ({ ...prev, connectionQuality: 'fair' }));
        logDiagnostics('Checking ICE candidates...');
      } else if (iceState === 'connected' || iceState === 'completed') {
        markProgress(); // Mark progress when ICE connected
        setConnection(prev => ({ ...prev, connectionQuality: 'good' }));
        logDiagnostics('ICE connection established');
      } else if (iceState === 'disconnected') {
        setConnection(prev => ({ ...prev, connectionQuality: 'poor' }));
        logDiagnostics('ICE connection disconnected');
      } else if (iceState === 'failed') {
        logDiagnostics('ICE connection failed - may need TURN server');
        updateDiagnostics({ lastError: 'ICE connection failed' });
      }
    };

    // Monitor ICE gathering state
    peerConnection.onicegatheringstatechange = () => {
      const gatheringState = peerConnection.iceGatheringState;
      logDiagnostics('ICE gathering state changed', { gatheringState });
      updateDiagnostics({ iceGatheringState: gatheringState });
      
      if (gatheringState === 'gathering') {
        markProgress(); // Mark progress when gathering ICE
      }
    };

    // Monitor signaling state
    peerConnection.onsignalingstatechange = () => {
      const signalingState = peerConnection.signalingState;
      logDiagnostics('Signaling state changed', { signalingState });
      updateDiagnostics({ signalingState });
      
      if (signalingState === 'have-remote-offer' || signalingState === 'have-local-offer') {
        markProgress(); // Mark progress when offer/answer exchanged
      }
    };

    return peerConnection;
  }, [exchangeCandidatesMutation, logDiagnostics, updateDiagnostics, markProgress, clearSignalingTimeout]);

  // Start connection as offer creator (caller) with timeout and retry
  const startConnection = useCallback(async (peer: Principal) => {
    try {
      logDiagnostics('Starting connection as offer creator', { peer: peer.toString() });
      
      // Perform full cleanup before starting new connection
      performFullCleanup();
      
      // Ensure we have local stream before starting connection
      if (!localStreamRef.current) {
        logDiagnostics('No local stream available, requesting microphone permission');
        await requestMicrophonePermission();
      }

      if (!localStreamRef.current) {
        throw new Error('Failed to obtain local media stream');
      }

      setConnection(prev => ({ ...prev, state: 'connecting', peer, error: null }));
      isOfferCreatorRef.current = true;
      retryAttemptsRef.current = 0;
      updateDiagnostics({ retryAttempts: 0, lastError: null });

      const peerConnection = initializePeerConnection(peer);
      
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await peerConnection.setLocalDescription(offer);
      
      markProgress(); // Mark progress when offer created
      
      logDiagnostics('Offer created and set as local description', {
        type: offer.type,
        sdp: offer.sdp?.substring(0, 100) + '...',
      });
      
      // Send offer to backend with retry logic
      const sendOffer = async (retries = 3): Promise<void> => {
        try {
          await createOfferMutation.mutateAsync({
            peer,
            offer: JSON.stringify(offer),
          });
          logDiagnostics('Offer sent to backend successfully');
          markProgress(); // Mark progress when offer sent
        } catch (error) {
          if (retries > 0) {
            logDiagnostics(`Failed to send offer, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return sendOffer(retries - 1);
          } else {
            throw new Error('Failed to send offer after multiple attempts');
          }
        }
      };

      await sendOffer();
      toast.info('Waiting for peer to accept... 🔄');

      // Start signaling timeout
      startSignalingTimeout();

    } catch (error: any) {
      console.error('Error starting connection:', error);
      logDiagnostics('Error starting connection', { error: error.message });
      
      const errorMessage = error.message || 'Failed to start connection. Please try again.';
      setConnection(prev => ({
        ...prev,
        state: 'error',
        error: errorMessage,
      }));
      updateDiagnostics({ lastError: errorMessage });
      toast.error(errorMessage);
      
      performFullCleanup();
    }
  }, [createOfferMutation, initializePeerConnection, logDiagnostics, requestMicrophonePermission, updateDiagnostics, markProgress, startSignalingTimeout, performFullCleanup]);

  // Accept connection as answer creator (callee)
  const acceptConnection = useCallback(async (peer: Principal) => {
    try {
      logDiagnostics('Accepting connection as answer creator', { peer: peer.toString() });
      
      // Perform full cleanup before accepting new connection
      performFullCleanup();
      
      // Ensure we have local stream
      if (!localStreamRef.current) {
        logDiagnostics('No local stream available, requesting microphone permission');
        await requestMicrophonePermission();
      }

      if (!localStreamRef.current) {
        throw new Error('Failed to obtain local media stream');
      }

      setConnection(prev => ({ ...prev, state: 'connecting', peer, error: null }));
      isOfferCreatorRef.current = false;
      retryAttemptsRef.current = 0;
      updateDiagnostics({ retryAttempts: 0, lastError: null });

      const peerConnection = initializePeerConnection(peer);

      // Start signaling timeout
      startSignalingTimeout();

      logDiagnostics('Waiting for offer from peer...');
      toast.info('Connecting to peer... 🔄');

    } catch (error: any) {
      console.error('Error accepting connection:', error);
      logDiagnostics('Error accepting connection', { error: error.message });
      
      const errorMessage = error.message || 'Failed to accept connection. Please try again.';
      setConnection(prev => ({
        ...prev,
        state: 'error',
        error: errorMessage,
      }));
      updateDiagnostics({ lastError: errorMessage });
      toast.error(errorMessage);
      
      performFullCleanup();
    }
  }, [initializePeerConnection, logDiagnostics, requestMicrophonePermission, updateDiagnostics, startSignalingTimeout, performFullCleanup]);

  // Process signaling data from backend
  useEffect(() => {
    if (!signalingData || !peerConnectionRef.current || !connection.peer) return;

    const processSignaling = async () => {
      try {
        const peerConnection = peerConnectionRef.current;
        if (!peerConnection || !connection.peer) return;

        // Process offer (for answer creator)
        if (signalingData.offer && !isOfferCreatorRef.current && peerConnection.signalingState === 'stable') {
          logDiagnostics('Processing received offer');
          const offer = JSON.parse(signalingData.offer);
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          markProgress(); // Mark progress when offer processed
          
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          markProgress(); // Mark progress when answer created
          
          logDiagnostics('Answer created and set as local description');
          
          await sendAnswerMutation.mutateAsync({
            peer: connection.peer,
            answer: JSON.stringify(answer),
          });
          markProgress(); // Mark progress when answer sent
          
          logDiagnostics('Answer sent to backend');
          toast.success('Connection established! 🎉');
        }

        // Process answer (for offer creator)
        if (signalingData.answer && isOfferCreatorRef.current && peerConnection.signalingState === 'have-local-offer') {
          logDiagnostics('Processing received answer');
          const answer = JSON.parse(signalingData.answer);
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
          markProgress(); // Mark progress when answer processed
          logDiagnostics('Remote description set from answer');
        }

        // Process ICE candidates with deduplication
        if (signalingData.iceCandidates && signalingData.iceCandidates.length > 0) {
          for (const candidateString of signalingData.iceCandidates) {
            if (processedCandidatesRef.current.has(candidateString)) {
              continue; // Skip already processed candidates
            }
            
            processedCandidatesRef.current.add(candidateString);
            
            try {
              const candidate = JSON.parse(candidateString);
              
              if (peerConnection.remoteDescription) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                markProgress(); // Mark progress when ICE candidate added
                logDiagnostics('ICE candidate added', { type: candidate.type });
              } else {
                iceCandidatesQueueRef.current.push(new RTCIceCandidate(candidate));
                logDiagnostics('ICE candidate queued (no remote description yet)');
              }
            } catch (error) {
              console.error('Error processing ICE candidate:', error);
            }
          }
        }

        // Process queued candidates if remote description is now set
        if (peerConnection.remoteDescription && iceCandidatesQueueRef.current.length > 0) {
          logDiagnostics('Processing queued ICE candidates', { count: iceCandidatesQueueRef.current.length });
          for (const candidate of iceCandidatesQueueRef.current) {
            try {
              await peerConnection.addIceCandidate(candidate);
              markProgress(); // Mark progress when queued candidate added
              logDiagnostics('Queued ICE candidate added');
            } catch (error) {
              console.error('Error adding queued ICE candidate:', error);
            }
          }
          iceCandidatesQueueRef.current = [];
        }
      } catch (error) {
        console.error('Error processing signaling data:', error);
        logDiagnostics('Error processing signaling data', { error });
      }
    };

    processSignaling();
  }, [signalingData, connection.peer, sendAnswerMutation, logDiagnostics, markProgress]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setConnection(prev => ({ ...prev, isMuted: !audioTrack.enabled }));
        logDiagnostics('Mute toggled', { muted: !audioTrack.enabled });
        toast.info(audioTrack.enabled ? 'Microphone unmuted 🎤' : 'Microphone muted 🔇');
      }
    }
  }, [logDiagnostics]);

  // Disconnect and cleanup
  const disconnect = useCallback(async () => {
    logDiagnostics('Disconnect requested');
    
    performFullCleanup();
    
    setConnection(prev => ({
      ...prev,
      state: 'idle',
      remoteStream: null,
      peer: null,
      error: null,
      connectionQuality: 'good',
      autoplayBlocked: false,
      diagnostics: {
        ...prev.diagnostics,
        signalingState: 'stable',
        iceConnectionState: 'new',
        iceGatheringState: 'new',
        connectionState: 'new',
        retryAttempts: 0,
        usingTurnServer: false,
        remoteTracksCount: 0,
      },
    }));
    
    logDiagnostics('Disconnected and cleaned up');
  }, [performFullCleanup, logDiagnostics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      performFullCleanup();
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    };
  }, [performFullCleanup]);

  return {
    connection,
    requestMicrophonePermission,
    startConnection,
    acceptConnection,
    toggleMute,
    disconnect,
    resumeRemoteAudioPlayback,
  };
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Youtube, AlertCircle, Loader2, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { Principal } from '@dfinity/principal';
import { parseYouTubeUrl } from '../lib/youtube';
import { useYouTubeIFramePlayer } from '../hooks/useYouTubeIFramePlayer';
import { useGetYouTubeSessionState, useSetYouTubeSessionState, useCleanupYouTubeSessionState } from '../hooks/useQueries';
import type { YoutubeSessionState } from '../backend';

const YOUTUBE_PLAYER_STATES = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
};

export default function ViewTogetherPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/view-together' }) as { peer?: string };
  
  const [peerInput, setPeerInput] = useState(searchParams.peer || '');
  const [peer, setPeer] = useState<Principal | null>(null);
  const [youtubeInput, setYoutubeInput] = useState('');
  const [currentVideoId, setCurrentVideoId] = useState<string>('');
  const [validationError, setValidationError] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  // Track local state to implement last-write-wins
  const localVersionRef = useRef<number>(0);
  const localLastUpdatedRef = useRef<number>(0);
  const isApplyingRemoteUpdateRef = useRef(false);
  const lastPlayerStateRef = useRef<number>(-1);

  // Backend queries
  const { data: sessionState, isLoading: sessionLoading } = useGetYouTubeSessionState(peer, isSessionActive);
  const setSessionState = useSetYouTubeSessionState();
  const cleanupSession = useCleanupYouTubeSessionState();

  // YouTube player
  const {
    containerRef,
    isReady: playerReady,
    play,
    pause,
    seekTo,
    getCurrentTime,
    getPlayerState,
  } = useYouTubeIFramePlayer({
    videoId: currentVideoId,
    onStateChange: (state) => {
      // Only send updates if this is a user-initiated action (not from remote sync)
      if (isApplyingRemoteUpdateRef.current) return;
      
      // Debounce state changes to avoid rapid updates
      if (lastPlayerStateRef.current === state) return;
      lastPlayerStateRef.current = state;

      const isPlaying = state === YOUTUBE_PLAYER_STATES.PLAYING;
      const isPaused = state === YOUTUBE_PLAYER_STATES.PAUSED;

      if (isPlaying || isPaused) {
        sendStateUpdate(isPlaying);
      }
    },
  });

  // Initialize peer from URL params
  useEffect(() => {
    if (searchParams.peer) {
      try {
        const principal = Principal.fromText(searchParams.peer);
        setPeer(principal);
        setPeerInput(searchParams.peer);
      } catch (e) {
        console.error('Invalid peer principal in URL:', e);
      }
    }
  }, [searchParams.peer]);

  // Apply remote updates when session state changes
  useEffect(() => {
    if (!sessionState || !playerReady || !peer) return;

    // Check if remote update is newer than our last local update
    const remoteUpdated = Number(sessionState.lastUpdated);
    const remoteVersion = Number(sessionState.version);

    if (remoteUpdated <= localLastUpdatedRef.current && remoteVersion <= localVersionRef.current) {
      // Our local state is newer or equal, ignore remote update
      return;
    }

    // Apply remote update
    isApplyingRemoteUpdateRef.current = true;

    try {
      // Update video if changed
      if (sessionState.videoId !== currentVideoId) {
        setCurrentVideoId(sessionState.videoId);
      }

      // Sync playback position (with tolerance to avoid constant seeking)
      const currentTime = getCurrentTime();
      const targetTime = Number(sessionState.playbackPosition);
      const timeDiff = Math.abs(currentTime - targetTime);

      if (timeDiff > 2) {
        // Only seek if difference is more than 2 seconds
        seekTo(targetTime);
      }

      // Sync play/pause state
      const currentState = getPlayerState();
      const isCurrentlyPlaying = currentState === YOUTUBE_PLAYER_STATES.PLAYING;

      if (sessionState.isPlaying && !isCurrentlyPlaying) {
        play();
      } else if (!sessionState.isPlaying && isCurrentlyPlaying) {
        pause();
      }

      // Update local tracking
      localVersionRef.current = remoteVersion;
      localLastUpdatedRef.current = remoteUpdated;
    } finally {
      // Reset flag after a short delay to allow player state to settle
      setTimeout(() => {
        isApplyingRemoteUpdateRef.current = false;
      }, 500);
    }
  }, [sessionState, playerReady, peer, currentVideoId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (peer && isSessionActive) {
        cleanupSession.mutate(peer);
      }
    };
  }, [peer, isSessionActive]);

  const handleSetPeer = () => {
    setValidationError('');
    try {
      const principal = Principal.fromText(peerInput.trim());
      setPeer(principal);
      toast.success('Peer connected! 🎉');
    } catch (e) {
      setValidationError('Invalid principal ID. Please enter a valid peer principal.');
    }
  };

  const handleStartSession = () => {
    setValidationError('');
    
    const parseResult = parseYouTubeUrl(youtubeInput);
    if (!parseResult.success) {
      setValidationError(parseResult.error || 'Invalid YouTube URL');
      return;
    }

    if (!peer) {
      setValidationError('Please set a peer first');
      return;
    }

    setCurrentVideoId(parseResult.videoId!);
    setIsSessionActive(true);
    
    // Send initial state
    sendStateUpdate(false, parseResult.videoId);
    
    toast.success('Session started! 🎬');
  };

  const sendStateUpdate = (isPlaying: boolean, videoId?: string) => {
    if (!peer || !playerReady) return;

    const currentTime = getCurrentTime();
    const newVersion = localVersionRef.current + 1;
    const newLastUpdated = Date.now() * 1_000_000; // Convert to nanoseconds

    const state: YoutubeSessionState = {
      videoId: videoId || currentVideoId,
      playbackPosition: BigInt(Math.floor(currentTime)),
      isPlaying,
      version: BigInt(newVersion),
      lastUpdated: BigInt(newLastUpdated),
    };

    localVersionRef.current = newVersion;
    localLastUpdatedRef.current = newLastUpdated;

    setSessionState.mutate({ peer, state });
  };

  const handleEndSession = () => {
    if (peer) {
      cleanupSession.mutate(peer);
    }
    setIsSessionActive(false);
    setCurrentVideoId('');
    setYoutubeInput('');
    localVersionRef.current = 0;
    localLastUpdatedRef.current = 0;
    toast.success('Session ended 👋');
  };

  return (
    <div className="min-h-screen py-8 sm:py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: '/friends' })}
          className="mb-6 gap-2 hover:bg-accent/50 rounded-2xl"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Friends
        </Button>

        <Card className="border-2 shadow-cat-lg rounded-3xl">
          <CardHeader className="border-b border-border p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <Youtube className="h-8 w-8 text-red-500" />
              <CardTitle className="text-3xl sm:text-4xl font-bold">
                View Together
              </CardTitle>
              {isSessionActive && (
                <Badge className="bg-green-500/20 text-green-600 border-green-500/50 text-sm px-3 py-1 rounded-full">
                  Live 🔴
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Peer Selection */}
            {!isSessionActive && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="peer" className="text-base font-semibold">
                    Friend's Principal ID
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="peer"
                      value={peerInput}
                      onChange={(e) => setPeerInput(e.target.value)}
                      placeholder="Enter friend's principal ID..."
                      className="flex-1 h-12 text-base rounded-2xl"
                      disabled={!!peer}
                    />
                    {!peer ? (
                      <Button
                        onClick={handleSetPeer}
                        className="h-12 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90"
                      >
                        Connect
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          setPeer(null);
                          setPeerInput('');
                        }}
                        variant="outline"
                        className="h-12 px-6 rounded-2xl"
                      >
                        Change
                      </Button>
                    )}
                  </div>
                  {peer && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      ✓ Connected to peer
                    </p>
                  )}
                </div>

                {/* YouTube URL Input */}
                {peer && (
                  <div className="space-y-2">
                    <Label htmlFor="youtube" className="text-base font-semibold">
                      YouTube Video
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="youtube"
                        value={youtubeInput}
                        onChange={(e) => {
                          setYoutubeInput(e.target.value);
                          setValidationError('');
                        }}
                        placeholder="Paste YouTube URL or video ID..."
                        className="flex-1 h-12 text-base rounded-2xl"
                      />
                      <Button
                        onClick={handleStartSession}
                        disabled={!youtubeInput.trim()}
                        className="h-12 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90"
                      >
                        <Play className="h-5 w-5 mr-2" />
                        Start
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Supports: youtube.com/watch?v=..., youtu.be/..., or video ID
                    </p>
                  </div>
                )}

                {validationError && (
                  <Alert variant="destructive" className="rounded-2xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{validationError}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Active Session */}
            {isSessionActive && currentVideoId && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Now watching</p>
                    <p className="font-mono text-sm">{currentVideoId}</p>
                  </div>
                  <Button
                    onClick={handleEndSession}
                    variant="destructive"
                    className="rounded-2xl"
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    End Session
                  </Button>
                </div>

                {/* YouTube Player */}
                <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden">
                  {!playerReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                      <Loader2 className="h-12 w-12 animate-spin text-white" />
                    </div>
                  )}
                  <div ref={containerRef} className="w-full h-full" />
                </div>

                {sessionLoading && (
                  <Alert className="rounded-2xl">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>Syncing with peer...</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Empty State */}
            {!isSessionActive && !peer && (
              <div className="text-center py-12 space-y-4">
                <Youtube className="h-20 w-20 mx-auto text-muted-foreground/50" />
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Watch YouTube Together</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Connect with a friend and watch YouTube videos in sync. Perfect for movie nights! 🍿
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

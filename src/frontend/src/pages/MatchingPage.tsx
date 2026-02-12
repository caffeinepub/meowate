import { useState, useEffect } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile, useGetCallerSubscription, useUpdateActivity, useGetActiveUserCount, useFindEligiblePeer } from '../hooks/useQueries';
import { useWebRTC } from '../hooks/useWebRTC';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Heart, X, Mic, MicOff, Phone, UserPlus, AlertCircle, Signal, SignalHigh, SignalLow, Info, RefreshCw, Volume2, Play, LogIn, ChevronDown, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { Principal } from '@dfinity/principal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type ConnectionState = 'idle' | 'searching' | 'connecting' | 'deciding' | 'waiting' | 'connected' | 'ended';

export default function MatchingPage() {
  const { identity, login } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched: profileFetched, error: profileError } = useGetCallerUserProfile();
  const { data: subscription } = useGetCallerSubscription();
  const { data: activeUserCount = 0 } = useGetActiveUserCount();
  const updateActivity = useUpdateActivity();
  const findEligiblePeer = useFindEligiblePeer();
  const navigate = useNavigate();

  const { connection, requestMicrophonePermission, startConnection, acceptConnection, toggleMute, disconnect, resumeRemoteAudioPlayback } = useWebRTC();

  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [decisionTimer, setDecisionTimer] = useState(23);
  const [callDuration, setCallDuration] = useState(0);
  const [canSendFriendRequest, setCanSendFriendRequest] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [matchedPeer, setMatchedPeer] = useState<Principal | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const isPremium = subscription?.isActive || false;
  const maxCallDuration = isPremium ? Infinity : 23 * 60;

  // Check for auth errors and prompt login
  useEffect(() => {
    if (profileError) {
      const errorMsg = String(profileError);
      if (errorMsg.includes('Unauthorized') || errorMsg.includes('Only users can')) {
        toast.error('Please log in to access matching', {
          duration: 5000,
          action: {
            label: 'Log In',
            onClick: () => login(),
          },
        });
      }
    }
  }, [profileError, login]);

  // Guard: redirect if not authenticated or profile not loaded
  useEffect(() => {
    if (!identity) {
      return; // Wait for identity to load
    }
    
    // Wait for profile query to complete
    if (profileLoading || !profileFetched) {
      return;
    }

    // If profile query completed but no profile exists, user needs onboarding
    if (userProfile === null) {
      navigate({ to: '/' });
      return;
    }

    // If profile exists but onboarding not complete, redirect
    if (userProfile && !userProfile.onboardingComplete) {
      navigate({ to: '/' });
      return;
    }
  }, [identity, userProfile, profileLoading, profileFetched, navigate]);

  // Update activity on mount and when starting matching
  useEffect(() => {
    if (identity && userProfile?.onboardingComplete) {
      updateActivity.mutate();
    }
  }, [identity, userProfile?.onboardingComplete]);

  // Sync WebRTC connection state with UI state
  useEffect(() => {
    if (connection.state === 'connected' && connectionState !== 'connected') {
      setConnectionState('connected');
    } else if (connection.state === 'disconnected' && connectionState === 'connected') {
      handleEndCall();
    } else if (connection.state === 'error') {
      const errorMsg = connection.error || 'Connection error occurred';
      
      // Parse error for actionable feedback
      if (errorMsg.includes('AUTH_REQUIRED')) {
        toast.error('Please log in to continue', {
          action: {
            label: 'Log In',
            onClick: () => login(),
          },
        });
      } else if (errorMsg.includes('PEER_INVALID')) {
        toast.error('The other user is no longer available. Please try a new match.');
      } else {
        toast.error(errorMsg);
      }
      
      // Reset to idle state when error occurs
      setConnectionState('idle');
      setMatchedPeer(null);
    }
  }, [connection.state, connection.error, connectionState, login]);

  // Decision timer countdown
  useEffect(() => {
    if (connectionState === 'deciding' && decisionTimer > 0) {
      const timer = setTimeout(() => setDecisionTimer(decisionTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (connectionState === 'deciding' && decisionTimer === 0) {
      handleSkip();
    }
  }, [connectionState, decisionTimer]);

  // Call duration timer
  useEffect(() => {
    if (connectionState === 'connected') {
      const timer = setInterval(() => {
        setCallDuration((prev) => {
          const newDuration = prev + 1;
          
          if (newDuration === 360) {
            setCanSendFriendRequest(true);
            toast.success('Meow-velous! You can now send a friend request! 🐾');
          }
          
          if (!isPremium && newDuration >= maxCallDuration) {
            handleEndCall();
            toast.info('Free session ended. Upgrade to Premium for unlimited calls! 😺', {
              duration: 5000,
            });
          }
          
          return newDuration;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [connectionState, isPremium, maxCallDuration]);

  const handleStartMatching = async () => {
    // Update activity to mark user as active
    updateActivity.mutate();

    // Check if there are other active users available
    if (activeUserCount < 2) {
      toast.error('No other users online right now. Try again in a moment! 😿', {
        duration: 4000,
      });
      return;
    }

    // Request microphone permission first
    if (!micPermissionGranted) {
      try {
        await requestMicrophonePermission();
        setMicPermissionGranted(true);
      } catch (error) {
        // Error already handled in useWebRTC hook
        return;
      }
    }

    setConnectionState('searching');
    toast.info('Searching for available users... 🔍');
    
    try {
      // Find an eligible peer from the backend
      const peer = await findEligiblePeer.mutateAsync();
      
      if (!peer) {
        // No peers available
        toast.error('No users available for matching right now. Please try again in a moment! 😿', {
          duration: 5000,
        });
        setConnectionState('idle');
        return;
      }
      
      setMatchedPeer(peer);
      setConnectionState('connecting');
      toast.info('Found a match! Establishing connection... 🎉');
      
      // Start WebRTC connection with signaling
      await startConnection(peer);
      
      // Move to decision phase after connection is established
      setTimeout(() => {
        setConnectionState('deciding');
        setDecisionTimer(23);
      }, 2000);
    } catch (error: any) {
      console.error('Error during matching:', error);
      const errorMsg = error?.message || String(error);
      
      if (errorMsg === 'ONBOARDING_REQUIRED') {
        toast.error('Please complete your profile setup first', {
          action: {
            label: 'Setup',
            onClick: () => navigate({ to: '/' }),
          },
        });
      } else if (errorMsg === 'ACTIVITY_REQUIRED') {
        toast.error('Please allow microphone access and stay active');
      } else if (errorMsg === 'AUTH_REQUIRED') {
        toast.error('Please log in to continue', {
          action: {
            label: 'Log In',
            onClick: () => login(),
          },
        });
      } else {
        toast.error('Failed to find a match. Please try again! 😿');
      }
      
      setConnectionState('idle');
      setMatchedPeer(null);
    }
  };

  const handleRetryConnection = async () => {
    // Clean disconnect first
    await disconnect();
    
    // Reset UI state
    setConnectionState('idle');
    setCallDuration(0);
    setCanSendFriendRequest(false);
    setFriendRequestSent(false);
    setDecisionTimer(23);
    setMatchedPeer(null);
    
    // Wait a moment before retrying
    setTimeout(() => {
      handleStartMatching();
    }, 500);
  };

  const handleRequestMicPermission = async () => {
    try {
      await requestMicrophonePermission();
      setMicPermissionGranted(true);
    } catch (error) {
      // Error already handled in useWebRTC hook
    }
  };

  const handleAccept = () => {
    setConnectionState('connected');
    toast.success('Great match! Enjoy your conversation! 🎉');
  };

  const handleSkip = async () => {
    await disconnect();
    setConnectionState('idle');
    setCallDuration(0);
    setCanSendFriendRequest(false);
    setFriendRequestSent(false);
    setDecisionTimer(23);
    setMatchedPeer(null);
    toast.info('Skipped. Ready for next match! 🐾');
  };

  const handleEndCall = async () => {
    await disconnect();
    setConnectionState('ended');
    setMatchedPeer(null);
    
    setTimeout(() => {
      setConnectionState('idle');
      setCallDuration(0);
      setCanSendFriendRequest(false);
      setFriendRequestSent(false);
      setDecisionTimer(23);
    }, 3000);
  };

  const handleSendFriendRequest = () => {
    setFriendRequestSent(true);
    toast.success('Friend request sent! 🐾');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectionQualityIcon = () => {
    switch (connection.connectionQuality) {
      case 'good':
        return <SignalHigh className="h-5 w-5 text-success" />;
      case 'fair':
        return <Signal className="h-5 w-5 text-warning" />;
      case 'poor':
        return <SignalLow className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusMessage = () => {
    if (connectionState === 'searching') {
      return 'Searching for available users...';
    } else if (connectionState === 'connecting') {
      const { signalingState, iceConnectionState, connectionState: rtcState } = connection.diagnostics;
      
      if (signalingState === 'have-local-offer' || signalingState === 'have-remote-offer') {
        return 'Exchanging connection details...';
      } else if (iceConnectionState === 'checking') {
        return 'Establishing peer connection via relay...';
      } else if (iceConnectionState === 'connected' || iceConnectionState === 'completed') {
        return 'Connection established!';
      } else if (rtcState === 'connecting') {
        return 'Connecting to peer via relay server...';
      } else {
        return 'Initializing connection...';
      }
    } else if (connectionState === 'connected') {
      return 'Connected - Enjoy your conversation!';
    } else if (connection.state === 'error') {
      return 'Connection error - Please retry';
    } else {
      return 'Ready to match';
    }
  };

  // Show login prompt if not authenticated
  if (!identity) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-md mx-auto border-2 shadow-cat">
          <CardContent className="p-8 text-center space-y-6">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 flex items-center justify-center">
                <LogIn className="h-10 w-10 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Login Required</h2>
              <p className="text-muted-foreground">
                Please log in with Internet Identity to start matching with other users.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => login()}
              className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90"
            >
              Log In with Internet Identity
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading while profile is being fetched
  if (profileLoading || !profileFetched) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center space-y-4">
          <div className="inline-block h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
            Voice Matching
          </h1>
          <p className="text-muted-foreground text-lg">
            Connect with real people through voice chat
          </p>
          <div className="flex items-center justify-center gap-2 text-sm">
            <Badge variant="outline" className="gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              {activeUserCount} users online
            </Badge>
          </div>
        </div>

        {/* Status Message */}
        {(connectionState === 'searching' || connectionState === 'connecting' || connectionState === 'connected') && (
          <Alert className="border-primary bg-primary/10">
            <Info className="h-5 w-5 text-primary" />
            <AlertTitle className="text-primary font-semibold">Status</AlertTitle>
            <AlertDescription>
              <p className="text-foreground">{getStatusMessage()}</p>
              {connection.diagnostics.usingTurnServer && (connectionState === 'connecting' || connectionState === 'connected') && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Radio className="h-4 w-4 text-success" />
                  <span>Using relay server for secure connection</span>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Microphone Permission Denial Alert */}
        {connection.micPermissionDenied && (
          <Alert className="border-destructive bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <AlertTitle className="text-destructive font-semibold">Microphone Access Denied</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>Voice matching requires microphone access. Please allow access in your browser:</p>
              <div className="space-y-2 text-sm">
                <p className="font-semibold">Chrome/Edge:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Click the lock icon in the address bar</li>
                  <li>Find "Microphone" and select "Allow"</li>
                  <li>Reload the page</li>
                </ol>
                <p className="font-semibold mt-3">Firefox:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Click the microphone icon in the address bar</li>
                  <li>Select "Allow" and check "Remember this decision"</li>
                  <li>Reload the page</li>
                </ol>
                <p className="font-semibold mt-3">Safari:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Go to Safari → Settings → Websites → Microphone</li>
                  <li>Find this site and select "Allow"</li>
                  <li>Reload the page</li>
                </ol>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestMicPermission}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Autoplay Blocked Alert */}
        {connection.autoplayBlocked && connectionState === 'connected' && (
          <Alert className="border-warning bg-warning/10">
            <Volume2 className="h-5 w-5 text-warning" />
            <AlertTitle className="text-warning font-semibold">Audio Ready</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Your browser blocked automatic audio playback. Click the button below to hear your peer:</p>
              <Button
                variant="default"
                size="sm"
                onClick={resumeRemoteAudioPlayback}
                className="mt-2 bg-warning hover:bg-warning/90 text-warning-foreground"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Audio
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Error Alert */}
        {connection.state === 'error' && connection.error && (
          <Alert className="border-destructive bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <AlertTitle className="text-destructive font-semibold">Connection Error</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{connection.error}</p>
              <div className="space-y-2 text-sm">
                <p className="font-semibold">Troubleshooting steps:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Check your internet connection</li>
                  <li>Ensure your firewall allows WebRTC connections</li>
                  <li>Try disabling VPN or proxy if active</li>
                  <li>Refresh the page and try again</li>
                </ul>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryConnection}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Matching Card */}
        <Card className="border-2 shadow-cat-lg">
          <CardContent className="p-8">
            {/* Idle State */}
            {connectionState === 'idle' && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="h-32 w-32 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 flex items-center justify-center animate-float">
                    <img src="/assets/generated/cat-paw-icon-transparent.dim_64x64.png" alt="Cat Paw" className="h-16 w-16" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Ready to Match?</h2>
                  <p className="text-muted-foreground">
                    Click below to start matching with someone new!
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={handleStartMatching}
                  disabled={activeUserCount < 2}
                  className="w-full max-w-xs bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90"
                >
                  Start Matching
                </Button>
                {activeUserCount < 2 && (
                  <p className="text-sm text-muted-foreground">
                    Waiting for more users to come online...
                  </p>
                )}
              </div>
            )}

            {/* Searching State */}
            {connectionState === 'searching' && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="h-32 w-32 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 flex items-center justify-center animate-spin">
                    <img src="/assets/generated/cat-loading-spinner-transparent.dim_80x80.png" alt="Loading" className="h-20 w-20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Searching...</h2>
                  <p className="text-muted-foreground">
                    Looking for available users to match with
                  </p>
                </div>
              </div>
            )}

            {/* Connecting State */}
            {connectionState === 'connecting' && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="h-32 w-32 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 flex items-center justify-center animate-pulse">
                    <Signal className="h-16 w-16 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Connecting...</h2>
                  <p className="text-muted-foreground">
                    Establishing secure connection via relay server
                  </p>
                </div>
                <Progress value={50} className="w-full max-w-xs mx-auto" />
              </div>
            )}

            {/* Deciding State */}
            {connectionState === 'deciding' && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="h-32 w-32 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">{decisionTimer}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Match Found!</h2>
                  <p className="text-muted-foreground">
                    Accept or skip this match
                  </p>
                </div>
                <div className="flex gap-4 justify-center">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleSkip}
                    className="gap-2"
                  >
                    <X className="h-5 w-5" />
                    Skip
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleAccept}
                    className="gap-2 bg-success hover:bg-success/90"
                  >
                    <Heart className="h-5 w-5" />
                    Accept
                  </Button>
                </div>
              </div>
            )}

            {/* Connected State */}
            {connectionState === 'connected' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getConnectionQualityIcon()}
                    <div>
                      <h3 className="font-semibold">Connected</h3>
                      <p className="text-sm text-muted-foreground">
                        Call Duration: {formatTime(callDuration)}
                      </p>
                    </div>
                  </div>
                  {!isPremium && (
                    <Badge variant="outline">
                      {formatTime(maxCallDuration - callDuration)} left
                    </Badge>
                  )}
                </div>

                <div className="flex gap-3 justify-center">
                  <Button
                    size="lg"
                    variant={connection.isMuted ? 'destructive' : 'outline'}
                    onClick={toggleMute}
                    className="gap-2"
                  >
                    {connection.isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    {connection.isMuted ? 'Unmute' : 'Mute'}
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleEndCall}
                    className="gap-2"
                  >
                    <Phone className="h-5 w-5" />
                    End Call
                  </Button>
                  {canSendFriendRequest && !friendRequestSent && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleSendFriendRequest}
                      className="gap-2"
                    >
                      <UserPlus className="h-5 w-5" />
                      Add Friend
                    </Button>
                  )}
                </div>

                {friendRequestSent && (
                  <p className="text-center text-sm text-success">
                    Friend request sent! 🐾
                  </p>
                )}
              </div>
            )}

            {/* Ended State */}
            {connectionState === 'ended' && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center">
                    <img src="/assets/generated/cat-paw-icon-transparent.dim_64x64.png" alt="Cat Paw" className="h-16 w-16 opacity-50" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Call Ended</h2>
                  <p className="text-muted-foreground">
                    Thanks for chatting! Ready for another match?
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diagnostics Panel */}
        {(connectionState === 'connecting' || connectionState === 'connected') && (
          <Collapsible open={showDiagnostics} onOpenChange={setShowDiagnostics}>
            <Card className="border-muted">
              <CardContent className="p-4">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Connection Diagnostics
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showDiagnostics ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Signaling State:</span>
                      <span className="ml-2 font-mono">{connection.diagnostics.signalingState}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ICE Connection:</span>
                      <span className="ml-2 font-mono">{connection.diagnostics.iceConnectionState}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ICE Gathering:</span>
                      <span className="ml-2 font-mono">{connection.diagnostics.iceGatheringState}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Connection State:</span>
                      <span className="ml-2 font-mono">{connection.diagnostics.connectionState}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Using TURN:</span>
                      <span className={`ml-2 font-mono ${connection.diagnostics.usingTurnServer ? 'text-success' : 'text-muted-foreground'}`}>
                        {connection.diagnostics.usingTurnServer ? 'Yes (Relay)' : 'No'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Retry Attempts:</span>
                      <span className="ml-2 font-mono">{connection.diagnostics.retryAttempts}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Local Tracks:</span>
                      <span className="ml-2 font-mono">{connection.diagnostics.localTracksCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Remote Tracks:</span>
                      <span className="ml-2 font-mono">{connection.diagnostics.remoteTracksCount}</span>
                    </div>
                  </div>
                  {connection.diagnostics.lastError && (
                    <div className="mt-3 p-2 bg-destructive/10 rounded text-destructive text-xs">
                      <span className="font-semibold">Last Error:</span> {connection.diagnostics.lastError}
                    </div>
                  )}
                </CollapsibleContent>
              </CardContent>
            </Card>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

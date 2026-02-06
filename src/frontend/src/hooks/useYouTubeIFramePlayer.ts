import { useEffect, useRef, useState } from 'react';

export interface YouTubePlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
}

export interface YouTubeIFrameAPI {
  Player: new (elementId: string, config: any) => YouTubePlayer;
  PlayerState: {
    UNSTARTED: number;
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

declare global {
  interface Window {
    YT?: YouTubeIFrameAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface UseYouTubeIFramePlayerOptions {
  videoId: string;
  onReady?: () => void;
  onStateChange?: (state: number) => void;
  onError?: (error: any) => void;
}

export function useYouTubeIFramePlayer(options: UseYouTubeIFramePlayerOptions) {
  const { videoId, onReady, onStateChange, onError } = options;
  const playerRef = useRef<YouTubePlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isAPIReady, setIsAPIReady] = useState(false);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT) {
      setIsAPIReady(true);
      return;
    }

    // Load the IFrame Player API code asynchronously
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // API will call this function when ready
    window.onYouTubeIframeAPIReady = () => {
      setIsAPIReady(true);
    };
  }, []);

  // Initialize player when API is ready
  useEffect(() => {
    if (!isAPIReady || !containerRef.current || !videoId) return;

    // Clean up existing player
    if (playerRef.current) {
      try {
        (playerRef.current as any).destroy?.();
      } catch (e) {
        console.error('Error destroying player:', e);
      }
      playerRef.current = null;
      setIsReady(false);
    }

    // Create unique ID for player container
    const playerId = `youtube-player-${Date.now()}`;
    containerRef.current.id = playerId;

    try {
      playerRef.current = new window.YT!.Player(playerId, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            setIsReady(true);
            onReady?.();
          },
          onStateChange: (event: any) => {
            onStateChange?.(event.data);
          },
          onError: (event: any) => {
            onError?.(event.data);
          },
        },
      });
    } catch (error) {
      console.error('Error creating YouTube player:', error);
      onError?.(error);
    }

    return () => {
      if (playerRef.current) {
        try {
          (playerRef.current as any).destroy?.();
        } catch (e) {
          console.error('Error destroying player on cleanup:', e);
        }
      }
    };
  }, [isAPIReady, videoId]);

  const play = () => {
    if (playerRef.current && isReady) {
      try {
        playerRef.current.playVideo();
      } catch (e) {
        console.error('Error playing video:', e);
      }
    }
  };

  const pause = () => {
    if (playerRef.current && isReady) {
      try {
        playerRef.current.pauseVideo();
      } catch (e) {
        console.error('Error pausing video:', e);
      }
    }
  };

  const seekTo = (seconds: number) => {
    if (playerRef.current && isReady) {
      try {
        playerRef.current.seekTo(seconds, true);
      } catch (e) {
        console.error('Error seeking video:', e);
      }
    }
  };

  const getCurrentTime = (): number => {
    if (playerRef.current && isReady) {
      try {
        return playerRef.current.getCurrentTime();
      } catch (e) {
        console.error('Error getting current time:', e);
      }
    }
    return 0;
  };

  const getPlayerState = (): number => {
    if (playerRef.current && isReady) {
      try {
        return playerRef.current.getPlayerState();
      } catch (e) {
        console.error('Error getting player state:', e);
      }
    }
    return -1; // UNSTARTED
  };

  return {
    containerRef,
    player: playerRef.current,
    isReady,
    play,
    pause,
    seekTo,
    getCurrentTime,
    getPlayerState,
  };
}

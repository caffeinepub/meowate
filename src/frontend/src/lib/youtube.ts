/**
 * YouTube URL parsing and validation utilities
 */

export interface YouTubeParseResult {
  success: boolean;
  videoId?: string;
  error?: string;
}

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - Raw video ID
 */
export function parseYouTubeUrl(input: string): YouTubeParseResult {
  if (!input || input.trim() === '') {
    return {
      success: false,
      error: 'Please enter a YouTube URL or video ID',
    };
  }

  const trimmedInput = input.trim();

  // Check if it's a raw video ID (11 characters, alphanumeric with - and _)
  const videoIdRegex = /^[a-zA-Z0-9_-]{11}$/;
  if (videoIdRegex.test(trimmedInput)) {
    return {
      success: true,
      videoId: trimmedInput,
    };
  }

  try {
    // Try to parse as URL
    const url = new URL(trimmedInput);

    // Handle youtube.com/watch?v=VIDEO_ID
    if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
      const videoId = url.searchParams.get('v');
      if (videoId && videoIdRegex.test(videoId)) {
        return {
          success: true,
          videoId,
        };
      }
      return {
        success: false,
        error: 'Invalid YouTube URL format. Please use a valid watch URL.',
      };
    }

    // Handle youtu.be/VIDEO_ID
    if (url.hostname === 'youtu.be') {
      const videoId = url.pathname.slice(1); // Remove leading slash
      if (videoId && videoIdRegex.test(videoId)) {
        return {
          success: true,
          videoId,
        };
      }
      return {
        success: false,
        error: 'Invalid YouTube short URL format.',
      };
    }

    return {
      success: false,
      error: 'Please enter a valid YouTube URL (youtube.com or youtu.be)',
    };
  } catch {
    // Not a valid URL, check if it might be a malformed video ID
    return {
      success: false,
      error: 'Invalid format. Please enter a YouTube URL or 11-character video ID.',
    };
  }
}

/**
 * Generate YouTube embed URL from video ID
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;
}

import { Config } from '../config';

const API_BASE_URL = Config.api.baseUrl;

export interface Caption {
  start: number;
  end: number;
  text: string;
}

export interface YouTubeSearchResponse {
  videoId: string;
  videoUrl: string;
  startTime: number;
  endTime: number;
  caption: string;
  captions: Caption[];
}

export type SearchStatus = 'queued' | 'searching' | 'downloading' | 'transcribing' | 'completed' | 'failed';

export interface YouTubeSearchStatusResponse {
  status: SearchStatus;
  message: string;
  currentVideoId?: string;
  error?: string;
  // When completed, includes all video data
  videoId?: string;
  videoUrl?: string;
  startTime?: number;
  endTime?: number;
  caption?: string;
  captions?: Caption[];
}

async function checkSearchStatus(query: string): Promise<YouTubeSearchStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/youtube/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch YouTube context');
  }

  return await response.json();
}

// Queue a word for YouTube search without waiting for completion
export async function queueWordForSearch(word: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/youtube/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: word }),
    });
  } catch (error) {
    console.error('Error queueing word for search:', error);
    // Don't throw - we don't want to block word saving if queueing fails
  }
}

export async function searchYouTubeContext(
  query: string,
  onStatusUpdate?: (status: SearchStatus, message: string, currentVideoId?: string) => void,
  abortSignal?: AbortSignal
): Promise<YouTubeSearchResponse> {
  try {
    // Initial request to queue the search
    let statusResponse = await checkSearchStatus(query);

    // Check if aborted
    if (abortSignal?.aborted) {
      throw new Error('Search cancelled');
    }

    // Notify initial status
    if (onStatusUpdate) {
      onStatusUpdate(statusResponse.status, statusResponse.message, statusResponse.currentVideoId);
    }

    // Poll until completed or failed
    while (statusResponse.status !== 'completed' && statusResponse.status !== 'failed') {
      // Check if aborted before waiting
      if (abortSignal?.aborted) {
        throw new Error('Search cancelled');
      }

      // Wait before polling again (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if aborted after waiting
      if (abortSignal?.aborted) {
        throw new Error('Search cancelled');
      }

      statusResponse = await checkSearchStatus(query);

      // Notify status update only if not aborted
      if (onStatusUpdate && !abortSignal?.aborted) {
        onStatusUpdate(statusResponse.status, statusResponse.message, statusResponse.currentVideoId);
      }
    }

    // Handle failed status
    if (statusResponse.status === 'failed') {
      throw new Error(statusResponse.error || 'Failed to find video');
    }

    // Return completed data
    return {
      videoId: statusResponse.videoId!,
      videoUrl: statusResponse.videoUrl!,
      startTime: statusResponse.startTime!,
      endTime: statusResponse.endTime!,
      caption: statusResponse.caption!,
      captions: statusResponse.captions!,
    };
  } catch (error) {
    console.error('Error searching YouTube context:', error);
    throw error;
  }
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import YoutubePlayer, { YoutubeIframeRef } from 'react-native-youtube-iframe';

interface YouTubePlayerProps {
  videoId: string;
  startTime: number;
  endTime?: number;
  onTimeUpdate?: (currentTime: number) => void;
}

export default function YouTubePlayerComponent({ 
  videoId, 
  startTime, 
  endTime,
  onTimeUpdate 
}: YouTubePlayerProps) {
  const playerRef = useRef<YoutubeIframeRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Autoplay when player is ready (with small delay for stability)
  const onReady = useCallback(() => {
    setIsReady(true);
    // Small delay to ensure player is fully initialized
    setTimeout(() => {
      setIsPlaying(true);
    }, 500);
  }, []);

  // Track current time and handle looping
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(async () => {
        if (playerRef.current) {
          try {
            const currentTime = await playerRef.current.getCurrentTime();
            onTimeUpdate?.(currentTime);

            // Loop back to start if we've passed the end time
            if (endTime && currentTime >= endTime) {
              playerRef.current.seekTo(startTime, true);
            }
          } catch (error) {
            // Silently handle errors during time tracking
          }
        }
      }, 250); // Update every 250ms for smooth caption sync
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, startTime, endTime, onTimeUpdate]);

  const onStateChange = useCallback((state: string) => {
    if (state === 'playing') {
      setIsPlaying(true);
    } else if (state === 'paused' || state === 'ended') {
      setIsPlaying(false);
    }

    // If video ended, loop back to start
    if (state === 'ended') {
      playerRef.current?.seekTo(startTime, true);
    }
  }, [startTime]);

  const togglePlayPause = async () => {
    if (!playerRef.current) return;

    try {
      if (isPlaying) {
        setIsPlaying(false);
      } else {
        // Seek to startTime if needed
        const currentTime = await playerRef.current.getCurrentTime();
        if (currentTime < startTime || (endTime && currentTime >= endTime)) {
          await playerRef.current.seekTo(startTime, true);
        }
        setIsPlaying(true);
      }
    } catch (error) {
      console.log('Error in togglePlayPause:', error);
    }
  };

  return (
    <View style={styles.container}>
      <YoutubePlayer
        ref={playerRef}
        height={220}
        videoId={videoId}
        play={isPlaying}
        onReady={onReady}
        onChangeState={onStateChange}
        webViewProps={{
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
        }}
        userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36"
        mediaPlaybackRequiresUserAction={((Platform.OS !== 'android') || (Platform.Version >= 17)) ? false : undefined}
        initialPlayerParams={{
          start: Math.floor(startTime),
          controls: true,
          modestbranding: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  playButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  playButtonDisabled: {
    backgroundColor: '#a0c4e8',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

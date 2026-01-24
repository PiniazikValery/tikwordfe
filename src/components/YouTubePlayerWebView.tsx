import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface YouTubePlayerProps {
  videoId: string;
  startTime: number;
  endTime?: number;
  onTimeUpdate?: (currentTime: number) => void;
}

export default function YouTubePlayerWebView({
  videoId,
  startTime,
  endTime,
  onTimeUpdate
}: YouTubePlayerProps) {
  const webViewRef = useRef<WebView>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // HTML content with YouTube IFrame API
  const youtubeHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * { margin: 0; padding: 0; }
        body { background-color: #000; overflow: hidden; }
        #player { width: 100%; height: 100vh; }
      </style>
    </head>
    <body>
      <div id="player"></div>
      <script>
        var player;
        var checkInterval;

        // Load YouTube IFrame API
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        // Called when API is ready
        function onYouTubeIframeAPIReady() {
          player = new YT.Player('player', {
            videoId: '${videoId}',
            playerVars: {
              autoplay: 0,
              controls: 1,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
              fs: 0,
              enablejsapi: 1,
              widget_referrer: 'https://www.youtube.com',
              start: ${Math.floor(startTime)}
            },
            events: {
              onReady: onPlayerReady,
              onStateChange: onPlayerStateChange,
              onError: onPlayerError
            }
          });
        }

        function onPlayerError(event) {
          var errorCode = event.data;
          var errorMessage = '';

          switch(errorCode) {
            case 2:
              errorMessage = 'Invalid video ID';
              break;
            case 5:
              errorMessage = 'HTML5 player error';
              break;
            case 100:
              errorMessage = 'Video not found or private';
              break;
            case 101:
            case 150:
              errorMessage = 'Video embedding disabled by owner';
              break;
            case 153:
              errorMessage = 'Video cannot be played in mobile app (Error 153)';
              break;
            default:
              errorMessage = 'Playback error (Code: ' + errorCode + ')';
          }

          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            errorCode: errorCode,
            errorMessage: errorMessage
          }));
        }

        function onPlayerReady(event) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ready'
          }));
        }

        function onPlayerStateChange(event) {
          var state = '';
          if (event.data === YT.PlayerState.PLAYING) {
            state = 'playing';
            startTimeTracking();
          } else if (event.data === YT.PlayerState.PAUSED) {
            state = 'paused';
            stopTimeTracking();
          } else if (event.data === YT.PlayerState.ENDED) {
            state = 'ended';
            stopTimeTracking();
          } else if (event.data === YT.PlayerState.BUFFERING) {
            state = 'buffering';
          }

          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'stateChange',
            state: state
          }));
        }

        function startTimeTracking() {
          stopTimeTracking();
          checkInterval = setInterval(function() {
            if (player && player.getCurrentTime) {
              var currentTime = player.getCurrentTime();
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'timeUpdate',
                currentTime: currentTime
              }));

              // Check if we need to loop
              ${endTime ? `
              if (currentTime >= ${endTime}) {
                player.seekTo(${startTime}, true);
              }
              ` : ''}
            }
          }, 250);
        }

        function stopTimeTracking() {
          if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
          }
        }

        // Handle messages from React Native
        window.addEventListener('message', function(event) {
          var data = JSON.parse(event.data);

          if (!player) return;

          switch(data.command) {
            case 'play':
              player.playVideo();
              break;
            case 'pause':
              player.pauseVideo();
              break;
            case 'seekTo':
              player.seekTo(data.time, true);
              break;
          }
        });

        document.addEventListener('message', function(event) {
          var data = JSON.parse(event.data);

          if (!player) return;

          switch(data.command) {
            case 'play':
              player.playVideo();
              break;
            case 'pause':
              player.pauseVideo();
              break;
            case 'seekTo':
              player.seekTo(data.time, true);
              break;
          }
        });
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'ready':
          console.log('Player ready');
          setIsReady(true);
          setIsLoading(false);
          setError(null);
          break;

        case 'stateChange':
          console.log('State changed to:', data.state);
          if (data.state === 'playing') {
            setIsPlaying(true);
          } else if (data.state === 'paused' || data.state === 'ended') {
            setIsPlaying(false);
          }
          break;

        case 'timeUpdate':
          onTimeUpdate?.(data.currentTime);
          break;

        case 'error':
          console.log('Player error:', data.errorCode, data.errorMessage);
          setError(data.errorMessage);
          setIsLoading(false);
          setIsReady(false);
          break;
      }
    } catch (error) {
      console.log('Error handling message:', error);
    }
  };

  const sendCommand = (command: string, params?: any) => {
    const message = JSON.stringify({ command, ...params });
    webViewRef.current?.postMessage(message);
  };

  const togglePlayPause = () => {
    console.log('Button pressed! Current isPlaying:', isPlaying);
    if (!isReady) {
      console.log('Player not ready');
      return;
    }

    if (isPlaying) {
      console.log('Sending pause command');
      sendCommand('pause');
    } else {
      console.log('Sending play command');
      sendCommand('play');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.playerContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: youtubeHTML }}
          style={styles.webview}
          onMessage={handleMessage}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          mixedContentMode="compatibility"
          allowsFullscreenVideo={true}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error:', nativeEvent);
          }}
        />
        {isLoading && !error && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
        {error && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorTitle}>⚠️ Playback Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Text style={styles.errorHint}>
              Try a different video or check if embedding is enabled
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.playButton, !isReady && styles.playButtonDisabled]}
        onPress={togglePlayPause}
        disabled={!isReady}
      >
        <Text style={styles.playButtonText}>
          {!isReady ? '⏳ Loading...' : isPlaying ? '⏸ Pause' : '▶️ Play'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  playerContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#000',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorMessage: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
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

import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Linking, Alert } from 'react-native';
import { WebView } from 'react-native-webview';

interface YouTubePlayerProps {
  videoId: string;
  startTime: number;
  endTime?: number;
  onTimeUpdate?: (currentTime: number) => void;
}

export default function YouTubePlayerSimple({
  videoId,
  startTime,
  endTime,
}: YouTubePlayerProps) {
  const [hasError, setHasError] = useState(false);

  // Simple iframe embed - sometimes works better than IFrame API on mobile
  const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${Math.floor(startTime)}${endTime ? `&end=${Math.floor(endTime)}` : ''}&autoplay=1&playsinline=1&controls=1&modestbranding=1&rel=0&enablejsapi=0`;

  const openInYouTube = async () => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(startTime)}s`;
    const youtubeAppUrl = `vnd.youtube://www.youtube.com/watch?v=${videoId}&t=${Math.floor(startTime)}s`;

    try {
      // Try to open in YouTube app first
      const supported = await Linking.canOpenURL(youtubeAppUrl);
      if (supported) {
        await Linking.openURL(youtubeAppUrl);
      } else {
        // Fall back to browser
        await Linking.openURL(youtubeUrl);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open YouTube');
    }
  };

  if (hasError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Video Unavailable</Text>
          <Text style={styles.errorMessage}>
            This video cannot be played in the app due to YouTube restrictions.
          </Text>
          <TouchableOpacity style={styles.openButton} onPress={openInYouTube}>
            <Text style={styles.openButtonText}>📱 Open in YouTube App</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: embedUrl }}
        style={styles.webview}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        onError={() => setHasError(true)}
        onHttpError={() => setHasError(true)}
      />
      <TouchableOpacity style={styles.fallbackButton} onPress={openInYouTube}>
        <Text style={styles.fallbackButtonText}>Open in YouTube</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  webview: {
    width: '100%',
    height: 220,
    backgroundColor: '#000',
  },
  errorContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderRadius: 8,
  },
  errorTitle: {
    color: '#ff6b6b',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  errorMessage: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  openButton: {
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  openButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fallbackButton: {
    backgroundColor: '#666',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  fallbackButtonText: {
    color: '#fff',
    fontSize: 12,
  },
});

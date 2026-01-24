import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Caption } from '../types';

interface CaptionsDisplayProps {
  captions: Caption[];
  currentTime: number;
  highlightWord?: string;
}

export default function CaptionsDisplay({ captions, currentTime, highlightWord }: CaptionsDisplayProps) {
  const { t } = useTranslation();
  const scrollViewRef = useRef<ScrollView>(null);
  const itemHeight = 60; // Approximate height of each caption item

  // Find the currently active caption based on video time
  const getActiveIndex = () => {
    for (let i = 0; i < captions.length; i++) {
      const caption = captions[i];
      // Check if current time falls within this caption's time range
      if (currentTime >= caption.start && currentTime <= caption.end) {
        return i;
      }
      // Also check if we're slightly past this caption but before the next one
      const nextCaption = captions[i + 1];
      if (currentTime >= caption.start && nextCaption && currentTime < nextCaption.start) {
        return i;
      }
    }
    // If currentTime is before all captions, highlight first; if after all, highlight last
    if (captions.length > 0) {
      if (currentTime < captions[0].start) return 0;
      if (currentTime >= captions[captions.length - 1].start) return captions.length - 1;
    }
    return -1;
  };

  const activeIndex = getActiveIndex();

  // Auto-scroll to active caption
  useEffect(() => {
    if (activeIndex >= 0 && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: activeIndex * itemHeight,
        animated: true,
      });
    }
  }, [activeIndex]);

  // Escape special regex characters in the highlight word
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Function to highlight the word in the caption text
  const renderCaptionText = (text: string, isActive: boolean) => {
    if (!highlightWord || !text) {
      return <Text style={[styles.captionText, isActive && styles.activeText]}>{text || ''}</Text>;
    }

    try {
      // Case-insensitive search for the word (escaped for regex safety)
      const regex = new RegExp(`(${escapeRegex(highlightWord)})`, 'gi');
      const parts = text.split(regex);

      return (
        <Text style={[styles.captionText, isActive && styles.activeText]}>
          {parts.map((part, index) => {
            const isHighlightedWord = part.toLowerCase() === highlightWord.toLowerCase();
            return (
              <Text
                key={index}
                style={isHighlightedWord ? styles.highlightedWord : undefined}
              >
                {part}
              </Text>
            );
          })}
        </Text>
      );
    } catch (e) {
      // Fallback if regex fails
      return <Text style={[styles.captionText, isActive && styles.activeText]}>{text}</Text>;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('captions.title')}</Text>
        <Text style={styles.timeDisplay}>⏱ {t('captions.timeFormat', { time: currentTime.toFixed(1) })}</Text>
      </View>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {captions.map((caption, index) => {
          const isActive = index === activeIndex;
          return (
            <View
              key={index}
              style={[
                styles.captionItem,
                isActive && styles.activeCaptionItem,
              ]}
            >
              <Text style={styles.timeRange}>
                {t('captions.timeRange', { start: caption.start.toFixed(1), end: caption.end.toFixed(1) })}
              </Text>
              {renderCaptionText(caption.text, isActive)}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  timeDisplay: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    backgroundColor: '#007AFF15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scrollContainer: {
    maxHeight: 200,
  },
  captionItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  activeCaptionItem: {
    backgroundColor: '#007AFF20',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  timeRange: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  captionText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  activeText: {
    color: '#000',
    fontWeight: '500',
  },
  highlightedWord: {
    backgroundColor: '#FFEB3B',
    fontWeight: 'bold',
    color: '#000',
  },
});

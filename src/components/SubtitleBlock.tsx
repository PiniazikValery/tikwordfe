import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Subtitle } from '../types';

interface SubtitleBlockProps {
  subtitle: Subtitle;
}

export default function SubtitleBlock({ subtitle }: SubtitleBlockProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.englishText}>{subtitle.english}</Text>
      <Text style={styles.russianText}>{subtitle.russian}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 16,
  },
  englishText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  russianText: {
    fontSize: 16,
    color: '#666',
  },
});

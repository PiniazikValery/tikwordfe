import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { queueWordForSearch } from '../api/youtube';
import { useLanguage } from '../contexts/LanguageContext';
import { generateId, getWords, saveWord } from '../storage/words';
import { AnalyzeResponse, Word } from '../types';

interface ExplanationModalProps {
  visible: boolean;
  sentence: string;
  analysisData: AnalyzeResponse | null;
  onClose: () => void;
  isStreaming?: boolean;
}

export default function ExplanationModal({
  visible,
  sentence,
  analysisData,
  onClose,
  isStreaming = false,
}: ExplanationModalProps) {
  const { t } = useTranslation();
  const { languageConfig } = useLanguage();
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set());
  const scrollViewRef = useRef<ScrollView>(null);
  const [dots, setDots] = useState('');

  // Simple auto-scroll control
  const autoScrollEnabled = useRef(true);
  const scrollViewHeight = useRef(0);
  const contentHeight = useRef(0);

  // Animated dots for streaming indicator
  useEffect(() => {
    if (!isStreaming) {
      setDots('');
      return;
    }

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isStreaming]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      autoScrollEnabled.current = true;
      if (languageConfig) {
        loadExistingWords();
      }
    }
  }, [visible, languageConfig]);

  // Scroll to bottom when content size changes (streaming new content)
  const handleContentSizeChange = useCallback((width: number, height: number) => {
    contentHeight.current = height;
    
    if (autoScrollEnabled.current && scrollViewRef.current && isStreaming) {
      scrollViewRef.current.scrollToEnd({ animated: false });
    }
  }, [isStreaming]);

  // Track scroll view layout
  const handleLayout = useCallback((event: any) => {
    scrollViewHeight.current = event.nativeEvent.layout.height;
  }, []);

  // Check if user is at the bottom
  const isAtBottom = useCallback((offsetY: number): boolean => {
    const threshold = 5;
    const maxScroll = contentHeight.current - scrollViewHeight.current;
    return maxScroll <= 0 || offsetY >= maxScroll - threshold;
  }, []);

  // When user starts dragging, disable auto-scroll
  const handleScrollBeginDrag = useCallback(() => {
    autoScrollEnabled.current = false;
  }, []);

  // When scroll ends, check if user is at bottom to re-enable
  const handleScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (isAtBottom(offsetY)) {
      autoScrollEnabled.current = true;
    }
  }, [isAtBottom]);

  async function loadExistingWords() {
    if (!languageConfig) return;

    try {
      const existingWords = await getWords(languageConfig.code);
      const wordSet = new Set(
        existingWords.map((w) => w.word.toLowerCase())
      );
      setAddedWords(wordSet);
    } catch (error) {
      console.error('Error loading existing words:', error);
    }
  }

  // Show modal if streaming or if we have data
  if (!analysisData && !isStreaming) {
    return null;
  }

  async function handleAddToDictionary(
    word: string,
    translation: string,
    baseForm?: string
  ) {
    if (!languageConfig) {
      Alert.alert(
        t('explanation.alertErrorTitle'),
        t('explanation.alertErrorNoLanguage')
      );
      return;
    }

    try {
      const wordToSave = baseForm || word;

      // Check if word already exists
      if (addedWords.has(wordToSave.toLowerCase())) {
        Alert.alert(
          t('explanation.alertAlreadyTitle'),
          t('explanation.alertAlreadyMessage', { word: wordToSave })
        );
        return;
      }

      const newWord: Word = {
        id: generateId(),
        word: wordToSave,
        translation: translation,
        rememberPercent: 0,
        correctCount: 0,
        incorrectCount: 0,
      };

      await saveWord(newWord, languageConfig.code);
      queueWordForSearch(wordToSave);

      // Mark word as added
      const updatedWords = new Set(addedWords);
      updatedWords.add(wordToSave.toLowerCase());
      setAddedWords(updatedWords);

      Alert.alert(
        t('explanation.alertSuccessTitle'),
        t('explanation.alertSuccessMessage', { word: wordToSave })
      );
    } catch (error) {
      Alert.alert(
        t('explanation.alertErrorTitle'),
        t('explanation.alertErrorMessage')
      );
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onLayout={handleLayout}
            onContentSizeChange={handleContentSizeChange}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleScrollEnd}
            onMomentumScrollEnd={handleScrollEnd}
          >
            <Text style={styles.sentenceLabel}>{t('explanation.sentenceLabel')}</Text>
            <Text style={styles.sentence}>{sentence}</Text>

            {analysisData && (
              <>
                <Text style={styles.sectionLabel}>{t('explanation.fullTranslation')}</Text>
                <Text style={styles.text}>{analysisData.fullTranslation || `Loading${dots}`}</Text>

                <Text style={styles.sectionLabel}>{t('explanation.grammarAnalysis')}</Text>
                <Text style={styles.text}>{analysisData.grammarAnalysis || `Loading${dots}`}</Text>

                {analysisData.breakdown && analysisData.breakdown.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>{t('explanation.wordBreakdown')}</Text>
                    {analysisData.breakdown.map((item, index) => {
                      const wordToCheck = (item.baseForm || item.word).toLowerCase();
                      const isAdded = addedWords.has(wordToCheck);
                      return (
                        <View key={index} style={styles.breakdownItem}>
                          <View style={styles.wordHeader}>
                            <Text style={styles.breakdownWord}>{item.word}</Text>
                            <TouchableOpacity
                              style={[styles.addButton, isAdded && styles.addButtonDisabled]}
                              onPress={() =>
                                handleAddToDictionary(item.word, item.translation, item.baseForm)
                              }
                              disabled={isAdded}
                            >
                              <Text style={styles.addButtonText}>
                                {isAdded ? t('explanation.alreadyInDictionary') : t('explanation.addToLearn')}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.breakdownDetail}>
                            {item.partOfSpeech} - {item.translation}
                          </Text>
                          <Text style={styles.breakdownFunction}>{item.function}</Text>
                          {item.meaningInSentence && (
                            <Text style={styles.breakdownMeaning}>
                              <Text style={styles.boldText}>{t('explanation.meaning')}</Text>
                              {item.meaningInSentence}
                            </Text>
                          )}
                          {item.usageInContext && (
                            <Text style={styles.breakdownUsage}>
                              <Text style={styles.boldText}>{t('explanation.usage')}</Text>
                              {item.usageInContext}
                            </Text>
                          )}
                          {item.alternativeMeanings && item.alternativeMeanings.length > 0 && (
                            <View style={styles.alternativeMeaningsContainer}>
                              <Text style={styles.boldText}>{t('explanation.alternativeMeanings')}</Text>
                              {item.alternativeMeanings.map((meaning, idx) => (
                                <Text key={idx} style={styles.alternativeMeaning}>• {meaning}</Text>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </>
                )}

                {analysisData.targetWordAnalysis && (
                  <>
                    <Text style={styles.sectionLabel}>{t('explanation.targetWordAnalysis')}</Text>
                    <View style={styles.targetWordBox}>
                      <Text style={styles.text}>
                        <Text style={styles.boldText}>{t('explanation.baseForm')}</Text>
                        {analysisData.targetWordAnalysis.baseForm}
                      </Text>
                      <Text style={styles.text}>
                        <Text style={styles.boldText}>{t('explanation.partOfSpeech')}</Text>
                        {analysisData.targetWordAnalysis.partOfSpeech}
                      </Text>
                      <Text style={styles.text}>
                        <Text style={styles.boldText}>{t('explanation.usage')}</Text>
                        {analysisData.targetWordAnalysis.usageInContext}
                      </Text>
                      {analysisData.targetWordAnalysis.alternativeMeanings &&
                        analysisData.targetWordAnalysis.alternativeMeanings.length > 0 && (
                          <>
                            <Text style={styles.boldText}>{t('explanation.alternativeMeanings')}</Text>
                            {analysisData.targetWordAnalysis.alternativeMeanings.map((meaning, idx) => (
                              <Text key={idx} style={styles.listItem}>• {meaning}</Text>
                            ))}
                          </>
                        )}
                    </View>
                  </>
                )}

                {analysisData.idioms && analysisData.idioms.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>{t('explanation.idioms')}</Text>
                    {analysisData.idioms.map((idiom, index) => (
                      <View key={index} style={styles.idiomItem}>
                        <Text style={styles.idiomPhrase}>{idiom.phrase}</Text>
                        <Text style={styles.text}>{idiom.meaning}</Text>
                        <Text style={styles.idiomLiteral}>
                          {t('explanation.literal')}{idiom.literalTranslation}
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                {analysisData.difficultyNotes && (
                  <>
                    <Text style={styles.sectionLabel}>{t('explanation.difficultyNotes')}</Text>
                    <Text style={styles.text}>{analysisData.difficultyNotes}</Text>
                  </>
                )}
              </>
            )}
          </ScrollView>

          {isStreaming && (
            <View style={styles.streamingContainer}>
              <Text style={styles.streamingLabel}>Generating{dots}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>{t('explanation.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  sentenceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  sentence: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 8,
  },
  boldText: {
    fontWeight: '600',
    color: '#000',
  },
  breakdownItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownWord: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    flex: 1,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#4CAF50',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  breakdownDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  breakdownFunction: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  breakdownMeaning: {
    fontSize: 14,
    color: '#333',
    marginTop: 6,
    lineHeight: 20,
  },
  breakdownUsage: {
    fontSize: 14,
    color: '#333',
    marginTop: 6,
    lineHeight: 20,
  },
  alternativeMeaningsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  alternativeMeaning: {
    fontSize: 13,
    color: '#555',
    marginLeft: 8,
    marginTop: 4,
    lineHeight: 18,
  },
  targetWordBox: {
    backgroundColor: '#fff8e1',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffd54f',
  },
  listItem: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    marginTop: 4,
  },
  idiomItem: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  idiomPhrase: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 4,
  },
  idiomLiteral: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  streamingContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  streamingLabel: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'monospace',
  },
});
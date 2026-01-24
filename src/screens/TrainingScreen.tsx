import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getWordImage } from "../api/pixabay";
import { getRandomWordExample } from "../api/wordIndex";
import { SearchStatus, searchYouTubeContext } from "../api/youtube";
import { useLanguage } from "../contexts/LanguageContext";
import {
  calculateRememberPercent,
  getWords,
  updateWord,
} from "../storage/words";
import { VideoData, Word } from "../types";
import VideoContextScreen from "./VideoContextScreen";

const MIN_WORDS_FOR_TRAINING = 5;

export default function TrainingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { languageConfig } = useLanguage();
  const { width: windowWidth } = useWindowDimensions();
  const [words, setWords] = useState<Word[]>([]);
  const [sortedWords, setSortedWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [wordImage, setWordImage] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("queued");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [currentVideoId, setCurrentVideoId] = useState<string | undefined>();

  // Determine if we should use vertical layout for status indicator
  const isNarrowScreen = windowWidth < 300;

  // Animation values
  const flipAnimation = useRef(new Animated.Value(0)).current;

  // Abort controller for cancelling YouTube search
  const abortControllerRef = useRef<AbortController | null>(null);

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
  };

  // Reload words every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (languageConfig) {
        loadWords();
      }
    }, [languageConfig]),
  );

  // Clear state immediately when language changes to prevent stale options
  useEffect(() => {
    if (languageConfig) {
      setSortedWords([]);
      setOptions([]);
      setWords([]);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setWordImage(null);
    }
  }, [languageConfig?.code]);

  // Reload words when language changes (even if screen is already focused)
  useEffect(() => {
    if (languageConfig) {
      loadWords();
    }
  }, [languageConfig?.code]);

  useEffect(() => {
    if (sortedWords.length >= MIN_WORDS_FOR_TRAINING) {
      generateOptions();
      // Fetch image for current word
      fetchWordImage();
    }
  }, [currentIndex, sortedWords.length]);

  async function fetchWordImage() {
    const currentWord = sortedWords[currentIndex];
    if (!currentWord) return;

    setWordImage(null);
    const image = await getWordImage(currentWord.word);
    setWordImage(image);
  }

  useEffect(() => {
    if (isFlipped) {
      Animated.spring(flipAnimation, {
        toValue: 0,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(flipAnimation, {
        toValue: 180,
        friction: 8,
        tension: 10,
        useNativeDriver: true,
      }).start();
    }
  }, [isFlipped]);

  async function loadWords() {
    if (!languageConfig) return;

    const loadedWords = await getWords(languageConfig.code);
    // Sort words by remember percentage (lowest first)
    const sorted = [...loadedWords].sort((a, b) => {
      const aPercent = a.rememberPercent ?? 0;
      const bPercent = b.rememberPercent ?? 0;
      return aPercent - bPercent;
    });
    setWords(loadedWords);
    setSortedWords(sorted);
    setIsFlipped(true);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
  }

  function generateOptions() {
    const currentWord = sortedWords[currentIndex];
    if (!currentWord) return;

    // Get other translations from user's dictionary (excluding current word)
    const otherTranslations = sortedWords
      .filter((w) => w.id !== currentWord.id)
      .map((w) => w.translation);

    // Shuffle and pick 3 wrong options
    const wrongOptions = otherTranslations
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    // Combine with correct answer and shuffle
    const allOptions = [...wrongOptions, currentWord.translation].sort(
      () => Math.random() - 0.5,
    );
    setOptions(allOptions);
    setSelectedAnswer(null);
    setIsCorrect(null);

    // Track the current word ID for navigation persistence
    // setCurrentWordId(currentWord.id);
  }

  async function handleSelectAnswer(answer: string) {
    if (!languageConfig) return;

    const currentWord = sortedWords[currentIndex];
    const correct = answer === currentWord.translation;

    setSelectedAnswer(answer);
    setIsCorrect(correct);

    // Update remember percentage (with time check for correct answers)
    const { newPercent, shouldUpdate } = calculateRememberPercent(
      currentWord.rememberPercent ?? 0,
      correct,
      currentWord.lastAnsweredAt,
    );

    const updatedWord: Word = {
      ...currentWord,
      rememberPercent: newPercent,
      correctCount: (currentWord.correctCount ?? 0) + (correct ? 1 : 0),
      incorrectCount: (currentWord.incorrectCount ?? 0) + (correct ? 0 : 1),
      lastAnsweredAt: shouldUpdate ? Date.now() : currentWord.lastAnsweredAt,
    };

    // Save to storage
    await updateWord(updatedWord, languageConfig.code);

    // Update sortedWords locally (don't re-sort to avoid UI jump)
    const updatedSorted = sortedWords.map((w) =>
      w.id === updatedWord.id ? updatedWord : w,
    );
    setSortedWords(updatedSorted);

    // Flip the card to show the image
    setIsFlipped(false);
  }

  function handleNextWord() {
    // Reset flip state before moving to next word
    if (!isFlipped) {
      setIsFlipped(true);
    }

    if (currentIndex < sortedWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      Alert.alert(t("training.complete"), t("training.completeMessage"));
      router.push("/(tabs)");
    }
  }

  async function handleSeeInConversation() {
    // Cancel any ongoing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this search
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setShowVideoModal(true);
    setLoadingVideo(true);
    setVideoError(null);
    setVideoData(null);
    setSearchStatus("queued");
    setStatusMessage(t("training.loadingLookingForExamples"));
    setCurrentVideoId(undefined);

    try {
      // First, try to get a random example from the word index
      const wordExample = await getRandomWordExample(currentWord.word);

      // Check if aborted while fetching word example
      if (abortController.signal.aborted) {
        return;
      }

      if (wordExample) {
        // Found a pre-indexed example, use it directly
        const videoData: VideoData = {
          videoId: wordExample.videoId,
          startTime: wordExample.startTime,
          endTime: wordExample.endTime,
          subtitle: {
            english: wordExample.caption,
            russian: currentWord.translation,
          },
          captions: wordExample.captions,
        };

        setVideoData(videoData);
        setLoadingVideo(false);
        return;
      }

      // No pre-indexed example found (404), fall back to YouTube search
      setStatusMessage(t("training.loadingQueueing"));
      const response = await searchYouTubeContext(
        currentWord.word,
        (status, message, videoId) => {
          // Update UI with current status
          setSearchStatus(status);
          setStatusMessage(message);
          setCurrentVideoId(videoId);
        },
        abortController.signal,
      );

      // Transform backend response to VideoData format
      const videoData: VideoData = {
        videoId: response.videoId,
        startTime: response.startTime,
        endTime: response.endTime,
        subtitle: {
          english: response.caption,
          russian: currentWord.translation,
        },
        captions: response.captions,
      };

      setVideoData(videoData);
    } catch (error) {
      // Don't show error if the search was cancelled
      if (error instanceof Error && error.message === "Search cancelled") {
        console.log("Search was cancelled by user");
        return;
      }

      console.error("Error loading video context:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load video context. Please try again.";
      setVideoError(errorMessage);
    } finally {
      setLoadingVideo(false);
    }
  }

  function handleCloseVideoModal() {
    // Cancel any ongoing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setShowVideoModal(false);
    setVideoData(null);
    setVideoError(null);
    setLoadingVideo(false);
    setSearchStatus("queued");
    setStatusMessage("");
    setCurrentVideoId(undefined);
  }

  function handleRetryVideo() {
    handleSeeInConversation();
  }

  if (words.length < MIN_WORDS_FOR_TRAINING) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Text style={styles.title}>{t("training.title")}</Text>
        <Text style={styles.emptyText}>
          {t("training.minWordsMessage", { count: words.length })}
        </Text>
      </SafeAreaView>
    );
  }

  const currentWord = sortedWords[currentIndex];
  if (!currentWord) return null;

  const rememberPercent = currentWord.rememberPercent ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerSection}>
        <Text style={styles.title}>{t("training.title")}</Text>

        <Text style={styles.progress}>
          {t("training.wordProgress", {
            current: currentIndex + 1,
            total: sortedWords.length,
          })}
        </Text>

        <View style={styles.cardContainer}>
          {/* Front of card */}
          <Animated.View
            style={[styles.wordCard, styles.cardFace, frontAnimatedStyle]}
          >
            <Text style={styles.wordText}>{currentWord.word}</Text>
            {currentWord.transcription && (
              <Text style={styles.transcriptionText}>
                {currentWord.transcription}
              </Text>
            )}
            <View style={styles.progressBarContainer}>
              <View
                style={[styles.progressBar, { width: `${rememberPercent}%` }]}
              />
            </View>
            <Text style={styles.percentText}>
              {t("training.learned", { percent: rememberPercent })}
            </Text>
          </Animated.View>

          {/* Back of card */}
          <Animated.View
            style={[
              styles.wordCard,
              styles.cardFace,
              styles.cardBack,
              backAnimatedStyle,
            ]}
          >
            {wordImage ? (
              <Image
                source={{ uri: wordImage }}
                style={styles.wordImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noImageContainer}>
                <Text style={styles.noImageText}>{t("training.noImage")}</Text>
              </View>
            )}
            <Text style={styles.wordTextBack}>{currentWord.word}</Text>
            <Text style={styles.translationTextBack}>
              {currentWord.translation}
            </Text>
          </Animated.View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollSection}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.instruction}>{t("training.instruction")}</Text>

        <View style={styles.optionsContainer}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedAnswer === option &&
                  (isCorrect ? styles.correctOption : styles.incorrectOption),
              ]}
              onPress={() => handleSelectAnswer(option)}
              disabled={selectedAnswer !== null}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedAnswer === option && styles.selectedOptionText,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedAnswer !== null && (
          <View style={styles.resultContainer}>
            <Text
              style={[
                styles.resultText,
                isCorrect ? styles.correctText : styles.incorrectText,
              ]}
            >
              {isCorrect
                ? t("training.correct")
                : t("training.wrong", { answer: currentWord.translation })}
            </Text>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleSeeInConversation}
            >
              <Text style={styles.actionButtonText}>
                {t("training.seeInConversation")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNextWord}
            >
              <Text style={styles.nextButtonText}>
                {t("training.nextWord")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Video Loading/Display Modal */}
      <Modal
        visible={showVideoModal}
        animationType="slide"
        onRequestClose={handleCloseVideoModal}
      >
        <SafeAreaView style={styles.modalContainer} edges={["top", "bottom"]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseVideoModal}
            >
              <Text style={styles.closeButtonText}>{t("common.close")}</Text>
            </TouchableOpacity>
          </View>

          {loadingVideo ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />

              <Text style={styles.loadingTitle}>
                {searchStatus === "queued" && t("training.videoStatusQueued")}
                {searchStatus === "searching" &&
                  t("training.videoStatusSearching")}
                {searchStatus === "downloading" &&
                  t("training.videoStatusDownloading")}
                {searchStatus === "transcribing" &&
                  t("training.videoStatusTranscribing")}
              </Text>

              <Text style={styles.loadingText}>
                {statusMessage ||
                  t("training.loadingFindingExample", {
                    word: currentWord.word,
                  })}
              </Text>

              {currentVideoId && (
                <Text style={styles.videoIdText}>
                  {t("training.loadingVideoId", { videoId: currentVideoId })}
                </Text>
              )}

              <View
                style={[
                  styles.statusIndicator,
                  isNarrowScreen && styles.statusIndicatorVertical,
                ]}
              >
                <View
                  style={[
                    styles.statusStep,
                    searchStatus === "queued" && styles.statusStepActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusStepText,
                      searchStatus === "queued" && styles.statusStepTextActive,
                    ]}
                  >
                    {t("training.statusQueue")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusConnector,
                    isNarrowScreen && styles.statusConnectorVertical,
                  ]}
                />
                <View
                  style={[
                    styles.statusStep,
                    searchStatus === "searching" && styles.statusStepActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusStepText,
                      searchStatus === "searching" &&
                        styles.statusStepTextActive,
                    ]}
                  >
                    {t("training.statusSearch")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusConnector,
                    isNarrowScreen && styles.statusConnectorVertical,
                  ]}
                />
                <View
                  style={[
                    styles.statusStep,
                    searchStatus === "downloading" && styles.statusStepActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusStepText,
                      searchStatus === "downloading" &&
                        styles.statusStepTextActive,
                    ]}
                  >
                    {t("training.statusDownload")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusConnector,
                    isNarrowScreen && styles.statusConnectorVertical,
                  ]}
                />
                <View
                  style={[
                    styles.statusStep,
                    searchStatus === "transcribing" && styles.statusStepActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusStepText,
                      searchStatus === "transcribing" &&
                        styles.statusStepTextActive,
                    ]}
                  >
                    {t("training.statusTranscribe")}
                  </Text>
                </View>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoIcon}>ℹ️</Text>
                <Text style={styles.infoText}>{t("training.loadingInfo")}</Text>
              </View>
            </View>
          ) : videoError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>{t("training.errorIcon")}</Text>
              <Text style={styles.errorTitle}>{t("training.errorOops")}</Text>
              <Text style={styles.errorText}>{videoError}</Text>

              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetryVideo}
              >
                <Text style={styles.retryButtonText}>
                  {t("training.retry")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <VideoContextScreen
              word={currentWord.word}
              videoData={videoData || undefined}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  headerSection: {
    padding: 16,
    paddingBottom: 0,
  },
  scrollSection: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 10,
    marginTop: 8,
  },
  progress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  cardContainer: {
    height: 180,
    marginBottom: 20,
  },
  wordCard: {
    backgroundColor: "#f5f5f5",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    height: 180,
  },
  cardFace: {
    position: "absolute",
    width: "100%",
    backfaceVisibility: "hidden",
  },
  cardBack: {
    backgroundColor: "#e8f4f8",
  },
  wordImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  noImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  noImageText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
  wordTextBack: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  translationTextBack: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  wordText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
  },
  transcriptionText: {
    fontSize: 18,
    color: "#888",
    fontStyle: "italic",
    marginTop: 8,
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    backgroundColor: "#ddd",
    borderRadius: 4,
    marginTop: 16,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#28a745",
    borderRadius: 4,
  },
  percentText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  instruction: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 10,
  },
  optionButton: {
    backgroundColor: "#f5f5f5",
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  correctOption: {
    backgroundColor: "#d4edda",
    borderColor: "#28a745",
  },
  incorrectOption: {
    backgroundColor: "#f8d7da",
    borderColor: "#dc3545",
  },
  optionText: {
    fontSize: 18,
    color: "#000",
    textAlign: "center",
  },
  selectedOptionText: {
    fontWeight: "600",
  },
  resultContainer: {
    marginTop: 20,
  },
  resultText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },
  correctText: {
    color: "#28a745",
  },
  incorrectText: {
    color: "#dc3545",
  },
  actionButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  nextButton: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    fontSize: 16,
    marginTop: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  loadingText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 12,
  },
  videoIdText: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "monospace",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  statusIndicatorVertical: {
    flexDirection: "column",
    paddingHorizontal: 0,
  },
  statusStep: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
    minWidth: 60,
    alignItems: "center",
    flex: 1,
    maxWidth: 80,
  },
  statusStepActive: {
    backgroundColor: "#007AFF",
  },
  statusStepText: {
    fontSize: 10,
    color: "#666",
    fontWeight: "600",
  },
  statusStepTextActive: {
    color: "#fff",
  },
  statusConnector: {
    width: 12,
    height: 2,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 2,
  },
  statusConnectorVertical: {
    width: 2,
    height: 12,
    marginHorizontal: 0,
    marginVertical: 4,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#e3f2fd",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#90caf9",
    marginHorizontal: 16,
    alignItems: "flex-start",
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#1976d2",
    lineHeight: 19,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

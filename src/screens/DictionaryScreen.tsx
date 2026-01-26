import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import wordExists from "word-exists";
import { getPhoneticTranscription } from "../api/transcription";
import { translateToLanguage } from "../api/translate";
import { queueWordForSearch } from "../api/youtube";
import LibraryManagementModal from "../components/LibraryManagementModal";
import LibraryPicker from "../components/LibraryPicker";
import LibrarySelectModal from "../components/LibrarySelectModal";
import { useLanguage } from "../contexts/LanguageContext";
import { useLibrary } from "../contexts/LibraryContext";
import {
  deleteWord,
  generateId,
  getWords,
  saveWord,
  updateWord,
} from "../storage/words";
import { Word } from "../types";

// Check if all words in a phrase exist in the dictionary
function validateEnglishPhrase(phrase: string): boolean {
  // Split by spaces and common separators, filter empty strings
  const words = phrase
    .toLowerCase()
    .split(/[\s,;.!?]+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) return false;

  // Check each word (handle contractions by removing apostrophe suffixes)
  return words.every((word) => {
    // Remove apostrophe and anything after (e.g., "what's" -> "what")
    const baseWord = word.replace(/'.*$/, "");
    return baseWord.length > 0 && wordExists(baseWord);
  });
}

export default function DictionaryScreen() {
  const { t } = useTranslation();
  const { languageConfig } = useLanguage();
  const { libraries, selectedLibraryId, selectLibrary } = useLibrary();
  const [words, setWords] = useState<Word[]>([]);
  const [newWord, setNewWord] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [newTranscription, setNewTranscription] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [isWordValid, setIsWordValid] = useState(false);
  const [isReversed, setIsReversed] = useState(false); // false = EN→Native, true = Native→EN
  const [showLibraryManagement, setShowLibraryManagement] = useState(false);
  const [showLibrarySelect, setShowLibrarySelect] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);

  // Filter words by selected library
  const filteredWords = useMemo(() => {
    if (!selectedLibraryId) return words;
    return words.filter(
      (w) => w.libraryIds && w.libraryIds.includes(selectedLibraryId),
    );
  }, [words, selectedLibraryId]);

  // Calculate word counts per library
  const wordCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    libraries.forEach((lib) => {
      counts[lib.id] = words.filter(
        (w) => w.libraryIds && w.libraryIds.includes(lib.id),
      ).length;
    });
    return counts;
  }, [words, libraries]);

  const loadWords = useCallback(async () => {
    if (!languageConfig) return;
    const loadedWords = await getWords(languageConfig.code);
    setWords(loadedWords);
  }, [languageConfig]);

  // Reload words whenever the screen comes into focus or language changes
  useFocusEffect(
    useCallback(() => {
      loadWords();
    }, [loadWords]),
  );

  // Auto-translate when user stops typing
  useEffect(() => {
    if (!newWord.trim() || !languageConfig) {
      setNewTranslation("");
      setNewTranscription("");
      setIsWordValid(false);
      return;
    }

    // Immediately invalidate when typing starts - prevents race condition
    setIsWordValid(false);

    const timeoutId = setTimeout(async () => {
      setIsTranslating(true);
      try {
        if (isReversed) {
          // Native → English mode: translate from native language to English
          const translation = await translateToLanguage(
            newWord.trim(),
            "en",
            languageConfig.googleTranslateCode,
          );
          setNewTranslation(translation);
          // Get transcription for the English translation
          const transcription = await getPhoneticTranscription(
            translation,
          ).catch(() => "");
          setNewTranscription(transcription);
          // Validate the English translation
          const exists = validateEnglishPhrase(translation);
          setIsWordValid(exists);
        } else {
          // English → Native mode (original behavior)
          const [translation, transcription] = await Promise.all([
            translateToLanguage(
              newWord.trim(),
              languageConfig.googleTranslateCode,
            ),
            getPhoneticTranscription(newWord.trim()).catch(() => ""),
          ]);
          setNewTranslation(translation);
          setNewTranscription(transcription);
          // Check if the word exists in English dictionary
          const exists = validateEnglishPhrase(newWord.trim());
          setIsWordValid(exists);
        }
      } catch (error) {
        // Keep empty, user can type manually
        setIsWordValid(false);
      } finally {
        setIsTranslating(false);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [newWord, languageConfig, isReversed]);

  function handleSwapInputMode() {
    setIsReversed(!isReversed);
    setNewWord("");
    setNewTranslation("");
    setNewTranscription("");
    setIsWordValid(false);
  }

  function handleAddWord() {
    if (!newWord.trim() || !newTranslation.trim()) {
      Alert.alert(
        t("dictionary.alertErrorTitle"),
        t("dictionary.alertErrorBothFields"),
      );
      return;
    }

    if (!languageConfig) {
      Alert.alert(
        t("dictionary.alertErrorTitle"),
        t("dictionary.alertErrorNoLanguage"),
      );
      return;
    }

    // Check for duplicate words (case-insensitive)
    const englishWord = isReversed ? newTranslation.trim() : newWord.trim();
    const isDuplicate = words.some(
      (w) => w.word.toLowerCase() === englishWord.toLowerCase(),
    );

    if (isDuplicate) {
      Alert.alert(
        t("dictionary.alertErrorTitle"),
        t("dictionary.alertErrorDuplicate"),
      );
      return;
    }

    // Always show library selection modal
    setShowLibrarySelect(true);
  }

  async function saveWordToStorage(libraryIds: string[]) {
    if (!languageConfig) return;

    // In reversed mode: newWord is native, newTranslation is English
    // We always save: word = English, translation = Native
    const englishWord = isReversed ? newTranslation.trim() : newWord.trim();
    const nativeTranslation = isReversed
      ? newWord.trim()
      : newTranslation.trim();

    const word: Word = {
      id: generateId(),
      word: englishWord,
      translation: nativeTranslation,
      transcription: newTranscription || undefined,
      rememberPercent: 0,
      correctCount: 0,
      incorrectCount: 0,
      libraryIds: libraryIds.length > 0 ? libraryIds : undefined,
    };

    try {
      await saveWord(word, languageConfig.code);
      setWords([...words, word]);

      // Queue the word for YouTube search (fire and forget)
      queueWordForSearch(word.word);

      setNewWord("");
      setNewTranslation("");
      setNewTranscription("");
      setIsWordValid(false);
    } catch (error) {
      Alert.alert(
        t("dictionary.alertErrorTitle"),
        t("dictionary.alertErrorSave"),
      );
    }
  }

  async function handleDeleteWord(id: string) {
    if (!languageConfig) return;

    try {
      await deleteWord(id, languageConfig.code);
      setWords(words.filter((w) => w.id !== id));
    } catch (error) {
      Alert.alert(
        t("dictionary.alertErrorTitle"),
        t("dictionary.alertErrorDelete"),
      );
    }
  }

  function handleWordPress(word: Word) {
    setEditingWord(word);
    setShowLibrarySelect(true);
  }

  async function handleUpdateWordLibraries(libraryIds: string[]) {
    if (!languageConfig || !editingWord) return;

    const updatedWord: Word = {
      ...editingWord,
      libraryIds: libraryIds.length > 0 ? libraryIds : undefined,
    };

    try {
      await updateWord(updatedWord, languageConfig.code);
      setWords(words.map((w) => (w.id === editingWord.id ? updatedWord : w)));
      setEditingWord(null);
    } catch (error) {
      Alert.alert(
        t("dictionary.alertErrorTitle"),
        t("dictionary.alertErrorSave"),
      );
    }
  }

  function renderWordItem({ item }: { item: Word }) {
    const progress = item.rememberPercent || 0;
    const progressColor =
      progress >= 80 ? "#4CAF50" : progress >= 50 ? "#FF9500" : "#007AFF";

    // SVG circle calculations
    const size = 44;
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    // Get library colors for this word
    const wordLibraries = libraries.filter(
      (lib) => item.libraryIds && item.libraryIds.includes(lib.id),
    );

    return (
      <TouchableOpacity
        style={styles.wordItem}
        onPress={() => handleWordPress(item)}
        activeOpacity={0.7}
      >
        {wordLibraries.length > 0 ? (
          <View style={styles.libraryIndicators}>
            {wordLibraries.slice(0, 3).map((lib) => (
              <View
                key={lib.id}
                style={[
                  styles.libraryDot,
                  { backgroundColor: lib.color || "#007AFF" },
                ]}
              />
            ))}
          </View>
        ) : (
          <View style={styles.libraryIndicators}>
            <Ionicons name="add-circle-outline" size={16} color="#ccc" />
          </View>
        )}
        <View style={styles.wordContent}>
          <Text style={styles.wordText}>{item.word}</Text>
          {item.transcription && (
            <Text style={styles.wordTranscriptionText}>
              {item.transcription}
            </Text>
          )}
          <Text style={styles.translationText}>{item.translation}</Text>
        </View>
        <View style={styles.progressCircle}>
          <Svg width={size} height={size}>
            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#e0e0e0"
              strokeWidth={strokeWidth}
              fill="white"
            />
            {/* Progress circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={progressColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90, ${size / 2}, ${size / 2})`}
            />
          </Svg>
          <View style={styles.progressTextContainer}>
            <Text style={[styles.progressText, { color: progressColor }]}>
              {progress}%
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteWord(item.id)}
        >
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.title}>{t("dictionary.title")}</Text>

      {libraries.length > 0 ? (
        <LibraryPicker
          libraries={libraries}
          selectedLibraryId={selectedLibraryId}
          onSelectLibrary={selectLibrary}
          onManagePress={() => setShowLibraryManagement(true)}
        />
      ) : (
        <TouchableOpacity
          style={styles.createLibraryButton}
          onPress={() => setShowLibraryManagement(true)}
        >
          <Ionicons name="add-circle-outline" size={18} color="#007AFF" />
          <Text style={styles.createLibraryText}>{t("libraries.create")}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, styles.firstInput]}
          placeholder={
            isReversed
              ? t("dictionary.placeholderNativeWord")
              : t("dictionary.placeholderWord")
          }
          value={newWord}
          onChangeText={setNewWord}
          placeholderTextColor="#999"
        />
        <View style={styles.swapButtonAnchor}>
          <TouchableOpacity
            style={styles.swapButton}
            onPress={handleSwapInputMode}
          >
            <Ionicons name="swap-vertical" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.translationInputContainer}>
          <View
            style={[
              styles.input,
              styles.translationInput,
              styles.translationDisplay,
            ]}
          >
            <Text style={styles.translationDisplayText}>
              {newTranslation}
              {newTranscription ? (
                <Text style={styles.transcriptionInline}>
                  {" "}
                  [{newTranscription}]
                </Text>
              ) : null}
            </Text>
            {!newTranslation && (
              <Text style={styles.translationPlaceholder}>
                {isReversed
                  ? t("dictionary.placeholderEnglishTranslation")
                  : t("dictionary.placeholderTranslation")}
              </Text>
            )}
          </View>
          {isTranslating && (
            <ActivityIndicator
              style={styles.translationLoader}
              color="#007AFF"
            />
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.addButton,
            (isTranslating ||
              !newWord.trim() ||
              !newTranslation.trim() ||
              !isWordValid) &&
              styles.addButtonDisabled,
          ]}
          onPress={handleAddWord}
          disabled={
            isTranslating ||
            !newWord.trim() ||
            !newTranslation.trim() ||
            !isWordValid
          }
        >
          <Text style={styles.addButtonText}>{t("dictionary.addWord")}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredWords}
        keyExtractor={(item) => item.id}
        renderItem={renderWordItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{t("dictionary.emptyState")}</Text>
        }
      />

      <LibraryManagementModal
        visible={showLibraryManagement}
        onClose={() => setShowLibraryManagement(false)}
        wordCounts={wordCounts}
        words={words}
        onWordsUpdated={loadWords}
      />

      <LibrarySelectModal
        visible={showLibrarySelect}
        libraries={libraries}
        selectedIds={editingWord?.libraryIds || []}
        onSave={editingWord ? handleUpdateWordLibraries : saveWordToStorage}
        onClose={() => {
          setShowLibrarySelect(false);
          setEditingWord(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 20,
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: "#000",
  },
  firstInput: {
    marginBottom: 0,
  },
  swapButtonAnchor: {
    position: "relative",
    width: 10,
    height: 10,
    alignSelf: "flex-end",
    marginRight: 8,
    zIndex: 10,
  },
  swapButton: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    top: "50%",
    transform: [{ translateY: "-50%" }, { translateX: "-50%" }],
  },
  translationInputContainer: {
    position: "relative",
  },
  translationInput: {
    paddingRight: 40,
  },
  translationDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },
  translationDisplayText: {
    fontSize: 16,
    color: "#000",
  },
  transcriptionInline: {
    color: "#007AFF",
    fontStyle: "italic",
  },
  translationPlaceholder: {
    fontSize: 16,
    color: "#999",
  },
  translationLoader: {
    position: "absolute",
    right: 14,
    top: 14,
  },
  transcriptionText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginBottom: 10,
    marginTop: -5,
    paddingLeft: 4,
  },
  addButton: {
    marginTop: 10,
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  wordItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 10,
  },
  progressCircle: {
    marginLeft: 12,
    marginRight: 12,
    position: "relative",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  progressText: {
    fontSize: 11,
    fontWeight: "700",
  },
  wordContent: {
    flex: 1,
  },
  wordText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  wordTranscriptionText: {
    fontSize: 13,
    color: "#888",
    fontStyle: "italic",
    marginTop: 2,
  },
  translationText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ff3b30",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    fontSize: 16,
    marginTop: 40,
  },
  libraryIndicators: {
    flexDirection: "column",
    gap: 4,
    marginRight: 10,
  },
  libraryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  createLibraryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#e3f2fd",
    borderRadius: 20,
    marginBottom: 12,
    gap: 6,
    alignSelf: "flex-start",
  },
  createLibraryText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
});

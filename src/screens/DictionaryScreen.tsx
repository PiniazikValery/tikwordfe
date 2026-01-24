import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
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
import { getPhoneticTranscription } from "../api/transcription";
import { translateToLanguage } from "../api/translate";
import { queueWordForSearch } from "../api/youtube";
import { useLanguage } from "../contexts/LanguageContext";
import { deleteWord, generateId, getWords, saveWord } from "../storage/words";
import { Word } from "../types";

export default function DictionaryScreen() {
  const { t } = useTranslation();
  const { languageConfig } = useLanguage();
  const [words, setWords] = useState<Word[]>([]);
  const [newWord, setNewWord] = useState("");
  const [newTranslation, setNewTranslation] = useState("");
  const [newTranscription, setNewTranscription] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);

  // Reload words whenever the screen comes into focus or language changes
  useFocusEffect(
    useCallback(() => {
      if (languageConfig) {
        loadWords();
      }
    }, [languageConfig]),
  );

  // Auto-translate when user stops typing
  useEffect(() => {
    if (!newWord.trim() || !languageConfig) {
      setNewTranslation("");
      setNewTranscription("");
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsTranslating(true);
      try {
        const [translation, transcription] = await Promise.all([
          translateToLanguage(
            newWord.trim(),
            languageConfig.googleTranslateCode,
          ),
          getPhoneticTranscription(newWord.trim()).catch(() => ""),
        ]);
        setNewTranslation(translation);
        setNewTranscription(transcription);
      } catch (error) {
        // Keep empty, user can type manually
      } finally {
        setIsTranslating(false);
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [newWord, languageConfig]);

  async function loadWords() {
    if (!languageConfig) return;
    const loadedWords = await getWords(languageConfig.code);
    setWords(loadedWords);
  }

  async function handleAddWord() {
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

    const word: Word = {
      id: generateId(),
      word: newWord.trim(),
      translation: newTranslation.trim(),
      transcription: newTranscription || undefined,
      rememberPercent: 0,
      correctCount: 0,
      incorrectCount: 0,
    };

    try {
      await saveWord(word, languageConfig.code);
      setWords([...words, word]);

      // Queue the word for YouTube search (fire and forget)
      queueWordForSearch(word.word);

      setNewWord("");
      setNewTranslation("");
      setNewTranscription("");
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

    return (
      <View style={styles.wordItem}>
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
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.title}>{t("dictionary.title")}</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={t("dictionary.placeholderWord")}
          value={newWord}
          onChangeText={setNewWord}
          placeholderTextColor="#999"
        />
        <View style={styles.translationInputContainer}>
          <TextInput
            style={[styles.input, styles.translationInput]}
            placeholder={t("dictionary.placeholderTranslation")}
            value={newTranslation}
            editable={false}
            placeholderTextColor="#999"
          />
          {isTranslating && (
            <ActivityIndicator
              style={styles.translationLoader}
              color="#007AFF"
            />
          )}
          {newTranscription && (
            <Text style={styles.transcriptionText}>{newTranscription}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddWord}>
          <Text style={styles.addButtonText}>{t("dictionary.addWord")}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={words}
        keyExtractor={(item) => item.id}
        renderItem={renderWordItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{t("dictionary.emptyState")}</Text>
        }
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
    marginBottom: 10,
    color: "#000",
  },
  translationInputContainer: {
    position: "relative",
  },
  translationInput: {
    paddingRight: 40,
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
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  list: {
    flex: 1,
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
});

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Library, LibraryDifficulty, Word } from "../types";

interface LibraryFormModalProps {
  visible: boolean;
  library?: Library;
  words?: Word[];
  onSave: (
    data: Omit<Library, "id" | "createdAt" | "updatedAt">,
    selectedWordIds?: string[],
  ) => Promise<void>;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#FF5733",
  "#33A1FF",
  "#28A745",
  "#FFC107",
  "#9C27B0",
  "#FF9800",
  "#607D8B",
  "#E91E63",
];

const PRESET_ICONS = [
  "folder",
  "book",
  "star",
  "heart",
  "flag",
  "bookmark",
  "school",
  "briefcase",
  "airplane",
  "restaurant",
];

const DIFFICULTIES: LibraryDifficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
];

export default function LibraryFormModal({
  visible,
  library,
  words = [],
  onSave,
  onClose,
}: LibraryFormModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState<LibraryDifficulty>("beginner");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string | undefined>();
  const [icon, setIcon] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);
  const [wordSearch, setWordSearch] = useState("");

  // Filter words based on search
  const filteredWords = words.filter(
    (w) =>
      w.word.toLowerCase().includes(wordSearch.toLowerCase()) ||
      w.translation.toLowerCase().includes(wordSearch.toLowerCase()),
  );

  useEffect(() => {
    if (!visible) return;

    if (library) {
      setName(library.name);
      setDifficulty(library.difficulty);
      setDescription(library.description || "");
      setColor(library.color);
      setIcon(library.icon);
      // Pre-select words that are already in this library
      const wordsInLibrary = words
        .filter((w) => w.libraryIds?.includes(library.id))
        .map((w) => w.id);
      setSelectedWordIds(wordsInLibrary);
    } else {
      setName("");
      setDifficulty("beginner");
      setDescription("");
      setColor(undefined);
      setIcon(undefined);
      setSelectedWordIds([]);
    }
    setWordSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, visible]);

  const toggleWordSelection = (wordId: string) => {
    setSelectedWordIds((prev) =>
      prev.includes(wordId)
        ? prev.filter((id) => id !== wordId)
        : [...prev, wordId],
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t("common.error"), t("libraries.alertNameRequired"));
      return;
    }

    setIsSaving(true);
    try {
      await onSave(
        {
          name: name.trim(),
          difficulty,
          description: description.trim() || undefined,
          color,
          icon,
        },
        words.length > 0 ? selectedWordIds : undefined,
      );
      onClose();
    } catch (error) {
      Alert.alert(t("common.error"), t("libraries.alertSaveError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Text style={styles.cancelText}>{t("libraries.cancel")}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {library ? t("libraries.edit") : t("libraries.create")}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.headerButton}
            disabled={isSaving}
          >
            <Text style={[styles.saveText, isSaving && styles.disabledText]}>
              {t("libraries.save")}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.label}>{t("libraries.name")}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t("libraries.namePlaceholder")}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t("libraries.difficulty")}</Text>
            <View style={styles.difficultyContainer}>
              {DIFFICULTIES.map((diff) => (
                <TouchableOpacity
                  key={diff}
                  style={[
                    styles.difficultyButton,
                    difficulty === diff && styles.difficultyButtonSelected,
                  ]}
                  onPress={() => setDifficulty(diff)}
                >
                  <Text
                    style={[
                      styles.difficultyText,
                      difficulty === diff && styles.difficultyTextSelected,
                    ]}
                  >
                    {t(`libraries.${diff}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t("libraries.description")}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={t("libraries.descriptionPlaceholder")}
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t("libraries.color")}</Text>
            <View style={styles.colorContainer}>
              <TouchableOpacity
                style={[
                  styles.colorOption,
                  styles.noColorOption,
                  !color && styles.colorOptionSelected,
                ]}
                onPress={() => setColor(undefined)}
              >
                <Ionicons name="close" size={16} color="#999" />
              </TouchableOpacity>
              {PRESET_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorOption,
                    { backgroundColor: c },
                    color === c && styles.colorOptionSelected,
                  ]}
                  onPress={() => setColor(c)}
                >
                  {color === c && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>{t("libraries.icon")}</Text>
            <View style={styles.iconContainer}>
              <TouchableOpacity
                style={[styles.iconOption, !icon && styles.iconOptionSelected]}
                onPress={() => setIcon(undefined)}
              >
                <Ionicons name="close" size={20} color="#999" />
              </TouchableOpacity>
              {PRESET_ICONS.map((i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.iconOption,
                    icon === i && styles.iconOptionSelected,
                  ]}
                  onPress={() => setIcon(i)}
                >
                  <Ionicons
                    name={i as any}
                    size={20}
                    color={icon === i ? "#007AFF" : "#666"}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {words.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>
                {t("libraries.words")} ({selectedWordIds.length}/{words.length})
              </Text>
              <View style={styles.wordSearchContainer}>
                <Ionicons
                  name="search"
                  size={18}
                  color="#999"
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.wordSearchInput}
                  placeholder={t("libraries.searchWords")}
                  placeholderTextColor="#999"
                  value={wordSearch}
                  onChangeText={setWordSearch}
                />
                {wordSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setWordSearch("")}>
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView style={styles.wordsList} nestedScrollEnabled>
                {filteredWords.map((word) => {
                  const isSelected = selectedWordIds.includes(word.id);
                  return (
                    <TouchableOpacity
                      key={word.id}
                      style={styles.wordItem}
                      onPress={() => toggleWordSelection(word.id)}
                    >
                      <View style={styles.wordInfo}>
                        <Text style={styles.wordText} numberOfLines={1}>
                          {word.word}
                        </Text>
                        <Text style={styles.wordTranslation} numberOfLines={1}>
                          {word.translation}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxSelected,
                        ]}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {filteredWords.length === 0 && wordSearch.length > 0 && (
                  <Text style={styles.noWordsFound}>
                    {t("libraries.noWordsFound")}
                  </Text>
                )}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerButton: {
    minWidth: 60,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
  cancelText: {
    fontSize: 16,
    color: "#666",
  },
  saveText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
    textAlign: "right",
  },
  disabledText: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#000",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  difficultyContainer: {
    flexDirection: "row",
    gap: 8,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
  },
  difficultyButtonSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  difficultyText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  difficultyTextSelected: {
    color: "#fff",
  },
  colorContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  noColorOption: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#f5f5f5",
  },
  colorOptionSelected: {
    borderWidth: 2,
    borderColor: "#000",
  },
  iconContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  iconOptionSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#e3f2fd",
  },
  wordSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  searchIcon: {
    marginRight: 8,
  },
  wordSearchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: "#000",
  },
  wordsList: {
    maxHeight: 250,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    overflow: "hidden",
  },
  wordItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  wordInfo: {
    flex: 1,
  },
  wordText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
  },
  wordTranslation: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  noWordsFound: {
    padding: 16,
    textAlign: "center",
    color: "#999",
    fontSize: 14,
  },
});

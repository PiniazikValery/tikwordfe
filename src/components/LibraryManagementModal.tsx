import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "../contexts/LanguageContext";
import { useLibrary } from "../contexts/LibraryContext";
import { updateWord } from "../storage/words";
import { Library, Word } from "../types";
import DifficultyBadge from "./DifficultyBadge";
import LibraryFormModal from "./LibraryFormModal";

interface LibraryManagementModalProps {
  visible: boolean;
  onClose: () => void;
  wordCounts: Record<string, number>;
  words?: Word[];
  onWordsUpdated?: () => void;
}

export default function LibraryManagementModal({
  visible,
  onClose,
  wordCounts,
  words = [],
  onWordsUpdated,
}: LibraryManagementModalProps) {
  const { t } = useTranslation();
  const { languageConfig } = useLanguage();
  const { libraries, createLibrary, editLibrary, deleteLibrary } = useLibrary();
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<Library | undefined>();

  const handleCreate = () => {
    setEditingLibrary(undefined);
    setShowFormModal(true);
  };

  const handleEdit = (library: Library) => {
    setEditingLibrary(library);
    setShowFormModal(true);
  };

  const handleDelete = (library: Library) => {
    Alert.alert(
      t("libraries.deleteConfirmTitle"),
      t("libraries.deleteConfirmMessage"),
      [
        { text: t("libraries.cancel"), style: "cancel" },
        {
          text: t("libraries.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteLibrary(library.id);
            } catch (error) {
              Alert.alert(t("common.error"), t("libraries.alertDeleteError"));
            }
          },
        },
      ],
    );
  };

  const handleSave = async (
    data: Omit<Library, "id" | "createdAt" | "updatedAt">,
    selectedWordIds?: string[],
  ) => {
    let libraryId: string;

    if (editingLibrary) {
      await editLibrary({ ...editingLibrary, ...data });
      libraryId = editingLibrary.id;
    } else {
      const newLibrary = await createLibrary(data);
      if (!newLibrary) return;
      libraryId = newLibrary.id;
    }

    // Update word assignments if words are provided and selectedWordIds is defined
    if (selectedWordIds !== undefined && languageConfig) {
      for (const word of words) {
        const isSelected = selectedWordIds.includes(word.id);
        const wasInLibrary = word.libraryIds?.includes(libraryId) || false;

        if (isSelected && !wasInLibrary) {
          // Add library to word
          const newLibraryIds = [...(word.libraryIds || []), libraryId];
          await updateWord(
            { ...word, libraryIds: newLibraryIds },
            languageConfig.code,
          );
        } else if (!isSelected && wasInLibrary) {
          // Remove library from word
          const newLibraryIds = word.libraryIds?.filter(
            (id) => id !== libraryId,
          );
          await updateWord(
            {
              ...word,
              libraryIds: newLibraryIds?.length ? newLibraryIds : undefined,
            },
            languageConfig.code,
          );
        }
      }
      onWordsUpdated?.();
    }
  };

  const renderItem = ({ item }: { item: Library }) => (
    <View style={styles.libraryItem}>
      <View style={styles.libraryLeft}>
        {item.color && (
          <View
            style={[styles.colorIndicator, { backgroundColor: item.color }]}
          />
        )}
        {item.icon && (
          <Ionicons
            name={item.icon as any}
            size={20}
            color="#666"
            style={styles.libraryIcon}
          />
        )}
        <View style={styles.libraryInfo}>
          <Text style={styles.libraryName}>{item.name}</Text>
          <View style={styles.libraryMeta}>
            <DifficultyBadge difficulty={item.difficulty} />
            <Text style={styles.wordCount}>
              {t("libraries.wordCount", { count: wordCounts[item.id] || 0 })}
            </Text>
          </View>
          {item.description && (
            <Text style={styles.libraryDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.libraryActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEdit(item)}
        >
          <Ionicons name="pencil" size={18} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash-outline" size={18} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="folder-open-outline" size={48} color="#ccc" />
      <Text style={styles.emptyText}>{t("libraries.emptyState")}</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>{t("libraries.manage")}</Text>
          <TouchableOpacity onPress={handleCreate} style={styles.headerButton}>
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={libraries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            libraries.length === 0 ? styles.emptyContainer : styles.list
          }
        />

        <LibraryFormModal
          visible={showFormModal}
          library={editingLibrary}
          words={words}
          onSave={handleSave}
          onClose={() => setShowFormModal(false)}
        />
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
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
  list: {
    padding: 16,
  },
  libraryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    marginBottom: 12,
  },
  libraryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  colorIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  libraryIcon: {
    marginRight: 12,
  },
  libraryInfo: {
    flex: 1,
  },
  libraryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  libraryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  wordCount: {
    fontSize: 12,
    color: "#666",
  },
  libraryDescription: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },
  libraryActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 16,
    textAlign: "center",
  },
});

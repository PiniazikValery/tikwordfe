import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLibrary } from "../contexts/LibraryContext";
import { Library } from "../types";
import DifficultyBadge from "./DifficultyBadge";
import LibraryFormModal from "./LibraryFormModal";

interface LibrarySelectModalProps {
  visible: boolean;
  libraries: Library[];
  selectedIds: string[];
  onSave: (ids: string[]) => void;
  onClose: () => void;
}

export default function LibrarySelectModal({
  visible,
  libraries,
  selectedIds,
  onSave,
  onClose,
}: LibrarySelectModalProps) {
  const { t } = useTranslation();
  const { createLibrary } = useLibrary();
  const [selected, setSelected] = useState<string[]>([]);
  const [showCreateLibrary, setShowCreateLibrary] = useState(false);

  useEffect(() => {
    setSelected(selectedIds);
  }, [selectedIds, visible]);

  const toggleSelection = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSave = () => {
    onSave(selected);
    onClose();
  };

  const handleCreateLibrary = async (
    data: Omit<Library, "id" | "createdAt" | "updatedAt">,
  ) => {
    const newLibrary = await createLibrary(data);
    if (newLibrary) {
      // Auto-select the newly created library
      setSelected((prev) => [...prev, newLibrary.id]);
    }
    setShowCreateLibrary(false);
  };

  const renderItem = ({ item }: { item: Library }) => {
    const isSelected = selected.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.libraryItem, isSelected && styles.libraryItemSelected]}
        onPress={() => toggleSelection(item.id)}
      >
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
            <DifficultyBadge difficulty={item.difficulty} />
          </View>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="folder-open-outline" size={48} color="#ccc" />
      <Text style={styles.emptyText}>{t("libraries.emptyState")}</Text>
    </View>
  );

  const renderHeader = () => (
    <TouchableOpacity
      style={styles.createLibraryButton}
      onPress={() => setShowCreateLibrary(true)}
    >
      <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
      <Text style={styles.createLibraryText}>{t("libraries.create")}</Text>
    </TouchableOpacity>
  );

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
          <Text style={styles.title}>{t("libraries.selectLibraries")}</Text>
          <View style={styles.headerButton} />
        </View>

        <FlatList
          data={libraries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={
            libraries.length === 0 ? styles.emptyContainer : styles.list
          }
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              onSave([]);
              onClose();
            }}
          >
            <Text style={styles.skipButtonText}>
              {t("libraries.saveWithoutLibrary")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveButton,
              selected.length === 0 && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={selected.length === 0}
          >
            <Text style={styles.saveButtonText}>
              {t("libraries.saveToSelected")}
            </Text>
          </TouchableOpacity>
        </View>

        <LibraryFormModal
          visible={showCreateLibrary}
          onClose={() => setShowCreateLibrary(false)}
          onSave={handleCreateLibrary}
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
  libraryItemSelected: {
    backgroundColor: "#e3f2fd",
  },
  libraryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  colorIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  libraryIcon: {
    marginRight: 12,
  },
  libraryInfo: {
    flex: 1,
    gap: 4,
  },
  libraryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
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
  createLibraryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#e3f2fd",
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  createLibraryText: {
    fontSize: 15,
    color: "#007AFF",
    fontWeight: "600",
  },
  footer: {
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  skipButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  skipButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#007AFF",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
});

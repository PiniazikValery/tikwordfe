import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Library } from "../types";

interface LibraryPickerProps {
  libraries: Library[];
  selectedLibraryId: string | null;
  onSelectLibrary: (id: string | null) => void;
  onManagePress: () => void;
}

export default function LibraryPicker({
  libraries,
  selectedLibraryId,
  onSelectLibrary,
  onManagePress,
}: LibraryPickerProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.manageButton} onPress={onManagePress}>
        <Ionicons name="settings-outline" size={18} color="#666" />
      </TouchableOpacity>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          style={[
            styles.chip,
            selectedLibraryId === null && styles.chipSelected,
          ]}
          onPress={() => onSelectLibrary(null)}
        >
          <Text
            style={[
              styles.chipText,
              selectedLibraryId === null && styles.chipTextSelected,
            ]}
          >
            {t("libraries.allWords")}
          </Text>
        </TouchableOpacity>

        {libraries.map((library) => (
          <TouchableOpacity
            key={library.id}
            style={[
              styles.chip,
              selectedLibraryId === library.id && styles.chipSelected,
              library.color && { borderColor: library.color },
            ]}
            onPress={() => onSelectLibrary(library.id)}
          >
            {library.color && (
              <View
                style={[styles.colorDot, { backgroundColor: library.color }]}
              />
            )}
            {library.icon && (
              <Ionicons
                name={library.icon as any}
                size={14}
                color={selectedLibraryId === library.id ? "#fff" : "#666"}
                style={styles.icon}
              />
            )}
            <Text
              style={[
                styles.chipText,
                selectedLibraryId === library.id && styles.chipTextSelected,
              ]}
            >
              {library.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  scrollContent: {
    gap: 8,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  chipSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  chipText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "#fff",
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  icon: {
    marginRight: 4,
  },
  manageButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
});

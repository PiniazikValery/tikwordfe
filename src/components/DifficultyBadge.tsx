import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { LibraryDifficulty } from "../types";

interface DifficultyBadgeProps {
  difficulty: LibraryDifficulty;
  style?: ViewStyle;
}

const DIFFICULTY_COLORS: Record<LibraryDifficulty, { bg: string; text: string }> = {
  beginner: { bg: "#e8f5e9", text: "#2e7d32" },
  intermediate: { bg: "#fff3e0", text: "#ef6c00" },
  advanced: { bg: "#ffebee", text: "#c62828" },
};

export default function DifficultyBadge({ difficulty, style }: DifficultyBadgeProps) {
  const { t } = useTranslation();
  const colors = DIFFICULTY_COLORS[difficulty];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.text, { color: colors.text }]}>
        {t(`libraries.${difficulty}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});

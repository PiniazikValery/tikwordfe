import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { usePaywall } from "../contexts/PaywallContext";

interface RequestsRemainingBadgeProps {
  style?: object;
}

export default function RequestsRemainingBadge({
  style,
}: RequestsRemainingBadgeProps) {
  const { t } = useTranslation();
  const { state } = usePaywall();

  // Show loading state while initializing
  if (state.isInitializing) {
    return (
      <View style={[styles.container, styles.normalContainer, style]}>
        <Text style={styles.icon}>⏳</Text>
        <Text style={styles.text}>...</Text>
      </View>
    );
  }

  // Don't show badge for premium users
  if (state.hasSubscription) {
    return (
      <View style={[styles.container, styles.premiumContainer, style]}>
        <Text style={styles.premiumIcon}>★</Text>
        <Text style={styles.premiumText}>{t("requestsBadge.unlimited")}</Text>
      </View>
    );
  }

  // Calculate remaining requests
  const remaining =
    typeof state.requestsLimit === "number"
      ? state.requestsLimit - state.requestsUsed
      : 0;

  // Determine badge color based on remaining requests
  const isLow = remaining <= 1;
  const isEmpty = remaining <= 0;

  return (
    <View
      style={[
        styles.container,
        isEmpty
          ? styles.emptyContainer
          : isLow
            ? styles.lowContainer
            : styles.normalContainer,
        style,
      ]}
    >
      <Text style={styles.icon}>{isEmpty ? "⚠️" : "🎯"}</Text>
      <Text style={[styles.text, isEmpty && styles.emptyText]}>
        {isEmpty
          ? t("requestsBadge.limitReached")
          : t("requestsBadge.remaining", {
              remaining,
              total: state.requestsLimit,
            })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  normalContainer: {
    backgroundColor: "#e8f5e9",
  },
  lowContainer: {
    backgroundColor: "#fff3e0",
  },
  emptyContainer: {
    backgroundColor: "#ffebee",
  },
  premiumContainer: {
    backgroundColor: "#fff8e1",
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
  },
  text: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  emptyText: {
    color: "#c62828",
  },
  premiumIcon: {
    fontSize: 14,
    marginRight: 6,
    color: "#ffc107",
  },
  premiumText: {
    fontSize: 13,
    color: "#f57c00",
    fontWeight: "600",
  },
});

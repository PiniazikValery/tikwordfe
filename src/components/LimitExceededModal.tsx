import React from "react";
import { useTranslation } from "react-i18next";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface LimitExceededModalProps {
  visible: boolean;
  retryAfterFormatted?: string;
  onClose: () => void;
  onGetPremium: () => void;
}

export default function LimitExceededModal({
  visible,
  retryAfterFormatted,
  onClose,
  onGetPremium,
}: LimitExceededModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>⏳</Text>
          </View>

          <Text style={styles.title}>{t("limitExceeded.title")}</Text>

          <Text style={styles.subtitle}>{t("limitExceeded.subtitle")}</Text>

          {retryAfterFormatted && (
            <View style={styles.timerBox}>
              <Text style={styles.timerIcon}>⏱️</Text>
              <View style={styles.timerContent}>
                <Text style={styles.timerLabel}>
                  {t("limitExceeded.nextRequestIn")}
                </Text>
                <Text style={styles.timerValue}>{retryAfterFormatted}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={styles.infoText}>
              {t("limitExceeded.premiumBenefit")}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.premiumButton}
            onPress={onGetPremium}
            activeOpacity={0.8}
          >
            <Text style={styles.premiumButtonText}>
              {t("limitExceeded.getPremium")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.waitButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.waitButtonText}>{t("limitExceeded.wait")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff3e0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  timerBox: {
    flexDirection: "row",
    backgroundColor: "#fff3e0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    width: "100%",
  },
  timerIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  timerContent: {
    flex: 1,
  },
  timerLabel: {
    fontSize: 13,
    color: "#e65100",
    marginBottom: 2,
  },
  timerValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#e65100",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#e3f2fd",
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    alignItems: "center",
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1565c0",
    lineHeight: 20,
  },
  premiumButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  premiumButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  waitButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  waitButtonText: {
    color: "#666",
    fontSize: 15,
  },
});

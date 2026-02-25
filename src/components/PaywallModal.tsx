import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
} from "react-native-purchases";

interface PaywallModalProps {
  visible: boolean;
  offering: PurchasesOffering | null;
  onClose: () => void;
  onPurchaseSuccess: () => void;
  onRestoreSuccess: () => void;
}

export default function PaywallModal({
  visible,
  offering,
  onClose,
  onPurchaseSuccess,
  onRestoreSuccess,
}: PaywallModalProps) {
  const { t } = useTranslation();
  const [selectedPackage, setSelectedPackage] =
    useState<PurchasesPackage | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const packages = offering?.availablePackages || [];

  // Sort packages: yearly first, then 6-month, then monthly
  const sortedPackages = [...packages].sort((a, b) => {
    const order: Record<string, number> = {
      ANNUAL: 0,
      SIX_MONTH: 1,
      MONTHLY: 2,
    };
    const aOrder = order[a.packageType] ?? 3;
    const bOrder = order[b.packageType] ?? 3;
    return aOrder - bOrder;
  });

  // Auto-select the first package (best value)
  React.useEffect(() => {
    if (sortedPackages.length > 0 && !selectedPackage) {
      setSelectedPackage(sortedPackages[0]);
    }
  }, [sortedPackages, selectedPackage]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setIsPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
      console.log("Purchase successful:", customerInfo);
      onPurchaseSuccess();
    } catch (error: any) {
      if (error.userCancelled) {
        console.log("User cancelled purchase");
      } else {
        console.error("Purchase error:", error);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      const hasProAccess =
        Object.keys(customerInfo.entitlements.active).length > 0;
      if (hasProAccess) {
        onRestoreSuccess();
      }
    } catch (error) {
      console.error("Restore error:", error);
    } finally {
      setIsRestoring(false);
    }
  };

  const getPackageLabel = (pkg: PurchasesPackage): string => {
    switch (pkg.packageType) {
      case "ANNUAL":
        return t("paywall.yearly");
      case "SIX_MONTH":
        return t("paywall.sixMonths");
      case "MONTHLY":
        return t("paywall.monthly");
      default:
        return pkg.identifier;
    }
  };

  const getPackageBadge = (pkg: PurchasesPackage): string | null => {
    if (pkg.packageType === "ANNUAL") {
      return t("paywall.bestValue");
    }
    return null;
  };

  const getSavingsText = (pkg: PurchasesPackage): string | null => {
    if (pkg.packageType === "ANNUAL") {
      // Calculate savings compared to monthly
      const monthlyPkg = packages.find((p) => p.packageType === "MONTHLY");
      if (monthlyPkg) {
        const monthlyTotal = monthlyPkg.product.price * 12;
        const yearlyPrice = pkg.product.price;
        const savings = Math.round((1 - yearlyPrice / monthlyTotal) * 100);
        if (savings > 0) {
          return t("paywall.savePercent", { percent: savings });
        }
      }
    }
    return null;
  };

  const formatPrice = (pkg: PurchasesPackage): string => {
    return pkg.product.priceString;
  };

  const getPeriodText = (pkg: PurchasesPackage): string => {
    switch (pkg.packageType) {
      case "ANNUAL":
        return t("paywall.perYear");
      case "SIX_MONTH":
        return t("paywall.perSixMonths");
      case "MONTHLY":
        return t("paywall.perMonth");
      default:
        return "";
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
            <Text style={styles.closeIconText}>×</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.proIcon}>★</Text>
              <Text style={styles.title}>{t("paywall.title")}</Text>
              <Text style={styles.subtitle}>{t("paywall.subtitle")}</Text>
            </View>

            {/* Features */}
            <View style={styles.featuresContainer}>
              <FeatureItem icon="✓" text={t("paywall.feature1")} />
              <FeatureItem icon="✓" text={t("paywall.feature2")} />
              <FeatureItem icon="✓" text={t("paywall.feature3")} />
              <FeatureItem icon="✓" text={t("paywall.feature4")} />
            </View>

            {/* Plans */}
            <View style={styles.plansContainer}>
              {sortedPackages.map((pkg) => {
                const isSelected =
                  selectedPackage?.identifier === pkg.identifier;
                const badge = getPackageBadge(pkg);
                const savings = getSavingsText(pkg);

                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[
                      styles.planCard,
                      isSelected && styles.planCardSelected,
                    ]}
                    onPress={() => setSelectedPackage(pkg)}
                    activeOpacity={0.7}
                  >
                    {badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{badge}</Text>
                      </View>
                    )}
                    <View style={styles.planContent}>
                      <View style={styles.planHeader}>
                        <View
                          style={[
                            styles.radio,
                            isSelected && styles.radioSelected,
                          ]}
                        >
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                        <Text
                          style={[
                            styles.planLabel,
                            isSelected && styles.planLabelSelected,
                          ]}
                        >
                          {getPackageLabel(pkg)}
                        </Text>
                      </View>
                      <View style={styles.planPriceRow}>
                        <Text
                          style={[
                            styles.planPrice,
                            isSelected && styles.planPriceSelected,
                          ]}
                        >
                          {formatPrice(pkg)}
                        </Text>
                        <Text style={styles.planPeriod}>
                          {getPeriodText(pkg)}
                        </Text>
                      </View>
                      {savings && (
                        <Text style={styles.savingsText}>{savings}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Purchase Button */}
          <TouchableOpacity
            style={[
              styles.purchaseButton,
              isPurchasing && styles.purchaseButtonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={isPurchasing || !selectedPackage}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.purchaseButtonText}>
                {t("paywall.subscribe")}
              </Text>
            )}
          </TouchableOpacity>

          {/* Restore Purchases */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <ActivityIndicator color="#007AFF" size="small" />
            ) : (
              <Text style={styles.restoreButtonText}>
                {t("paywall.restore")}
              </Text>
            )}
          </TouchableOpacity>

          {/* Legal */}
          <Text style={styles.legalText}>{t("paywall.legal")}</Text>
        </View>
      </View>
    </Modal>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 34,
    maxHeight: "90%",
  },
  closeIcon: {
    position: "absolute",
    top: 12,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIconText: {
    fontSize: 28,
    color: "#999",
    fontWeight: "300",
  },
  header: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  proIcon: {
    fontSize: 48,
    color: "#FFD700",
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  featuresContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 18,
    color: "#4CAF50",
    marginRight: 12,
    width: 24,
    textAlign: "center",
  },
  featureText: {
    fontSize: 15,
    color: "#333",
    flex: 1,
  },
  plansContainer: {
    marginBottom: 24,
  },
  planCard: {
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: "relative",
  },
  planCardSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#f0f7ff",
  },
  badge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: "#FF9500",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  planContent: {
    flexDirection: "column",
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#ccc",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  radioSelected: {
    borderColor: "#007AFF",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#007AFF",
  },
  planLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  planLabelSelected: {
    color: "#007AFF",
  },
  planPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginLeft: 34,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  planPriceSelected: {
    color: "#007AFF",
  },
  planPeriod: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  savingsText: {
    fontSize: 13,
    color: "#4CAF50",
    fontWeight: "600",
    marginLeft: 34,
    marginTop: 4,
  },
  purchaseButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  restoreButtonText: {
    color: "#007AFF",
    fontSize: 15,
  },
  legalText: {
    fontSize: 11,
    color: "#999",
    textAlign: "center",
    lineHeight: 16,
  },
});

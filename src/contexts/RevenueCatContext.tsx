import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert } from "react-native";
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
} from "react-native-purchases";
import PaywallModal from "../components/PaywallModal";
import { Config } from "../config";

interface RevenueCatContextType {
  hasProAccess: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  refreshCustomerInfo: () => Promise<void>;
  showPaywall: () => Promise<boolean>;
  error: string | null;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(
  undefined,
);

// Get configuration from centralized config
const REVENUECAT_API_KEY = Config.revenueCat.apiKey;
const ENTITLEMENT_ID = Config.revenueCat.entitlementId;
const DEV_MODE_BYPASS_PAYWALL = Config.devMode.bypassPaywall;

interface RevenueCatProviderProps {
  children: ReactNode;
}

export function RevenueCatProvider({ children }: RevenueCatProviderProps) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [currentOffering, setCurrentOffering] =
    useState<PurchasesOffering | null>(null);
  const [paywallResolve, setPaywallResolve] = useState<
    ((value: boolean) => void) | null
  >(null);

  // Check if user has Pro access based on entitlements
  const hasProAccess = React.useMemo(() => {
    // Development bypass - grant Pro access in dev mode
    if (DEV_MODE_BYPASS_PAYWALL) {
      console.log("🔓 DEV MODE: Bypassing paywall check - granting Pro access");
      return true;
    }

    if (!customerInfo) return false;

    const proEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
    return proEntitlement?.isActive === true;
  }, [customerInfo]);

  // Initialize RevenueCat SDK
  useEffect(() => {
    const initializeRevenueCat = async () => {
      // Skip RevenueCat initialization entirely in bypass mode
      if (DEV_MODE_BYPASS_PAYWALL) {
        console.log(
          "🔓 DEV MODE: Skipping RevenueCat initialization (bypass enabled)",
        );
        setIsLoading(false);
        return;
      }

      try {
        // Set debug log level for development
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);

        console.log(
          "Initializing RevenueCat with API Key:",
          REVENUECAT_API_KEY,
        );

        // Configure SDK with API key
        await Purchases.configure({
          apiKey: REVENUECAT_API_KEY,
        });

        console.log("RevenueCat initialized successfully");

        // Fetch initial customer info
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        console.log("Customer info loaded:", {
          hasEntitlements: Object.keys(info.entitlements.active).length > 0,
          entitlements: Object.keys(info.entitlements.active),
        });

        // Check for available offerings
        try {
          const offerings = await Purchases.getOfferings();
          console.log("Offerings loaded:", {
            current: offerings.current?.identifier,
            availableCount: Object.keys(offerings.all).length,
            packages: offerings.current?.availablePackages?.length || 0,
          });

          if (!offerings.current) {
            console.warn(
              "⚠️ No current offering configured in RevenueCat dashboard!",
            );
            console.warn(
              "Please configure products and offerings in your RevenueCat dashboard.",
            );
          }
        } catch (offerErr) {
          console.error("Failed to fetch offerings:", offerErr);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Failed to initialize RevenueCat:", err);
        setError("Failed to initialize subscription service");
        setIsLoading(false);
      }
    };

    initializeRevenueCat();
  }, []);

  // Set up customer info update listener
  useEffect(() => {
    // Skip listener setup in dev mode since we're bypassing paywall
    if (DEV_MODE_BYPASS_PAYWALL) {
      return;
    }

    Purchases.addCustomerInfoUpdateListener((info) => {
      console.log("Customer info updated:", info);
      setCustomerInfo(info);
    });

    // Note: addCustomerInfoUpdateListener doesn't return a cleanup function
    // The SDK manages listener cleanup internally
  }, []);

  // Refresh customer info manually
  const refreshCustomerInfo = useCallback(async () => {
    try {
      setError(null);
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      console.log("Customer info refreshed");
    } catch (err) {
      console.error("Failed to refresh customer info:", err);
      setError("Failed to refresh subscription status");
    }
  }, []);

  // Handle paywall close
  const handlePaywallClose = useCallback(() => {
    setPaywallVisible(false);
    if (paywallResolve) {
      paywallResolve(false);
      setPaywallResolve(null);
    }
  }, [paywallResolve]);

  // Handle purchase success
  const handlePurchaseSuccess = useCallback(async () => {
    console.log("✅ Purchase successful");
    await refreshCustomerInfo();
    setPaywallVisible(false);
    if (paywallResolve) {
      paywallResolve(true);
      setPaywallResolve(null);
    }
  }, [paywallResolve, refreshCustomerInfo]);

  // Handle restore success
  const handleRestoreSuccess = useCallback(async () => {
    console.log("✅ Restore successful");
    await refreshCustomerInfo();
    setPaywallVisible(false);
    if (paywallResolve) {
      paywallResolve(true);
      setPaywallResolve(null);
    }
  }, [paywallResolve, refreshCustomerInfo]);

  // Show paywall and return whether purchase was made
  const showPaywall = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      // Development bypass - skip paywall in dev mode
      if (DEV_MODE_BYPASS_PAYWALL) {
        console.log(
          "🔓 DEV MODE: Bypassing paywall - simulating purchase success",
        );
        Alert.alert(
          "Development Mode",
          "Paywall bypassed in development mode. Pro features are unlocked.\n\nTo test real payments:\n1. Deploy app to internal testing\n2. Set DEV_MODE_BYPASS_PAYWALL = false\n3. Configure products in RevenueCat dashboard",
        );
        return true;
      }

      // Check if offerings are available
      const offerings = await Purchases.getOfferings();
      console.log("📦 Offerings:", {
        current: offerings.current?.identifier,
        currentPackages: offerings.current?.availablePackages.map((p) => ({
          identifier: p.identifier,
          product: p.product.identifier,
        })),
        allOfferings: Object.keys(offerings.all),
      });

      if (
        !offerings.current ||
        offerings.current.availablePackages.length === 0
      ) {
        console.error("❌ No offerings configured in RevenueCat dashboard");
        Alert.alert(
          "Configuration Required",
          'Subscription options are not yet configured. Please set up products in the RevenueCat dashboard.\n\nSteps:\n1. Go to RevenueCat dashboard\n2. Create products (monthly, six_month, yearly)\n3. Create "TikWord Pro" entitlement\n4. Create an offering with your products',
        );
        return false;
      }

      // Present custom paywall modal
      console.log(
        "🎨 Presenting paywall for offering:",
        offerings.current.identifier,
      );
      console.log("🔑 Required entitlement:", ENTITLEMENT_ID);

      setCurrentOffering(offerings.current);
      setPaywallVisible(true);

      // Return a promise that resolves when paywall closes
      return new Promise<boolean>((resolve) => {
        setPaywallResolve(() => resolve);
      });
    } catch (err: any) {
      // console.error('Paywall error:', err);
      setError("Could not display subscription options");
      Alert.alert(
        "Error",
        "Could not display subscription options. Please try again.",
      );
      return false;
    }
  }, []);

  const value: RevenueCatContextType = {
    hasProAccess,
    isLoading,
    customerInfo,
    refreshCustomerInfo,
    showPaywall,
    error,
  };

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
      <PaywallModal
        visible={paywallVisible}
        offering={currentOffering}
        onClose={handlePaywallClose}
        onPurchaseSuccess={handlePurchaseSuccess}
        onRestoreSuccess={handleRestoreSuccess}
      />
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat(): RevenueCatContextType {
  const context = useContext(RevenueCatContext);

  if (context === undefined) {
    throw new Error("useRevenueCat must be used within a RevenueCatProvider");
  }

  return context;
}

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Purchases from "react-native-purchases";
import { Config } from "../config";
import { useRevenueCat } from "./RevenueCatContext";

export interface PaywallState {
  requestsUsed: number;
  requestsLimit: number | "unlimited";
  hasSubscription: boolean;
  canMakeRequest: boolean;
  retryAfterSeconds?: number;
  retryAfterFormatted?: string;
  userId: string | null;
  isInitializing: boolean;
}

export interface PaywallError {
  code: "USER_ID_REQUIRED" | "PAYWALL_LIMIT_EXCEEDED";
  error: string;
  requestsUsed?: number;
  requestsLimit?: number;
  retryAfterSeconds?: number;
  retryAfterFormatted?: string;
}

export interface PaywallHeadersData {
  requestsUsed: number | null;
  requestsLimit: number | "unlimited" | null;
  hasSubscription: boolean | null;
}

interface PaywallContextType {
  state: PaywallState;
  getUserId: () => Promise<string>;
  checkSubscriptionStatus: () => Promise<boolean>;
  updateFromHeaders: (headers: Headers) => void;
  updateFromPaywallHeaders: (headers: PaywallHeadersData) => void;
  handlePaywallError: (error: PaywallError) => void;
  resetLimitState: () => void;
  isLimitExceeded: boolean;
  showLimitModal: boolean;
  setShowLimitModal: (show: boolean) => void;
}

const PaywallContext = createContext<PaywallContextType | undefined>(undefined);

const DEV_MODE_BYPASS_PAYWALL = Config.devMode.bypassPaywall;
const ENTITLEMENT_ID = Config.revenueCat.entitlementId;

interface PaywallProviderProps {
  children: ReactNode;
}

export function PaywallProvider({ children }: PaywallProviderProps) {
  const {
    customerInfo,
    hasProAccess,
    isLoading: isRevenueCatLoading,
  } = useRevenueCat();

  const [state, setState] = useState<PaywallState>({
    requestsUsed: 0,
    requestsLimit: 3,
    hasSubscription: false,
    canMakeRequest: true,
    userId: null,
    isInitializing: true,
  });
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Get user ID from RevenueCat
  const getUserId = useCallback(async (): Promise<string> => {
    // In dev mode, return a test user ID
    if (DEV_MODE_BYPASS_PAYWALL) {
      console.log("🔓 DEV MODE: Using test user ID");
      return "dev-test-user";
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const userId = customerInfo.originalAppUserId;

      // Update state with userId
      setState((prev) => ({ ...prev, userId }));

      return userId;
    } catch (error) {
      console.error("Failed to get RevenueCat user ID:", error);
      throw new Error("Could not get user identification");
    }
  }, []);

  // Check subscription status from RevenueCat (fresh check)
  const checkSubscriptionStatus = useCallback(async (): Promise<boolean> => {
    // In dev mode, always return true (has subscription)
    if (DEV_MODE_BYPASS_PAYWALL) {
      console.log("🔓 DEV MODE: Bypassing subscription check");
      setState((prev) => ({
        ...prev,
        hasSubscription: true,
        canMakeRequest: true,
      }));
      return true;
    }

    try {
      // Note: invalidateCustomerInfoCache is not supported in Expo Go / web
      // getCustomerInfo() will still get reasonably fresh data

      const customerInfo = await Purchases.getCustomerInfo();
      const proEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];
      const hasSubscription = proEntitlement?.isActive === true;

      console.log("Subscription status checked (fresh):", {
        hasSubscription,
        entitlement: ENTITLEMENT_ID,
        activeEntitlements: Object.keys(customerInfo.entitlements.active),
      });

      // Update state with fresh subscription status
      setState((prev) => ({
        ...prev,
        hasSubscription,
        canMakeRequest:
          hasSubscription ||
          (typeof prev.requestsLimit === "number" &&
            prev.requestsUsed < prev.requestsLimit),
      }));

      return hasSubscription;
    } catch (error) {
      console.error("Failed to check subscription status:", error);
      return state.hasSubscription; // Return cached value on error
    }
  }, [state.hasSubscription]);

  // Initialize userId and subscription status on mount
  useEffect(() => {
    // Wait for RevenueCat to be initialized before making any calls
    if (isRevenueCatLoading && !DEV_MODE_BYPASS_PAYWALL) {
      return;
    }

    const initialize = async () => {
      try {
        // Get user ID
        await getUserId();

        // Also check subscription status on mount to have correct state immediately
        if (!DEV_MODE_BYPASS_PAYWALL) {
          const customerInfo = await Purchases.getCustomerInfo();
          const proEntitlement =
            customerInfo.entitlements.active[ENTITLEMENT_ID];
          const hasSubscription = proEntitlement?.isActive === true;

          console.log("Initial subscription check:", { hasSubscription });

          setState((prev) => ({
            ...prev,
            hasSubscription,
            canMakeRequest:
              hasSubscription ||
              (typeof prev.requestsLimit === "number" &&
                prev.requestsUsed < prev.requestsLimit),
            requestsLimit: hasSubscription ? "unlimited" : prev.requestsLimit,
            isInitializing: false,
          }));
        } else {
          // Dev mode - mark as initialized
          setState((prev) => ({ ...prev, isInitializing: false }));
        }
      } catch (err) {
        console.error("Error initializing paywall state:", err);
        // Even on error, mark as initialized to not block the UI
        setState((prev) => ({ ...prev, isInitializing: false }));
      }
    };

    initialize();
  }, [getUserId, isRevenueCatLoading]);

  // Sync subscription status from RevenueCatContext when customerInfo changes
  useEffect(() => {
    if (DEV_MODE_BYPASS_PAYWALL) {
      return;
    }

    // customerInfo comes from RevenueCatContext which has a working listener
    if (customerInfo) {
      const proEntitlement =
        customerInfo.entitlements?.active?.[ENTITLEMENT_ID];
      const hasSubscription = proEntitlement?.isActive === true;

      console.log(
        "PaywallContext: customerInfo changed from RevenueCatContext",
        {
          hasSubscription,
          activeEntitlements: Object.keys(
            customerInfo.entitlements?.active || {},
          ),
        },
      );

      setState((prev) => ({
        ...prev,
        hasSubscription,
        canMakeRequest:
          hasSubscription ||
          (typeof prev.requestsLimit === "number" &&
            prev.requestsUsed < prev.requestsLimit),
        requestsLimit: hasSubscription ? "unlimited" : prev.requestsLimit,
      }));
    }
  }, [customerInfo]);

  // Update state from PaywallHeadersData (parsed headers)
  const updateFromPaywallHeaders = useCallback(
    (headers: PaywallHeadersData) => {
      setState((prev) => {
        const newState = { ...prev };

        if (headers.requestsUsed !== null) {
          newState.requestsUsed = headers.requestsUsed;
        }

        if (headers.requestsLimit !== null) {
          newState.requestsLimit = headers.requestsLimit;
        }

        if (headers.hasSubscription !== null) {
          newState.hasSubscription = headers.hasSubscription;
        }

        // Calculate if user can make more requests
        if (newState.hasSubscription) {
          newState.canMakeRequest = true;
        } else if (typeof newState.requestsLimit === "number") {
          newState.canMakeRequest =
            newState.requestsUsed < newState.requestsLimit;
        }

        return newState;
      });
    },
    [],
  );

  // Update state from response headers (native Headers object)
  const updateFromHeaders = useCallback(
    (headers: Headers) => {
      const requestsUsed = headers.get("X-Paywall-Requests-Used");
      const requestsLimit = headers.get("X-Paywall-Requests-Limit");
      const hasSubscription = headers.get("X-Paywall-Has-Subscription");

      updateFromPaywallHeaders({
        requestsUsed: requestsUsed !== null ? parseInt(requestsUsed, 10) : null,
        requestsLimit:
          requestsLimit !== null
            ? requestsLimit === "unlimited"
              ? "unlimited"
              : parseInt(requestsLimit, 10)
            : null,
        hasSubscription:
          hasSubscription !== null ? hasSubscription === "true" : null,
      });
    },
    [updateFromPaywallHeaders],
  );

  // Handle paywall error from API
  const handlePaywallError = useCallback((error: PaywallError) => {
    console.log("Hitted error handler in PaywallContext:", error);
    if (error.code === "PAYWALL_LIMIT_EXCEEDED") {
      setState((prev) => ({
        ...prev,
        requestsUsed: error.requestsUsed ?? prev.requestsUsed,
        requestsLimit: error.requestsLimit ?? prev.requestsLimit,
        retryAfterSeconds: error.retryAfterSeconds,
        retryAfterFormatted: error.retryAfterFormatted,
        canMakeRequest: false,
      }));
      setShowLimitModal(true);
    }
  }, []);

  // Reset limit state (e.g., after subscription purchase)
  const resetLimitState = useCallback(() => {
    setState((prev) => ({
      ...prev,
      requestsUsed: 0,
      canMakeRequest: true,
      retryAfterSeconds: undefined,
      retryAfterFormatted: undefined,
    }));
  }, []);

  const isLimitExceeded = !state.canMakeRequest && !state.hasSubscription;

  const value: PaywallContextType = {
    state,
    getUserId,
    checkSubscriptionStatus,
    updateFromHeaders,
    updateFromPaywallHeaders,
    handlePaywallError,
    resetLimitState,
    isLimitExceeded,
    showLimitModal,
    setShowLimitModal,
  };

  return (
    <PaywallContext.Provider value={value}>{children}</PaywallContext.Provider>
  );
}

export function usePaywall(): PaywallContextType {
  const context = useContext(PaywallContext);

  if (context === undefined) {
    throw new Error("usePaywall must be used within a PaywallProvider");
  }

  return context;
}

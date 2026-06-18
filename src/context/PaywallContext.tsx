import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TRIAL_KEY = "dispatch_trial_start_v1";
const SUB_KEY = "dispatch_subscribed_v1";
const TRIAL_DAYS = 3;

type PaywallState = {
  loading: boolean;
  trialStartDate: Date | null;
  trialDaysLeft: number;
  isTrialActive: boolean;
  isSubscribed: boolean;
  canPlay: boolean;
  subscribe: () => void;
  restore: () => void;
};

const PaywallContext = createContext<PaywallState>({
  loading: true,
  trialStartDate: null,
  trialDaysLeft: TRIAL_DAYS,
  isTrialActive: true,
  isSubscribed: false,
  canPlay: true,
  subscribe: () => {},
  restore: () => {},
});

function daysLeft(start: Date): number {
  const now = new Date();
  const elapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(TRIAL_DAYS - elapsed));
}

export function PaywallProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [trialStartDate, setTrialStartDate] = useState<Date | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    (async () => {
      const [trialRaw, subRaw] = await Promise.all([
        AsyncStorage.getItem(TRIAL_KEY),
        AsyncStorage.getItem(SUB_KEY),
      ]);

      if (subRaw === "true") {
        setIsSubscribed(true);
      }

      if (trialRaw) {
        setTrialStartDate(new Date(trialRaw));
      } else {
        const now = new Date();
        await AsyncStorage.setItem(TRIAL_KEY, now.toISOString());
        setTrialStartDate(now);
      }

      setLoading(false);
    })();
  }, []);

  const trialDaysRemaining = trialStartDate ? daysLeft(trialStartDate) : TRIAL_DAYS;
  const isTrialActive = trialDaysRemaining > 0;
  const canPlay = isSubscribed || isTrialActive;

  // Stub — wire to RevenueCat / expo-in-app-purchases for production
  const subscribe = useCallback(() => {
    setIsSubscribed(true);
    AsyncStorage.setItem(SUB_KEY, "true").catch(() => {});
  }, []);

  const restore = useCallback(() => {
    // In production: check receipt with RevenueCat / App Store
    subscribe();
  }, [subscribe]);

  return (
    <PaywallContext.Provider
      value={{
        loading,
        trialStartDate,
        trialDaysLeft: trialDaysRemaining,
        isTrialActive,
        isSubscribed,
        canPlay,
        subscribe,
        restore,
      }}
    >
      {children}
    </PaywallContext.Provider>
  );
}

export function usePaywall() {
  return useContext(PaywallContext);
}

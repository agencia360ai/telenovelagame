import React, { createContext, useContext } from "react";

type Subscription = {
  isSubscribed: boolean;
};

const SubscriptionContext = createContext<Subscription>({
  isSubscribed: false,
});

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SubscriptionContext.Provider value={{ isSubscribed: false }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}

import React, { createContext, useContext, useState, useCallback } from "react";

type Economy = {
  gems: number;
  spend: (amount: number) => boolean;
  earn: (amount: number) => void;
  setGems: (amount: number) => void;
};

const EconomyContext = createContext<Economy>({
  gems: 0,
  spend: () => false,
  earn: () => {},
  setGems: () => {},
});

export function EconomyProvider({
  initialGems,
  children,
}: {
  initialGems: number;
  children: React.ReactNode;
}) {
  const [gems, setGems] = useState(initialGems);

  const spend = useCallback(
    (amount: number): boolean => {
      if (gems < amount) return false;
      setGems((g) => g - amount);
      return true;
    },
    [gems]
  );

  const earn = useCallback((amount: number) => {
    setGems((g) => g + amount);
  }, []);

  return (
    <EconomyContext.Provider value={{ gems, spend, earn, setGems }}>
      {children}
    </EconomyContext.Provider>
  );
}

export function useEconomy() {
  return useContext(EconomyContext);
}

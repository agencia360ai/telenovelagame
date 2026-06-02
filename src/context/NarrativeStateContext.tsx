import React, { createContext, useContext, useState, useCallback } from "react";

type NarrativeState = {
  variables: Record<string, number>;
  flags: Record<string, boolean>;
  setVariable: (key: string, value: number) => void;
  adjustVariable: (key: string, delta: number) => void;
  setFlag: (key: string, value: boolean) => void;
  loadState: (vars: Record<string, number>, flags: Record<string, boolean>) => void;
  resetState: () => void;
};

const NarrativeStateContext = createContext<NarrativeState>({
  variables: {},
  flags: {},
  setVariable: () => {},
  adjustVariable: () => {},
  setFlag: () => {},
  loadState: () => {},
  resetState: () => {},
});

export function NarrativeStateProvider({
  initialVariables,
  initialFlags,
  children,
}: {
  initialVariables: Record<string, number>;
  initialFlags: Record<string, boolean>;
  children: React.ReactNode;
}) {
  const [variables, setVariables] = useState<Record<string, number>>(initialVariables);
  const [flags, setFlags] = useState<Record<string, boolean>>(initialFlags);

  const setVariable = useCallback((key: string, value: number) => {
    setVariables((prev) => ({ ...prev, [key]: value }));
  }, []);

  const adjustVariable = useCallback((key: string, delta: number) => {
    setVariables((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + delta }));
  }, []);

  const setFlag = useCallback((key: string, value: boolean) => {
    setFlags((prev) => ({ ...prev, [key]: value }));
  }, []);

  const loadState = useCallback(
    (vars: Record<string, number>, f: Record<string, boolean>) => {
      setVariables(vars);
      setFlags(f);
    },
    []
  );

  const resetState = useCallback(() => {
    setVariables(initialVariables);
    setFlags(initialFlags);
  }, [initialVariables, initialFlags]);

  return (
    <NarrativeStateContext.Provider
      value={{ variables, flags, setVariable, adjustVariable, setFlag, loadState, resetState }}
    >
      {children}
    </NarrativeStateContext.Provider>
  );
}

export function useNarrativeState() {
  return useContext(NarrativeStateContext);
}

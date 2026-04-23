import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { UnitPrefs, defaultUnits } from "@/lib/units";

const STORAGE_KEY = "weatherintel.units";

interface UnitsContextValue {
  units: UnitPrefs;
  setUnits: (u: UnitPrefs) => void;
  updateUnit: <K extends keyof UnitPrefs>(key: K, value: UnitPrefs[K]) => void;
  reset: () => void;
}

const UnitsContext = createContext<UnitsContextValue>({
  units: defaultUnits,
  setUnits: () => {},
  updateUnit: () => {},
  reset: () => {},
});

export const UnitsProvider = ({ children }: { children: ReactNode }) => {
  const [units, setUnitsState] = useState<UnitPrefs>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...defaultUnits, ...JSON.parse(saved) };
    } catch {
      // Ignore invalid localStorage data
    }
    return defaultUnits;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
    } catch {
      // Ignore localStorage write failures
    }
  }, [units]);

  const updateUnit = useCallback(<K extends keyof UnitPrefs>(key: K, value: UnitPrefs[K]) => {
    setUnitsState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => setUnitsState(defaultUnits), []);

  return (
    <UnitsContext.Provider value={{ units, setUnits: setUnitsState, updateUnit, reset }}>
      {children}
    </UnitsContext.Provider>
  );
};

export const useUnits = () => useContext(UnitsContext);

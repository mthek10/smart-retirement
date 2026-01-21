import { useState, useCallback } from 'react';
import type { Accounts, TaxSettings, SSData, StrategyMetrics } from './useProjections';

export interface Scenario {
  id: string;
  name: string;
  createdAt: Date;
  accounts: Accounts;
  ssData: SSData;
  taxSettings: TaxSettings;
  metrics: StrategyMetrics;
}

export interface ScenarioComparison {
  scenarios: Scenario[];
  addScenario: (name: string, accounts: Accounts, ssData: SSData, taxSettings: TaxSettings, metrics: StrategyMetrics) => void;
  removeScenario: (id: string) => void;
  renameScenario: (id: string, name: string) => void;
  clearScenarios: () => void;
}

export function useScenarios(): ScenarioComparison {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const addScenario = useCallback((
    name: string,
    accounts: Accounts,
    ssData: SSData,
    taxSettings: TaxSettings,
    metrics: StrategyMetrics
  ) => {
    const newScenario: Scenario = {
      id: `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      createdAt: new Date(),
      accounts: { ...accounts },
      ssData: JSON.parse(JSON.stringify(ssData)),
      taxSettings: JSON.parse(JSON.stringify(taxSettings)),
      metrics: { ...metrics },
    };
    setScenarios(prev => [...prev, newScenario]);
  }, []);

  const removeScenario = useCallback((id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
  }, []);

  const renameScenario = useCallback((id: string, name: string) => {
    setScenarios(prev => prev.map(s => 
      s.id === id ? { ...s, name } : s
    ));
  }, []);

  const clearScenarios = useCallback(() => {
    setScenarios([]);
  }, []);

  return {
    scenarios,
    addScenario,
    removeScenario,
    renameScenario,
    clearScenarios,
  };
}

import type { PayrollEpoch, PayrollSummary, WarChestSummary } from "./commander-payroll-types";

export const MOCK_PAYROLL_EPOCH: PayrollEpoch = {
  id: "deployment-01",
  number: 1,
  status: "open",
  timeRemainingLabel: "6D 14H 32M",
  payrollPoolSol: 0,
  collectionSupply: 777,
  deployedSoldierMints: [],
  deploymentCostSolPerSoldier: 0.001,
  gasRequiredPerSoldier: 100,
  gasRequirementLabel: "TEST VALUE",
  testMode: true,
};

export const MOCK_PAYROLL_SUMMARY: PayrollSummary = {
  activeSoldierMints: [],
  estimatedShareSol: 0,
  claimableSol: 0,
};

export const MOCK_WAR_CHEST: WarChestSummary = {
  balanceGas: 0,
  status: "test",
};

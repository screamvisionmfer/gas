export type PayrollEpochStatus = "open" | "settling" | "closed";

export type PayrollEpoch = {
  id: string;
  number: number;
  status: PayrollEpochStatus;
  timeRemainingLabel: string;
  payrollPoolSol: number;
  collectionSupply: number;
  deployedSoldierMints: string[];
  deploymentCostSolPerSoldier: number;
  gasRequiredPerSoldier: number;
  gasRequirementLabel: string;
  testMode: boolean;
};

export type DeploymentState = {
  epochId: string;
  selectedSoldierMints: string[];
  deployedSoldierMints: string[];
};

export type PayrollSummary = {
  activeSoldierMints: string[];
  estimatedShareSol: number;
  claimableSol: number;
};

export type WarChestSummary = {
  balanceGas: number;
  status: "test";
};

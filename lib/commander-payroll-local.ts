import type { LocalPayrollEpochHistory, LocalPayrollSimulation } from "./commander-payroll-types";

// LOCAL SIMULATION ECONOMICS (non-production):
// - one deployed NFT equals one share for the current epoch;
// - each NFT must deploy again in every new epoch;
// - deployment adds simulated TEST $GAS to the War Chest;
// - the War Chest never funds Payroll;
// - Payroll is simulated SOL creator revenue and is never guaranteed;
// - open-epoch estimates are variable; entitlement becomes final only on close;
// - a closed entitlement can be claimed only once.
export const LOCAL_DEFAULT_PAYROLL_POOL_SOL = 10;
export const LOCAL_DEFAULT_TOTAL_DEPLOYED = 30;
export const LOCAL_DEPLOYMENT_COST_GAS = 100;

export function createLocalPayrollSimulation(): LocalPayrollSimulation {
  return {
    version: 2,
    currentEpoch: 1,
    status: "open",
    payrollPoolSol: LOCAL_DEFAULT_PAYROLL_POOL_SOL,
    totalDeployedSoldiers: LOCAL_DEFAULT_TOTAL_DEPLOYED,
    deployedSoldierMints: [],
    warChestGas: 0,
    finalEntitlementSol: 0,
    finalPayrollPerSoldierSol: 0,
    claimed: false,
    claimedAmountSol: 0,
    history: [],
  };
}

export function payrollPerSoldier(poolSol: number, totalDeployed: number) {
  return totalDeployed > 0 ? poolSol / totalDeployed : 0;
}

export function estimatedWalletPayroll(state: LocalPayrollSimulation) {
  if (state.status === "closed") return state.finalEntitlementSol;
  return payrollPerSoldier(state.payrollPoolSol, state.totalDeployedSoldiers) * state.deployedSoldierMints.length;
}

function historyRecord(state: LocalPayrollSimulation, claimed = state.claimed): LocalPayrollEpochHistory {
  return {
    epochNumber: state.currentEpoch,
    payrollPoolSol: state.payrollPoolSol,
    totalDeployedSoldiers: state.totalDeployedSoldiers,
    walletDeployedSoldiers: state.deployedSoldierMints.length,
    payrollPerSoldierSol: state.finalPayrollPerSoldierSol,
    entitlementSol: state.finalEntitlementSol,
    claimed,
    claimedAmountSol: claimed ? state.finalEntitlementSol : state.claimedAmountSol,
    closedAt: Date.now(),
  };
}

export function deployLocalSoldiers(state: LocalPayrollSimulation, soldierMints: string[]) {
  if (state.status !== "open") return state;
  const additions = soldierMints.filter((mint) => !state.deployedSoldierMints.includes(mint));
  const deployedSoldierMints = [...state.deployedSoldierMints, ...additions];
  return {
    ...state,
    deployedSoldierMints,
    totalDeployedSoldiers: Math.max(state.totalDeployedSoldiers, deployedSoldierMints.length),
    warChestGas: state.warChestGas + (additions.length * LOCAL_DEPLOYMENT_COST_GAS),
  };
}

export function updateLocalEconomy(state: LocalPayrollSimulation, payrollPoolSol: number, totalDeployedSoldiers: number) {
  if (state.status !== "open") return state;
  return {
    ...state,
    payrollPoolSol: Math.max(0, Number.isFinite(payrollPoolSol) ? payrollPoolSol : 0),
    totalDeployedSoldiers: Math.max(state.deployedSoldierMints.length, Math.round(Number.isFinite(totalDeployedSoldiers) ? totalDeployedSoldiers : 0)),
  };
}

export function closeLocalEpoch(state: LocalPayrollSimulation) {
  if (state.status !== "open") return state;
  const finalPayrollPerSoldierSol = payrollPerSoldier(state.payrollPoolSol, state.totalDeployedSoldiers);
  const finalEntitlementSol = finalPayrollPerSoldierSol * state.deployedSoldierMints.length;
  const closed = { ...state, status: "closed" as const, finalPayrollPerSoldierSol, finalEntitlementSol };
  return { ...closed, history: [...state.history, historyRecord(closed)] };
}

export function claimLocalPayroll(state: LocalPayrollSimulation) {
  if (state.status !== "closed" || state.claimed) return state;
  const claimed = { ...state, claimed: true, claimedAmountSol: state.finalEntitlementSol };
  return {
    ...claimed,
    history: claimed.history.map((record) => record.epochNumber === claimed.currentEpoch ? historyRecord(claimed, true) : record),
  };
}

export function startNextLocalEpoch(state: LocalPayrollSimulation): LocalPayrollSimulation {
  if (state.status !== "closed") return state;
  return {
    ...state,
    currentEpoch: state.currentEpoch + 1,
    status: "open" as const,
    payrollPoolSol: LOCAL_DEFAULT_PAYROLL_POOL_SOL,
    totalDeployedSoldiers: LOCAL_DEFAULT_TOTAL_DEPLOYED,
    deployedSoldierMints: [],
    finalEntitlementSol: 0,
    finalPayrollPerSoldierSol: 0,
    claimed: false,
    claimedAmountSol: 0,
  };
}

export function normalizeLocalPayrollSimulation(value: unknown): LocalPayrollSimulation {
  if (!value || typeof value !== "object" || (value as { version?: number }).version !== 2) return createLocalPayrollSimulation();
  const state = value as LocalPayrollSimulation;
  return {
    ...createLocalPayrollSimulation(),
    ...state,
    deployedSoldierMints: Array.isArray(state.deployedSoldierMints) ? state.deployedSoldierMints.filter((mint) => typeof mint === "string") : [],
    history: Array.isArray(state.history) ? state.history : [],
  };
}

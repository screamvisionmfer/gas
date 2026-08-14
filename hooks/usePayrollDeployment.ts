"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCommanderIdentity } from "@/components/commander-hq/CommanderIdentityProvider";
import {
  claimLocalPayroll,
  closeLocalEpoch,
  createLocalPayrollSimulation,
  deployLocalSoldiers,
  normalizeLocalPayrollSimulation,
  startNextLocalEpoch,
  updateLocalEconomy,
} from "@/lib/commander-payroll-local";
import {
  broadcastAndConfirmProgramDeployment,
  fetchOnChainDeploymentState,
  fetchTestWarChestBalance,
  payrollTestConfig,
  payrollTransactionError,
  prepareProgramDeployment,
  serializeUnsignedTestTransaction,
} from "@/lib/commander-payroll-solana";
import type { LocalPayrollSimulation, OnChainDeploymentState, PayrollDeploymentReceipt, PayrollTransactionStatus } from "@/lib/commander-payroll-types";

const EMPTY_CHAIN_STATE: OnChainDeploymentState = { epoch: null, deployedSoldierMints: [] };
const LOCAL_STORAGE_PREFIX = "gas:payroll-local:v2";

function localStorageKey(walletAddress: string) { return `${LOCAL_STORAGE_PREFIX}:${walletAddress || "preview"}`; }

function toLocalChainState(state: LocalPayrollSimulation): OnChainDeploymentState {
  const now = Math.floor(Date.now() / 1000);
  return {
    epoch: {
      number: state.currentEpoch,
      startTimestamp: now - 86_400,
      endTimestamp: now + (7 * 86_400),
      deploymentCostGas: 100,
      totalDeployed: state.totalDeployedSoldiers,
      status: state.status,
    },
    deployedSoldierMints: state.deployedSoldierMints,
  };
}

function readLocalSimulation(walletAddress: string) {
  try {
    const value = window.localStorage.getItem(localStorageKey(walletAddress));
    return normalizeLocalPayrollSimulation(value ? JSON.parse(value) : null);
  } catch { return createLocalPayrollSimulation(); }
}

function writeLocalSimulation(walletAddress: string, state: LocalPayrollSimulation) {
  window.localStorage.setItem(localStorageKey(walletAddress), JSON.stringify(state));
}

function localDelay(milliseconds: number) { return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds)); }

export function usePayrollDeployment(walletAddress: string, soldierMints: string[]) {
  const config = useMemo(() => payrollTestConfig(), []);
  const initialLocal = useMemo(() => createLocalPayrollSimulation(), []);
  const mintKey = soldierMints.join(",");
  const { signSolanaDevnetTransaction } = useCommanderIdentity();
  const [status, setStatus] = useState<PayrollTransactionStatus>("idle");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<PayrollDeploymentReceipt | null>(null);
  const [localSimulation, setLocalSimulation] = useState<LocalPayrollSimulation>(initialLocal);
  const [chainState, setChainState] = useState<OnChainDeploymentState>(config.localFallback ? toLocalChainState(initialLocal) : EMPTY_CHAIN_STATE);
  const [chainLoading, setChainLoading] = useState(false);
  const [warChestBalance, setWarChestBalance] = useState<number | null>(config.localFallback ? 0 : null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const applyLocalSimulation = useCallback((next: LocalPayrollSimulation) => {
    writeLocalSimulation(walletAddress, next);
    setLocalSimulation(next);
    setChainState(toLocalChainState(next));
    setWarChestBalance(next.warChestGas);
    setError("");
    return next;
  }, [walletAddress]);

  const refreshChainState = useCallback(async () => {
    if (config.localFallback) {
      applyLocalSimulation(readLocalSimulation(walletAddress));
      return;
    }
    if (!config.configured) return;
    setChainLoading(true);
    try {
      setChainState(await fetchOnChainDeploymentState(config, mintKey ? mintKey.split(",") : []));
      if (status === "idle") setError("");
    } catch (chainError) {
      setError(payrollTransactionError(chainError));
      setChainState(EMPTY_CHAIN_STATE);
    } finally { setChainLoading(false); }
  }, [applyLocalSimulation, config, mintKey, status, walletAddress]);

  const refreshWarChest = useCallback(async () => {
    if (config.localFallback) {
      setWarChestBalance(readLocalSimulation(walletAddress).warChestGas);
      return;
    }
    if (!config.configured) return;
    setBalanceLoading(true);
    try { setWarChestBalance(await fetchTestWarChestBalance(config)); }
    catch { setWarChestBalance(null); }
    finally { setBalanceLoading(false); }
  }, [config, walletAddress]);

  useEffect(() => {
    const timer = window.setTimeout(() => void Promise.all([refreshChainState(), refreshWarChest()]), 0);
    return () => window.clearTimeout(timer);
  }, [refreshChainState, refreshWarChest]);

  const deploy = useCallback(async (selectedMints: string[]) => {
    if (!config.configured || !walletAddress || !selectedMints.length) return null;
    setError("");
    setReceipt(null);
    if (config.localFallback) {
      setStatus("preparing");
      await localDelay(350);
      setStatus("confirming");
      await localDelay(550);
      const current = readLocalSimulation(walletAddress);
      const next = applyLocalSimulation(deployLocalSoldiers(current, selectedMints));
      const confirmed: PayrollDeploymentReceipt = {
        signature: `LOCAL-${Date.now().toString(36).toUpperCase()}`,
        soldierMints: [...selectedMints], soldierCount: selectedMints.length,
        amountGas: next.warChestGas - current.warChestGas, epochNumber: next.currentEpoch,
      };
      setReceipt(confirmed);
      setStatus("success");
      return confirmed;
    }
    try {
      setStatus("preparing");
      const prepared = await prepareProgramDeployment(config, walletAddress, selectedMints);
      setStatus("awaiting_signature");
      const signed = await signSolanaDevnetTransaction(serializeUnsignedTestTransaction(prepared.transaction), walletAddress);
      setStatus("confirming");
      const signature = await broadcastAndConfirmProgramDeployment(prepared, signed);
      await Promise.all([refreshChainState(), refreshWarChest()]);
      const confirmed: PayrollDeploymentReceipt = { signature, soldierMints: [...selectedMints], soldierCount: selectedMints.length, amountGas: prepared.amountGas, epochNumber: prepared.epochNumber };
      setReceipt(confirmed);
      setStatus("success");
      return confirmed;
    } catch (deploymentError) {
      setError(payrollTransactionError(deploymentError));
      setStatus("error");
      void refreshChainState();
      return null;
    }
  }, [applyLocalSimulation, config, refreshChainState, refreshWarChest, signSolanaDevnetTransaction, walletAddress]);

  const updateLocalSimulation = useCallback((poolSol: number, totalDeployed: number) => {
    if (config.localFallback) applyLocalSimulation(updateLocalEconomy(readLocalSimulation(walletAddress), poolSol, totalDeployed));
  }, [applyLocalSimulation, config.localFallback, walletAddress]);

  const closeLocalSimulation = useCallback(() => {
    if (config.localFallback) applyLocalSimulation(closeLocalEpoch(readLocalSimulation(walletAddress)));
  }, [applyLocalSimulation, config.localFallback, walletAddress]);

  const claimLocalSimulation = useCallback(async () => {
    if (!config.localFallback) return 0;
    const current = readLocalSimulation(walletAddress);
    if (current.status !== "closed" || current.claimed) return 0;
    setReceipt(null);
    setStatus("confirming");
    await localDelay(450);
    const next = applyLocalSimulation(claimLocalPayroll(current));
    setStatus("success");
    return next.claimedAmountSol;
  }, [applyLocalSimulation, config.localFallback, walletAddress]);

  const startNextLocalSimulation = useCallback(() => {
    if (!config.localFallback) return;
    applyLocalSimulation(startNextLocalEpoch(readLocalSimulation(walletAddress)));
    setReceipt(null);
    setStatus("idle");
  }, [applyLocalSimulation, config.localFallback, walletAddress]);

  return {
    config, status, error, receipt, chainState, chainLoading, warChestBalance, balanceLoading, localSimulation,
    busy: ["preparing", "awaiting_signature", "confirming"].includes(status),
    deploy, refreshChainState, refreshWarChest, updateLocalSimulation, closeLocalSimulation, claimLocalSimulation, startNextLocalSimulation,
  };
}

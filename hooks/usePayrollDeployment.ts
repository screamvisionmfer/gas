"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCommanderIdentity } from "@/components/commander-hq/CommanderIdentityProvider";
import { MOCK_PAYROLL_EPOCH } from "@/lib/commander-payroll-config";
import {
  broadcastAndConfirmProgramDeployment,
  fetchOnChainDeploymentState,
  fetchTestWarChestBalance,
  payrollTestConfig,
  payrollTransactionError,
  prepareProgramDeployment,
  serializeUnsignedTestTransaction,
} from "@/lib/commander-payroll-solana";
import type { OnChainDeploymentState, PayrollDeploymentReceipt, PayrollTransactionStatus } from "@/lib/commander-payroll-types";

const EMPTY_CHAIN_STATE: OnChainDeploymentState = { epoch: null, deployedSoldierMints: [] };
const LOCAL_EPOCH_NUMBER = 1;
const LOCAL_STORAGE_PREFIX = "gas:payroll-local:v1";

function localStorageKey(walletAddress: string) {
  return `${LOCAL_STORAGE_PREFIX}:${walletAddress || "preview"}:epoch-${LOCAL_EPOCH_NUMBER}`;
}

function localEpoch(deployedSoldierMints: string[]): OnChainDeploymentState {
  const now = Math.floor(Date.now() / 1000);
  return {
    epoch: {
      number: LOCAL_EPOCH_NUMBER,
      startTimestamp: now - 86_400,
      endTimestamp: now + (7 * 86_400),
      deploymentCostGas: MOCK_PAYROLL_EPOCH.gasRequiredPerSoldier,
      totalDeployed: deployedSoldierMints.length,
      status: "open",
    },
    deployedSoldierMints,
  };
}

function readLocalDeployments(walletAddress: string) {
  try {
    const value = window.localStorage.getItem(localStorageKey(walletAddress));
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((mint): mint is string => typeof mint === "string") : [];
  } catch { return []; }
}

function writeLocalDeployments(walletAddress: string, mints: string[]) {
  window.localStorage.setItem(localStorageKey(walletAddress), JSON.stringify(mints));
}

function localDelay(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

export function usePayrollDeployment(walletAddress: string, soldierMints: string[]) {
  const config = useMemo(() => payrollTestConfig(), []);
  const mintKey = soldierMints.join(",");
  const { signSolanaDevnetTransaction } = useCommanderIdentity();
  const [status, setStatus] = useState<PayrollTransactionStatus>("idle");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<PayrollDeploymentReceipt | null>(null);
  const [chainState, setChainState] = useState<OnChainDeploymentState>(config.localFallback ? localEpoch([]) : EMPTY_CHAIN_STATE);
  const [chainLoading, setChainLoading] = useState(false);
  const [warChestBalance, setWarChestBalance] = useState<number | null>(config.localFallback ? 0 : null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const refreshChainState = useCallback(async () => {
    if (config.localFallback) {
      setChainState(localEpoch(readLocalDeployments(walletAddress)));
      setError("");
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
  }, [config, mintKey, status, walletAddress]);

  const refreshWarChest = useCallback(async () => {
    if (config.localFallback) {
      setWarChestBalance(readLocalDeployments(walletAddress).length * MOCK_PAYROLL_EPOCH.gasRequiredPerSoldier);
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
      const current = readLocalDeployments(walletAddress);
      const deployed = Array.from(new Set([...current, ...selectedMints]));
      writeLocalDeployments(walletAddress, deployed);
      setChainState(localEpoch(deployed));
      setWarChestBalance(deployed.length * MOCK_PAYROLL_EPOCH.gasRequiredPerSoldier);
      const confirmed: PayrollDeploymentReceipt = {
        signature: `LOCAL-${Date.now().toString(36).toUpperCase()}`,
        soldierMints: [...selectedMints],
        soldierCount: selectedMints.length,
        amountGas: selectedMints.length * MOCK_PAYROLL_EPOCH.gasRequiredPerSoldier,
        epochNumber: LOCAL_EPOCH_NUMBER,
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
  }, [config, refreshChainState, refreshWarChest, signSolanaDevnetTransaction, walletAddress]);

  return {
    config, status, error, receipt, chainState, chainLoading, warChestBalance, balanceLoading,
    busy: ["preparing", "awaiting_signature", "confirming"].includes(status),
    deploy, refreshChainState, refreshWarChest,
  };
}

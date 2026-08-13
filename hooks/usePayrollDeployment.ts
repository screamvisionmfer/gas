"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCommanderIdentity } from "@/components/commander-hq/CommanderIdentityProvider";
import {
  broadcastAndConfirmTestTransfer,
  fetchTestWarChestBalance,
  payrollTestConfig,
  payrollTransactionError,
  prepareTestGasTransfer,
  serializeUnsignedTestTransaction,
} from "@/lib/commander-payroll-solana";
import type { PayrollDeploymentReceipt, PayrollTransactionStatus } from "@/lib/commander-payroll-types";

export function usePayrollDeployment(walletAddress: string) {
  const config = useMemo(() => payrollTestConfig(), []);
  const { signSolanaDevnetTransaction } = useCommanderIdentity();
  const [status, setStatus] = useState<PayrollTransactionStatus>("idle");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<PayrollDeploymentReceipt | null>(null);
  const [warChestBalance, setWarChestBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  const refreshWarChest = useCallback(async () => {
    if (!config.configured) return;
    setBalanceLoading(true);
    try {
      setWarChestBalance(await fetchTestWarChestBalance(config));
    } catch {
      setWarChestBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  }, [config]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshWarChest(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshWarChest]);

  const deploy = useCallback(async (soldierMints: string[], amountGas: number) => {
    if (!config.configured) {
      setStatus("error");
      setError(config.error ?? "TEST NETWORK NOT CONFIGURED");
      return null;
    }
    if (!walletAddress || !soldierMints.length) return null;
    setError("");
    setReceipt(null);
    try {
      setStatus("preparing");
      const prepared = await prepareTestGasTransfer(config, walletAddress, amountGas);
      setStatus("awaiting_signature");
      const signed = await signSolanaDevnetTransaction(serializeUnsignedTestTransaction(prepared.transaction), walletAddress);
      setStatus("confirming");
      const signature = await broadcastAndConfirmTestTransfer(prepared, signed);
      const confirmed: PayrollDeploymentReceipt = { signature, soldierMints: [...soldierMints], soldierCount: soldierMints.length, amountGas };
      setReceipt(confirmed);
      setStatus("success");
      await refreshWarChest();
      return confirmed;
    } catch (deploymentError) {
      setError(payrollTransactionError(deploymentError));
      setStatus("error");
      return null;
    }
  }, [config, refreshWarChest, signSolanaDevnetTransaction, walletAddress]);

  return {
    config,
    status,
    error,
    receipt,
    warChestBalance,
    balanceLoading,
    busy: ["preparing", "awaiting_signature", "confirming"].includes(status),
    deploy,
    refreshWarChest,
  };
}

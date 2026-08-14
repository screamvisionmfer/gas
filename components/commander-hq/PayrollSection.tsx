"use client";
/* eslint-disable @next/next/no-img-element -- verified GAS metadata images are served directly. */

import { useMemo, useState } from "react";
import type { Soldier } from "@/lib/commander-hq-types";
import { MOCK_PAYROLL_EPOCH, MOCK_PAYROLL_SUMMARY } from "@/lib/commander-payroll-config";
import { MAX_ATOMIC_DEPLOYMENTS, shortenSignature, testExplorerUrl } from "@/lib/commander-payroll-solana";
import type { PayrollEpoch, PayrollSummary } from "@/lib/commander-payroll-types";
import { usePayrollDeployment } from "@/hooks/usePayrollDeployment";
import type { ArmyLoadStatus } from "./ArmySection";
import styles from "./CommanderHQ.module.css";

type PayrollSectionProps = { soldiers: Soldier[]; armyStatus: ArmyLoadStatus; walletAddress: string; epoch?: PayrollEpoch; summary?: PayrollSummary };

function shortMint(mint: string) { return mint.length > 16 ? `${mint.slice(0, 6)}…${mint.slice(-6)}` : mint; }
function sol(value: number) { return `${value.toFixed(3)} SOL`; }

export function PayrollSection({ soldiers, armyStatus, walletAddress, epoch = MOCK_PAYROLL_EPOCH, summary = MOCK_PAYROLL_SUMMARY }: PayrollSectionProps) {
  const [selectedSoldierMints, setSelectedSoldierMints] = useState<string[]>([]);
  const soldierMints = useMemo(() => soldiers.map((soldier) => soldier.mint), [soldiers]);
  const payroll = usePayrollDeployment(walletAddress, soldierMints);
  const liveEpoch = payroll.chainState.epoch;
  const ownedMints = useMemo(() => new Set(soldierMints), [soldierMints]);
  const deployedMints = useMemo(() => new Set([...summary.activeSoldierMints, ...payroll.chainState.deployedSoldierMints]), [payroll.chainState.deployedSoldierMints, summary.activeSoldierMints]);
  const availableSoldiers = useMemo(() => soldiers.filter((soldier) => !deployedMints.has(soldier.mint)), [deployedMints, soldiers]);
  const selectedMints = useMemo(() => new Set(selectedSoldierMints), [selectedSoldierMints]);

  function toggleSoldier(mint: string) {
    if (deployedMints.has(mint) || payroll.busy) return;
    setSelectedSoldierMints((current) => current.includes(mint)
      ? current.filter((selectedMint) => selectedMint !== mint)
      : current.length >= MAX_ATOMIC_DEPLOYMENTS ? current : [...current, mint]);
  }

  async function deploySelected() {
    if (!selectedSoldierMints.length) return;
    if (await payroll.deploy([...selectedSoldierMints])) setSelectedSoldierMints([]);
  }

  const selectedCount = selectedSoldierMints.length;
  const activeMints = Array.from(deployedMints).filter((mint) => ownedMints.has(mint));
  const totalDeployed = liveEpoch?.totalDeployed ?? 0;
  const gasPerSoldier = liveEpoch?.deploymentCostGas ?? 0;
  const scanning = armyStatus === "connecting" || armyStatus === "loading";

  return (
    <section className={`${styles.hqSection} ${styles.payrollSection}`} aria-labelledby="payroll-title">
      <header className={styles.sectionHeader}>
        <div><span>WEEKLY DEPLOYMENT PROGRAM</span><h2 id="payroll-title">COMMANDER PAYROLL</h2></div>
        <strong className={styles.testModeBadge}>{payroll.config.localFallback ? "LOCAL TEST MODE" : "DEVNET TEST MODE"}</strong>
      </header>

      <p className={styles.payrollNotice}>{payroll.config.localFallback ? "LOCAL UI SIMULATION · No wallet signature, RPC request, token transfer, or blockchain record is created. State exists only in this browser." : "DEVNET PROGRAM TEST · Deployment records and TEST $GAS payment are atomic and persistent on Devnet. Mainnet GAS NFT ownership remains a UI eligibility check only."}</p>
      <div className={styles.payrollNetworkBar}><b>{payroll.config.localFallback ? "LOCAL BROWSER" : "DEVNET"}</b><span>SIMULATED TEST $GAS</span><strong>NON-PRODUCTION · NO REAL VALUE</strong></div>
      {!payroll.config.configured && <p className={styles.payrollConfigError} role="alert">TEST NETWORK NOT CONFIGURED · {payroll.config.error}</p>}
      {payroll.config.configured && payroll.error && payroll.status === "idle" && <p className={styles.payrollConfigError} role="alert">DEVNET STATE UNAVAILABLE · {payroll.error}</p>}

      <section className={styles.epochPanel} aria-label="Current deployment epoch">
        <div className={styles.epochHeading}>
          <div><span>CURRENT EPOCH</span><h3>{payroll.chainLoading ? "READING DEVNET..." : liveEpoch ? `DEPLOYMENT #${String(liveEpoch.number).padStart(2, "0")}` : "NOT INITIALIZED"}</h3></div>
          <b className={styles.epochStatus}>{liveEpoch?.status.toUpperCase() ?? "OFFLINE"}</b>
        </div>
        <dl className={styles.epochMetrics}>
          <div><dt>EPOCH END</dt><dd>{liveEpoch ? new Date(liveEpoch.endTimestamp * 1000).toLocaleString() : "—"}</dd></div>
          <div><dt>PAYROLL POOL</dt><dd>{sol(epoch.payrollPoolSol)}</dd></div>
          <div><dt>SOLDIERS DEPLOYED</dt><dd>{totalDeployed} / {epoch.collectionSupply}</dd></div>
          <div><dt>DEPLOYMENT VALUE</dt><dd>≈ {sol(epoch.deploymentCostSolPerSoldier)} / SOLDIER</dd></div>
          <div><dt>$GAS REQUIRED</dt><dd>{liveEpoch ? `${gasPerSoldier.toLocaleString()} TEST $GAS / SOLDIER` : epoch.gasRequirementLabel}</dd></div>
        </dl>
      </section>

      <div className={styles.payrollWorkspace}>
        <section className={styles.deploymentPanel} aria-labelledby="deployment-title">
          <div className={styles.deploymentHeading}>
            <div><span>REAL VERIFIED GAS NFT</span><h3 id="deployment-title">MY DEPLOYMENT</h3></div>
            <div className={styles.deploymentToolbar}>
              <button type="button" onClick={() => setSelectedSoldierMints(availableSoldiers.slice(0, MAX_ATOMIC_DEPLOYMENTS).map((soldier) => soldier.mint))} disabled={!availableSoldiers.length || payroll.busy}>SELECT UP TO {MAX_ATOMIC_DEPLOYMENTS}</button>
              <button type="button" onClick={() => setSelectedSoldierMints([])} disabled={!selectedCount || payroll.busy}>CLEAR</button>
            </div>
          </div>

          {scanning && !soldiers.length ? (
            <div className={`${styles.payrollState} ${styles.armyLoading}`}><strong>WAITING FOR PERSONNEL SCAN</strong><span /><p>Payroll will use the verified soldiers loaded by your Army.</p></div>
          ) : armyStatus === "error" && !soldiers.length ? (
            <div className={styles.payrollState}><strong>PERSONNEL FEED UNAVAILABLE</strong><p>Refresh the Army scan before preparing a deployment.</p></div>
          ) : !walletAddress ? (
            <div className={styles.payrollState}><strong>LINKED WALLET REQUIRED</strong><p>Connect a verified Solana wallet to load eligible GAS soldiers.</p></div>
          ) : !soldiers.length ? (
            <div className={styles.payrollState}><strong>NO ELIGIBLE SOLDIERS</strong><p>This wallet has no verified GAS NFT available for deployment.</p></div>
          ) : (
            <div className={styles.deploymentGrid}>
              {soldiers.map((soldier) => {
                const deployed = deployedMints.has(soldier.mint);
                const selected = selectedMints.has(soldier.mint);
                return (
                  <button type="button" key={soldier.mint} className={`${styles.deploymentCard} ${selected ? styles.deploymentSelected : ""} ${deployed ? styles.deploymentDeployed : ""}`} onClick={() => toggleSoldier(soldier.mint)} disabled={deployed || payroll.busy} aria-pressed={selected}>
                    <img src={soldier.image} alt="" loading="lazy" />
                    <span className={styles.deploymentCopy}><small title={soldier.mint}>{shortMint(soldier.mint)}</small><strong>{soldier.name}</strong><em>{soldier.rank ?? "RECRUIT"}</em></span>
                    <b>{deployed ? "DEPLOYED" : selected ? "SELECTED" : "AVAILABLE"}</b>
                  </button>
                );
              })}
            </div>
          )}

          <div className={styles.selectionSummary}>
            <div><span>SELECTED SOLDIERS</span><strong>{selectedCount} / {MAX_ATOMIC_DEPLOYMENTS}</strong></div>
            <div><span>ESTIMATED $GAS REQUIRED</span><strong>{selectedCount ? `${(selectedCount * gasPerSoldier).toLocaleString()} TEST $GAS` : "0 TEST $GAS"}</strong></div>
            <div><span>DEPLOYMENT VALUE</span><strong>≈ {sol(selectedCount * epoch.deploymentCostSolPerSoldier)}</strong></div>
            <button type="button" onClick={() => void deploySelected()} disabled={!selectedCount || !epoch.testMode || !payroll.config.configured || !liveEpoch || liveEpoch.status !== "open" || payroll.busy}>{payroll.busy ? "TRANSACTION ACTIVE..." : "DEPLOY SELECTED"}</button>
          </div>
          {payroll.status !== "idle" && (
            <div className={`${styles.payrollTransaction} ${payroll.status === "error" ? styles.payrollTransactionError : ""}`} role={payroll.status === "error" ? "alert" : "status"}>
              <strong>{payroll.status === "preparing" ? (payroll.config.localFallback ? "PREPARING LOCAL SIMULATION" : "PREPARING PROGRAM TRANSACTION") : payroll.status === "awaiting_signature" ? "AWAITING WALLET SIGNATURE" : payroll.status === "confirming" ? (payroll.config.localFallback ? "SAVING LOCAL TEST STATE" : "CONFIRMING ON DEVNET") : payroll.status === "success" ? "DEPLOYMENT CONFIRMED" : "DEPLOYMENT FAILED"}</strong>
              {payroll.error && <p>{payroll.error}</p>}
              {payroll.receipt && <dl><div><dt>EPOCH</dt><dd>#{payroll.receipt.epochNumber}</dd></div><div><dt>SOLDIERS DEPLOYED</dt><dd>{payroll.receipt.soldierCount}</dd></div><div><dt>{payroll.config.localFallback ? "TEST $GAS SIMULATED" : "TEST $GAS TRANSFERRED"}</dt><dd>{payroll.receipt.amountGas.toLocaleString()}</dd></div><div><dt>{payroll.config.localFallback ? "LOCAL RECORD" : "TRANSACTION"}</dt><dd>{payroll.config.localFallback ? shortenSignature(payroll.receipt.signature) : <a href={testExplorerUrl(payroll.receipt.signature)} target="_blank" rel="noopener noreferrer">{shortenSignature(payroll.receipt.signature)}</a>}</dd></div></dl>}
            </div>
          )}
        </section>

        <aside className={styles.payrollSide}>
          <section className={styles.payrollSummary}>
            <span>WEEKLY PAYROLL STATUS</span><h3>MY PAYROLL</h3>
            <dl><div><dt>MY ACTIVE SOLDIERS</dt><dd>{activeMints.length}</dd></div><div><dt>CURRENT ESTIMATED SHARE</dt><dd>{sol(summary.estimatedShareSol)}</dd></div><div><dt>CLAIMABLE</dt><dd>{sol(summary.claimableSol)}</dd></div></dl>
            <button type="button" disabled>CLAIM PAYROLL</button>
            <p>Payroll claiming is not implemented. No fixed return is guaranteed.</p>
          </section>
          <section className={styles.warChest}>
            <span>{payroll.config.localFallback ? "LOCAL SIMULATED BALANCE" : "DEVNET TEST BALANCE"}</span><h3>GAS WAR CHEST</h3>
            <strong>{payroll.balanceLoading ? "LOADING..." : payroll.warChestBalance === null ? "—" : payroll.warChestBalance.toLocaleString()} TEST $GAS</strong>
            <b>{payroll.config.localFallback ? "LOCAL ONLY · CLEARED WITH BROWSER DATA" : "DEVNET · NO REAL VALUE"}</b>
            <button className={styles.warChestRefresh} type="button" onClick={() => void Promise.all([payroll.refreshWarChest(), payroll.refreshChainState()])} disabled={!payroll.config.configured || payroll.balanceLoading || payroll.chainLoading}>REFRESH DEVNET STATE</button>
            <p>{payroll.config.localFallback ? "This is a browser-only UI fallback. It creates no blockchain transaction and proves nothing on-chain." : "Each program instruction atomically transfers TEST $GAS and creates one persistent deployment PDA."}</p>
          </section>
        </aside>
      </div>
    </section>
  );
}

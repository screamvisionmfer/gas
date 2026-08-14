"use client";
/* eslint-disable @next/next/no-img-element -- verified GAS metadata images are served directly. */

import { useMemo, useState } from "react";
import type { Soldier } from "@/lib/commander-hq-types";
import { MOCK_PAYROLL_EPOCH, MOCK_PAYROLL_SUMMARY } from "@/lib/commander-payroll-config";
import { estimatedWalletPayroll, payrollPerSoldier } from "@/lib/commander-payroll-local";
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
  const [claimNotice, setClaimNotice] = useState(0);
  const soldierMints = useMemo(() => soldiers.map((soldier) => soldier.mint), [soldiers]);
  const payroll = usePayrollDeployment(walletAddress, soldierMints);
  const local = payroll.localSimulation;
  const liveEpoch = payroll.chainState.epoch;
  const ownedMints = useMemo(() => new Set(soldierMints), [soldierMints]);
  const deployedMints = useMemo(() => new Set([...summary.activeSoldierMints, ...payroll.chainState.deployedSoldierMints]), [payroll.chainState.deployedSoldierMints, summary.activeSoldierMints]);
  const availableSoldiers = useMemo(() => soldiers.filter((soldier) => !deployedMints.has(soldier.mint)), [deployedMints, soldiers]);
  const selectedMints = useMemo(() => new Set(selectedSoldierMints), [selectedSoldierMints]);
  const localMode = payroll.config.localFallback;
  const myActiveSoldiers = Array.from(deployedMints).filter((mint) => ownedMints.has(mint)).length;
  const totalDeployed = localMode ? local.totalDeployedSoldiers : (liveEpoch?.totalDeployed ?? 0);
  const payrollPoolSol = localMode ? local.payrollPoolSol : epoch.payrollPoolSol;
  const perSoldierSol = localMode
    ? (local.status === "closed" ? local.finalPayrollPerSoldierSol : payrollPerSoldier(local.payrollPoolSol, local.totalDeployedSoldiers))
    : payrollPerSoldier(epoch.payrollPoolSol, totalDeployed);
  const currentEstimatedShare = localMode ? estimatedWalletPayroll(local) : summary.estimatedShareSol;
  const claimable = localMode ? (local.status === "closed" && !local.claimed ? local.finalEntitlementSol : 0) : summary.claimableSol;
  const gasPerSoldier = liveEpoch?.deploymentCostGas ?? epoch.gasRequiredPerSoldier;
  const scanning = armyStatus === "connecting" || armyStatus === "loading";

  function toggleSoldier(mint: string) {
    if (deployedMints.has(mint) || payroll.busy || liveEpoch?.status === "closed") return;
    setSelectedSoldierMints((current) => current.includes(mint)
      ? current.filter((selectedMint) => selectedMint !== mint)
      : current.length >= MAX_ATOMIC_DEPLOYMENTS ? current : [...current, mint]);
  }

  async function deploySelected() {
    if (!selectedSoldierMints.length) return;
    if (await payroll.deploy([...selectedSoldierMints])) setSelectedSoldierMints([]);
  }

  async function claimPayroll() {
    const claimed = await payroll.claimLocalSimulation();
    if (claimed > 0) setClaimNotice(claimed);
  }

  function startNextEpoch() {
    payroll.startNextLocalSimulation();
    setSelectedSoldierMints([]);
    setClaimNotice(0);
  }

  const selectedCount = selectedSoldierMints.length;

  return (
    <section className={`${styles.hqSection} ${styles.payrollSection}`} aria-labelledby="payroll-title">
      <header className={styles.sectionHeader}>
        <div><span>WEEKLY DEPLOYMENT PROGRAM</span><h2 id="payroll-title">COMMANDER PAYROLL</h2></div>
        <strong className={styles.testModeBadge}>{localMode ? "LOCAL SIMULATION" : "DEVNET TEST MODE"}</strong>
      </header>

      <p className={styles.payrollNotice}>{localMode ? "No real tokens or SOL are used." : "DEVNET PROGRAM TEST · Deployment records and TEST $GAS payment are atomic and persistent on Devnet. Mainnet GAS NFT ownership remains a UI eligibility check only."}</p>
      {!localMode && <div className={styles.payrollNetworkBar}><b>DEVNET</b><span>TEST $GAS</span><strong>NO REAL VALUE</strong></div>}
      {!payroll.config.configured && <p className={styles.payrollConfigError} role="alert">TEST NETWORK NOT CONFIGURED · {payroll.config.error}</p>}
      {!localMode && payroll.config.configured && payroll.error && payroll.status === "idle" && <p className={styles.payrollConfigError} role="alert">DEVNET STATE UNAVAILABLE · {payroll.error}</p>}

      <section className={styles.epochPanel} aria-label="Current deployment epoch">
        <div className={styles.epochHeading}>
          <div><span>CURRENT EPOCH</span><h3>{payroll.chainLoading ? "READING DEVNET..." : liveEpoch ? `DEPLOYMENT #${String(liveEpoch.number).padStart(2, "0")}` : "NOT INITIALIZED"}</h3></div>
          <b className={styles.epochStatus}>{liveEpoch?.status.toUpperCase() ?? "OFFLINE"}</b>
        </div>
        <dl className={`${styles.epochMetrics} ${styles.epochEconomyMetrics}`}>
          <div><dt>PAYROLL POOL</dt><dd>{sol(payrollPoolSol)}</dd></div>
          <div><dt>SOLDIERS DEPLOYED</dt><dd>{totalDeployed} / {epoch.collectionSupply}</dd></div>
          <div><dt>PAYROLL / SOLDIER</dt><dd>{sol(perSoldierSol)}</dd></div>
          <div><dt>DEPLOYMENT COST</dt><dd>{gasPerSoldier.toLocaleString()} TEST $GAS / SOLDIER</dd></div>
        </dl>
      </section>

      <div className={styles.payrollWorkspace}>
        <section className={styles.deploymentPanel} aria-labelledby="deployment-title">
          <div className={styles.deploymentHeading}>
            <div><span>REAL VERIFIED GAS NFT</span><h3 id="deployment-title">MY DEPLOYMENT</h3></div>
            <div className={styles.deploymentToolbar}>
              <button type="button" onClick={() => setSelectedSoldierMints(availableSoldiers.slice(0, MAX_ATOMIC_DEPLOYMENTS).map((soldier) => soldier.mint))} disabled={!availableSoldiers.length || payroll.busy || liveEpoch?.status === "closed"}>SELECT UP TO {MAX_ATOMIC_DEPLOYMENTS}</button>
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
                  <button type="button" key={soldier.mint} className={`${styles.deploymentCard} ${selected ? styles.deploymentSelected : ""} ${deployed ? styles.deploymentDeployed : ""}`} onClick={() => toggleSoldier(soldier.mint)} disabled={deployed || payroll.busy || liveEpoch?.status === "closed"} aria-pressed={selected}>
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
            <div><span>TEST $GAS REQUIRED</span><strong>{(selectedCount * gasPerSoldier).toLocaleString()} TEST $GAS</strong></div>
            <div><span>ESTIMATED PAYROLL</span><strong>{sol(perSoldierSol * selectedCount)}</strong></div>
            <button type="button" onClick={() => void deploySelected()} disabled={!selectedCount || !epoch.testMode || !payroll.config.configured || !liveEpoch || liveEpoch.status !== "open" || payroll.busy}>{payroll.busy ? "PROCESSING..." : "DEPLOY SELECTED"}</button>
          </div>
          {payroll.status !== "idle" && payroll.receipt && (
            <div className={styles.payrollTransaction} role="status">
              <strong>DEPLOYMENT CONFIRMED</strong>
              <dl><div><dt>EPOCH</dt><dd>#{payroll.receipt.epochNumber}</dd></div><div><dt>SOLDIERS DEPLOYED</dt><dd>{payroll.receipt.soldierCount}</dd></div><div><dt>{localMode ? "TEST $GAS SIMULATED" : "TEST $GAS TRANSFERRED"}</dt><dd>{payroll.receipt.amountGas.toLocaleString()}</dd></div><div><dt>{localMode ? "LOCAL RECORD" : "TRANSACTION"}</dt><dd>{localMode ? shortenSignature(payroll.receipt.signature) : <a href={testExplorerUrl(payroll.receipt.signature)} target="_blank" rel="noopener noreferrer">{shortenSignature(payroll.receipt.signature)}</a>}</dd></div></dl>
            </div>
          )}
          {payroll.status === "error" && <div className={`${styles.payrollTransaction} ${styles.payrollTransactionError}`} role="alert"><strong>DEPLOYMENT FAILED</strong><p>{payroll.error}</p></div>}
        </section>

        <aside className={styles.payrollSide}>
          <section className={styles.payrollSummary}>
            <span>WEEKLY PAYROLL STATUS</span><h3>MY PAYROLL</h3>
            <dl><div><dt>MY ACTIVE SOLDIERS</dt><dd>{myActiveSoldiers}</dd></div><div><dt>CURRENT ESTIMATED SHARE</dt><dd>{sol(currentEstimatedShare)}</dd></div><div><dt>CLAIMABLE</dt><dd>{sol(claimable)}</dd></div></dl>
            <button type="button" onClick={() => void claimPayroll()} disabled={!localMode || local.status !== "closed" || local.claimed || claimable <= 0 || payroll.busy}>CLAIM PAYROLL</button>
            {localMode && local.claimed && <strong className={styles.payrollClaimed}>PAYROLL CLAIMED · {sol(local.claimedAmountSol)}</strong>}
            {!local.claimed && claimNotice > 0 && <strong className={styles.payrollClaimed}>PAYROLL CLAIMED · {sol(claimNotice)}</strong>}
            <p>{localMode ? (local.status === "open" ? "Estimate changes as more soldiers deploy. It becomes final only when the epoch closes." : "The epoch is closed. This entitlement is frozen and cannot change.") : "Open-epoch payroll is an estimate. No fixed return is guaranteed."}</p>
          </section>

          {localMode && (
            <details className={styles.simulationControls}>
              <summary>SIMULATION CONTROLS</summary>
              <div>
                <label>PAYROLL POOL SOL<input type="number" min="0" step="0.1" value={local.payrollPoolSol} disabled={local.status === "closed"} onChange={(event) => payroll.updateLocalSimulation(Number(event.target.value), local.totalDeployedSoldiers)} /></label>
                <label>TOTAL DEPLOYED SOLDIERS<input type="number" min={local.deployedSoldierMints.length} max={epoch.collectionSupply} step="1" value={local.totalDeployedSoldiers} disabled={local.status === "closed"} onChange={(event) => payroll.updateLocalSimulation(local.payrollPoolSol, Number(event.target.value))} /></label>
                <button type="button" onClick={payroll.closeLocalSimulation} disabled={local.status === "closed"}>CLOSE EPOCH &amp; CALCULATE PAYROLL</button>
                <button type="button" onClick={startNextEpoch} disabled={local.status !== "closed"}>START NEXT EPOCH</button>
              </div>
            </details>
          )}

          <section className={styles.warChest}>
            <span>{localMode ? "ACCUMULATED SIMULATED BALANCE" : "DEVNET TEST BALANCE"}</span><h3>GAS WAR CHEST</h3>
            <strong>{payroll.balanceLoading ? "LOADING..." : payroll.warChestBalance === null ? "—" : payroll.warChestBalance.toLocaleString()} TEST $GAS</strong>
            <b>{localMode ? "DEPLOYMENT FEES · NOT PAYROLL FUNDS" : "DEVNET · NO REAL VALUE"}</b>
            {!localMode && <button className={styles.warChestRefresh} type="button" onClick={() => void Promise.all([payroll.refreshWarChest(), payroll.refreshChainState()])} disabled={!payroll.config.configured || payroll.balanceLoading || payroll.chainLoading}>REFRESH DEVNET STATE</button>}
            <p>{localMode ? "The War Chest accumulates deployment TEST $GAS across epochs. SOL Payroll comes from a separate simulated creator-revenue pool." : "Each program instruction atomically transfers TEST $GAS and creates one persistent deployment PDA."}</p>
          </section>
        </aside>
      </div>

      {localMode && local.history.length > 0 && (
        <section className={styles.epochHistory} aria-labelledby="epoch-history-title">
          <div><span>COMPLETED OPERATIONS</span><h3 id="epoch-history-title">EPOCH HISTORY</h3></div>
          <div className={styles.epochHistoryList}>
            {[...local.history].reverse().map((record) => (
              <article key={record.epochNumber}>
                <strong>EPOCH #{String(record.epochNumber).padStart(2, "0")}</strong>
                <span>POOL {sol(record.payrollPoolSol)}</span><span>DEPLOYED {record.totalDeployedSoldiers}</span><span>MY SOLDIERS {record.walletDeployedSoldiers}</span><span>MY PAYROLL {sol(record.entitlementSol)}</span>
                <b>{record.claimed ? "CLAIMED" : "UNCLAIMED"}</b>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

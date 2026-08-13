"use client";
/* eslint-disable @next/next/no-img-element -- verified GAS metadata images are served directly. */

import { useMemo, useState } from "react";
import type { Soldier } from "@/lib/commander-hq-types";
import { MOCK_PAYROLL_EPOCH, MOCK_PAYROLL_SUMMARY } from "@/lib/commander-payroll-config";
import { shortenSignature, testExplorerUrl } from "@/lib/commander-payroll-solana";
import type { DeploymentState, PayrollEpoch, PayrollSummary } from "@/lib/commander-payroll-types";
import { usePayrollDeployment } from "@/hooks/usePayrollDeployment";
import type { ArmyLoadStatus } from "./ArmySection";
import styles from "./CommanderHQ.module.css";

type PayrollSectionProps = {
  soldiers: Soldier[];
  armyStatus: ArmyLoadStatus;
  walletAddress: string;
  epoch?: PayrollEpoch;
  summary?: PayrollSummary;
};

function shortMint(mint: string) {
  return mint.length > 16 ? `${mint.slice(0, 6)}…${mint.slice(-6)}` : mint;
}

function sol(value: number) {
  return `${value.toFixed(3)} SOL`;
}

export function PayrollSection({
  soldiers,
  armyStatus,
  walletAddress,
  epoch = MOCK_PAYROLL_EPOCH,
  summary = MOCK_PAYROLL_SUMMARY,
}: PayrollSectionProps) {
  const [deployment, setDeployment] = useState<DeploymentState>({
    epochId: epoch.id,
    selectedSoldierMints: [],
    deployedSoldierMints: epoch.deployedSoldierMints,
  });
  const payroll = usePayrollDeployment(walletAddress);

  const ownedMints = useMemo(() => new Set(soldiers.map((soldier) => soldier.mint)), [soldiers]);
  const deployedMints = useMemo(
    () => new Set([...summary.activeSoldierMints, ...deployment.deployedSoldierMints]),
    [deployment.deployedSoldierMints, summary.activeSoldierMints],
  );
  const availableSoldiers = useMemo(() => soldiers.filter((soldier) => !deployedMints.has(soldier.mint)), [deployedMints, soldiers]);
  const selectedMints = useMemo(() => new Set(deployment.selectedSoldierMints), [deployment.selectedSoldierMints]);

  function toggleSoldier(mint: string) {
    if (deployedMints.has(mint)) return;
    if (payroll.busy) return;
    setDeployment((current) => ({
      ...current,
      selectedSoldierMints: current.selectedSoldierMints.includes(mint)
        ? current.selectedSoldierMints.filter((selectedMint) => selectedMint !== mint)
        : [...current.selectedSoldierMints, mint],
    }));
  }

  async function deploySelected() {
    if (!deployment.selectedSoldierMints.length) return;
    const selected = [...deployment.selectedSoldierMints];
    const receipt = await payroll.deploy(selected, selected.length * epoch.gasRequiredPerSoldier);
    if (!receipt) return;
    setDeployment((current) => ({ ...current, selectedSoldierMints: [], deployedSoldierMints: Array.from(new Set([...current.deployedSoldierMints, ...receipt.soldierMints])) }));
  }

  const selectedCount = deployment.selectedSoldierMints.length;
  const activeMints = Array.from(deployedMints).filter((mint) => ownedMints.has(mint));
  const totalDeployed = new Set([...epoch.deployedSoldierMints, ...deployment.deployedSoldierMints]).size;
  const scanning = armyStatus === "connecting" || armyStatus === "loading";

  return (
    <section className={`${styles.hqSection} ${styles.payrollSection}`} aria-labelledby="payroll-title">
      <header className={styles.sectionHeader}>
        <div><span>WEEKLY DEPLOYMENT PROGRAM</span><h2 id="payroll-title">COMMANDER PAYROLL</h2></div>
        <strong className={styles.testModeBadge}>TEST MODE</strong>
      </header>

      <p className={styles.payrollNotice}>DEVNET TRANSACTION TEST · Transfers TEST $GAS with no real value. Mainnet GAS NFTs are displayed for UX testing only and do not prove Devnet deployment eligibility.</p>
      <div className={styles.payrollNetworkBar}><b>DEVNET</b><span>TEST $GAS</span><strong>NO REAL VALUE</strong></div>
      {!payroll.config.configured && <p className={styles.payrollConfigError} role="alert">TEST NETWORK NOT CONFIGURED · {payroll.config.error}</p>}

      <section className={styles.epochPanel} aria-label="Current deployment epoch">
        <div className={styles.epochHeading}>
          <div><span>CURRENT EPOCH</span><h3>DEPLOYMENT #{String(epoch.number).padStart(2, "0")}</h3></div>
          <b className={styles.epochStatus}>{epoch.status.toUpperCase()}</b>
        </div>
        <dl className={styles.epochMetrics}>
          <div><dt>TIME REMAINING</dt><dd>{epoch.timeRemainingLabel}</dd></div>
          <div><dt>PAYROLL POOL</dt><dd>{sol(epoch.payrollPoolSol)}</dd></div>
          <div><dt>SOLDIERS DEPLOYED</dt><dd>{totalDeployed} / {epoch.collectionSupply}</dd></div>
          <div><dt>DEPLOYMENT COST</dt><dd>≈ {sol(epoch.deploymentCostSolPerSoldier)} / SOLDIER</dd></div>
          <div><dt>$GAS REQUIRED</dt><dd>{epoch.gasRequirementLabel}</dd></div>
        </dl>
      </section>

      <div className={styles.payrollWorkspace}>
        <section className={styles.deploymentPanel} aria-labelledby="deployment-title">
          <div className={styles.deploymentHeading}>
            <div><span>REAL VERIFIED GAS NFT</span><h3 id="deployment-title">MY DEPLOYMENT</h3></div>
            <div className={styles.deploymentToolbar}>
              <button type="button" onClick={() => setDeployment((current) => ({ ...current, selectedSoldierMints: availableSoldiers.map((soldier) => soldier.mint) }))} disabled={!availableSoldiers.length || payroll.busy}>SELECT ALL</button>
              <button type="button" onClick={() => setDeployment((current) => ({ ...current, selectedSoldierMints: [] }))} disabled={!selectedCount || payroll.busy}>CLEAR</button>
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
                  <button
                    type="button"
                    key={soldier.mint}
                    className={`${styles.deploymentCard} ${selected ? styles.deploymentSelected : ""} ${deployed ? styles.deploymentDeployed : ""}`}
                    onClick={() => toggleSoldier(soldier.mint)}
                    disabled={deployed || payroll.busy}
                    aria-pressed={selected}
                  >
                    <img src={soldier.image} alt="" loading="lazy" />
                    <span className={styles.deploymentCopy}>
                      <small title={soldier.mint}>{shortMint(soldier.mint)}</small>
                      <strong>{soldier.name}</strong>
                      <em>{soldier.rank ?? "RECRUIT"}</em>
                    </span>
                    <b>{deployed ? "DEPLOYED" : selected ? "SELECTED" : "AVAILABLE"}</b>
                  </button>
                );
              })}
            </div>
          )}

          <div className={styles.selectionSummary}>
            <div><span>SELECTED SOLDIERS</span><strong>{selectedCount}</strong></div>
            <div><span>ESTIMATED $GAS REQUIRED</span><strong>{selectedCount ? `${(selectedCount * epoch.gasRequiredPerSoldier).toLocaleString()} TEST $GAS` : "0 TEST $GAS"}</strong></div>
            <div><span>DEPLOYMENT VALUE</span><strong>≈ {sol(selectedCount * epoch.deploymentCostSolPerSoldier)}</strong></div>
            <button type="button" onClick={() => void deploySelected()} disabled={!selectedCount || !epoch.testMode || !payroll.config.configured || payroll.busy}>{payroll.busy ? "TRANSACTION ACTIVE..." : "DEPLOY SELECTED"}</button>
          </div>
          {payroll.status !== "idle" && (
            <div className={`${styles.payrollTransaction} ${payroll.status === "error" ? styles.payrollTransactionError : ""}`} role={payroll.status === "error" ? "alert" : "status"}>
              <strong>{payroll.status === "preparing" ? "PREPARING DEVNET TRANSFER" : payroll.status === "awaiting_signature" ? "AWAITING WALLET SIGNATURE" : payroll.status === "confirming" ? "CONFIRMING ON DEVNET" : payroll.status === "success" ? "DEPLOYMENT CONFIRMED" : "DEPLOYMENT FAILED"}</strong>
              {payroll.error && <p>{payroll.error}</p>}
              {payroll.receipt && <dl><div><dt>SOLDIERS</dt><dd>{payroll.receipt.soldierCount}</dd></div><div><dt>TEST $GAS TRANSFERRED</dt><dd>{payroll.receipt.amountGas.toLocaleString()}</dd></div><div><dt>TRANSACTION</dt><dd><a href={testExplorerUrl(payroll.receipt.signature)} target="_blank" rel="noopener noreferrer">{shortenSignature(payroll.receipt.signature)}</a></dd></div></dl>}
            </div>
          )}
        </section>

        <aside className={styles.payrollSide}>
          <section className={styles.payrollSummary}>
            <span>WEEKLY PAYROLL STATUS</span><h3>MY PAYROLL</h3>
            <dl>
              <div><dt>MY ACTIVE SOLDIERS</dt><dd>{activeMints.length}</dd></div>
              <div><dt>CURRENT ESTIMATED SHARE</dt><dd>{sol(summary.estimatedShareSol)}</dd></div>
              <div><dt>CLAIMABLE</dt><dd>{sol(summary.claimableSol)}</dd></div>
            </dl>
            <button type="button" disabled>CLAIM PAYROLL</button>
            <p>Payroll is funded by $GAS creator revenue. Rewards vary with trading activity. No fixed return is guaranteed.</p>
          </section>
          <section className={styles.warChest}>
            <span>DEVNET TEST BALANCE</span><h3>GAS WAR CHEST</h3>
            <strong>{payroll.balanceLoading ? "LOADING..." : payroll.warChestBalance === null ? "—" : payroll.warChestBalance.toLocaleString()} TEST $GAS</strong>
            <b>DEVNET · NO REAL VALUE</b>
            <button className={styles.warChestRefresh} type="button" onClick={() => void payroll.refreshWarChest()} disabled={!payroll.config.configured || payroll.balanceLoading}>REFRESH BALANCE</button>
            <p>The only blockchain action in this test is a user-approved TEST $GAS transfer on Devnet. Tokens are collected, not burned.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}

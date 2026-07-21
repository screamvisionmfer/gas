import type { ProvisionsData, TreasuryData } from "@/lib/commander-hq-types";
import styles from "./CommanderHQ.module.css";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function TreasurySection({ treasury, provisions }: { treasury: TreasuryData; provisions: ProvisionsData }) {
  return (
    <section className={`${styles.hqSection} ${styles.treasurySection}`} aria-labelledby="treasury-title">
      <div className={styles.treasuryPane}>
        <span>WAR CHEST / ESTIMATED</span>
        <h2 id="treasury-title">TREASURY</h2>
        <strong className={styles.bigMoney}>{usd.format(treasury.totalValueUsd)}</strong>
        <p className={styles.positive}>+{usd.format(treasury.change24hUsd)} · +{treasury.change24hPercent}% / 24H</p>
        <dl className={styles.financeList}>
          <div><dt>INVESTED</dt><dd>{usd.format(treasury.investedUsd)}</dd></div>
          <div><dt>REALIZED PNL</dt><dd className={styles.positive}>{usd.format(treasury.realizedPnlUsd)}</dd></div>
          <div><dt>UNREALIZED PNL</dt><dd className={styles.positive}>{usd.format(treasury.unrealizedPnlUsd)}</dd></div>
        </dl>
      </div>
      <div className={styles.provisionsPane}>
        <span>SUPPLY INVENTORY</span>
        <h2>PROVISIONS — $GROYPER</h2>
        <div className={styles.provisionBalance}><strong>{number.format(provisions.tokenBalance)}</strong><small>$GROYPER</small></div>
        <p>{usd.format(provisions.tokenValueUsd)} CURRENT VALUE</p>
        <dl className={styles.financeList}>
          <div><dt>TOKEN PRICE</dt><dd>${provisions.tokenPriceUsd.toFixed(5)}</dd></div>
          <div><dt>AVERAGE ENTRY</dt><dd>${provisions.averageEntryUsd.toFixed(5)}</dd></div>
          <div><dt>24H CHANGE</dt><dd className={styles.positive}>+{provisions.change24hPercent}%</dd></div>
        </dl>
        <div className={styles.supplyCrate} aria-hidden="true"><span>$G</span><i /><b>GAS PROVISIONS</b></div>
      </div>
    </section>
  );
}


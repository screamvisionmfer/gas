import type { GroyperMarketData, GroyperTokenBalance, LiveDataStatus, TreasuryData } from "@/lib/commander-hq-types";
import styles from "./CommanderHQ.module.css";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const compactBalance = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });

function exactTokenAmount(balance: GroyperTokenBalance) {
  const decimals = Math.max(0, balance.decimals);
  const padded = balance.rawAmount.padStart(decimals + 1, "0");
  const integer = decimals ? padded.slice(0, -decimals) : padded;
  const fraction = decimals ? padded.slice(-decimals).replace(/0+$/, "") : "";
  const groupedInteger = BigInt(integer || "0").toLocaleString("en-US");
  return fraction ? `${groupedInteger}.${fraction}` : groupedInteger;
}

function tokenPrice(value: number | null | undefined) {
  if (value === null || value === undefined) return "PRICE UNAVAILABLE";
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 10, minimumSignificantDigits: 2, maximumSignificantDigits: 7 })}`;
}

function signedPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "UNAVAILABLE";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

type TreasurySectionProps = {
  treasury: TreasuryData;
  balance: GroyperTokenBalance | null;
  market: GroyperMarketData | null;
  status: LiveDataStatus;
  error: string;
  walletConnected: boolean;
  onRefresh: () => void;
};

export function TreasurySection({ treasury, balance, market, status, error, walletConnected, onRefresh }: TreasurySectionProps) {
  const exactBalance = balance ? exactTokenAmount(balance) : "0";
  const tokenValue = balance && market?.priceUsd !== null && market?.priceUsd !== undefined
    ? balance.uiAmount * market.priceUsd
    : null;
  const change = market?.priceChange24hPercent;

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
          <div><dt>AVERAGE BUY PRICE</dt><dd>{tokenPrice(treasury.averageBuyPriceUsd)}</dd></div>
        </dl>
      </div>
      <div className={styles.provisionsPane}>
        <span>LIVE WALLET INVENTORY</span>
        <h2>PROVISIONS — $GROYPER</h2>

        {!walletConnected ? (
          <div className={styles.liveDataState}><strong>WALLET NOT CONNECTED</strong><p>Connect a read-only Solana wallet to inspect provisions.</p></div>
        ) : status === "loading" && !balance ? (
          <div className={`${styles.liveDataState} ${styles.liveDataLoading}`}><strong>SCANNING TOKEN ACCOUNTS</strong><span /></div>
        ) : status === "error" && !balance ? (
          <div className={`${styles.liveDataState} ${styles.liveDataError}`}><strong>PROVISIONS FEED UNAVAILABLE</strong><p>{error}</p><button type="button" onClick={onRefresh}>RETRY DATA</button></div>
        ) : balance ? (
          <>
            <div className={styles.provisionBalance} title={`${exactBalance} $GROYPER`}><strong>{compactBalance.format(balance.uiAmount)}</strong><small>$GROYPER</small></div>
            <p className={styles.exactBalance}>EXACT BALANCE: {exactBalance} $GROYPER</p>
            <p>{tokenValue === null ? "PRICE UNAVAILABLE" : `${usd.format(tokenValue)} CURRENT VALUE`}</p>
            <dl className={styles.financeList}>
              <div><dt>TOKEN PRICE</dt><dd>{tokenPrice(market?.priceUsd)}</dd></div>
              <div><dt>24H CHANGE</dt><dd className={change !== null && change !== undefined && change < 0 ? styles.negative : styles.positive}>{signedPercent(change)}</dd></div>
              <div><dt>ON-CHAIN STATUS</dt><dd>{balance.uiAmount === 0 ? "ZERO BALANCE" : "CONFIRMED"}</dd></div>
            </dl>
            {status === "error" ? <p className={styles.liveInlineError}>{error} · DISPLAYING LAST CONFIRMED BALANCE</p> : null}
            <button className={styles.liveRefreshButton} type="button" onClick={onRefresh} disabled={status === "loading"}>{status === "loading" ? "REFRESHING DATA..." : "REFRESH DATA"}</button>
          </>
        ) : null}

        <div className={styles.supplyCrate} aria-hidden="true"><span>$G</span><i /><b>GAS PROVISIONS</b></div>
      </div>
    </section>
  );
}


"use client";

import { useMemo } from "react";
import type { GroyperMarketData, LiveDataStatus, MarketChartPoint } from "@/lib/commander-hq-types";
import { safeExternalUrl, siteConfig } from "@/lib/site-config";
import styles from "./CommanderHQ.module.css";

const periods = ["1H", "24H", "7D", "30D"] as const;
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });

function chartPolyline(points: MarketChartPoint[]) {
  if (!points.length) return "";
  const values = points.map((point) => point.priceUsd);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum;
  return values.map((value, index) => {
    const x = values.length === 1 ? 380 : (index / (values.length - 1)) * 760;
    const y = range === 0 ? 120 : 205 - ((value - minimum) / range) * 170;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}
function price(value: number | null) {
  return value === null ? "PRICE UNAVAILABLE" : `$${value.toLocaleString("en-US", { maximumFractionDigits: 10, minimumSignificantDigits: 2, maximumSignificantDigits: 7 })}`;
}

function metric(value: number | null) {
  return value === null ? "UNAVAILABLE" : `$${compact.format(value)}`;
}

function change(value: number | null) {
  return value === null ? "UNAVAILABLE" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function intelAge(updatedAt: string) {
  const elapsed = Date.now() - new Date(updatedAt).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return { label: "JUST NOW", stale: false };
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return { label: "JUST NOW", stale: false };
  return { label: `${minutes} MIN AGO`, stale: minutes >= 2 };
}

type MarketIntelSectionProps = {
  market: GroyperMarketData | null;
  chart24h: MarketChartPoint[];
  status: LiveDataStatus;
  error: string;
  onRefresh: () => void;
};

export function MarketIntelSection({ market, chart24h, status, error, onRefresh }: MarketIntelSectionProps) {
  const points = useMemo(() => chartPolyline(chart24h), [chart24h]);
  const age = market ? intelAge(market.updatedAt) : null;
  const marketUrl = safeExternalUrl(market?.pairUrl ?? siteConfig.dexScreenerUrl);
  const change24h = market?.priceChange24hPercent ?? null;

  return (
    <section className={styles.hqSection} aria-labelledby="market-title">
      <header className={styles.sectionHeader}>
        <div><span>DEXSCREENER FEED / GECKOTERMINAL 24H</span><h2 id="market-title">$GROYPER MARKET INTEL</h2></div>
        <div className={styles.sectionActions}>
          <button className={`${styles.sectionButton} ${styles.refreshButton}`} type="button" onClick={onRefresh} disabled={status === "loading"}>{status === "loading" ? "REFRESHING..." : "REFRESH DATA"}</button>
          <a className={styles.sectionButton} href={marketUrl} target="_blank" rel="noopener noreferrer">VIEW ON DEXSCREENER</a>
        </div>
      </header>

      {status === "loading" && !market ? (
        <div className={`${styles.emptyState} ${styles.liveDataLoading}`}><strong>RECEIVING MARKET INTELLIGENCE</strong><span /></div>
      ) : status === "error" && !market ? (
        <div className={`${styles.emptyState} ${styles.armyError}`}><strong>MARKET API UNAVAILABLE</strong><p>{error}</p></div>
      ) : market ? (
        <>
          <div className={styles.marketMetrics}>
            <div className={styles.marketPrice}><small>CURRENT PRICE</small><strong>{price(market.priceUsd)}</strong><b className={change24h !== null && change24h < 0 ? styles.negative : styles.positive}>{change(change24h)}</b></div>
            <div><small>MARKET CAP</small><strong>{metric(market.marketCapUsd)}</strong></div>
            <div><small>LIQUIDITY</small><strong>{metric(market.liquidityUsd)}</strong></div>
            <div><small>VOLUME 24H</small><strong>{metric(market.volume24hUsd)}</strong></div>
            <div><small>FDV</small><strong>{metric(market.fdvUsd)}</strong></div>
          </div>
          <div className={styles.marketStatusLine}>
            <span>{market.dexId?.toUpperCase() ?? "DEX"} · {market.pairAddress ? `${market.pairAddress.slice(0, 6)}…${market.pairAddress.slice(-6)}` : "PAIR UNAVAILABLE"}</span>
            <b className={age?.stale ? styles.staleData : ""}>LAST INTEL UPDATE: {age?.label ?? "UNKNOWN"}</b>
          </div>
          {status === "error" ? <p className={styles.liveInlineError}>{error} · DISPLAYING LAST AVAILABLE INTEL</p> : null}
          <div className={styles.chartPanel}>
            <div className={styles.chartPeriods} aria-label="Chart period">
              {periods.map((item) => {
                const available = item === "24H" && Boolean(points);
                return <button className={available ? styles.activePeriod : ""} type="button" key={item} disabled={!available} title={available ? "LIVE 24H PRICE DATA" : "DATA COMING SOON"} aria-pressed={available}>{item}</button>;
              })}
            </div>
            {points ? (
              <svg className={styles.marketChart} viewBox="0 0 760 230" role="img" aria-label="$GROYPER real 24H price chart" preserveAspectRatio="none">
                <g className={styles.chartGrid}><line x1="0" y1="35" x2="760" y2="35" /><line x1="0" y1="92" x2="760" y2="92" /><line x1="0" y1="149" x2="760" y2="149" /><line x1="0" y1="205" x2="760" y2="205" /></g>
                <polyline className={styles.chartShadow} points={points} />
                <polyline className={styles.chartLine} points={points} />
              </svg>
            ) : (
              <div className={styles.emptyState}><strong>24H PRICE HISTORY UNAVAILABLE</strong><p>Current market metrics are live. Historical chart data is temporarily unavailable.</p></div>
            )}
          </div>
        </>
      ) : (
        <div className={styles.emptyState}><strong>MARKET FEED INITIALIZING</strong></div>
      )}
    </section>
  );
}

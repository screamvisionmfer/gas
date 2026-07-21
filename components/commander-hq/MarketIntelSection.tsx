"use client";

import { useMemo, useState } from "react";
import type { MarketData } from "@/lib/commander-hq-types";
import { safeExternalUrl, siteConfig } from "@/lib/site-config";
import styles from "./CommanderHQ.module.css";

type Period = keyof MarketData["chart"];
const periods: Period[] = ["1H", "24H", "7D", "30D"];
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });

function chartPoints(values: number[]) {
  if (!values.length) return "";
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  return values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 760;
    const y = 205 - ((value - minimum) / range) * 170;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function MarketIntelSection({ market }: { market: MarketData }) {
  const [period, setPeriod] = useState<Period>("24H");
  const points = useMemo(() => chartPoints(market.chart[period] ?? []), [market.chart, period]);

  return (
    <section className={styles.hqSection} aria-labelledby="market-title">
      <header className={styles.sectionHeader}>
        <div><span>LIVE MARKET FEED / MOCK ADAPTER</span><h2 id="market-title">$GROYPER MARKET INTEL</h2></div>
        <a className={styles.sectionButton} href={safeExternalUrl(siteConfig.dexScreenerUrl)} target="_blank" rel="noopener noreferrer">VIEW ON DEXSCREENER</a>
      </header>
      <div className={styles.marketMetrics}>
        <div className={styles.marketPrice}><small>CURRENT PRICE</small><strong>${market.tokenPriceUsd.toFixed(5)}</strong><b>+{market.change24hPercent}%</b></div>
        <div><small>MARKET CAP</small><strong>${compact.format(market.marketCapUsd)}</strong></div>
        <div><small>LIQUIDITY</small><strong>${compact.format(market.liquidityUsd)}</strong></div>
        <div><small>VOLUME 24H</small><strong>${compact.format(market.volume24hUsd)}</strong></div>
        <div><small>HOLDERS</small><strong>{market.holders.toLocaleString("en-US")}</strong></div>
      </div>
      <div className={styles.chartPanel}>
        <div className={styles.chartPeriods} aria-label="Chart period">
          {periods.map((item) => <button className={item === period ? styles.activePeriod : ""} type="button" key={item} onClick={() => setPeriod(item)} aria-pressed={item === period}>{item}</button>)}
        </div>
        {points ? (
          <svg className={styles.marketChart} viewBox="0 0 760 230" role="img" aria-label={`$GROYPER ${period} price chart`} preserveAspectRatio="none">
            <g className={styles.chartGrid}><line x1="0" y1="35" x2="760" y2="35" /><line x1="0" y1="92" x2="760" y2="92" /><line x1="0" y1="149" x2="760" y2="149" /><line x1="0" y1="205" x2="760" y2="205" /></g>
            <polyline className={styles.chartShadow} points={points} />
            <polyline className={styles.chartLine} points={points} />
          </svg>
        ) : (
          <div className={styles.emptyState}><strong>MARKET FEED TEMPORARILY SILENT</strong><p>No chart data is available for this period.</p></div>
        )}
      </div>
    </section>
  );
}

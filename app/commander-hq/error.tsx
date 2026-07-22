"use client";
/* eslint-disable @next/next/no-img-element -- local GAS artwork is served directly. */

import { useEffect } from "react";
import styles from "@/components/commander-hq/CommanderHQ.module.css";

export default function CommanderHQError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Commander HQ route failure", error);
  }, [error]);

  function restartIdentity() {
    const url = new URL(window.location.href);
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("privy_oauth_")) url.searchParams.delete(key);
    }
    window.location.replace(url.toString());
  }

  return (
    <main className={styles.accessPage}>
      <section className={styles.dashboardError} role="alert">
        <img src="/logo.png" width="92" height="92" alt="" />
        <span>GAS IDENTITY RECOVERY</span>
        <h1>IDENTITY LINK INTERRUPTED</h1>
        <p>{error.message || "The X identity callback could not be completed."}</p>
        {error.digest && <p>REPORT ID · {error.digest}</p>}
        <button type="button" onClick={reset}>RETRY CALLBACK</button>
        <button type="button" onClick={restartIdentity}>RESET X LOGIN</button>
      </section>
    </main>
  );
}

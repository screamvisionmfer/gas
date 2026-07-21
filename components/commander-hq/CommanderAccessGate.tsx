"use client";
/* eslint-disable @next/next/no-img-element -- local GAS artwork is served directly. */

import { FormEvent, useEffect, useRef, useState } from "react";
import styles from "./CommanderHQ.module.css";

export function CommanderAccessGate({ configurationError = false }: { configurationError?: boolean }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "accepted">("idle");
  const [error, setError] = useState(configurationError ? "COMMANDER HQ IS NOT CONFIGURED" : "");
  const [bootLine, setBootLine] = useState("");
  const [acceptedLines, setAcceptedLines] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const message = "ESTABLISHING ENCRYPTED FIELD LINK...";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const reducedTimer = window.setTimeout(() => setBootLine(message), 0);
      return () => window.clearTimeout(reducedTimer);
    }
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setBootLine(message.slice(0, index));
      if (index >= message.length) window.clearInterval(timer);
    }, 34);
    return () => window.clearInterval(timer);
  }, []);

  async function authorize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || status !== "idle" || configurationError) return;
    const submittedPassword = password;
    setPassword("");
    setStatus("loading");
    setError("");

    try {
      const response = await fetch("/api/commander-hq/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: submittedPassword }),
      });
      const payload = await response.json() as { ok?: boolean; error?: string; retryAfter?: number };
      if (!response.ok || !payload.ok) {
        const retry = payload.retryAfter ? ` · RETRY IN ${Math.ceil(payload.retryAfter / 60)} MIN` : "";
        throw new Error(`${payload.error ?? "SECURE NETWORK ERROR"}${retry}`);
      }

      setStatus("accepted");
      const lines = ["ACCESS CODE ACCEPTED", "CLEARANCE CONFIRMED", "OPENING COMMANDER HQ..."];
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        setAcceptedLines(lines);
      } else {
        for (const line of lines) {
          await new Promise((resolve) => window.setTimeout(resolve, 260));
          setAcceptedLines((current) => [...current, line]);
        }
      }
      window.setTimeout(() => window.location.replace("/commander-hq"), reduced ? 60 : 360);
    } catch (authError) {
      setStatus("idle");
      setError(authError instanceof Error ? authError.message : "SECURE NETWORK ERROR");
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  return (
    <main className={styles.accessPage}>
      <div className={styles.accessScanlines} aria-hidden="true" />
      <section className={styles.accessTerminal} aria-labelledby="access-title">
        <div className={styles.accessTerminalTop}>
          <span>GAS SECURE NETWORK</span>
          <b>NODE 44 / ENCRYPTED</b>
        </div>
        <img src="/logo.png" width="96" height="96" alt="Groypers Alpha Squadron" />
        <p className={styles.bootLine}>{bootLine}<i aria-hidden="true" /></p>
        <h1 id="access-title">COMMANDER HQ<br />ACCESS TERMINAL</h1>
        <div className={styles.terminalPrompt}>
          <span>&gt; IDENTIFICATION REQUIRED</span>
          <span>&gt; ENTER ACCESS CODE</span>
        </div>

        {status === "accepted" ? (
          <div className={styles.accessAccepted} role="status" aria-live="polite">
            {acceptedLines.map((line) => <strong key={line}>{line}</strong>)}
          </div>
        ) : (
          <form onSubmit={authorize} className={styles.accessForm}>
            <label htmlFor="commander-access-code">ACCESS CODE</label>
            <div>
              <input
                ref={inputRef}
                id="commander-access-code"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
                autoComplete="current-password"
                disabled={status === "loading" || configurationError}
              />
              <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>
            <button className={styles.authorizeButton} type="submit" disabled={status === "loading" || !password || configurationError}>
              {status === "loading" ? "AUTHORIZING..." : "AUTHORIZE"}
            </button>
          </form>
        )}

        <p className={styles.accessError} aria-live="assertive">{error}</p>
        <small className={styles.accessFoot}>ACCESS LIMITED TO CLEARED PERSONNEL</small>
      </section>
    </main>
  );
}

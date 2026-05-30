/**
 * @file LoginScreen.tsx
 * @module ui/screens
 *
 * Operator Login — email + 6-digit PIN.
 *
 * Specification: ECS v1.3 EVENT 13 — OPERATOR_SESSION_OPENED
 *                AMS v1.3 — Terminal Operations (Boundary Module)
 *                SOS v1.0 §2 — Two-factor: email (identity) + PIN (secret)
 *                ui-standards.md §10 — PIN Entry
 *
 * Flow:
 *   Step 1 — Enter email address
 *   Step 2 — Enter 6-digit PIN
 *   System identifies operator from email + PIN combination
 *
 * Responsive: adapts from 320px phones to 4K displays.
 * Desktop: hardware keyboard only. Mobile: custom numpad.
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter }               from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { sessionService }          from "@/core/session/session.service";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIN_LENGTH = 6;

const ROLE_REDIRECT: Record<string, string> = {
  CASHIER:      "/cashier",
  BARBER:       "/barber/lane_001", // fallback — overridden below when barber_id is known
  ADMIN:        "/admin",
  SYSTEM_OWNER: "/admin",
};

// ─── PIN Box ──────────────────────────────────────────────────────────────────

function PinBox({
  filled, active, error, success,
}: {
  filled: boolean; active: boolean; error: boolean; success: boolean;
}) {
  const border = error ? "#ef4444" : success ? "#e2d609" : active ? "#e2d609" : filled ? "#3a4650" : "#2d3840";
  const glow   = error ? "0 0 0 3px rgba(239,68,68,0.15)"
    : (success || active) ? "0 0 0 3px rgba(226,214,9,0.15)" : "none";
  const bg     = success ? "rgba(226,214,9,0.12)" : filled ? "#252f38" : "#1e262d";

  return (
    <div style={{
      flex: "1 1 0",
      maxWidth: "52px",
      aspectRatio: "4/5",
      borderRadius: "10px",
      border: `2px solid ${border}`,
      background: bg,
      boxShadow: glow,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
    }}>
      {filled && (
        <div style={{
          width: "35%", height: "35%",
          borderRadius: "50%",
          background: success ? "#e2d609" : "rgba(255,255,255,0.85)",
          transition: "background 0.2s",
        }} />
      )}
    </div>
  );
}

// ─── Numpad Key ───────────────────────────────────────────────────────────────

function NumKey({
  label, sub, onPress, disabled, ghost,
}: {
  label: string; sub?: string; onPress: () => void;
  disabled?: boolean; ghost?: boolean;
}) {
  const [down, setDown] = useState(false);

  const press = () => {
    if (disabled) return;
    setDown(true);
    setTimeout(() => setDown(false), 100);
    onPress();
  };

  return (
    <button
      onClick={press}
      disabled={disabled}
      aria-label={label}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2px",
        aspectRatio: "1",
        borderRadius: "14px",
        background: down ? "#3a4650" : ghost ? "transparent" : "#1e262d",
        border: ghost ? "1px solid transparent" : "1px solid #2d3840",
        color: ghost ? "rgba(255,255,255,0.45)" : "#f5f5f5",
        fontSize: "clamp(16px, 4.5vw, 22px)",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
        transform: down ? "scale(0.93)" : "scale(1)",
        transition: "background 0.1s, transform 0.1s",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      <span>{label}</span>
      {sub && (
        <span style={{
          fontSize: "clamp(7px, 1.8vw, 9px)",
          letterSpacing: "0.08em",
          color: "rgba(255,255,255,0.28)",
          fontWeight: 500,
          lineHeight: 1,
        }}>
          {sub}
        </span>
      )}
    </button>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();

  const [step,      setStep]      = useState<"email" | "pin">("email");
  const [email,     setEmail]     = useState("");
  const [pin,       setPin]       = useState("");
  const [status,    setStatus]    = useState<"idle" | "error" | "success">("idle");
  const [errorMsg,  setErrorMsg]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [shake,     setShake]     = useState(false);
  const [isMobile,  setIsMobile]  = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);

  // ── Detect touch device ─────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      setIsMobile(
        window.matchMedia("(pointer: coarse)").matches ||
        window.innerWidth < 768
      );
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Redirect if already logged in ──────────────────────────────────────────
  useEffect(() => {
    const s = sessionService.getActiveSession();
    if (s) {
      router.replace(
        s.role === "BARBER" && s.barber_id
          ? `/barber/${s.barber_id}`
          : ROLE_REDIRECT[s.role] ?? "/cashier"
      );
    }
  }, [router]);

  // ── Focus email on mount ────────────────────────────────────────────────────
  useEffect(() => { emailRef.current?.focus(); }, []);

  // ── PIN digit handlers ──────────────────────────────────────────────────────
  const addDigit = useCallback((d: string) => {
    if (loading || status === "success" || pin.length >= PIN_LENGTH) return;
    if (status === "error") { setStatus("idle"); setErrorMsg(""); }
    setPin(p => p + d);
  }, [pin, status, loading]);

  const delDigit = useCallback(() => {
    if (loading || status === "success") return;
    if (status === "error") { setStatus("idle"); setErrorMsg(""); }
    setPin(p => p.slice(0, -1));
  }, [status, loading]);

  const clearAll = useCallback(() => {
    if (loading || status === "success") return;
    setPin(""); setStatus("idle"); setErrorMsg("");
  }, [status, loading]);

  // ── Hardware keyboard (PIN step) ────────────────────────────────────────────
  useEffect(() => {
    if (step !== "pin") return;
    const h = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") addDigit(e.key);
      else if (e.key === "Backspace") delDigit();
      else if (e.key === "Escape") { clearAll(); setStep("email"); setPin(""); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [step, addDigit, delDigit, clearAll]);

  // ── Auto-submit when PIN full ───────────────────────────────────────────────
  useEffect(() => {
    if (pin.length === PIN_LENGTH && status === "idle" && step === "pin") {
      void submit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  // ── Email step submit ───────────────────────────────────────────────────────
  const submitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setErrorMsg("Enter a valid email address");
      triggerShake();
      return;
    }
    setErrorMsg("");
    setStep("pin");
  };

  // ── PIN submit ──────────────────────────────────────────────────────────────
  const submit = async () => {
    if (pin.length < PIN_LENGTH || loading) return;
    setLoading(true);
    try {
      const session = await sessionService.login(email.trim().toLowerCase(), pin);
      if (!session) {
        setStatus("error");
        setErrorMsg("Invalid email or PIN");
        triggerShake();
        setPin("");
        return;
      }
      setStatus("success");
      setTimeout(() => {
        // First login → force PIN change before accessing the system
        if (session.is_first_login) {
          router.replace("/change-pin");
          return;
        }
        const redirect = session.role === "BARBER" && session.barber_id
          ? `/barber/${session.barber_id}`
          : ROLE_REDIRECT[session.role] ?? "/cashier";
        router.replace(redirect);
      }, 500);
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong — try again");
      triggerShake();
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // ── Numpad rows ─────────────────────────────────────────────────────────────
  const ROWS = [
    [["1",""],["2","ABC"],["3","DEF"]],
    [["4","GHI"],["5","JKL"],["6","MNO"]],
    [["7","PQR"],["8","STU"],["9","VWX"]],
  ] as const;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0f1317",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "clamp(16px, 4vw, 32px) clamp(12px, 4vw, 24px)",
    }}>

      {/* ── Brand ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ textAlign: "center", marginBottom: "clamp(24px, 5vw, 40px)" }}
      >
        <div style={{
          width: "clamp(40px, 10vw, 52px)",
          height: "clamp(40px, 10vw, 52px)",
          borderRadius: "clamp(10px, 2.5vw, 14px)",
          background: "#e2d609",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto clamp(10px, 2.5vw, 14px)",
          boxShadow: "0 0 32px rgba(226,214,9,0.25)",
        }}>
          <span style={{
            color: "#0f1317",
            fontSize: "clamp(16px, 4vw, 22px)",
            fontWeight: 900,
          }}>U</span>
        </div>
        <h1 style={{
          fontSize: "clamp(16px, 4vw, 22px)",
          fontWeight: 800,
          color: "#f5f5f5",
          letterSpacing: "-0.01em",
          margin: 0,
        }}>
          Dove Barber
        </h1>
        <p style={{
          fontSize: "clamp(11px, 2.5vw, 13px)",
          color: "rgba(255,255,255,0.35)",
          marginTop: "4px",
        }}>
          Staff Portal
        </p>
      </motion.div>

      {/* ── Card ───────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: "100%",
          maxWidth: "clamp(300px, 90vw, 380px)",
          background: "#171d22",
          border: "1px solid #2d3840",
          borderRadius: "clamp(14px, 3.5vw, 22px)",
          padding: "clamp(20px, 5vw, 32px) clamp(16px, 5vw, 28px)",
          overflow: "hidden",
        }}
      >
        <AnimatePresence mode="wait">

          {/* ── Step 1: Email ─────────────────────────────────────────────── */}
          {step === "email" && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <form onSubmit={submitEmail} noValidate>
                <p style={{
                  fontSize: "clamp(13px, 3vw, 15px)",
                  fontWeight: 700,
                  color: "#f5f5f5",
                  marginBottom: "clamp(16px, 4vw, 24px)",
                }}>
                  Sign in to your account
                </p>

                <div style={{ marginBottom: "clamp(12px, 3vw, 16px)" }}>
                  <label style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.4)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: "7px",
                  }}>
                    Email Address
                  </label>
                  <input
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setErrorMsg(""); }}
                    placeholder="you@unclegrooming.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    style={{
                      width: "100%",
                      padding: "clamp(10px, 2.5vw, 13px) clamp(12px, 3vw, 16px)",
                      background: "#252f38",
                      border: `1.5px solid ${errorMsg ? "#ef4444" : "#2d3840"}`,
                      borderRadius: "10px",
                      color: "#f5f5f5",
                      fontSize: "clamp(14px, 3.5vw, 15px)",
                      outline: "none",
                      transition: "border-color 0.2s, box-shadow 0.2s",
                      boxSizing: "border-box",
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = "#e2d609";
                      e.target.style.boxShadow = "0 0 0 3px rgba(226,214,9,0.12)";
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = errorMsg ? "#ef4444" : "#2d3840";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <AnimatePresence>
                    {errorMsg && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        role="alert"
                        style={{
                          fontSize: "12px",
                          color: "#f87171",
                          marginTop: "6px",
                          animation: shake ? "shake 0.4s ease" : "none",
                        }}
                      >
                        {errorMsg}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "clamp(11px, 2.8vw, 14px)",
                    borderRadius: "9999px",
                    background: "#e2d609",
                    color: "#0f1317",
                    fontSize: "clamp(13px, 3.2vw, 15px)",
                    fontWeight: 800,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 0 24px rgba(226,214,9,0.22)",
                    transition: "all 0.2s ease",
                    letterSpacing: "0.01em",
                  }}
                >
                  Continue →
                </button>
              </form>
            </motion.div>
          )}

          {/* ── Step 2: PIN ───────────────────────────────────────────────── */}
          {step === "pin" && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {/* Back row */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "clamp(16px, 4vw, 24px)",
              }}>
                <button
                  onClick={() => { setStep("email"); setPin(""); setStatus("idle"); setErrorMsg(""); }}
                  aria-label="Back to email"
                  style={{
                    background: "none", border: "none",
                    color: "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    fontSize: "clamp(16px, 4vw, 20px)",
                    padding: "4px 6px",
                    lineHeight: 1,
                    borderRadius: "6px",
                    transition: "color 0.15s",
                    flexShrink: 0,
                  }}
                >
                  ←
                </button>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: "clamp(12px, 3vw, 14px)",
                    fontWeight: 700,
                    color: "#f5f5f5",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {email}
                  </div>
                  <div style={{
                    fontSize: "clamp(10px, 2.5vw, 12px)",
                    color: "rgba(255,255,255,0.35)",
                    marginTop: "1px",
                  }}>
                    Enter your 6-digit PIN
                  </div>
                </div>
              </div>

              {/* PIN boxes */}
              <div
                style={{
                  display: "flex",
                  gap: "clamp(5px, 1.5vw, 8px)",
                  justifyContent: "center",
                  marginBottom: "clamp(12px, 3vw, 20px)",
                  animation: shake ? "shake 0.4s ease" : "none",
                }}
              >
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <PinBox
                    key={i}
                    filled={i < pin.length}
                    active={i === pin.length && status !== "error" && status !== "success"}
                    error={status === "error"}
                    success={status === "success"}
                  />
                ))}
              </div>

              {/* Error */}
              <AnimatePresence>
                {errorMsg && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    role="alert"
                    style={{
                      textAlign: "center",
                      fontSize: "clamp(11px, 2.8vw, 13px)",
                      color: "#f87171",
                      fontWeight: 500,
                      marginBottom: "clamp(10px, 2.5vw, 14px)",
                    }}
                  >
                    {errorMsg}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Touch numpad — mobile only */}
              {isMobile && (
                <div style={{ display: "flex", flexDirection: "column", gap: "clamp(6px, 1.8vw, 10px)" }}>
                  {ROWS.map((row, ri) => (
                    <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "clamp(6px, 1.8vw, 10px)" }}>
                      {row.map(([d, s]) => (
                        <NumKey
                          key={d}
                          label={d}
                          sub={s || undefined}
                          onPress={() => addDigit(d)}
                          disabled={loading || status === "success"}
                        />
                      ))}
                    </div>
                  ))}
                  {/* Bottom row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "clamp(6px, 1.8vw, 10px)" }}>
                    <NumKey label="C" onPress={clearAll} ghost disabled={loading || status === "success" || pin.length === 0} />
                    <NumKey label="0" onPress={() => addDigit("0")} disabled={loading || status === "success"} />
                    <NumKey label="⌫" onPress={delDigit} ghost disabled={loading || status === "success" || pin.length === 0} />
                  </div>
                </div>
              )}

              {/* Desktop hint */}
              {!isMobile && (
                <p style={{
                  textAlign: "center",
                  fontSize: "clamp(11px, 2.5vw, 12px)",
                  color: "rgba(255,255,255,0.22)",
                  marginTop: "4px",
                }}>
                  Type your PIN using the keyboard
                </p>
              )}

              {/* Status line */}
              <p style={{
                textAlign: "center",
                marginTop: "clamp(10px, 2.5vw, 14px)",
                fontSize: "clamp(11px, 2.5vw, 12px)",
                color: status === "success" ? "#e2d609" : "rgba(255,255,255,0.2)",
                transition: "color 0.2s",
                minHeight: "16px",
              }}>
                {status === "success" ? "✓ Verified — entering…"
                  : loading ? "Verifying…"
                  : pin.length < PIN_LENGTH
                  ? `${PIN_LENGTH - pin.length} digit${PIN_LENGTH - pin.length !== 1 ? "s" : ""} remaining`
                  : ""}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Shake keyframe */}
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15%      { transform: translateX(-7px); }
          30%      { transform: translateX(7px); }
          45%      { transform: translateX(-5px); }
          60%      { transform: translateX(5px); }
          75%      { transform: translateX(-3px); }
          90%      { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}

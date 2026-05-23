/**
 * @file LoginScreen.tsx
 * @module ui/screens
 *
 * Operator Login — 6-digit PIN entry.
 *
 * Specification: ECS v1.3 EVENT 13 — OPERATOR_SESSION_OPENED
 *                AMS v1.3 — Terminal Operations (Boundary Module)
 *                IMS v1.1 — Operator Login screen
 *                UI Standards §9 — PIN Entry
 *                UI Standards §7 — Operational Screen Shell
 *
 * Flow:
 *   1. Operator selects their name from the roster
 *   2. Enters 6-digit PIN
 *   3. On success → EVENT 13 emitted → redirect to role screen
 *   4. On failure → shake animation, clear PIN, allow retry
 *
 * Security note (Phase 1):
 *   PINs are validated locally against the seeded roster in localStorage.
 *   No network call is made. This is intentional — the system must work
 *   fully offline (TAS §1 — Local Operational Authority).
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter }       from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { sessionService }  from "@/core/session/session.service";
import type { Operator }   from "@/core/session/session.types";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIN_LENGTH = 6;

// ─── Role redirect map ────────────────────────────────────────────────────────

const ROLE_REDIRECT: Record<string, string> = {
  CASHIER:      "/cashier",
  BARBER:       "/barber",   // redirected to /barber/[id] after session check
  ADMIN:        "/admin",
  SYSTEM_OWNER: "/admin",
};

// ─── PIN Box ──────────────────────────────────────────────────────────────────

interface PinBoxProps {
  filled:  boolean;
  active:  boolean;
  error:   boolean;
  success: boolean;
  index:   number;
}

function PinBox({ filled, active, error, success }: PinBoxProps) {
  const borderColor = error
    ? "#ef4444"
    : success
    ? "#e2d609"
    : active
    ? "#e2d609"
    : filled
    ? "#3a4650"
    : "#2d3840";

  const boxShadow = active && !error
    ? "0 0 0 3px rgba(226,214,9,0.15)"
    : error
    ? "0 0 0 3px rgba(239,68,68,0.15)"
    : success
    ? "0 0 0 3px rgba(226,214,9,0.2)"
    : "none";

  const bg = success
    ? "rgba(226,214,9,0.12)"
    : filled
    ? "#252f38"
    : "#1e262d";

  return (
    <div style={{
      width: "52px", height: "64px",
      borderRadius: "12px",
      border: `2px solid ${borderColor}`,
      background: bg,
      boxShadow,
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.15s ease",
      flexShrink: 0,
    }}>
      {filled && (
        <div style={{
          width: "10px", height: "10px", borderRadius: "50%",
          background: success ? "#e2d609" : "rgba(255,255,255,0.8)",
          transition: "background 0.2s",
        }} />
      )}
    </div>
  );
}

// ─── Numpad Key ───────────────────────────────────────────────────────────────

interface NumKeyProps {
  label:    string;
  sublabel?: string;
  onPress:  () => void;
  disabled?: boolean;
  variant?: "default" | "delete" | "clear";
}

function NumKey({ label, sublabel, onPress, disabled, variant = "default" }: NumKeyProps) {
  const [pressed, setPressed] = useState(false);

  const handlePress = () => {
    if (disabled) return;
    setPressed(true);
    setTimeout(() => setPressed(false), 120);
    onPress();
  };

  const bg = pressed
    ? "#3a4650"
    : variant === "delete" || variant === "clear"
    ? "transparent"
    : "#1e262d";

  const border = variant === "delete" || variant === "clear"
    ? "1px solid transparent"
    : "1px solid #2d3840";

  return (
    <button
      onClick={handlePress}
      disabled={disabled}
      style={{
        width: "72px", height: "72px",
        borderRadius: "16px",
        background: bg,
        border,
        color: variant === "delete" ? "rgba(255,255,255,0.5)" : "#f5f5f5",
        fontSize: variant === "delete" ? "20px" : "22px",
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "background 0.1s, transform 0.1s",
        transform: pressed ? "scale(0.94)" : "scale(1)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: "2px",
        userSelect: "none",
        WebkitTapHighlightColor: "transparent",
      }}
      aria-label={label}
    >
      <span>{label}</span>
      {sublabel && (
        <span style={{ fontSize: "8px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>
          {sublabel}
        </span>
      )}
    </button>
  );
}

// ─── Operator Selector ────────────────────────────────────────────────────────

interface OperatorSelectorProps {
  operators:        Operator[];
  selected:         Operator | null;
  onSelect:         (op: Operator) => void;
}

function OperatorSelector({ operators, selected, onSelect }: OperatorSelectorProps) {
  const ROLE_COLOR: Record<string, string> = {
    ADMIN:   "#fb923c",
    CASHIER: "#38bdf8",
    BARBER:  "#2dd4bf",
  };

  return (
    <div style={{ width: "100%", marginBottom: "32px" }}>
      <p style={{
        fontSize: "11px", fontWeight: 700,
        color: "rgba(255,255,255,0.4)",
        textTransform: "uppercase", letterSpacing: "0.12em",
        marginBottom: "12px", textAlign: "center",
      }}>
        Who are you?
      </p>
      <div style={{
        display: "flex", flexWrap: "wrap",
        gap: "8px", justifyContent: "center",
      }}>
        {operators.map(op => {
          const isSelected = selected?.actor_id === op.actor_id;
          return (
            <button
              key={op.actor_id}
              onClick={() => onSelect(op)}
              style={{
                padding: "8px 16px", borderRadius: "9999px",
                border: isSelected
                  ? `2px solid ${ROLE_COLOR[op.role] ?? "#e2d609"}`
                  : "2px solid #2d3840",
                background: isSelected ? "rgba(226,214,9,0.08)" : "transparent",
                color: isSelected ? "#f5f5f5" : "rgba(255,255,255,0.5)",
                fontSize: "13px", fontWeight: isSelected ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {op.name}
              <span style={{
                marginLeft: "6px", fontSize: "10px",
                color: ROLE_COLOR[op.role] ?? "#e2d609",
                fontWeight: 700, textTransform: "uppercase",
              }}>
                {op.role}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();

  const [operators, setOperators]     = useState<Operator[]>([]);
  const [selected,  setSelected]      = useState<Operator | null>(null);
  const [pin,       setPin]           = useState<string>("");
  const [status,    setStatus]        = useState<"idle" | "error" | "success">("idle");
  const [errorMsg,  setErrorMsg]      = useState<string>("");
  const [isLoading, setIsLoading]     = useState(false);

  // Shake animation trigger
  const [shake, setShake] = useState(false);

  // Load roster on mount
  useEffect(() => {
    const roster = sessionService.getRoster();
    setOperators(roster);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    const session = sessionService.getActiveSession();
    if (session) {
      const redirect =
        session.role === "BARBER" && session.barber_id
          ? `/barber/${session.barber_id}`
          : ROLE_REDIRECT[session.role] ?? "/cashier";
      router.replace(redirect);
    }
  }, [router]);

  // ── PIN input handlers ──────────────────────────────────────────────────────

  const appendDigit = useCallback((digit: string) => {
    if (status === "success" || isLoading) return;
    if (pin.length >= PIN_LENGTH) return;

    // Clear error on new input
    if (status === "error") {
      setStatus("idle");
      setErrorMsg("");
    }

    setPin(prev => prev + digit);
  }, [pin, status, isLoading]);

  const deleteDigit = useCallback(() => {
    if (status === "success" || isLoading) return;
    if (status === "error") {
      setStatus("idle");
      setErrorMsg("");
    }
    setPin(prev => prev.slice(0, -1));
  }, [status, isLoading]);

  const clearPin = useCallback(() => {
    if (status === "success" || isLoading) return;
    setPin("");
    setStatus("idle");
    setErrorMsg("");
  }, [status, isLoading]);

  // ── Physical keyboard support ───────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") appendDigit(e.key);
      else if (e.key === "Backspace") deleteDigit();
      else if (e.key === "Escape") clearPin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [appendDigit, deleteDigit, clearPin]);

  // ── Auto-submit when PIN is complete ───────────────────────────────────────

  useEffect(() => {
    if (pin.length === PIN_LENGTH && status === "idle") {
      handleSubmit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selected) {
      setStatus("error");
      setErrorMsg("Select who you are first");
      triggerShake();
      setPin("");
      return;
    }

    if (pin.length < PIN_LENGTH) return;

    setIsLoading(true);

    try {
      const session = await sessionService.login(pin);

      if (!session) {
        // Wrong PIN
        setStatus("error");
        setErrorMsg("Incorrect PIN");
        triggerShake();
        setPin("");
        return;
      }

      // Verify the logged-in operator matches the selected one
      if (session.actor_id !== selected.actor_id) {
        await sessionService.logout();
        setStatus("error");
        setErrorMsg("PIN does not match selected operator");
        triggerShake();
        setPin("");
        return;
      }

      // Success
      setStatus("success");
      setTimeout(() => {
        const redirect =
          session.role === "BARBER" && session.barber_id
            ? `/barber/${session.barber_id}`
            : ROLE_REDIRECT[session.role] ?? "/cashier";
        router.replace(redirect);
      }, 500);

    } catch (err) {
      setStatus("error");
      setErrorMsg("System error — try again");
      triggerShake();
      setPin("");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // ── Numpad layout ───────────────────────────────────────────────────────────

  const NUMPAD = [
    ["1", "ABC"], ["2", "DEF"], ["3", "GHI"],
    ["4", "JKL"], ["5", "MNO"], ["6", "PQR"],
    ["7", "STU"], ["8", "VWX"], ["9", "YZ"],
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
      padding: "24px 16px",
    }}>

      {/* Brand */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: "40px", textAlign: "center" }}
      >
        <div style={{
          width: "48px", height: "48px", borderRadius: "14px",
          background: "#e2d609", display: "flex",
          alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px",
          boxShadow: "0 0 32px rgba(226,214,9,0.25)",
        }}>
          <span style={{ color: "#0f1317", fontSize: "20px", fontWeight: 900 }}>U</span>
        </div>
        <h1 style={{
          fontSize: "clamp(18px, 3vw, 22px)",
          fontWeight: 800, color: "#f5f5f5",
          letterSpacing: "-0.01em",
        }}>
          Uncle Grooming Hub
        </h1>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>
          Terminal Operations · Operator Login
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: "100%", maxWidth: "360px",
          background: "#171d22",
          border: "1px solid #2d3840",
          borderRadius: "20px",
          padding: "28px 24px",
        }}
      >
        {/* Operator selector */}
        <OperatorSelector
          operators={operators}
          selected={selected}
          onSelect={(op) => {
            setSelected(op);
            setPin("");
            setStatus("idle");
            setErrorMsg("");
          }}
        />

        {/* PIN display */}
        <div style={{ marginBottom: "28px" }}>
          <p style={{
            fontSize: "11px", fontWeight: 700,
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase", letterSpacing: "0.12em",
            marginBottom: "16px", textAlign: "center",
          }}>
            Enter PIN
          </p>

          {/* PIN boxes with shake */}
          <div
            style={{
              display: "flex", gap: "8px", justifyContent: "center",
              animation: shake ? "shake 0.4s ease" : "none",
            }}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <PinBox
                key={i}
                index={i}
                filled={i < pin.length}
                active={i === pin.length && status !== "error" && status !== "success"}
                error={status === "error"}
                success={status === "success"}
              />
            ))}
          </div>

          {/* Error message */}
          <AnimatePresence>
            {errorMsg && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  textAlign: "center", marginTop: "12px",
                  fontSize: "13px", color: "#f87171",
                  fontWeight: 500,
                }}
                role="alert"
              >
                {errorMsg}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Numpad */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 72px)",
          gap: "10px",
          justifyContent: "center",
        }}>
          {NUMPAD.map(([digit, sub]) => (
            <NumKey
              key={digit}
              label={digit}
              sublabel={sub}
              onPress={() => appendDigit(digit)}
              disabled={isLoading || status === "success" || !selected}
            />
          ))}

          {/* Bottom row: clear | 0 | delete */}
          <NumKey
            label="C"
            onPress={clearPin}
            variant="clear"
            disabled={isLoading || status === "success" || pin.length === 0}
          />
          <NumKey
            label="0"
            onPress={() => appendDigit("0")}
            disabled={isLoading || status === "success" || !selected}
          />
          <NumKey
            label="⌫"
            onPress={deleteDigit}
            variant="delete"
            disabled={isLoading || status === "success" || pin.length === 0}
          />
        </div>

        {/* Status hint */}
        <p style={{
          textAlign: "center", marginTop: "20px",
          fontSize: "12px",
          color: status === "success"
            ? "#e2d609"
            : "rgba(255,255,255,0.25)",
          transition: "color 0.2s",
        }}>
          {status === "success"
            ? "✓ Verified — entering…"
            : selected
            ? `${PIN_LENGTH - pin.length} digit${PIN_LENGTH - pin.length !== 1 ? "s" : ""} remaining`
            : "Select your name above to begin"}
        </p>
      </motion.div>

      {/* Shake keyframe */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%       { transform: translateX(-6px); }
          30%       { transform: translateX(6px); }
          45%       { transform: translateX(-5px); }
          60%       { transform: translateX(5px); }
          75%       { transform: translateX(-3px); }
          90%       { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}

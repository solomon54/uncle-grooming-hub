/**
 * @file ChangePinScreen.tsx
 * @module ui/screens
 *
 * PIN Change Screen — shown on first login (is_first_login = true).
 *
 * Specification: SOS v1.0 §4.2 — First Login PIN Change
 *                AGENT.md §14 — Updated Session Contract
 *
 * Forces operator to set a new personal PIN before accessing the system.
 * Emits EVENT 28 — STAFF_PIN_CHANGED after successful change.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useRouter }                  from "next/navigation";
import { motion }                     from "framer-motion";
import { useSession }                 from "@/ui/hooks/useSession";
import { sessionService }             from "@/core/session/session.service";

// ─── PIN Box ──────────────────────────────────────────────────────────────────

function PinBox({ filled, active, error, success }: {
  filled: boolean; active: boolean; error: boolean; success: boolean;
}) {
  const border = error ? "#ef4444" : success ? "#e2d609" : active ? "#e2d609" : filled ? "#3a4650" : "#2d3840";
  const glow   = error ? "0 0 0 3px rgba(239,68,68,0.15)" : (success || active) ? "0 0 0 3px rgba(226,214,9,0.15)" : "none";
  return (
    <div style={{ width: "clamp(36px, 11vw, 52px)", height: "clamp(44px, 14vw, 64px)", borderRadius: "10px", border: `2px solid ${border}`, background: success ? "rgba(226,214,9,0.12)" : filled ? "#252f38" : "#1e262d", boxShadow: glow, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s ease", flexShrink: 0 }}>
      {filled && <div style={{ width: "clamp(7px, 2vw, 10px)", height: "clamp(7px, 2vw, 10px)", borderRadius: "50%", background: success ? "#e2d609" : "rgba(255,255,255,0.85)" }} />}
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const PIN_LENGTH = 6;

const ROLE_REDIRECT: Record<string, string> = {
  CASHIER:      "/cashier",
  BARBER:       "/barber",
  ADMIN:        "/admin",
  SYSTEM_OWNER: "/admin",
};

export default function ChangePinScreen() {
  const router        = useRouter();
  const { session }   = useSession();
  const [step,        setStep]        = useState<"new" | "confirm">("new");
  const [newPin,      setNewPin]      = useState("");
  const [confirmPin,  setConfirmPin]  = useState("");
  const [status,      setStatus]      = useState<"idle" | "error" | "success">("idle");
  const [errorMsg,    setErrorMsg]    = useState("");
  const [loading,     setLoading]     = useState(false);
  const [shake,       setShake]       = useState(false);

  // Redirect if not first login
  useEffect(() => {
    if (session && !session.is_first_login) {
      router.replace(ROLE_REDIRECT[session.role] ?? "/cashier");
    }
  }, [session, router]);

  const currentPin = step === "new" ? newPin : confirmPin;
  const setCurrentPin = step === "new" ? setNewPin : setConfirmPin;

  // Hardware keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        setCurrentPin(p => p.length < PIN_LENGTH ? p + e.key : p);
        setStatus("idle"); setErrorMsg("");
      } else if (e.key === "Backspace") {
        setCurrentPin(p => p.slice(0, -1));
        setStatus("idle"); setErrorMsg("");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setCurrentPin]);

  // Auto-advance when PIN complete
  useEffect(() => {
    if (newPin.length === PIN_LENGTH && step === "new") {
      // Validate: not all same digits, not sequential
      const allSame = newPin.split("").every(d => d === newPin[0]);
      const sequential = ["012345","123456","234567","345678","456789","987654","876543","765432","654321","543210"].includes(newPin);
      if (allSame || sequential) {
        setStatus("error");
        setErrorMsg("PIN is too simple — choose a less predictable combination");
        triggerShake();
        setNewPin("");
        return;
      }
      setTimeout(() => setStep("confirm"), 300);
    }
  }, [newPin, step]);

  useEffect(() => {
    if (confirmPin.length === PIN_LENGTH && step === "confirm") {
      void handleSubmit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmPin]);

  const handleSubmit = async () => {
    if (confirmPin !== newPin) {
      setStatus("error");
      setErrorMsg("PINs don't match — try again");
      triggerShake();
      setConfirmPin("");
      return;
    }

    if (!session) return;
    setLoading(true);

    try {
      const { changeCloudPin } = await import("@/core/cloud/operator.cloud");
      const result = await changeCloudPin(session.actor_id, newPin);

      if (!result.success) {
        setStatus("error");
        setErrorMsg(result.error ?? "Failed to update PIN");
        triggerShake();
        setConfirmPin("");
        return;
      }

      // Update session to clear is_first_login
      const updatedSession = { ...session, is_first_login: false };
      sessionStorage.setItem("ugh:active_session", JSON.stringify(updatedSession));

      setStatus("success");
      setTimeout(() => {
        router.replace(ROLE_REDIRECT[session.role] ?? "/cashier");
      }, 800);

    } catch (err) {
      console.error("PIN change failed:", err);
      setStatus("error");
      setErrorMsg("Something went wrong — try again");
      triggerShake();
      setConfirmPin("");
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  if (!session) return null;

  return (
    <div style={{ minHeight: "100dvh", background: "#0f1317", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>

      {/* Brand */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: "32px", textAlign: "center" }}>
        <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "#e2d609", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", boxShadow: "0 0 32px rgba(226,214,9,0.25)" }}>
          <span style={{ color: "#0f1317", fontSize: "20px", fontWeight: 900 }}>U</span>
        </div>
        <h1 style={{ fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 800, color: "#f5f5f5" }}>
          Set Your PIN
        </h1>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>
          Welcome, {session.actor_name}. Choose a secure 6-digit PIN.
        </p>
      </motion.div>

      {/* Card */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: "340px", background: "#171d22", border: "1px solid #2d3840", borderRadius: "20px", padding: "clamp(20px, 5vw, 28px) clamp(16px, 5vw, 24px)" }}>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {(["new", "confirm"] as const).map((s, i) => (
            <div key={s} style={{ flex: 1, height: "3px", borderRadius: "9999px", background: step === s ? "#e2d609" : i === 0 && step === "confirm" ? "rgba(226,214,9,0.4)" : "#2d3840", transition: "background 0.3s" }} />
          ))}
        </div>

        <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "16px", textAlign: "center" }}>
          {step === "new" ? "Enter new PIN" : "Confirm new PIN"}
        </p>

        {/* PIN boxes */}
        <div style={{ display: "flex", gap: "clamp(5px, 1.5vw, 8px)", justifyContent: "center", marginBottom: "16px", animation: shake ? "shake 0.4s ease" : "none" }}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <PinBox key={i}
              filled={i < currentPin.length}
              active={i === currentPin.length && status !== "error" && status !== "success"}
              error={status === "error"}
              success={status === "success"}
            />
          ))}
        </div>

        {/* Error */}
        {errorMsg && (
          <p style={{ textAlign: "center", fontSize: "13px", color: "#f87171", fontWeight: 500, marginBottom: "8px" }} role="alert">
            {errorMsg}
          </p>
        )}

        {/* Status */}
        <p style={{ textAlign: "center", fontSize: "12px", color: status === "success" ? "#e2d609" : "rgba(255,255,255,0.2)", transition: "color 0.2s", minHeight: "16px" }}>
          {status === "success" ? "✓ PIN set — entering…"
            : loading ? "Saving…"
            : step === "new" ? `${PIN_LENGTH - newPin.length} digit${PIN_LENGTH - newPin.length !== 1 ? "s" : ""} remaining`
            : `${PIN_LENGTH - confirmPin.length} digit${PIN_LENGTH - confirmPin.length !== 1 ? "s" : ""} to confirm`}
        </p>

        {/* Security note */}
        <div style={{ marginTop: "16px", padding: "10px 14px", background: "rgba(226,214,9,0.05)", borderRadius: "8px", border: "1px solid rgba(226,214,9,0.1)" }}>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
            Your PIN is encrypted before storage. Never share it with anyone.
          </p>
        </div>
      </motion.div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15% { transform: translateX(-7px); }
          30% { transform: translateX(7px); }
          45% { transform: translateX(-5px); }
          60% { transform: translateX(5px); }
          75% { transform: translateX(-3px); }
          90% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}

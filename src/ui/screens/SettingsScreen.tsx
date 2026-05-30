/**
 * @file SettingsScreen.tsx
 * @module ui/screens
 *
 * Staff Settings — profile photo, display name, PIN change.
 * Accessible to all authenticated roles.
 * Designed to expand: future sections (notifications, preferences, etc.)
 * can be added as new SettingsSection components.
 */

"use client";

import React, { useState, useRef, useCallback } from "react";
import { useRouter }   from "next/navigation";
import { useSession }  from "@/ui/hooks/useSession";
import { TopBar }      from "@/ui/components/shell/TopBar";

// ─── Role colours (matches TopBar) ───────────────────────────────────────────

const ROLE_COLOR: Record<string, string> = {
  SYSTEM_OWNER: "#fb923c",
  ADMIN:        "#e2d609",
  CASHIER:      "#38bdf8",
  BARBER:       "#2dd4bf",
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: "#e2d609", textTransform: "uppercase", letterSpacing: "0.15em" }}>
        {title}
      </div>
      <div style={{ background: "#1e262d", borderRadius: "14px", border: "1px solid #2d3840", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

function Row({
  label, value, action, actionLabel, danger, href,
}: {
  label:        string;
  value?:       string;
  action?:      () => void;
  actionLabel?: string;
  danger?:      boolean;
  href?:        string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 18px", borderBottom: "1px solid #2d3840",
    }}>
      <div>
        <div style={{ fontSize: "14px", color: "#f5f5f5", fontWeight: 500 }}>{label}</div>
        {value && <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>{value}</div>}
      </div>
      {(action || href) && (
        href ? (
          <a href={href} style={{
            padding: "7px 14px", borderRadius: "8px",
            background: "transparent",
            border: `1px solid ${danger ? "rgba(239,68,68,0.3)" : "#3a4650"}`,
            color: danger ? "#f87171" : "rgba(255,255,255,0.5)",
            fontSize: "12px", fontWeight: 600, textDecoration: "none",
            cursor: "pointer",
          }}>
            {actionLabel}
          </a>
        ) : (
          <button type="button" onClick={action} style={{
            padding: "7px 14px", borderRadius: "8px",
            background: "transparent",
            border: `1px solid ${danger ? "rgba(239,68,68,0.3)" : "#3a4650"}`,
            color: danger ? "#f87171" : "rgba(255,255,255,0.5)",
            fontSize: "12px", fontWeight: 600, cursor: "pointer",
          }}>
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
}

// ─── Photo Upload — clickable avatar circle with camera overlay ───────────────

function PhotoUpload({
  actorId,
  currentUrl,
  name,
  onUploaded,
}: {
  actorId:    string;
  currentUrl: string | null;
  name:       string;
  onUploaded: (url: string) => void;
}) {
  const inputRef                 = useRef<HTMLInputElement>(null);
  const [preview,   setPreview]  = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]    = useState("");
  const [success,   setSuccess]  = useState(false);
  const [hover,     setHover]    = useState(false);

  const initials = name.trim().split(/\s+/).map(p => p[0]?.toUpperCase() ?? "").slice(0, 2).join("");

  const handleFile = useCallback(async (file: File) => {
    setError(""); setSuccess(false);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPEG, PNG or WebP images are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("actor_id", actorId);
      const resp = await fetch("/api/auth/upload-avatar", { method: "POST", body: fd });
      const body = await resp.json() as { success?: boolean; avatar_url?: string; error?: string };
      if (!resp.ok || !body.success) {
        setError(body.error ?? "Upload failed — try again");
        setPreview(currentUrl);
        return;
      }
      setSuccess(true);
      onUploaded(body.avatar_url!);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Network error — try again");
      setPreview(currentUrl);
    } finally { setUploading(false); }
  }, [actorId, currentUrl, onUploaded]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  return (
    <div style={{ padding: "24px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Upload profile photo"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
      />

      {/* Clickable avatar circle */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        aria-label="Change profile photo"
        style={{
          position: "relative", width: 96, height: 96,
          borderRadius: "50%", border: "none", padding: 0,
          cursor: uploading ? "not-allowed" : "pointer",
          background: "transparent",
          flexShrink: 0,
        }}
      >
        {/* Photo or initials */}
        {preview ? (
          <img src={preview} alt={name} width={96} height={96}
            style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: "3px solid #2d3840", display: "block" }} />
        ) : (
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: "linear-gradient(135deg, #252f38, #1e262d)", border: "3px solid #2d3840", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#e2d609" }}>
            {initials || "?"}
          </div>
        )}

        {/* Camera overlay — always subtle, stronger on hover */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: uploading
            ? "rgba(0,0,0,0.65)"
            : hover
            ? "rgba(0,0,0,0.55)"
            : "rgba(0,0,0,0.28)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "3px",
          transition: "background 0.2s",
        }}>
          {uploading ? (
            <svg style={{ width: 22, height: 22, color: "#e2d609", animation: "spin 1s linear infinite" }}
              viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <>
              {/* Camera icon SVG */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: hover ? 1 : 0.7 }}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.8)", fontWeight: 700, letterSpacing: "0.05em", opacity: hover ? 1 : 0.6 }}>
                {hover ? "CHANGE" : "PHOTO"}
              </span>
            </>
          )}
        </div>
      </button>

      {/* Feedback */}
      {error   && <p style={{ fontSize: "12px", color: "#f87171", textAlign: "center" }}>{error}</p>}
      {success && <p style={{ fontSize: "12px", color: "#10b981", textAlign: "center" }}>✓ Photo updated</p>}
      {!error && !success && !uploading && (
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
          JPEG, PNG or WebP · max 2MB
        </p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { session, refresh } = useSession();
  const router               = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  if (!session) return null;

  const roleColor = ROLE_COLOR[session.role] ?? "#9ca3af";
  const roleLabel = session.role.replace("_", " ");

  const handleAvatarUploaded = (url: string) => {
    setAvatarUrl(url);
    // Persist to sessionStorage so TopBar picks it up
    try {
      const stored = sessionStorage.getItem("ugh:active_session");
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, unknown>;
        parsed.avatar_url = url;
        sessionStorage.setItem("ugh:active_session", JSON.stringify(parsed));
        refresh();
      }
    } catch { /* best-effort */ }
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#0f1317", display: "flex", flexDirection: "column" }}>
      <TopBar session={session} />

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px" }}>
        <div style={{ maxWidth: "520px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Page title */}
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#f5f5f5", margin: 0 }}>Settings</h1>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>Manage your profile and account</p>
          </div>

          {/* ── Profile ──────────────────────────────────────────────────── */}
          <Section title="Profile">
            <PhotoUpload
              actorId={session.actor_id}
              currentUrl={avatarUrl ?? (session as unknown as Record<string, unknown>).avatar_url as string | null ?? null}
              name={session.actor_name}
              onUploaded={handleAvatarUploaded}
            />
            <div style={{ borderTop: "1px solid #2d3840" }} />
            <Row label="Display Name" value={session.actor_name} />
            <Row label="Email" value={session.email} />
            <Row
              label="Role"
              value={roleLabel}
            />
            {session.barber_id && (
              <Row label="Lane" value={session.barber_id} />
            )}
          </Section>

          {/* ── Security ─────────────────────────────────────────────────── */}
          <Section title="Security">
            <Row
              label="Change PIN"
              value="Update your 6-digit login PIN"
              href="/change-pin?from=settings"
              actionLabel="Change →"
            />
          </Section>

          {/* ── Role badge ───────────────────────────────────────────────── */}
          <div style={{
            padding: "16px 18px", borderRadius: "14px",
            background: `${roleColor}0d`,
            border: `1px solid ${roleColor}30`,
            display: "flex", alignItems: "center", gap: "12px",
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "10px",
              background: `${roleColor}18`,
              border: `1px solid ${roleColor}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px",
            }}>
              {session.role === "BARBER" ? "✂️" : session.role === "CASHIER" ? "💳" : session.role === "ADMIN" ? "🔑" : "👑"}
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: roleColor }}>{roleLabel}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
                {session.role === "BARBER"       ? "Lane cockpit, service management, schedule" :
                 session.role === "CASHIER"      ? "Queue management, check-in, settlement" :
                 session.role === "ADMIN"        ? "Full access including staff management" :
                                                   "Full system access — all permissions"}
              </div>
            </div>
          </div>

          {/* ── Danger zone ──────────────────────────────────────────────── */}
          <Section title="Session">
            <Row
              label="Sign Out"
              value="End your current session on this terminal"
              action={async () => {
                const { sessionService } = await import("@/core/session/session.service");
                await sessionService.logout();
                router.replace("/login");
              }}
              actionLabel="Sign Out"
              danger
            />
          </Section>

          {/* Version */}
          <p style={{ textAlign: "center", fontSize: "11px", color: "rgba(255,255,255,0.15)" }}>
            Dove Barber · Staff Portal
          </p>

        </div>
      </div>
    </div>
  );
}

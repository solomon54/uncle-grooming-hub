/**
 * @file terminal.identity.ts
 * @module core/terminal
 *
 * Terminal Identity Service
 *
 * Specification: TAS v1.0 §1.2 — Hardware-Bound Terminal Identity
 *
 * Responsibilities:
 *   - Generate and persist a stable terminal_id across sessions
 *   - Provide the terminal_id to the HLC and event metadata
 *
 * In production (TAS §1.2), terminal_id MUST be hardware-derived
 * (Secure Enclave / TPM). In Phase 1 (browser environment), we
 * generate a UUID v4 on first boot and persist it to localStorage.
 * This is flagged as a Phase 2 upgrade point.
 *
 * @todo Phase 2 — Replace localStorage persistence with hardware-bound
 *       identity via Electron/Tauri Secure Enclave integration.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "ugh:terminal_id";

// ─── Terminal Identity ────────────────────────────────────────────────────────

export class TerminalIdentityService {
  private _terminalId: string | null = null;

  /**
   * Returns the stable terminal_id for this device.
   * Generates and persists one on first call.
   *
   * Safe to call server-side — returns "SSR_TERMINAL" during SSR.
   */
  get terminalId(): string {
    if (typeof window === "undefined") {
      return "SSR_TERMINAL";
    }

    if (this._terminalId) {
      return this._terminalId;
    }

    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      this._terminalId = stored;
      return stored;
    }

    // First boot — generate and persist
    const generated = `term_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    localStorage.setItem(STORAGE_KEY, generated);
    this._terminalId = generated;

    return generated;
  }

  /**
   * Force-reset the terminal identity.
   * Only used during device decommissioning (TAS §12.4).
   * Requires explicit confirmation to prevent accidental calls.
   */
  reset(confirmation: "CONFIRM_TERMINAL_RESET"): void {
    if (confirmation !== "CONFIRM_TERMINAL_RESET") return;

    localStorage.removeItem(STORAGE_KEY);
    this._terminalId = null;
  }
}

/**
 * Singleton — one terminal identity per browser context
 */
export const terminalIdentity = new TerminalIdentityService();

/**
 * @file queue-token.ts
 * @module core/queue
 *
 * Queue token generator — CXS v1.1 §1.1
 * Format: {letter}-{NN} — letter rotates daily, sequence persists per shop day.
 *
 * Replaces the inline generateQueueToken() in CashierScreen which reset on
 * every page load. This version persists counter in localStorage.
 */

const STORAGE_KEY = "ugh:queue_token_day";

interface DayState {
  dateKey: string;
  letter:  string;
  counter: number;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function letterForDay(date: Date): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const start   = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return letters[dayOfYear % letters.length];
}

function loadState(): DayState {
  if (typeof window === "undefined") {
    const now = new Date();
    return { dateKey: todayKey(), letter: letterForDay(now), counter: 0 };
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  const key = todayKey();

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DayState;
      if (parsed.dateKey === key) return parsed;
    } catch {
      // fall through to fresh state
    }
  }

  const now = new Date();
  return { dateKey: key, letter: letterForDay(now), counter: 0 };
}

function saveState(state: DayState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Issue the next queue token for today (e.g. "A-07").
 * Counter persists across page reloads for the current shop day.
 */
export function issueQueueToken(): string {
  const state = loadState();
  state.counter += 1;
  saveState(state);

  const seq = String(state.counter).padStart(2, "0");
  return `${state.letter}-${seq}`;
}

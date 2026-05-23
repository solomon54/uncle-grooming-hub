/**
 * @file useTransaction.ts
 * @module ui/hooks
 *
 * useTransaction — reactive hook for the TransactionLedgerView projection.
 *
 * Specification: MODULE_PRIORITY.md P5.4
 *                AGENT.md §5 — Hooks subscribe to projections
 */

"use client";

import { useEffect, useState }        from "react";
import { projectionEngine }           from "@/core/projection/projection.engine";
import type { TransactionLedgerView } from "@/projections/transaction-ledger.view";

export function useTransaction(): { view: TransactionLedgerView | null; isLoading: boolean } {
  const [view, setView] = useState<TransactionLedgerView | null>(() =>
    projectionEngine.getState<TransactionLedgerView>("TRANSACTION_LEDGER_VIEW") ?? null
  );

  useEffect(() => {
    const current = projectionEngine.getState<TransactionLedgerView>("TRANSACTION_LEDGER_VIEW");
    if (current) setView(current);

    const unsubscribe = projectionEngine.subscribe(() => {
      const next = projectionEngine.getState<TransactionLedgerView>("TRANSACTION_LEDGER_VIEW");
      if (next) setView(next);
    });

    return unsubscribe;
  }, []);

  return { view, isLoading: view === null };
}

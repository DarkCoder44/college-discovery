"use client";

/**
 * Compare Selection Context
 * -------------------------
 * Thin React binding over `lib/client/compare-store`.
 *
 * The selection has to survive navigation: a user adds a college on the listing
 * page, opens its detail page, comes back, adds a second, then opens /compare.
 * Component-local state cannot do that, so the state lives in an external
 * store (localStorage-backed) that this provider subscribes to.
 *
 * Deliberately NOT a state-management library. The state is one array of at
 * most three ids with four operations — Redux or Zustand would be pure
 * overhead here.
 *
 * The 3-college cap is enforced here for UX and AGAIN server-side by
 * `compareQuerySchema`. The client-side limit is convenience, not enforcement.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  subscribe,
  getSnapshot,
  getServerSnapshot,
  toggleEntry,
  removeEntry,
  clearEntries,
  addEntries,
  replaceEntries,
  syncEntryNames,
  PENDING_NAME,
  type CompareEntry,
} from "@/lib/client/compare-store";
import { MAX_COMPARE_COLLEGES, MIN_COMPARE_COLLEGES } from "@/lib/validation/schemas";
import { useToast } from "@/components/providers/ToastProvider";

export type { CompareEntry };
export { PENDING_NAME };

interface CompareContextValue {
  entries: CompareEntry[];
  ids: string[];
  count: number;
  isSelected: (id: string) => boolean;
  isFull: boolean;
  canCompare: boolean;
  toggle: (entry: CompareEntry) => void;
  remove: (id: string) => void;
  clear: () => void;
  add: (entries: CompareEntry[]) => void;
  /** Replaces the whole selection — used for a shared ?ids= link. */
  replace: (entries: CompareEntry[]) => void;
  syncNames: (known: CompareEntry[]) => void;
  /** Href for /compare with the current selection. */
  compareHref: string;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();

  // No effect, no hydration mismatch: the server snapshot is empty and React
  // swaps in the real localStorage value after hydration.
  const entries = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const isSelected = useCallback(
    (id: string) => entries.some((entry) => entry.id === id),
    [entries]
  );

  const toggle = useCallback(
    (entry: CompareEntry) => {
      const { rejectedAsFull } = toggleEntry(entry);
      if (rejectedAsFull) {
        showToast(
          `You can compare up to ${MAX_COMPARE_COLLEGES} colleges. Remove one first.`,
          "info"
        );
      }
    },
    [showToast]
  );

  const value = useMemo<CompareContextValue>(() => {
    const ids = entries.map((entry) => entry.id);
    return {
      entries,
      ids,
      count: entries.length,
      isSelected,
      isFull: entries.length >= MAX_COMPARE_COLLEGES,
      canCompare: entries.length >= MIN_COMPARE_COLLEGES,
      toggle,
      remove: removeEntry,
      clear: clearEntries,
      add: addEntries,
      replace: replaceEntries,
      syncNames: syncEntryNames,
      compareHref: `/compare?ids=${ids.join(",")}`,
    };
  }, [entries, isSelected, toggle]);

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareContextValue {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("useCompare must be used inside <CompareProvider>");
  }
  return context;
}

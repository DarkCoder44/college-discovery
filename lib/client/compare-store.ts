/**
 * Compare Selection Store
 * -----------------------
 * A tiny external store backed by localStorage, consumed through React's
 * `useSyncExternalStore`.
 *
 * Why not plain `useState` + an effect? The selection genuinely lives outside
 * React — in localStorage, shared across tabs. Hydrating it with
 * `useEffect(() => setState(read()))` is the pattern React 19 now flags
 * (`react-hooks/set-state-in-effect`), because it causes a second render pass
 * on every mount. `useSyncExternalStore` is the API designed for exactly this:
 * it gives a server snapshot for SSR, a client snapshot after hydration, and a
 * subscription for changes — with no effect and no cascading render.
 *
 * The bonus: subscribing to the `storage` event means two open tabs keep the
 * same comparison selection.
 *
 * Only ids and display names are stored. All figures shown in the comparison
 * come from PostgreSQL via /api/compare, so nothing here can go stale.
 */

import { MAX_COMPARE_COLLEGES } from "@/lib/validation/schemas";

export interface CompareEntry {
  id: string;
  name: string;
  slug: string;
}

const STORAGE_KEY = "college-discovery:compare";

/**
 * Name used for an entry added from a `?ids=` link, before the real name is
 * known. Exported so the UI can tell "not resolved yet" from a real name.
 */
export const PENDING_NAME = "Loading…";

/** Stable empty array — a new [] each call would loop useSyncExternalStore. */
const EMPTY: CompareEntry[] = [];

let snapshot: CompareEntry[] = EMPTY;
let isInitialised = false;
const listeners = new Set<() => void>();

function isCompareEntry(value: unknown): value is CompareEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CompareEntry).id === "string" &&
    typeof (value as CompareEntry).name === "string" &&
    typeof (value as CompareEntry).slug === "string"
  );
}

/** Parses localStorage, tolerating absent, corrupt or hand-edited values. */
function readStorage(): CompareEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;

    const entries = parsed.filter(isCompareEntry).slice(0, MAX_COMPARE_COLLEGES);
    return entries.length > 0 ? entries : EMPTY;
  } catch {
    // Private browsing can throw on access; corrupt JSON throws on parse.
    return EMPTY;
  }
}

function writeStorage(entries: CompareEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded or storage blocked — the in-memory selection still works.
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

function setEntries(next: CompareEntry[]) {
  snapshot = next.length > 0 ? next : EMPTY;
  writeStorage(snapshot);
  emit();
}

// ─── useSyncExternalStore contract ───────────────────────────────────────────

export function subscribe(listener: () => void): () => void {
  // Read once, lazily, the first time a component subscribes. Doing it at
  // module scope would run during SSR where `window` does not exist.
  if (!isInitialised) {
    isInitialised = true;
    snapshot = readStorage();
  }

  listeners.add(listener);

  // Keep multiple tabs in sync — `storage` fires in every *other* tab.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    snapshot = readStorage();
    emit();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Must return a cached reference: returning a fresh array each call makes
 * React think the store changed on every render and loop forever.
 */
export function getSnapshot(): CompareEntry[] {
  return snapshot;
}

/** The server has no localStorage, so it always renders an empty selection. */
export function getServerSnapshot(): CompareEntry[] {
  return EMPTY;
}

// ─── Mutations ───────────────────────────────────────────────────────────────

/** Adds if absent, removes if present. Returns the resulting selection state. */
export function toggleEntry(entry: CompareEntry): {
  selected: boolean;
  rejectedAsFull: boolean;
} {
  const current = snapshot;

  if (current.some((e) => e.id === entry.id)) {
    setEntries(current.filter((e) => e.id !== entry.id));
    return { selected: false, rejectedAsFull: false };
  }

  if (current.length >= MAX_COMPARE_COLLEGES) {
    return { selected: false, rejectedAsFull: true };
  }

  setEntries([...current, entry]);
  return { selected: true, rejectedAsFull: false };
}

export function removeEntry(id: string) {
  if (!snapshot.some((e) => e.id === id)) return;
  setEntries(snapshot.filter((e) => e.id !== id));
}

export function clearEntries() {
  if (snapshot.length === 0) return;
  setEntries([]);
}

/**
 * Adds several entries at once, ignoring duplicates and respecting the cap.
 */
export function addEntries(entries: CompareEntry[]) {
  const existing = new Set(snapshot.map((e) => e.id));
  const additions = entries.filter((e) => !existing.has(e.id));
  if (additions.length === 0) return;

  setEntries([...snapshot, ...additions].slice(0, MAX_COMPARE_COLLEGES));
}

/**
 * Replaces the whole selection — used when a shared `/compare?ids=…` link is
 * opened.
 *
 * Replace, not merge. Merging looks harmless until the visitor already has
 * three colleges selected from an earlier session: the cap then rejects every
 * id from the link, the URL is rewritten back to their old selection, and the
 * link they clicked silently does nothing. Following an explicit comparison
 * link is an unambiguous instruction, so it wins over stored state.
 */
export function replaceEntries(entries: CompareEntry[]) {
  const seen = new Set<string>();
  const deduped = entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });

  const next = deduped.slice(0, MAX_COMPARE_COLLEGES);

  // Skip the write when the selection is already exactly this, so opening a
  // link that matches the current state does not churn storage or re-render.
  const unchanged =
    next.length === snapshot.length &&
    next.every((entry, index) => snapshot[index]?.id === entry.id);
  if (unchanged) return;

  setEntries(next);
}

/**
 * Fills in real names for entries added by id alone (a shared link arrives
 * before any name is known). No-ops when nothing changed, so it is safe to call
 * from an effect that depends on the selection.
 */
export function syncEntryNames(known: CompareEntry[]) {
  const byId = new Map(known.map((entry) => [entry.id, entry]));
  let changed = false;

  const next = snapshot.map((entry) => {
    const match = byId.get(entry.id);
    if (!match || (match.name === entry.name && match.slug === entry.slug)) {
      return entry;
    }
    changed = true;
    return { ...entry, name: match.name, slug: match.slug };
  });

  if (changed) setEntries(next);
}

/** Test/reset helper. */
export function resetCompareStore() {
  snapshot = EMPTY;
  isInitialised = false;
  listeners.clear();
}

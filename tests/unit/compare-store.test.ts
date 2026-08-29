/**
 * Unit tests — the compare selection store.
 *
 * This store backs a user-visible guarantee (a shared /compare?ids= link opens
 * exactly that comparison) and feeds `useSyncExternalStore`, which has a strict
 * contract: `getSnapshot` MUST return a stable reference when nothing changed,
 * or React re-renders forever.
 */

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
  resetCompareStore,
  PENDING_NAME,
  type CompareEntry,
} from "@/lib/client/compare-store";

const entry = (id: string, name = `College ${id}`): CompareEntry => ({
  id,
  name,
  slug: `slug-${id}`,
});

// jsdom is not enabled for this suite, so provide the minimum the store touches.
beforeAll(() => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    writable: true,
    value: {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });
});

beforeEach(() => {
  resetCompareStore();
  // Prime the lazy read so getSnapshot reflects mutations.
  subscribe(() => {});
  clearEntries();
});

describe("useSyncExternalStore contract", () => {
  it("returns a stable reference when nothing changed", () => {
    // A fresh array on each call would make React loop forever.
    expect(getSnapshot()).toBe(getSnapshot());
  });

  it("returns a stable empty reference on the server", () => {
    expect(getServerSnapshot()).toBe(getServerSnapshot());
    expect(getServerSnapshot()).toEqual([]);
  });

  it("returns a new reference after a real change", () => {
    const before = getSnapshot();
    toggleEntry(entry("a"));
    expect(getSnapshot()).not.toBe(before);
  });

  it("notifies subscribers on change", () => {
    let calls = 0;
    const unsubscribe = subscribe(() => calls++);
    toggleEntry(entry("a"));
    expect(calls).toBeGreaterThan(0);
    unsubscribe();
  });
});

describe("toggleEntry", () => {
  it("adds a college that is not selected", () => {
    expect(toggleEntry(entry("a"))).toEqual({ selected: true, rejectedAsFull: false });
    expect(getSnapshot().map((e) => e.id)).toEqual(["a"]);
  });

  it("removes a college that is already selected", () => {
    toggleEntry(entry("a"));
    expect(toggleEntry(entry("a"))).toEqual({ selected: false, rejectedAsFull: false });
    expect(getSnapshot()).toEqual([]);
  });

  it("refuses a fourth college and reports why", () => {
    toggleEntry(entry("a"));
    toggleEntry(entry("b"));
    toggleEntry(entry("c"));

    expect(toggleEntry(entry("d"))).toEqual({ selected: false, rejectedAsFull: true });
    expect(getSnapshot()).toHaveLength(3);
    expect(getSnapshot().map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("preserves selection order", () => {
    toggleEntry(entry("c"));
    toggleEntry(entry("a"));
    toggleEntry(entry("b"));
    expect(getSnapshot().map((e) => e.id)).toEqual(["c", "a", "b"]);
  });
});

describe("replaceEntries", () => {
  it("replaces a full selection, so a shared link is never ignored", () => {
    // The regression this guards: with three colleges already selected, a
    // merge would hit the cap, add nothing, and the shared link would appear
    // to do nothing at all.
    toggleEntry(entry("old1"));
    toggleEntry(entry("old2"));
    toggleEntry(entry("old3"));

    replaceEntries([entry("new1"), entry("new2")]);

    expect(getSnapshot().map((e) => e.id)).toEqual(["new1", "new2"]);
  });

  it("caps a link that names too many colleges", () => {
    replaceEntries([entry("a"), entry("b"), entry("c"), entry("d")]);
    expect(getSnapshot().map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("drops duplicate ids from the link", () => {
    replaceEntries([entry("a"), entry("a"), entry("b")]);
    expect(getSnapshot().map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("is a no-op when the selection already matches, keeping the reference stable", () => {
    replaceEntries([entry("a"), entry("b")]);
    const before = getSnapshot();
    replaceEntries([entry("a"), entry("b")]);
    expect(getSnapshot()).toBe(before);
  });
});

describe("addEntries", () => {
  it("adds only ids that are not already present", () => {
    toggleEntry(entry("a"));
    addEntries([entry("a"), entry("b")]);
    expect(getSnapshot().map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("respects the three-college cap", () => {
    addEntries([entry("a"), entry("b"), entry("c"), entry("d")]);
    expect(getSnapshot()).toHaveLength(3);
  });
});

describe("syncEntryNames", () => {
  it("fills in a real name over the placeholder", () => {
    replaceEntries([{ id: "a", name: PENDING_NAME, slug: "a" }]);
    syncEntryNames([entry("a", "Indian Institute of Technology Bombay")]);

    expect(getSnapshot()[0].name).toBe("Indian Institute of Technology Bombay");
    expect(getSnapshot()[0].slug).toBe("slug-a");
  });

  it("keeps the selection order while renaming", () => {
    replaceEntries([entry("a", PENDING_NAME), entry("b", PENDING_NAME)]);
    syncEntryNames([entry("b", "Second"), entry("a", "First")]);
    expect(getSnapshot().map((e) => e.id)).toEqual(["a", "b"]);
    expect(getSnapshot().map((e) => e.name)).toEqual(["First", "Second"]);
  });

  it("is a no-op when nothing changed, so it cannot loop an effect", () => {
    replaceEntries([entry("a", "Real Name")]);
    const before = getSnapshot();
    syncEntryNames([entry("a", "Real Name")]);
    expect(getSnapshot()).toBe(before);
  });

  it("ignores ids that are not in the selection", () => {
    replaceEntries([entry("a", PENDING_NAME)]);
    syncEntryNames([entry("zzz", "Not Selected")]);
    expect(getSnapshot()).toHaveLength(1);
    expect(getSnapshot()[0].id).toBe("a");
  });
});

describe("removeEntry / clearEntries", () => {
  it("removes one college", () => {
    replaceEntries([entry("a"), entry("b")]);
    removeEntry("a");
    expect(getSnapshot().map((e) => e.id)).toEqual(["b"]);
  });

  it("ignores a removal for an id that is not selected", () => {
    replaceEntries([entry("a")]);
    const before = getSnapshot();
    removeEntry("nope");
    expect(getSnapshot()).toBe(before);
  });

  it("clears everything", () => {
    replaceEntries([entry("a"), entry("b")]);
    clearEntries();
    expect(getSnapshot()).toEqual([]);
  });

  it("does not churn when clearing an already-empty selection", () => {
    const before = getSnapshot();
    clearEntries();
    expect(getSnapshot()).toBe(before);
  });
});

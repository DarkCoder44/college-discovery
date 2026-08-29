/**
 * Unit tests — "best value" highlighting in the comparison table.
 *
 * This is the piece of the compare feature a user actually reads a decision
 * off, so its edge cases matter: ties, missing data, and rows where lower is
 * better (fees) versus higher is better (placement package).
 */

import { findBestIndices } from "@/components/compare/CompareTable";

const v = (...numbers: Array<number | null>) => numbers.map((numeric) => ({ numeric }));

describe("findBestIndices", () => {
  it("marks the highest value when higher is better", () => {
    expect([...findBestIndices(v(4.2, 4.9, 4.5), "high")]).toEqual([1]);
  });

  it("marks the lowest value when lower is better (fees)", () => {
    expect([...findBestIndices(v(250_000, 50_000, 300_000), "low")]).toEqual([1]);
  });

  it("marks EVERY column that ties for best, not just the first", () => {
    // Two colleges both rated 4.9 are equally best — marking only the
    // left-most one would tell the user something false.
    expect([...findBestIndices(v(4.9, 4.9, 4.8), "high")]).toEqual([0, 1]);
  });

  it("marks nothing when every column ties", () => {
    // "Best" is meaningless if they are all identical.
    expect(findBestIndices(v(4.5, 4.5, 4.5), "high").size).toBe(0);
  });

  it("marks nothing for rows with no ordering (location, recruiter)", () => {
    expect(findBestIndices(v(null, null, null), "none").size).toBe(0);
    expect(findBestIndices(v(1, 2, 3), "none").size).toBe(0);
  });

  it("marks nothing when only one column has a comparable value", () => {
    // Nothing to compare against — a lone value is not a winner.
    expect(findBestIndices(v(4.5, null, null), "high").size).toBe(0);
  });

  it("ignores missing values but still ranks the rest", () => {
    expect([...findBestIndices(v(null, 4.9, 4.2), "high")]).toEqual([1]);
  });

  it("treats zero as a real value, not as missing", () => {
    // A college with a 0% placement rate must lose, not be skipped —
    // a truthiness filter here would silently drop it.
    expect([...findBestIndices(v(0, 50, 90), "high")]).toEqual([2]);
    expect([...findBestIndices(v(0, 50, 90), "low")]).toEqual([0]);
  });

  it("handles a two-college comparison", () => {
    expect([...findBestIndices(v(100_000, 200_000), "low")]).toEqual([0]);
  });

  it("handles negative and fractional values without surprises", () => {
    expect([...findBestIndices(v(98.5, 98.51), "high")]).toEqual([1]);
  });
});

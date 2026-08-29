/**
 * Unit tests — pagination maths and the page-number window.
 * Off-by-one errors here are the classic source of "page 4 of 3" bugs.
 */

import { buildPaginationMeta } from "@/lib/services/college.service";
import { buildPageWindow } from "@/components/ui/Pagination";

describe("buildPaginationMeta", () => {
  it("computes the page count for an exact multiple", () => {
    const meta = buildPaginationMeta(24, 1, 12);
    expect(meta.totalPages).toBe(2);
    expect(meta.hasNext).toBe(true);
    expect(meta.hasPrev).toBe(false);
  });

  it("rounds a partial final page up", () => {
    expect(buildPaginationMeta(28, 1, 12).totalPages).toBe(3);
    expect(buildPaginationMeta(1, 1, 12).totalPages).toBe(1);
  });

  it("marks the last page as having no next", () => {
    const meta = buildPaginationMeta(28, 3, 12);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(true);
  });

  it("reports zero pages and no navigation for an empty result set", () => {
    const meta = buildPaginationMeta(0, 1, 12);
    expect(meta.totalPages).toBe(0);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(false);
  });

  it("does not offer a previous page when a search returns nothing on page 2", () => {
    // Guards the case where a filter change empties the result while the user
    // is on a later page.
    const meta = buildPaginationMeta(0, 2, 12);
    expect(meta.hasPrev).toBe(false);
    expect(meta.hasNext).toBe(false);
  });
});

describe("buildPageWindow", () => {
  it("lists every page when they all fit", () => {
    expect(buildPageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(buildPageWindow(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("always includes the first and last page", () => {
    const window = buildPageWindow(15, 30);
    expect(window[0]).toBe(1);
    expect(window[window.length - 1]).toBe(30);
  });

  it("keeps the current page and its neighbours", () => {
    const window = buildPageWindow(15, 30);
    expect(window).toContain(13);
    expect(window).toContain(14);
    expect(window).toContain(15);
    expect(window).toContain(16);
    expect(window).toContain(17);
  });

  it("inserts an ellipsis marker where pages are skipped", () => {
    const window = buildPageWindow(15, 30);
    expect(window).toContain(null);
    // Never two gaps in a row.
    window.forEach((value, index) => {
      if (value === null) expect(window[index + 1]).not.toBeNull();
    });
  });

  it("never repeats a page number", () => {
    const window = buildPageWindow(2, 30).filter((p): p is number => p !== null);
    expect(new Set(window).size).toBe(window.length);
  });

  it("stays sorted", () => {
    const window = buildPageWindow(20, 40).filter((p): p is number => p !== null);
    expect([...window].sort((a, b) => a - b)).toEqual(window);
  });
});

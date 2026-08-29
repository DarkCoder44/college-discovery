/**
 * Unit tests — display formatters.
 * These run on every price/rating in the UI, so a regression here is visible
 * on every page.
 */

import {
  formatCurrency,
  formatRating,
  formatPercent,
  formatNumber,
  formatDate,
  collegeTypeBadgeClass,
} from "@/lib/format";

describe("formatCurrency", () => {
  it("uses Indian lakh/crore units", () => {
    expect(formatCurrency(250_000)).toBe("₹2.5L");
    expect(formatCurrency(100_000)).toBe("₹1L");
    expect(formatCurrency(2_200_000)).toBe("₹22L");
    expect(formatCurrency(25_000_000)).toBe("₹2.5Cr");
  });

  it("uses thousands below one lakh", () => {
    expect(formatCurrency(50_000)).toBe("₹50K");
    expect(formatCurrency(1_000)).toBe("₹1K");
  });

  it("accepts the string form the API sends for Decimal columns", () => {
    expect(formatCurrency("250000.00")).toBe("₹2.5L");
  });

  it("returns an em dash for missing or unparseable values instead of NaN", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency(undefined)).toBe("—");
    expect(formatCurrency("not a number")).toBe("—");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("₹0");
  });
});

describe("formatRating", () => {
  it("always shows one decimal place", () => {
    expect(formatRating("4.80")).toBe("4.8");
    expect(formatRating(5)).toBe("5.0");
  });

  it("degrades safely", () => {
    expect(formatRating(null)).toBe("—");
    expect(formatRating("abc")).toBe("—");
  });
});

describe("formatPercent", () => {
  it("formats a placement rate", () => {
    expect(formatPercent("98.50")).toBe("98.5%");
    expect(formatPercent(100)).toBe("100.0%");
  });

  it("degrades safely", () => {
    expect(formatPercent(null)).toBe("—");
  });
});

describe("formatNumber", () => {
  it("groups using the Indian numbering system", () => {
    expect(formatNumber(10000)).toBe("10,000");
  });

  it("handles zero as a value, not as missing", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(null)).toBe("—");
  });
});

describe("formatDate", () => {
  it("formats an ISO string", () => {
    expect(formatDate("2025-03-14T00:00:00.000Z")).toMatch(/2025/);
  });

  it("degrades safely on an invalid date", () => {
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDate(null)).toBe("—");
  });
});

describe("collegeTypeBadgeClass", () => {
  it("maps each known type to its own class", () => {
    expect(collegeTypeBadgeClass("Public")).toBe("badge-public");
    expect(collegeTypeBadgeClass("Private")).toBe("badge-private");
    expect(collegeTypeBadgeClass("Deemed")).toBe("badge-deemed");
  });

  it("falls back rather than rendering an undefined class", () => {
    expect(collegeTypeBadgeClass("Anything else")).toBe("badge-deemed");
  });
});

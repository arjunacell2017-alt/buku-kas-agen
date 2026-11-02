import { describe, expect, test } from "bun:test";
import { jakartaTransactionDate } from "./transaction-number";

describe("Tanggal transaksi Asia/Jakarta", () => {
  test("2 November 2026 uses the Jakarta date across UTC midnight", () => {
    expect(jakartaTransactionDate(new Date("2026-11-01T18:00:00Z"))).toBe("2026-11-02");
  });
  test("3 November 2026 starts at Jakarta midnight", () => {
    expect(jakartaTransactionDate(new Date("2026-11-02T17:00:00Z"))).toBe("2026-11-03");
  });
});
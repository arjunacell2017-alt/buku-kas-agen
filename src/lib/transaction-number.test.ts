import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { jakartaTransactionDate } from "./transaction-number";

describe("Tanggal transaksi Asia/Jakarta", () => {
  test("2 November 2026 uses the Jakarta date across UTC midnight", () => {
    assert.equal(jakartaTransactionDate(new Date("2026-11-01T18:00:00Z")), "2026-11-02");
  });
  test("3 November 2026 starts at Jakarta midnight", () => {
    assert.equal(jakartaTransactionDate(new Date("2026-11-02T17:00:00Z")), "2026-11-03");
  });
});
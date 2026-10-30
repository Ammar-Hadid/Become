import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import {
  isDirectionWriteConflict,
  retryDirectionTransaction,
} from "./direction-mutation.service";

describe("confirmed transaction rollback recovery", () => {
  it("retries a raw-query rollback nested in Prisma adapter metadata", async () => {
    const rollback = new Prisma.PrismaClientKnownRequestError(
      "Raw query failed",
      {
        code: "P2010",
        clientVersion: "7.10.0",
        meta: {
          driverAdapterError: new Error("TransactionWriteConflict", {
            cause: { kind: "TransactionWriteConflict", originalCode: "40001" },
          }),
        },
      },
    );
    let attempts = 0;
    await expect(
      retryDirectionTransaction(async () => {
        if (++attempts === 1) throw rollback;
        return "finalized once";
      }),
    ).resolves.toBe("finalized once");
    expect(attempts).toBe(2);
    expect(
      isDirectionWriteConflict({ code: "P2010", meta: { code: "40P01" } }),
    ).toBe(true);
    expect(
      isDirectionWriteConflict({
        code: "P2010",
        meta: {
          driverAdapterError: {
            cause: { originalCode: "08006", kind: "ConnectionClosed" },
          },
        },
      }),
    ).toBe(false);
    const cyclic = new Error("Unknown failure");
    cyclic.cause = cyclic;
    expect(isDirectionWriteConflict(cyclic)).toBe(false);
  });
  it("recognizes both Prisma and driver-adapter serialization errors", () => {
    expect(isDirectionWriteConflict({ code: "P2034" })).toBe(true);
    expect(
      isDirectionWriteConflict({
        cause: { kind: "TransactionWriteConflict", originalCode: "40001" },
      }),
    ).toBe(true);
    expect(isDirectionWriteConflict({ code: "40P01" })).toBe(true);
    expect(isDirectionWriteConflict({ code: "P2002" })).toBe(false);
    expect(
      isDirectionWriteConflict(new Error("Connection lost after commit")),
    ).toBe(false);
  });
  it("rebuilds a rolled-back transaction and bounds retries", async () => {
    let attempts = 0;
    const conflict = { cause: { originalCode: "40001" } };
    expect(
      await retryDirectionTransaction(async () => {
        if (++attempts < 3) throw conflict;
        return "committed once";
      }),
    ).toBe("committed once");
    expect(attempts).toBe(3);
    attempts = 0;
    await expect(
      retryDirectionTransaction(async () => {
        attempts++;
        throw conflict;
      }),
    ).rejects.toBe(conflict);
    expect(attempts).toBe(3);
  });
  it("never repeats an uncertain network or application failure", async () => {
    let attempts = 0;
    const uncertain = new Error("Connection lost after commit");
    await expect(
      retryDirectionTransaction(async () => {
        attempts++;
        throw uncertain;
      }),
    ).rejects.toBe(uncertain);
    expect(attempts).toBe(1);
  });
});

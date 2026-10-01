import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { FinanceError } from "@/features/finance/types/finance.types";
import { getOpenBankingConfig } from "../../config/open-banking.config";
import { getBankDataProvider } from "../../providers/adapters/enable-banking.adapter";
import { bankHash } from "../../providers/utils/enable-banking.util";
import { enqueueBankSynchronization } from "../../sync/services/bank-sync.service";

export const bankConnectionInputSchema = z.object({
  institutionName: z.string().trim().min(1).max(160),
  institutionCountry: z.enum(["NL", "LT"]),
  reconnectId: z.string().optional(),
});

export async function startBankAuthorization(userId: string, input: unknown) {
  const parsed = bankConnectionInputSchema.parse(input);
  const provider = getBankDataProvider();
  if (!getOpenBankingConfig().configured)
    throw new FinanceError(
      "Bank connections need server setup before you can connect.",
    );
  const institution = (
    await provider.institutions([parsed.institutionCountry])
  ).find(
    (item) =>
      item.name === parsed.institutionName &&
      item.country === parsed.institutionCountry,
  );
  if (!institution)
    throw new FinanceError(
      "This bank is not available through the configured provider.",
    );
  const state = randomBytes(32).toString("base64url");
  const now = new Date();
  const data = {
    institutionName: institution.name,
    institutionCountry: institution.country,
    institutionLogo: institution.logoUrl,
    requiredPsuHeaders: institution.requiredPsuHeaders,
    status: "AUTHORIZING" as const,
    authorizationStateHash: bankHash(state),
    authorizationExpiresAt: new Date(now.getTime() + 30 * 60_000),
    authorizationConsumedAt: null,
  };
  const connection = parsed.reconnectId
    ? await prisma.bankConnection.findFirst({
        where: { id: parsed.reconnectId, userId },
      })
    : null;
  if (
    parsed.reconnectId &&
    (!connection ||
      connection.institutionName !== institution.name ||
      connection.institutionCountry !== institution.country)
  )
    throw new FinanceError(
      "Choose the same bank when reconnecting this connection.",
    );
  const saved = connection
    ? await prisma.bankConnection.update({
        where: { id: connection.id, userId },
        data,
      })
    : await prisma.bankConnection.create({
        data: { ...data, userId, provider: provider.id },
      });
  try {
    const authorization = await provider.beginAuthorization({
      institution,
      state,
      redirectUrl: getOpenBankingConfig().callbackUrl,
      userId,
    });
    return { url: authorization.url, connectionId: saved.id };
  } catch (error) {
    await prisma.bankConnection.update({
      where: { id: saved.id, userId },
      data: { status: "FAILED" },
    });
    throw error;
  }
}

export async function completeBankAuthorization(
  userId: string,
  input: { state: string; code?: string; error?: string },
) {
  if (!/^[\w-]{40,100}$/.test(input.state))
    throw new FinanceError("This authorization link is invalid or expired.");
  const now = new Date();
  const connection = await prisma.bankConnection.findFirst({
    where: {
      userId,
      authorizationStateHash: bankHash(input.state),
      authorizationConsumedAt: null,
      authorizationExpiresAt: { gt: now },
      status: "AUTHORIZING",
    },
  });
  if (!connection)
    throw new FinanceError(
      "This authorization link has already been used or expired.",
    );
  // Claim before exchanging the single-use provider code. Concurrent callbacks cannot exchange twice.
  const claimed = await prisma.bankConnection.updateMany({
    where: {
      id: connection.id,
      userId,
      authorizationConsumedAt: null,
      authorizationExpiresAt: { gt: now },
    },
    data: { authorizationConsumedAt: now },
  });
  if (claimed.count !== 1)
    throw new FinanceError("This authorization link has already been used.");
  if (input.error || !input.code) {
    await prisma.bankConnection.update({
      where: { id: connection.id, userId },
      data: { status: "FAILED" },
    });
    throw new FinanceError(
      "Bank authorization was not completed. You can try connecting again.",
    );
  }
  const provider = getBankDataProvider(connection.provider);
  try {
    const authorized = await provider.completeAuthorization(input.code);
    if (
      authorized.institution.name !== connection.institutionName ||
      authorized.institution.country !== connection.institutionCountry
    )
      throw new FinanceError(
        "The bank returned a different institution. Start a new connection.",
      );
    await prisma.$transaction(async (tx) => {
      await tx.bankConnection.update({
        where: { id: connection.id, userId },
        data: {
          status: "CONNECTED",
          sessionId: authorized.sessionId,
          consentExpiresAt: authorized.expiresAt,
          nextEligibleAt: null,
          authorizationStateHash: null,
        },
      });
      for (const account of authorized.accounts) {
        const previous = await tx.externalBankAccount.findUnique({
          where: {
            userId_provider_identityKey: {
              userId,
              provider: connection.provider,
              identityKey: account.identityKey,
            },
          },
        });
        if (previous && previous.currency !== account.currency)
          throw new FinanceError(
            "The bank changed an account currency. Review its mapping before reconnecting.",
          );
        await tx.externalBankAccount.upsert({
          where: {
            userId_provider_identityKey: {
              userId,
              provider: connection.provider,
              identityKey: account.identityKey,
            },
          },
          create: {
            ...account,
            userId,
            provider: connection.provider,
            connectionId: connection.id,
            authorizedSessionId: authorized.sessionId,
          },
          update: {
            providerAccountId: account.providerAccountId,
            authorizedSessionId: authorized.sessionId,
            connectionId: connection.id,
            externalType: account.externalType,
            maskedIdentifier: account.maskedIdentifier,
            identityAliases: account.identityAliases,
          },
        });
      }
      // Retire jobs holding old session cursors; reauthorization creates a fresh full-history job.
      await tx.bankSyncJob.updateMany({
        where: {
          connectionId: connection.id,
          userId,
          status: { in: ["QUEUED", "RUNNING"] },
        },
        data: {
          status: "FAILED",
          lastError: "REAUTHORIZED",
          leaseToken: null,
          leasedUntil: null,
        },
      });
      await tx.bankSyncJob.create({
        data: {
          userId,
          connectionId: connection.id,
          trigger: "INITIAL",
          arguments: { longestHistory: true },
        },
      });
    });
    return { id: connection.id };
  } catch (error) {
    await prisma.bankConnection.update({
      where: { id: connection.id, userId },
      data: { status: "FAILED" },
    });
    throw error;
  }
}

export async function requestBankSynchronization(
  userId: string,
  connectionId: string,
) {
  return enqueueBankSynchronization(userId, connectionId, "USER");
}

export async function disconnectBankConnection(
  userId: string,
  connectionId: string,
) {
  const connection = await prisma.bankConnection.findFirst({
    where: { id: connectionId, userId },
  });
  if (!connection) throw new FinanceError("Bank connection not found.");
  // Stop local scheduling even if remote consent revocation is temporarily unavailable.
  await prisma.$transaction([
    prisma.bankConnection.update({
      where: { id: connection.id, userId },
      data: {
        status: "DISCONNECTED",
        authorizationStateHash: null,
        authorizationExpiresAt: null,
      },
    }),
    prisma.bankSyncJob.updateMany({
      where: {
        connectionId: connection.id,
        userId,
        status: { in: ["QUEUED", "RUNNING"] },
      },
      data: {
        status: "FAILED",
        leaseToken: null,
        leasedUntil: null,
        lastError: "DISCONNECTED",
      },
    }),
  ]);
  if (connection.sessionId) {
    try {
      await getBankDataProvider(connection.provider).revoke(
        connection.sessionId,
      );
      await prisma.bankConnection.update({
        where: { id: connection.id, userId },
        data: { sessionId: null },
      });
    } catch {
      throw new FinanceError(
        "Disconnected in Become. Bank consent could not be revoked yet; revoke it in your bank app or retry disconnecting.",
      );
    }
  }
}

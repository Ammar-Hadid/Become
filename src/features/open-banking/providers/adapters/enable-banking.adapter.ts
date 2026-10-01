import { readFile } from "node:fs/promises";
import { z } from "zod";
import { getOpenBankingConfig } from "../../config/open-banking.config";
import {
  enableBalanceSchema,
  enableInstitutionSchema,
  enableSessionSchema,
  enableTransactionSchema,
} from "../schemas/enable-banking.schema";
import {
  BankProviderError,
  type BankDataProvider,
  type BankInteractiveContext,
  type BankTransactionPageRequest,
} from "../types/bank-provider.types";
import {
  enableBankingJwt,
  normalizeEnableAccount,
  normalizeEnableBalance,
  normalizeEnableTransaction,
  parseBankRetryAfter,
} from "../utils/enable-banking.util";

const API_ORIGIN = "https://api.enablebanking.com";
const authResponse = z.object({ url: z.url() });

export class EnableBankingProvider implements BankDataProvider {
  readonly id = "ENABLE_BANKING" as const;
  constructor(private readonly requestFetch: typeof fetch = fetch) {}

  private async request(
    path: string,
    init: RequestInit = {},
    context?: BankInteractiveContext,
  ): Promise<unknown> {
    const config = getOpenBankingConfig();
    if (!config.configured) throw new BankProviderError("NOT_CONFIGURED", 503);
    const privateKey = await readFile(config.privateKeyPath, "utf8");
    const headers = new Headers(init.headers);
    headers.set(
      "Authorization",
      `Bearer ${enableBankingJwt(config.appId, privateKey)}`,
    );
    headers.set("Accept", "application/json");
    if (init.body) headers.set("Content-Type", "application/json");
    for (const [name, value] of Object.entries(context?.headers ?? {})) {
      if (name.toLowerCase().startsWith("psu-") && !/[\r\n]/.test(value))
        headers.set(name, value);
    }
    const response = await this.requestFetch(`${API_ORIGIN}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) {
      const error = z
        .object({ error: z.string().optional() })
        .safeParse(await response.json().catch(() => null));
      const code = error.success
        ? (error.data.error ?? `HTTP_${response.status}`)
        : `HTTP_${response.status}`;
      // Never surface provider messages: they can contain account identifiers.
      const safeCode = /^[A-Z0-9_]{1,80}$/.test(code)
        ? code
        : `HTTP_${response.status}`;
      throw new BankProviderError(
        safeCode,
        response.status,
        parseBankRetryAfter(response.headers.get("Retry-After")) ??
          (response.status === 429 || safeCode === "ASPSP_RATE_LIMIT_EXCEEDED"
            ? new Date(Date.now() + 6 * 3600_000)
            : null),
      );
    }
    return response.status === 204 ? null : response.json();
  }

  async institutions(countries: string[]) {
    const results = await Promise.all(
      countries.map(async (country) => {
        const payload = z
          .object({ aspsps: z.array(enableInstitutionSchema) })
          .parse(
            await this.request(
              `/aspsps?country=${encodeURIComponent(country)}`,
            ),
          );
        return payload.aspsps
          .filter((institution) => institution.psu_types.includes("personal"))
          .map((institution) => ({
            name: institution.name,
            country: institution.country,
            logoUrl: institution.logo ?? null,
            maximumConsentSeconds: institution.maximum_consent_validity,
            requiredPsuHeaders: institution.required_psu_headers ?? [],
          }));
      }),
    );
    return results.flat();
  }

  async beginAuthorization(
    input: Parameters<BankDataProvider["beginAuthorization"]>[0],
  ) {
    const payload = authResponse.parse(
      await this.request("/auth", {
        method: "POST",
        body: JSON.stringify({
          access: {
            balances: true,
            transactions: true,
            valid_until: new Date(
              Date.now() +
                Math.max(1, input.institution.maximumConsentSeconds - 60) *
                  1000,
            ).toISOString(),
          },
          aspsp: {
            name: input.institution.name,
            country: input.institution.country,
          },
          state: input.state,
          redirect_url: input.redirectUrl,
          psu_type: "personal",
          psu_id: input.userId,
        }),
      }),
    );
    const url = new URL(payload.url);
    if (url.protocol !== "https:" || url.hostname !== "auth.enablebanking.com")
      throw new BankProviderError("INVALID_REDIRECT", 502);
    return { url: url.href };
  }

  async completeAuthorization(code: string) {
    const payload = enableSessionSchema.parse(
      await this.request("/sessions", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    );
    const expiresAt = new Date(payload.access.valid_until);
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())
      throw new BankProviderError("SESSION_EXPIRED", 403);
    return {
      sessionId: payload.session_id,
      expiresAt,
      institution: payload.aspsp,
      accounts: payload.accounts.map(normalizeEnableAccount),
    };
  }

  async balances(accountId: string, context?: BankInteractiveContext) {
    const payload = z
      .object({ balances: z.array(enableBalanceSchema) })
      .parse(
        await this.request(
          `/accounts/${encodeURIComponent(accountId)}/balances`,
          {},
          context,
        ),
      );
    const now = new Date();
    return payload.balances.map((balance) =>
      normalizeEnableBalance(balance, now),
    );
  }

  async transactions(
    input: BankTransactionPageRequest,
    context?: BankInteractiveContext,
  ) {
    const query = new URLSearchParams();
    if (input.dateFrom) query.set("date_from", input.dateFrom);
    if (input.dateTo) query.set("date_to", input.dateTo);
    if (input.continuationKey)
      query.set("continuation_key", input.continuationKey);
    if (input.longestHistory) query.set("strategy", "longest");
    const payload = z
      .object({
        transactions: z.array(enableTransactionSchema),
        continuation_key: z.string().nullish(),
      })
      .parse(
        await this.request(
          `/accounts/${encodeURIComponent(input.accountId)}/transactions?${query}`,
          {},
          context,
        ),
      );
    return {
      observations: payload.transactions.map(normalizeEnableTransaction),
      continuationKey: payload.continuation_key || null,
    };
  }

  async revoke(sessionId: string) {
    await this.request(`/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });
  }
}

export function getBankDataProvider(
  provider = "ENABLE_BANKING",
): BankDataProvider {
  if (provider !== "ENABLE_BANKING")
    throw new BankProviderError("UNSUPPORTED_PROVIDER", 400);
  return new EnableBankingProvider();
}

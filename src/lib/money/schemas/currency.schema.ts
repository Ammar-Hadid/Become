import { z } from "zod";
import {
  SUPPORTED_CURRENCIES,
  UNSUPPORTED_CURRENCY_MESSAGE,
} from "@/lib/money/constants/currency.constants";

export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .pipe(
    z.enum(
      SUPPORTED_CURRENCIES.map(({ code }) => code),
      {
        error: UNSUPPORTED_CURRENCY_MESSAGE,
      },
    ),
  );

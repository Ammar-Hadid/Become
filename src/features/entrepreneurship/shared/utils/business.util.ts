import { DateTime } from "luxon";
import { APP_TIMEZONE } from "@/lib/config/environment.config";

export const canonicalName = (name: string) =>
  name.trim().normalize("NFKC").toLocaleLowerCase("en");
export const businessToday = () =>
  DateTime.now().setZone(APP_TIMEZONE).toISODate()!;
export const businessDate = (value: Date | string) =>
  DateTime.fromJSDate(new Date(value), { zone: APP_TIMEZONE }).toFormat(
    "d MMM yyyy",
  );
export const humanize = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());

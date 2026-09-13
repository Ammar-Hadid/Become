import { DateTime } from "luxon";

/** An explicit display pattern keeps server and browser date wording identical. */
export function formatReviewDate(value: string, includeTime = false) {
  const date = DateTime.fromISO(value, { zone: "Europe/Amsterdam" });
  return date.isValid
    ? date.toFormat(includeTime ? "d LLL yyyy, HH:mm" : "d LLL yyyy", {
        locale: "en-US",
      })
    : "Date not recorded";
}

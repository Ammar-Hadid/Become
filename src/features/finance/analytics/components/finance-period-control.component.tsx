"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition, type FormEvent } from "react";
import { TIMEFRAMES, type Timeframe } from "@/lib/dates/utils/period.util";

export function FinancePeriodControl({
  timeframe,
  date,
  maxDate,
}: {
  timeframe: Timeframe;
  date: string;
  maxDate: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextTimeframe = String(form.get("timeframe") ?? timeframe);
    const nextDate = String(form.get("date") ?? date);
    const search = new URLSearchParams({
      timeframe: nextTimeframe,
      date: nextDate,
    });

    startTransition(() => router.push(`${pathname}?${search.toString()}`));
  }

  return (
    <form
      className="finance-period-control"
      aria-busy={pending}
      data-pending={pending || undefined}
      onSubmit={submit}
    >
      <label>
        <span className="sr-only">Period</span>
        <select name="timeframe" defaultValue={timeframe} disabled={pending}>
          {TIMEFRAMES.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Date</span>
        <input
          type="date"
          name="date"
          defaultValue={date}
          max={maxDate}
          disabled={pending}
        />
      </label>
      <button type="submit" disabled={pending}>
        View
      </button>
    </form>
  );
}

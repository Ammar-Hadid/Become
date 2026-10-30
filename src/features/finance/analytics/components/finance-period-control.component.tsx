"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition, type FormEvent } from "react";
import { TIMEFRAMES, type Timeframe } from "@/lib/dates/utils/period.util";
import { NativeSelect } from "@/components/ui/forms/native-select.component";
import { Input } from "@/components/ui/forms/input.component";
import { Button } from "@/components/ui/buttons/button.component";

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
    const search = new URLSearchParams({
      timeframe: String(form.get("timeframe") ?? timeframe),
      date: String(form.get("date") ?? date),
    });
    startTransition(() => router.push(`${pathname}?${search.toString()}`));
  }
  return (
    <form
      className="finance-period-workspace"
      aria-busy={pending}
      onSubmit={submit}
    >
      <label>
        <span className="sr-only">Period</span>
        <NativeSelect
          name="timeframe"
          defaultValue={timeframe}
          disabled={pending}
        >
          {TIMEFRAMES.map((option) => (
            <option key={option} value={option}>
              {option[0].toUpperCase() + option.slice(1)}
            </option>
          ))}
        </NativeSelect>
      </label>
      <Input
        aria-label="Date"
        type="date"
        name="date"
        defaultValue={date}
        max={maxDate}
        disabled={pending}
      />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Loading…" : "View"}
      </Button>
    </form>
  );
}

"use client";
import { useBusinessRouter as useRouter } from "@/features/entrepreneurship/explorations/components/exploration-context.component";
import { useTransition } from "react";
import { TIMEFRAMES, type Timeframe } from "@/lib/dates/utils/period.util";
export function BusinessPeriodControl({
  timeframe,
  date,
  max,
}: {
  timeframe: Timeframe;
  date: string;
  max: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      className="business-period-control"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const params = new URLSearchParams(location.search);
        params.set("timeframe", String(data.get("timeframe")));
        params.set("date", String(data.get("date")));
        params.delete("cursor");
        start(() =>
          router.push(`/entrepreneurship/history?${params}`, { scroll: false }),
        );
      }}
    >
      <label>
        <span className="sr-only">Timeframe</span>
        <select name="timeframe" defaultValue={timeframe}>
          {TIMEFRAMES.map((value) => (
            <option key={value} value={value}>
              {value[0].toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">Reference date</span>
        <input name="date" type="date" defaultValue={date} max={max} />
      </label>
      <button>View</button>
    </form>
  );
}

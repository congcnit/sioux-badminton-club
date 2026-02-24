"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const START_YEAR = 2026;

export function DashboardYearSelect({
  currentYear,
  selectedYear,
}: {
  currentYear: number;
  selectedYear: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const years = Array.from(
    { length: currentYear - START_YEAR + 1 },
    (_, i) => currentYear - i,
  );

  function onValueChange(value: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("year", value);
    router.push(`/?${next.toString()}`);
  }

  return (
    <Select
      value={String(selectedYear)}
      onValueChange={onValueChange}
    >
      <SelectTrigger size="default" className="w-[6.5rem]">
        <SelectValue placeholder="Year" />
      </SelectTrigger>
      <SelectContent>
        {years.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

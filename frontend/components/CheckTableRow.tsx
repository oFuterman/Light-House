"use client";

import Link from "next/link";
import { Check } from "@/lib/api";
import { StatusBadge } from "./status-badge";
import { UptimeBadge } from "./UptimeBadge";
import { useCheckSummary } from "@/hooks/useCheckSummary";

interface CheckTableRowProps {
  check: Check;
  refreshTrigger?: number;
}

export function CheckTableRow({ check, refreshTrigger = 0 }: CheckTableRowProps) {
  const { summary, isLoading } = useCheckSummary({
    checkId: check.id,
    windowHours: 24,
    refreshTrigger,
  });

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <Link
          href={`/checks/${check.id}`}
          className="font-medium text-gray-900 hover:underline"
        >
          {check.name}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs">
        {check.url}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={check.last_status} />
      </td>
      <td className="px-4 py-3">
        <UptimeBadge
          percentage={summary && summary.total_runs > 0 ? summary.uptime_percentage : null}
          isLoading={isLoading}
        />
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {check.last_checked_at
          ? new Date(check.last_checked_at).toLocaleString()
          : "Never"}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {check.last_checked_at
          ? new Date(
              new Date(check.last_checked_at).getTime() +
                check.interval_seconds * 1000
            ).toLocaleString()
          : "Soon"}
      </td>
    </tr>
  );
}

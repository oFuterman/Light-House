type UptimeStatus = "perfect" | "good" | "warning" | "critical";

interface UptimeBadgeProps {
  percentage: number | null;
  isLoading?: boolean;
}

function getUptimeStatus(percentage: number): UptimeStatus {
  if (percentage === 100) return "perfect";
  if (percentage >= 99) return "good";
  if (percentage >= 95) return "warning";
  return "critical";
}

const statusStyles: Record<UptimeStatus, string> = {
  perfect: "bg-green-100 text-green-800",
  good: "bg-green-50 text-green-700",
  warning: "bg-yellow-100 text-yellow-800",
  critical: "bg-red-100 text-red-800",
};

export function UptimeBadge({ percentage, isLoading }: UptimeBadgeProps) {
  if (isLoading) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
        <span className="animate-pulse">—</span>
      </span>
    );
  }

  if (percentage === null) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        N/A
      </span>
    );
  }

  const status = getUptimeStatus(percentage);
  const displayValue =
    percentage === 100 ? "100%" : `${percentage.toFixed(1)}%`;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}
    >
      {displayValue}
    </span>
  );
}

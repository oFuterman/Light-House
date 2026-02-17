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
  perfect: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400",
  good: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
};

export function UptimeBadge({ percentage, isLoading }: UptimeBadgeProps) {
  if (isLoading) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
        <span className="animate-pulse">—</span>
      </span>
    );
  }

  if (percentage === null) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
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

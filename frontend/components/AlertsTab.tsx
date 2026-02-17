"use client";

import { useCheckAlerts } from "@/hooks/useCheckAlerts";

interface AlertsTabProps {
  checkId: string;
  windowHours: number;
}

function AlertTypeBadge({ type }: { type: "DOWN" | "RECOVERY" }) {
  const isDown = type === "DOWN";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        isDown ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400" : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400"
      }`}
    >
      {type}
    </span>
  );
}

export function AlertsTab({ checkId, windowHours }: AlertsTabProps) {
  const { alerts, isLoading, error } = useCheckAlerts({
    checkId,
    windowHours,
    limit: 100,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading alerts...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 mb-3 dark:bg-green-900/30">
          <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gray-600 text-sm dark:text-gray-400">No alerts in the selected time range</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200 dark:bg-gray-900 dark:border-gray-700">
          <tr>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Type</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Status Code</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Time</th>
            <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">Error</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {alerts.map((alert) => (
            <tr key={alert.id}>
              <td className="px-4 py-3">
                <AlertTypeBadge type={alert.alert_type} />
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{alert.status_code || "-"}</td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{new Date(alert.created_at).toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-red-600 max-w-xs truncate">{alert.error_message || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

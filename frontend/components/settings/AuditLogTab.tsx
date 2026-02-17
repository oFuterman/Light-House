"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { api, AuditLog } from "@/lib/api";
import { TimeRangePicker, TimeRange } from "@/components/TimeRangePicker";

function formatDate(ts: string): string {
  const date = new Date(ts);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  "auth.login": { label: "Login", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
  "auth.logout": { label: "Logout", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" },
  "auth.login_failed": { label: "Login Failed", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  "org.created": { label: "Org Created", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400" },
  "org.updated": { label: "Org Updated", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  "member.invited": { label: "Member Invited", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  "member.joined": { label: "Member Joined", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
  "member.removed": { label: "Member Removed", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  "member.role_changed": { label: "Role Changed", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400" },
  "member.invite_revoked": { label: "Invite Revoked", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  "apikey.created": { label: "API Key Created", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  "apikey.deleted": { label: "API Key Deleted", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  "check.created": { label: "Check Created", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
  "check.updated": { label: "Check Updated", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  "check.deleted": { label: "Check Deleted", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
  "settings.updated": { label: "Settings Updated", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
};

function createDefaultTimeRange(): TimeRange {
  const now = new Date();
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { from, to: now };
}

export function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [timeRange, setTimeRange] = useState<TimeRange>(createDefaultTimeRange);
  const [offset, setOffset] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await api.getAuditLogs({
        limit,
        offset,
        action: selectedAction || undefined,
        from: timeRange.from.toISOString(),
        to: timeRange.to.toISOString(),
      });
      setLogs(result.audit_logs);
      setTotal(result.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [offset, selectedAction, timeRange]);

  const fetchActions = useCallback(async () => {
    try {
      const data = await api.getAuditLogActions();
      setActions(data);
    } catch {
      // Ignore errors for actions
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (action: string) => {
    setSelectedAction(action);
    setOffset(0);
  };

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range);
    setOffset(0);
  }, []);

  const getActionDisplay = (action: string) => {
    const display = ACTION_LABELS[action];
    if (display) return display;
    return { label: action, color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300" };
  };

  const formatDetails = (details?: Record<string, unknown>) => {
    if (!details || Object.keys(details).length === 0) return null;
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(", ");
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">Audit Log</h2>
      <p className="text-sm text-gray-600 mb-4">
        View security and activity events for your organization.
      </p>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4 items-end">
        <div className="w-80">
          <label className="block text-xs text-gray-500 mb-1 dark:text-gray-400">Time Range</label>
          <TimeRangePicker
            value={timeRange}
            onChange={handleTimeRangeChange}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1 dark:text-gray-400">Action Type</label>
          <select
            value={selectedAction}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
          >
            <option value="">All Actions</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {getActionDisplay(action).label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm dark:bg-red-900/30 dark:text-red-400">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded dark:bg-gray-700" />
          ))}
        </div>
      ) : (
        <>
          <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 uppercase tracking-wide dark:text-gray-400">
                  <th className="text-left py-2 px-3 font-medium w-[160px]">Date</th>
                  <th className="text-left py-2 px-3 font-medium w-[120px]">Action</th>
                  <th className="text-left py-2 px-3 font-medium">User</th>
                  <th className="text-left py-2 px-3 font-medium w-[120px]">IP</th>
                  <th className="text-left py-2 px-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {logs.map((log) => {
                  const actionDisplay = getActionDisplay(log.action);
                  const details = formatDetails(log.details);
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className={`cursor-pointer text-sm ${
                          isExpanded
                            ? "bg-blue-50 dark:bg-blue-900/30"
                            : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        }`}
                      >
                        <td className="py-2 px-3 text-gray-500 font-mono text-xs whitespace-nowrap dark:text-gray-400">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${actionDisplay.color}`}>
                            {actionDisplay.label}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-700 truncate dark:text-gray-300">
                          {log.user_email || <span className="text-gray-400">System</span>}
                        </td>
                        <td className="py-2 px-3 text-gray-400 font-mono text-xs">
                          {log.ip_address || "-"}
                        </td>
                        <td className="py-2 px-3 text-gray-500 truncate dark:text-gray-400">
                          {details || "-"}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50 dark:bg-gray-800">
                          <td colSpan={5} className="p-0">
                            <div className="p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1 dark:text-gray-400">Timestamp</span>
                                  <span className="font-mono text-gray-900 dark:text-white">{new Date(log.created_at).toISOString()}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1 dark:text-gray-400">Action</span>
                                  <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${actionDisplay.color}`}>{actionDisplay.label}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1 dark:text-gray-400">User</span>
                                  <span className="text-gray-900 dark:text-white">{log.user_email || "System"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1 dark:text-gray-400">IP Address</span>
                                  <span className="font-mono text-gray-900 dark:text-white">{log.ip_address || "-"}</span>
                                </div>
                                {log.resource_type && (
                                  <div>
                                    <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1 dark:text-gray-400">Resource Type</span>
                                    <span className="text-gray-900 dark:text-white">{log.resource_type}</span>
                                  </div>
                                )}
                                {log.resource_id && (
                                  <div>
                                    <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1 dark:text-gray-400">Resource ID</span>
                                    <span className="font-mono text-gray-900 dark:text-white">{log.resource_id}</span>
                                  </div>
                                )}
                              </div>
                              {log.details && Object.keys(log.details).length > 0 && (
                                <div>
                                  <span className="text-gray-500 text-xs uppercase tracking-wide block mb-1 dark:text-gray-400">Details</span>
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {Object.entries(log.details).map(([key, value]) => (
                                      <span
                                        key={key}
                                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 font-mono dark:bg-gray-700 dark:text-gray-300"
                                      >
                                        <span className="text-gray-500 dark:text-gray-400">{key}:</span>
                                        <span className="ml-1">{String(value)}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

          {logs.length === 0 && (
            <p className="text-center text-gray-500 py-8">No audit logs found.</p>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} entries
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700 dark:text-gray-300"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

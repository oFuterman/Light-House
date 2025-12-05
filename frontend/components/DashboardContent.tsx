"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { CheckTableRow } from "@/components/CheckTableRow";
import { AutoRefreshToggle } from "@/components/AutoRefreshToggle";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useChecksSearch } from "@/hooks/useChecksSearch";
import { Loading } from "@/components/ui/Loading";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAuth } from "@/contexts/auth";

export function DashboardContent() {
  const params = useParams();
  const { user } = useAuth();

  // F4 mitigation: prefer params, fallback to auth context
  const slug = (params?.slug as string) || user?.org_slug || "";
  const basePath = slug ? `/org/${slug}` : "";

  const {
    data: checks,
    total,
    isLoading,
    isLoadingMore,
    error,
    refetch,
    loadMore,
    hasMore,
  } = useChecksSearch();
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Silent refresh for auto-refresh (no loading state)
  const silentRefresh = useCallback(async () => {
    refetch();
  }, [refetch]);

  const { isEnabled: autoRefreshEnabled, setEnabled: setAutoRefreshEnabled } = useAutoRefresh({
    callback: silentRefresh,
    intervalMs: 30000,
  });

  // Infinite scroll: use IntersectionObserver to detect when we scroll near the bottom
  useEffect(() => {
    const trigger = loadMoreTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          loadMore();
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(trigger);
    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, loadMore]);

  if (isLoading) {
    return <Loading message="Loading checks..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load checks"
        message={error}
        onRetry={refetch}
      />
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Uptime Checks</h1>
          {total > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Showing {checks.length} of {total} checks
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <AutoRefreshToggle
            isEnabled={autoRefreshEnabled}
            onToggle={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            intervalSeconds={30}
          />
          <Link
            href={`${basePath}/settings`}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            Settings
          </Link>
          <Link
            href={`${basePath}/checks/new`}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm"
          >
            New Check
          </Link>
        </div>
      </div>

      {checks.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 mb-4">
            <svg
              className="w-7 h-7 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No checks yet</h2>
          <p className="text-gray-600 text-sm max-w-sm mx-auto mb-6">
            Get started by creating your first uptime check. Light House will monitor your endpoints and record results automatically.
          </p>
          <Link
            href={`${basePath}/checks/new`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Your First Check
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  URL
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Uptime (24h)
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Last Check
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                  Next Check
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {checks.map((check) => (
                <CheckTableRow key={check.id} check={check} refreshTrigger={0} />
              ))}
            </tbody>
          </table>

          {/* Infinite scroll trigger */}
          <div ref={loadMoreTriggerRef} className="h-1" />

          {/* Loading more indicator */}
          {isLoadingMore && (
            <div className="flex justify-center py-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="text-sm">Loading more checks...</span>
              </div>
            </div>
          )}

          {/* End of results indicator */}
          {!hasMore && checks.length > 0 && checks.length < total && (
            <div className="text-center py-4 text-sm text-gray-500 border-t border-gray-100">
              End of results ({checks.length} checks)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

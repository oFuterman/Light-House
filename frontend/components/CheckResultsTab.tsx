"use client";

import { useState, useCallback } from "react";
import { SearchRequest } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { CheckResultsFilterBar } from "@/components/CheckResultsFilterBar";
import { useCheckResultsSearch } from "@/hooks/useCheckResultsSearch";

interface CheckResultsTabProps {
  checkId: string;
}

const defaultSearchRequest: SearchRequest = {
  time_range: {
    from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  filters: [],
  sort: [{ field: "created_at", dir: "desc" }],
  limit: 200,
  offset: 0,
};

export function CheckResultsTab({ checkId }: CheckResultsTabProps) {
  const [searchRequest, setSearchRequest] = useState<SearchRequest>(defaultSearchRequest);
  const { data: results, total, isLoading, error, refetch } = useCheckResultsSearch(
    checkId,
    searchRequest
  );

  const handleFilterChange = useCallback((request: SearchRequest) => {
    setSearchRequest(request);
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <CheckResultsFilterBar onChange={handleFilterChange} isLoading={isLoading} />

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading results...
        </div>
      ) : results.length === 0 ? (
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">No results found</p>
              <p className="text-sm text-gray-600 mt-1">
                No check results match the current filters. Try adjusting your filters or time range.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-200 bg-white">
            Showing {results.length} of {total} results
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Time</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Response Time</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {results.map((result) => (
                <tr key={result.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(result.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={result.status_code} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span
                      className={`${
                        result.response_time_ms > 500
                          ? "text-red-600"
                          : result.response_time_ms > 200
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {result.response_time_ms}ms
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-red-600 max-w-xs truncate" title={result.error_message || undefined}>
                    {result.error_message || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

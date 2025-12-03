"use client";

interface AutoRefreshToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
  intervalSeconds?: number;
}

export function AutoRefreshToggle({
  isEnabled,
  onToggle,
  intervalSeconds = 30,
}: AutoRefreshToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition ${
        isEnabled
          ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
          : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
      }`}
      title={isEnabled ? `Auto-refreshing every ${intervalSeconds}s` : "Auto-refresh paused"}
    >
      <span className={isEnabled ? "animate-spin" : ""} style={isEnabled ? { animationDuration: "2s" } : undefined}>
        <svg
          className="w-4 h-4 -scale-x-100"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </span>
    </button>
  );
}

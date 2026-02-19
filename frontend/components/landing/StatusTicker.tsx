"use client";

const MOCK_CHECKS = [
    { name: "api.example.com", status: "UP", ms: 42, uptime: "99.98%" },
    { name: "app.example.com", status: "UP", ms: 128, uptime: "99.95%" },
    { name: "cdn.example.com", status: "UP", ms: 18, uptime: "100%" },
];

export function StatusTicker() {
    return (
        <div className="w-full max-w-md mx-auto animate-float">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Live Status</span>
                    <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse-soft" />
                        All systems operational
                    </span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {MOCK_CHECKS.map((check, i) => (
                        <div
                            key={check.name}
                            className="px-4 py-2.5 flex items-center justify-between text-sm animate-fade-in-up"
                            style={{ animationDelay: `${0.8 + i * 0.15}s`, animationFillMode: "backwards" }}
                        >
                            <span className="text-gray-900 dark:text-white font-medium">{check.name}</span>
                            <div className="flex items-center gap-3">
                                <span className="text-gray-400 dark:text-gray-500 text-xs">{check.uptime}</span>
                                <span className="text-gray-400 dark:text-gray-500 text-xs">{check.ms}ms</span>
                                <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    {check.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

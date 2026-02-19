"use client";

import { AnimateOnScroll } from "./AnimateOnScroll";

const MOCK_ROWS = [
    { name: "Production API", url: "api.acme.com/health", status: "UP", uptime: "99.98%", ms: "42ms" },
    { name: "Marketing Site", url: "www.acme.com", status: "UP", uptime: "99.95%", ms: "128ms" },
    { name: "Auth Service", url: "auth.acme.com/ping", status: "UP", uptime: "100%", ms: "18ms" },
];

export function DashboardPreview() {
    return (
        <section className="py-24 px-4 bg-white dark:bg-transparent">
            <div className="max-w-5xl mx-auto">
                <AnimateOnScroll className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                        Built for developers who care about uptime
                    </h2>
                </AnimateOnScroll>

                <AnimateOnScroll>
                    <div className="rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800" style={{ transform: "perspective(1200px) rotateX(2deg)" }}>
                        {/* Browser chrome */}
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <div className="w-3 h-3 rounded-full bg-red-400" />
                            <div className="w-3 h-3 rounded-full bg-yellow-400" />
                            <div className="w-3 h-3 rounded-full bg-green-400" />
                            <div className="flex-1 mx-4">
                                <div className="h-6 rounded bg-gray-200 dark:bg-gray-700 max-w-xs mx-auto flex items-center justify-center">
                                    <span className="text-xs text-gray-400 dark:text-gray-500">app.lighthouse.dev/dashboard</span>
                                </div>
                            </div>
                        </div>

                        {/* Mock dashboard */}
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white">Checks</h3>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Last updated: just now</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                            <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Name</th>
                                            <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">URL</th>
                                            <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                                            <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Uptime</th>
                                            <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Response</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {MOCK_ROWS.map((row) => (
                                            <tr key={row.name} className="border-b border-gray-100 dark:border-gray-700/50">
                                                <td className="py-3 px-3 font-medium text-gray-900 dark:text-white">{row.name}</td>
                                                <td className="py-3 px-3 text-gray-500 dark:text-gray-400">{row.url}</td>
                                                <td className="py-3 px-3">
                                                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        {row.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-right text-gray-900 dark:text-white">{row.uptime}</td>
                                                <td className="py-3 px-3 text-right text-gray-500 dark:text-gray-400">{row.ms}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </AnimateOnScroll>
            </div>
        </section>
    );
}

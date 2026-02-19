"use client";

import { AnimateOnScroll } from "./AnimateOnScroll";

const FEATURES = [
    {
        title: "Uptime Monitoring",
        description: "HTTP, TCP, and DNS checks from multiple regions. Know the moment something goes down.",
        iconBg: "bg-emerald-50 dark:bg-emerald-900/20",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
    {
        title: "Structured Logs",
        description: "Ingest, search, and filter logs with a powerful query DSL. No more grepping through files.",
        iconBg: "bg-sky-50 dark:bg-sky-900/20",
        iconColor: "text-sky-600 dark:text-sky-400",
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
        ),
    },
    {
        title: "Distributed Tracing",
        description: "Follow requests across services. Pinpoint bottlenecks and failures instantly.",
        iconBg: "bg-violet-50 dark:bg-violet-900/20",
        iconColor: "text-violet-600 dark:text-violet-400",
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
        ),
    },
    {
        title: "Instant Alerts",
        description: "Get notified via email, Slack, or webhooks the second something needs attention.",
        iconBg: "bg-beacon-100 dark:bg-beacon-400/10",
        iconColor: "text-beacon-600 dark:text-beacon-400",
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
        ),
    },
    {
        title: "Search DSL",
        description: "Query logs and traces with a developer-friendly search language. Filter by any field.",
        iconBg: "bg-cyan-50 dark:bg-cyan-900/20",
        iconColor: "text-cyan-600 dark:text-cyan-400",
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
        ),
    },
    {
        title: "Team Collaboration",
        description: "Invite your team, manage roles, and share dashboards. Everyone stays in the loop.",
        iconBg: "bg-rose-50 dark:bg-rose-900/20",
        iconColor: "text-rose-600 dark:text-rose-400",
        icon: (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
        ),
    },
];

export function FeaturesGrid() {
    return (
        <section className="py-24 px-4 bg-white dark:bg-transparent">
            <div className="max-w-6xl mx-auto">
                <AnimateOnScroll className="text-center mb-16">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Features</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                        Everything you need to stay up
                    </h2>
                </AnimateOnScroll>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURES.map((feature, i) => (
                        <AnimateOnScroll key={feature.title} delay={i * 100}>
                            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-6 hover:border-gray-300 dark:hover:border-gray-700 transition-colors bg-white dark:bg-gray-800/50">
                                <div className={`w-10 h-10 rounded-lg ${feature.iconBg} ${feature.iconColor} flex items-center justify-center mb-4`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{feature.description}</p>
                            </div>
                        </AnimateOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}

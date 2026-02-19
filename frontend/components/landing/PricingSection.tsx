"use client";

import Link from "next/link";
import { AnimateOnScroll } from "./AnimateOnScroll";

const PLANS = [
    {
        name: "Free",
        price: "$0",
        period: "forever",
        description: "For hobby projects and personal sites.",
        features: [
            "10 checks",
            "5-minute intervals",
            "7-day log retention",
            "500 MB logs/month",
            "1 AI query/day",
        ],
        cta: "Get Started",
        highlighted: false,
    },
    {
        name: "Indie Pro",
        price: "$19",
        period: "/month",
        description: "For solo developers shipping real products.",
        features: [
            "25 checks",
            "60-second intervals",
            "30-day log retention",
            "5 GB logs/month",
            "1 status page",
        ],
        cta: "Start Free Trial",
        highlighted: false,
    },
    {
        name: "Team",
        price: "$49",
        period: "/month",
        description: "For growing teams that need reliability.",
        features: [
            "75 checks",
            "30-second intervals",
            "90-day log retention",
            "20 GB logs/month",
            "3 status pages",
        ],
        cta: "Start Free Trial",
        highlighted: true,
    },
    {
        name: "Agency",
        price: "$149",
        period: "/month",
        description: "For agencies managing multiple clients.",
        features: [
            "250 checks",
            "30-second intervals",
            "180-day log retention",
            "50 GB logs/month",
            "Unlimited status pages",
        ],
        cta: "Start Free Trial",
        highlighted: false,
    },
];

export function PricingSection() {
    return (
        <section id="pricing" className="py-24 px-4">
            <div className="max-w-6xl mx-auto">
                <AnimateOnScroll className="text-center mb-16">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Pricing</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                        Simple, transparent pricing
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">Start free. Scale when you need to.</p>
                </AnimateOnScroll>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {PLANS.map((plan, i) => (
                        <AnimateOnScroll key={plan.name} delay={i * 100}>
                            <div
                                className={`rounded-xl border p-6 flex flex-col h-full ${
                                    plan.highlighted
                                        ? "border-beacon-400 dark:border-beacon-400 relative"
                                        : "border-gray-200 dark:border-gray-800"
                                } bg-white dark:bg-gray-800/50`}
                            >
                                {plan.highlighted && (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-medium bg-beacon-400 text-gray-900 rounded-full">
                                        Most Popular
                                    </span>
                                )}
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{plan.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{plan.description}</p>
                                <div className="mb-6">
                                    <span className="text-4xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                                    <span className="text-gray-500 dark:text-gray-400 text-sm">{plan.period}</span>
                                </div>
                                <ul className="space-y-2.5 mb-8 flex-1">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                                            <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href="/signup"
                                    className={`block text-center py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                        plan.highlighted
                                            ? "bg-beacon-400 text-gray-900 hover:bg-beacon-300 dark:bg-beacon-400 dark:text-gray-900 dark:hover:bg-beacon-300"
                                            : "border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    }`}
                                >
                                    {plan.cta}
                                </Link>
                            </div>
                        </AnimateOnScroll>
                    ))}
                </div>

                <AnimateOnScroll className="text-center mt-8">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        All plans include unlimited team members. 14-day free trial on paid plans.
                    </p>
                </AnimateOnScroll>
            </div>
        </section>
    );
}

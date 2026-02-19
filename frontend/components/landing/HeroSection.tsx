"use client";

import Link from "next/link";
import { StatusTicker } from "./StatusTicker";

export function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center bg-grid overflow-hidden">
            {/* Beacon glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[500px] h-[500px] bg-beacon-300/15 dark:bg-beacon-400/10 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-4 py-32 text-center">
                {/* Badge */}
                <div
                    className="inline-block mb-6 animate-fade-in-up"
                    style={{ animationDelay: "0.1s", animationFillMode: "backwards" }}
                >
                    <span className="px-4 py-1.5 text-sm font-medium rounded-full border border-beacon-200 dark:border-beacon-500/30 bg-beacon-50 dark:bg-beacon-400/10 text-beacon-600 dark:text-beacon-300">
                        14-day free trial — no card required
                    </span>
                </div>

                {/* Headline */}
                <h1
                    className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 animate-fade-in-up"
                    style={{ animationDelay: "0.2s", animationFillMode: "backwards" }}
                >
                    Know when it breaks{" "}
                    <span className="text-gray-400 dark:text-gray-500">Before your users do</span>
                </h1>

                {/* Subheadline */}
                <p
                    className="text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto animate-fade-in-up"
                    style={{ animationDelay: "0.35s", animationFillMode: "backwards" }}
                >
                    Uptime monitoring, structured logs, and distributed tracing. One platform, zero complexity.
                </p>

                {/* CTAs */}
                <div
                    className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in-up"
                    style={{ animationDelay: "0.5s", animationFillMode: "backwards" }}
                >
                    <Link
                        href="/signup"
                        className="px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200 transition-colors font-medium"
                    >
                        Start Monitoring Free
                    </Link>
                    <a
                        href="#pricing"
                        className="px-8 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 font-medium"
                    >
                        View Pricing
                    </a>
                </div>

                {/* Status Ticker */}
                <div
                    className="animate-fade-in-up"
                    style={{ animationDelay: "0.65s", animationFillMode: "backwards" }}
                >
                    <StatusTicker />
                </div>
            </div>
        </section>
    );
}

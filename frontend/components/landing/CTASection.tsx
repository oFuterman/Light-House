"use client";

import Link from "next/link";
import { AnimateOnScroll } from "./AnimateOnScroll";

export function CTASection() {
    return (
        <section className="py-24 px-4 bg-gray-100 dark:bg-gray-800">
            <div className="max-w-3xl mx-auto text-center">
                <AnimateOnScroll>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Start monitoring in under a minute
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">
                        Free forever for hobby projects. Upgrade when you&apos;re ready.
                    </p>
                    <Link
                        href="/signup"
                        className="inline-block px-8 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-colors font-medium"
                    >
                        Get Started Free
                    </Link>
                </AnimateOnScroll>
            </div>
        </section>
    );
}

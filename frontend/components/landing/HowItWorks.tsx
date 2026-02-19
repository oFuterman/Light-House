"use client";

import { AnimateOnScroll } from "./AnimateOnScroll";

const STEPS = [
    {
        number: 1,
        title: "Sign Up in 30 Seconds",
        description: "Create your account with just an email. No credit card required, no complex setup.",
    },
    {
        number: 2,
        title: "Add Your Endpoints",
        description: "Enter the URLs you want to monitor. Set check intervals, alert rules, and you're done.",
    },
    {
        number: 3,
        title: "Relax and Ship",
        description: "We'll watch your services 24/7. You'll get notified instantly if anything goes wrong.",
    },
];

export function HowItWorks() {
    return (
        <section className="py-24 px-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="max-w-6xl mx-auto">
                <AnimateOnScroll className="text-center mb-16">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">How It Works</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                        Three steps to peace of mind
                    </h2>
                </AnimateOnScroll>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    {/* Connecting line (desktop only) */}
                    <div className="hidden md:block absolute top-5 left-[20%] right-[20%] h-px border-t-2 border-dashed border-gray-300 dark:border-gray-600" />

                    {STEPS.map((step, i) => (
                        <AnimateOnScroll key={step.number} delay={i * 150}>
                            <div className="text-center relative">
                                <div className="w-10 h-10 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center font-bold text-sm mx-auto mb-4 relative z-10">
                                    {step.number}
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">{step.description}</p>
                            </div>
                        </AnimateOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}

"use client";

import { useInView } from "@/hooks/useInView";

interface AnimateOnScrollProps {
    children: React.ReactNode;
    animation?: string;
    delay?: number;
    className?: string;
}

export function AnimateOnScroll({
    children,
    animation = "animate-fade-in-up",
    delay = 0,
    className = "",
}: AnimateOnScrollProps) {
    const { ref, inView } = useInView({ threshold: 0.1 });

    return (
        <div
            ref={ref}
            className={`${className} ${inView ? animation : "opacity-0"}`}
            style={inView ? (delay ? { animationDelay: `${delay}ms`, animationFillMode: "backwards" } : undefined) : { opacity: 0 }}
        >
            {children}
        </div>
    );
}

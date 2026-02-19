"use client";

import { useEffect, useRef, useState } from "react";

export function useInView(options?: IntersectionObserverInit & { once?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setInView(true);
                if (options?.once !== false) observer.unobserve(el);
            }
        }, { threshold: options?.threshold ?? 0.1, rootMargin: options?.rootMargin });

        observer.observe(el);
        return () => observer.disconnect();
    }, [options?.threshold, options?.rootMargin, options?.once]);

    return { ref, inView };
}

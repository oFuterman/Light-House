"use client";

import { useEffect, useState } from "react";

interface ClientDateProps {
  date: string | null;
  fallback?: string;
}

/**
 * Renders a date only on the client side to avoid hydration mismatches.
 * Server and client may have different timezones, so we render a placeholder
 * during SSR and the actual formatted date after hydration.
 */
export function ClientDate({ date, fallback = "-" }: ClientDateProps) {
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    if (date) {
      setFormatted(new Date(date).toLocaleString());
    }
  }, [date]);

  // During SSR and initial hydration, show fallback
  if (!formatted) {
    return <span>{date ? "..." : fallback}</span>;
  }

  return <span>{formatted}</span>;
}

interface ClientDateOffsetProps {
  date: string | null;
  offsetSeconds: number;
  fallback?: string;
}

/**
 * Renders a date with an offset (e.g., for "next check" time)
 */
export function ClientDateOffset({ date, offsetSeconds, fallback = "-" }: ClientDateOffsetProps) {
  const [formatted, setFormatted] = useState<string | null>(null);

  useEffect(() => {
    if (date) {
      const offsetDate = new Date(new Date(date).getTime() + offsetSeconds * 1000);
      setFormatted(offsetDate.toLocaleString());
    }
  }, [date, offsetSeconds]);

  if (!formatted) {
    return <span>{date ? "..." : fallback}</span>;
  }

  return <span>{formatted}</span>;
}

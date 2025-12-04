"use client";

import dynamic from "next/dynamic";
import { CheckResult } from "@/lib/api";

// Chart skeleton shown while Recharts loads
function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="animate-pulse bg-gray-100 rounded"
      style={{ height }}
    >
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Loading chart...
      </div>
    </div>
  );
}

// Lazy load the entire chart component - Recharts is ~200KB
const LazyCheckResponseTimeChart = dynamic(
  () => import("./CheckResponseTimeChart").then((mod) => mod.CheckResponseTimeChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton />,
  }
);

interface LazyChartProps {
  results: CheckResult[];
  height?: number;
}

export function LazyChart({ results, height = 300 }: LazyChartProps) {
  return <LazyCheckResponseTimeChart results={results} height={height} />;
}

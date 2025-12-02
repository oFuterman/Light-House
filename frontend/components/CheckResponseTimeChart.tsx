"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { CheckResult } from "@/lib/api";

interface ChartDataPoint {
  timestamp: number;
  responseTime: number;
  isSuccess: boolean;
  statusCode: number;
  formattedTime: string;
}

interface CheckResponseTimeChartProps {
  results: CheckResult[];
  height?: number;
}

export function CheckResponseTimeChart({
  results,
  height = 300,
}: CheckResponseTimeChartProps) {
  // Transform and sort data chronologically
  const chartData: ChartDataPoint[] = results
    .map((r) => ({
      timestamp: new Date(r.created_at).getTime(),
      responseTime: r.response_time_ms,
      isSuccess: r.status_code >= 200 && r.status_code < 300,
      statusCode: r.status_code,
      formattedTime: new Date(r.created_at).toLocaleString(),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  // Separate failed points for distinct rendering
  const failedPoints = chartData.filter((d) => !d.isSuccess);

  const formatXAxis = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }> }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-white border rounded shadow-lg p-3 text-sm">
        <p className="font-medium">{data.formattedTime}</p>
        <p>Response: {data.responseTime}ms</p>
        <p className={data.isSuccess ? "text-green-600" : "text-red-600"}>
          Status: {data.statusCode}
        </p>
      </div>
    );
  };

  if (results.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-500" style={{ height }}>
        No data available for this time period
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={chartData}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={formatXAxis}
          stroke="#6b7280"
          fontSize={12}
        />
        <YAxis
          dataKey="responseTime"
          stroke="#6b7280"
          fontSize={12}
          tickFormatter={(v) => `${v}ms`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="responseTime"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#3b82f6" }}
        />
        {/* Render failed requests as red dots */}
        {failedPoints.map((point) => (
          <ReferenceDot
            key={point.timestamp}
            x={point.timestamp}
            y={point.responseTime}
            r={5}
            fill="#ef4444"
            stroke="#fff"
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

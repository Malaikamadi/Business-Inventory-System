"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCurrency, formatCurrency, truncate } from "@/lib/utils";
import type { ShopPerformance } from "@/types";
import { ClientChartFrame } from "./client-chart-frame";

export function ShopPerformanceChart({ data }: { data: ShopPerformance[] }) {
  const height = Math.max(200, data.length * 48);

  return (
    <ClientChartFrame height={height}>
      <ResponsiveContainer width="100%" height={height} minWidth={1} minHeight={1}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickFormatter={(value: number) => formatCompactCurrency(value)}
        />
        <YAxis
          type="category"
          dataKey="shopName"
          tickLine={false}
          axisLine={false}
          width={110}
          tick={{ fontSize: 12, fill: "#475569" }}
          tickFormatter={(value: string) => truncate(value, 16)}
        />
        <Tooltip
          cursor={{ fill: "#f1f5f9" }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            fontSize: 12,
          }}
          formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
        />
        <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
    </ClientChartFrame>
  );
}

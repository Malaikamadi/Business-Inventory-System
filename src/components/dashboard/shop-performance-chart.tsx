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

export function ShopPerformanceChart({ data }: { data: ShopPerformance[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 48)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="0" stroke="#121212" strokeOpacity={0.12} horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#7a7468" }}
          tickFormatter={(value: number) => formatCompactCurrency(value)}
        />
        <YAxis
          type="category"
          dataKey="shopName"
          tickLine={false}
          axisLine={false}
          width={110}
          tick={{ fontSize: 12, fill: "#121212" }}
          tickFormatter={(value: string) => truncate(value, 16)}
        />
        <Tooltip
          cursor={{ fill: "#c8f04d", fillOpacity: 0.25 }}
          contentStyle={{
            borderRadius: 16,
            border: "2px solid #121212",
            background: "#fffcf7",
            fontSize: 12,
            boxShadow: "4px 4px 0 0 #121212",
          }}
          formatter={(value) => [formatCurrency(Number(value)), "revenue"]}
        />
        <Bar dataKey="revenue" fill="#c8f04d" stroke="#121212" strokeWidth={2} radius={[0, 8, 8, 0]} barSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

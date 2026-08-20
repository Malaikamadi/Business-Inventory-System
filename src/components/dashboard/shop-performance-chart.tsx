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
import { formatCurrency, truncate } from "@/lib/utils";
import type { ShopPerformance } from "@/types";

export function ShopPerformanceChart({ data }: { data: ShopPerformance[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 48)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "hsl(215 14% 65%)" }}
          tickFormatter={(value: number) =>
            value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)
          }
        />
        <YAxis
          type="category"
          dataKey="shopName"
          tickLine={false}
          axisLine={false}
          width={110}
          tick={{ fontSize: 12, fill: "hsl(215 16% 47%)" }}
          tickFormatter={(value: string) => truncate(value, 16)}
        />
        <Tooltip
          cursor={{ fill: "hsl(210 20% 96%)" }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(220 13% 91%)",
            fontSize: 12,
          }}
          formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
        />
        <Bar dataKey="revenue" fill="hsl(217 91% 60%)" radius={[0, 4, 4, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

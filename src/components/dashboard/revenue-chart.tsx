"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";
import type { SalesDataPoint } from "@/types";

function shortDate(iso: string) {
  const [, month, day] = iso.split("-");
  return `${month}/${day}`;
}

export function RevenueChart({ data }: { data: SalesDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8f04d" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#c8f04d" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="0" stroke="#121212" strokeOpacity={0.12} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#7a7468" }}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#7a7468" }}
          width={72}
          tickFormatter={(value: number) => formatCompactCurrency(value)}
        />
        <Tooltip
          cursor={{ stroke: "#121212", strokeWidth: 1 }}
          contentStyle={{
            borderRadius: 16,
            border: "2px solid #121212",
            background: "#fffcf7",
            fontSize: 12,
            boxShadow: "4px 4px 0 0 #121212",
          }}
          formatter={(value) => [formatCurrency(Number(value)), "revenue"]}
          labelFormatter={(label) =>
            new Date(`${String(label)}T00:00:00`).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })
          }
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#121212"
          strokeWidth={2}
          fill="url(#revenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

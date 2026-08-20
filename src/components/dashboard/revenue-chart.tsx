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
import { formatCurrency } from "@/lib/utils";
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
            <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "hsl(215 14% 65%)" }}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "hsl(215 14% 65%)" }}
          width={64}
          tickFormatter={(value: number) =>
            value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)
          }
        />
        <Tooltip
          cursor={{ stroke: "hsl(220 13% 91%)" }}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid hsl(220 13% 91%)",
            fontSize: 12,
          }}
          formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
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
          stroke="hsl(217 91% 60%)"
          strokeWidth={2}
          fill="url(#revenueFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

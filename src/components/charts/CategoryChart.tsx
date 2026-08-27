"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";

const BLUE = "#2a78d6";

export function CategoryChart({ data }: { data: { name: string; total: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted text-center py-10">Sin ventas este mes.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="#e1e0d9" />
        <XAxis type="number" tick={{ fontSize: 12, fill: "#898781" }} axisLine={{ stroke: "#c3c2b7" }} tickLine={false} tickFormatter={(v: number) => `S/${v}`} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#0b0b0b" }} axisLine={false} tickLine={false} width={110} />
        <Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={{ borderRadius: 8, border: "1px solid #e1e0d9", fontSize: 13 }} />
        <Bar dataKey="total" fill={BLUE} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

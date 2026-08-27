"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/lib/money";

// Categorical slots in fixed order (validated palette — see dataviz skill).
const CATEGORICAL = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#4a3aa7"];

export function PaymentMethodChart({ data }: { data: { name: string; total: number }[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted text-center py-10">Sin ventas este mes.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="total" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={CATEGORICAL[i % CATEGORICAL.length]} stroke="#fcfcfb" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatMoney(Number(value))} contentStyle={{ borderRadius: 8, border: "1px solid #e1e0d9", fontSize: 13 }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#52514e" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

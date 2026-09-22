"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type TrendPoint = { date: string; newLeads: number; converted: number };

export function LeadTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Lead Trend — Last 7 Days</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="newLeads" stroke="#3b82f6" strokeWidth={2} name="New Leads" />
            <Line type="monotone" dataKey="converted" stroke="#10b981" strokeWidth={2} name="Converted" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
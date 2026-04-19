"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Percent,
} from "lucide-react";
import Header from "@/components/Header";
import SummaryCard from "@/components/SummaryCard";
import { getDebtors, getSummary } from "@/lib/store";
import { formatCurrency, isOverdue } from "@/lib/calculator";
import type { Debtor, DebtSummary } from "@/types";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

export default function ReportsPage() {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [summary, setSummary] = useState<DebtSummary>({
    totalLent: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    totalInterestEarned: 0,
    overdueCount: 0,
    dueSoonCount: 0,
  });

  useEffect(() => {
    setDebtors(getDebtors());
    setSummary(getSummary());
  }, []);

  const paidCount = debtors.filter((d) => d.amountPaid >= d.totalAmount).length;
  const overdueCount = debtors.filter(
    (d) => isOverdue(d.dueDate) && d.amountPaid < d.totalAmount
  ).length;
  const activeCount = debtors.length - paidCount - overdueCount;

  const pieData = [
    { name: "ยังค้างอยู่", value: activeCount },
    { name: "ชำระแล้ว", value: paidCount },
    { name: "เกินกำหนด", value: overdueCount },
  ].filter((d) => d.value > 0);

  const barData = debtors.slice(0, 6).map((d) => ({
    name: d.name.length > 8 ? d.name.slice(0, 8) + "…" : d.name,
    ปล่อยกู้: d.principalAmount,
    ชำระแล้ว: d.amountPaid,
    คงเหลือ: Math.max(0, d.totalAmount - d.amountPaid),
  }));

  const collectionRate =
    summary.totalLent > 0
      ? Math.round((summary.totalCollected / summary.totalLent) * 100)
      : 0;

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-blue-100 text-sm">
          <p className="font-bold text-gray-700 mb-1">{label}</p>
          {payload.map((p) => (
            <p key={p.name} style={{ color: p.color }} className="font-semibold">
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Header title="รายงาน" />
      <div className="px-4 pt-5 space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="เงินปล่อยกู้ทั้งหมด"
            value={formatCurrency(summary.totalLent)}
            icon={<TrendingUp size={22} />}
            colorClass="text-blue-700"
            bgClass="bg-blue-50"
          />
          <SummaryCard
            label="เงินที่รับแล้ว"
            value={formatCurrency(summary.totalCollected)}
            icon={<TrendingDown size={22} />}
            colorClass="text-green-700"
            bgClass="bg-green-50"
          />
          <SummaryCard
            label="ยอดค้างชำระ"
            value={formatCurrency(summary.totalOutstanding)}
            icon={<AlertCircle size={22} />}
            colorClass="text-amber-700"
            bgClass="bg-amber-50"
          />
          <SummaryCard
            label="ดอกเบี้ยที่ได้รับ"
            value={formatCurrency(summary.totalInterestEarned)}
            icon={<DollarSign size={22} />}
            colorClass="text-purple-700"
            bgClass="bg-purple-50"
          />
        </div>

        {/* Collection Rate */}
        {debtors.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-gray-700 flex items-center gap-2">
                <Percent size={18} className="text-blue-500" />
                อัตราการเก็บเงิน
              </h2>
              <span className="text-2xl font-extrabold text-blue-600">
                {collectionRate}%
              </span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${collectionRate}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-400 mt-2">
              <span>฿0</span>
              <span>{formatCurrency(summary.totalLent)}</span>
            </div>
          </div>
        )}

        {/* Debtor Status Pie */}
        {debtors.length > 0 && pieData.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
            <h2 className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-500" />
              สถานะลูกหนี้
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-sm font-semibold">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-gray-600">
                    {entry.name} ({entry.value})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-Debtor Bar Chart */}
        {barData.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
            <h2 className="text-base font-bold text-gray-700 mb-3">
              สรุปรายลูกหนี้
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={barData}
                margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f0f7ff" }} />
                <Legend wrapperStyle={{ fontSize: "13px", fontWeight: 600 }} />
                <Bar dataKey="ปล่อยกู้" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="ชำระแล้ว" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="คงเหลือ" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {debtors.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-blue-100">
            <TrendingUp size={48} className="text-blue-200 mx-auto mb-3" />
            <p className="text-gray-400 font-medium text-lg">
              ยังไม่มีข้อมูล เพิ่มลูกหนี้เพื่อดูรายงาน
            </p>
          </div>
        )}

        <div className="h-4" />
      </div>
    </>
  );
}

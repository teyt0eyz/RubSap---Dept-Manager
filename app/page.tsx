"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  DollarSign,
  Users,
} from "lucide-react";
import Header from "@/components/Header";
import SummaryCard from "@/components/SummaryCard";
import DebtorCard from "@/components/DebtorCard";
import { getDebtors, getSummary } from "@/lib/store";
import { formatCurrency, isOverdue, isDueSoon } from "@/lib/calculator";
import type { Debtor, DebtSummary } from "@/types";
import Link from "next/link";

export default function DashboardPage() {
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

  const overdueDebtors = debtors.filter(
    (d) => isOverdue(d.dueDate) && d.amountPaid < d.totalAmount
  );
  const dueSoonDebtors = debtors.filter(
    (d) =>
      !isOverdue(d.dueDate) &&
      isDueSoon(d.dueDate) &&
      d.amountPaid < d.totalAmount
  );
  const recentDebtors = debtors.slice(0, 3);

  const chartData = [
    { name: "ปล่อยกู้", value: summary.totalLent, color: "#3b82f6" },
    { name: "รับแล้ว", value: summary.totalCollected, color: "#22c55e" },
    { name: "ค้างอยู่", value: summary.totalOutstanding, color: "#f59e0b" },
  ];

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-blue-100 text-sm font-semibold text-gray-700">
          {formatCurrency(payload[0].value)}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Header title="หน้าหลัก" />
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
            icon={<DollarSign size={22} />}
            colorClass="text-amber-700"
            bgClass="bg-amber-50"
          />
          <SummaryCard
            label="จำนวนลูกหนี้"
            value={String(debtors.length) + " คน"}
            icon={<Users size={22} />}
            colorClass="text-purple-700"
            bgClass="bg-purple-50"
          />
        </div>

        {/* Bar Chart */}
        {debtors.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              ภาพรวมการเงิน
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 13, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f0f7ff" }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Reminders */}
        {(overdueDebtors.length > 0 || dueSoonDebtors.length > 0) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-100">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <AlertCircle size={20} className="text-red-500" />
              การแจ้งเตือน
            </h2>

            {overdueDebtors.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-bold text-red-600 mb-2 uppercase tracking-wide">
                  เกินกำหนด ({overdueDebtors.length})
                </p>
                {overdueDebtors.map((d) => (
                  <Link key={d.id} href={`/debtors/${d.id}`}>
                    <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl p-3 mb-2 active:bg-red-100">
                      <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                        <span className="font-semibold text-gray-800">{d.name}</span>
                      </div>
                      <span className="text-sm font-bold text-red-600">
                        {formatCurrency(d.totalAmount - d.amountPaid)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {dueSoonDebtors.length > 0 && (
              <div>
                <p className="text-sm font-bold text-amber-600 mb-2 uppercase tracking-wide">
                  ใกล้ครบกำหนด ({dueSoonDebtors.length})
                </p>
                {dueSoonDebtors.map((d) => (
                  <Link key={d.id} href={`/debtors/${d.id}`}>
                    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-3 mb-2 active:bg-amber-100">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-amber-500 flex-shrink-0" />
                        <span className="font-semibold text-gray-800">{d.name}</span>
                      </div>
                      <span className="text-sm font-bold text-amber-700">
                        {formatCurrency(d.totalAmount - d.amountPaid)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Debtors */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800">ลูกหนี้ล่าสุด</h2>
            <Link
              href="/debtors"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              ดูทั้งหมด
            </Link>
          </div>

          {debtors.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-blue-100">
              <Users size={48} className="text-blue-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium text-lg">ยังไม่มีลูกหนี้</p>
              <p className="text-gray-400 text-sm mt-1">กดเพิ่มเพื่อเพิ่มลูกหนี้คนแรก</p>
              <Link
                href="/add-debt"
                className="mt-4 inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold text-base hover:bg-blue-700 transition-colors"
              >
                + เพิ่มลูกหนี้
              </Link>
            </div>
          ) : (
            recentDebtors.map((d) => <DebtorCard key={d.id} debtor={d} />)
          )}
        </div>
      </div>
    </>
  );
}

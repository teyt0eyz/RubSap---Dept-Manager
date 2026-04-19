"use client";

import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2,
  DollarSign, Percent, ChevronLeft, ChevronRight, BarChart2, Calendar, Star,
} from "lucide-react";
import Header from "@/components/Header";
import SummaryCard from "@/components/SummaryCard";
import { getDebtors, getSummary, getPayments, getMonthlyStats, type MonthlyStats } from "@/lib/store";
import { formatCurrency, isOverdue } from "@/lib/calculator";
import { analyzeCreditTag, creditBadgeCls, type CreditTag } from "@/lib/credit";
import type { Debtor, Payment } from "@/types";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

type Tab = "overview" | "monthly" | "credit";

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [creditFilter, setCreditFilter] = useState<CreditTag | "all">("all");

  useEffect(() => {
    setDebtors(getDebtors());
    setPayments(getPayments());
    setMonthlyStats(getMonthlyStats());
  }, []);

  const paidCount = debtors.filter((d) => d.amountPaid >= d.totalAmount).length;
  const overdueCount = debtors.filter((d) => isOverdue(d.dueDate) && d.amountPaid < d.totalAmount).length;
  const activeCount = debtors.length - paidCount - overdueCount;

  const sum = getSummary();

  const collectionRate = sum.totalLent > 0 ? Math.round((sum.totalCollected / sum.totalLent) * 100) : 0;

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

  // ── Monthly tab data ─────────────────────────────────────────────────────────
  const yearStats = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return monthlyStats.find((s) => s.year === selectedYear && s.month === m) ?? {
      year: selectedYear, month: m,
      lentAmount: 0, expectedInterest: 0,
      actualCollected: 0, estimatedInterestCollected: 0, newDebtorCount: 0,
    };
  });

  const yearTotalLent = yearStats.reduce((s, m) => s + m.lentAmount, 0);
  const yearTotalExpectedInterest = yearStats.reduce((s, m) => s + m.expectedInterest, 0);
  const yearTotalCollected = yearStats.reduce((s, m) => s + m.actualCollected, 0);
  const yearTotalEstInterest = yearStats.reduce((s, m) => s + m.estimatedInterestCollected, 0);

  const availableYears = Array.from(new Set(monthlyStats.map((s) => s.year))).sort();
  const nowYear = new Date().getFullYear();
  const nowMonth = new Date().getMonth() + 1;

  // ── Credit tab data ──────────────────────────────────────────────────────────
  const creditList = debtors.map((d) => ({ debtor: d, info: analyzeCreditTag(d, payments) }));
  const filteredCredit = creditList.filter((c) => creditFilter === "all" || c.info.tag === creditFilter);

  const creditCounts: Record<CreditTag | "all", number> = {
    all: creditList.length,
    excellent: creditList.filter((c) => c.info.tag === "excellent").length,
    good: creditList.filter((c) => c.info.tag === "good").length,
    slow: creditList.filter((c) => c.info.tag === "slow").length,
    bad: creditList.filter((c) => c.info.tag === "bad").length,
    new: creditList.filter((c) => c.info.tag === "new").length,
  };

  const creditFilterOptions: { key: CreditTag | "all"; label: string }[] = [
    { key: "all",       label: `ทั้งหมด (${creditCounts.all})` },
    { key: "excellent", label: `ดีเยี่ยม (${creditCounts.excellent})` },
    { key: "good",      label: `ดี (${creditCounts.good})` },
    { key: "slow",      label: `ช้า (${creditCounts.slow})` },
    { key: "bad",       label: `ไม่ดี (${creditCounts.bad})` },
    { key: "new",       label: `ใหม่ (${creditCounts.new})` },
  ];

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload?.length) {
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
      <div className="px-4 pt-4">
        {/* Tab bar */}
        <div className="flex rounded-xl border-2 border-blue-100 overflow-hidden mb-5">
          {([
            { key: "overview", label: "ภาพรวม",  Icon: BarChart2 },
            { key: "monthly",  label: "รายเดือน", Icon: Calendar  },
            { key: "credit",   label: "เครดิต",   Icon: Star      },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${
                tab === key ? "bg-blue-600 text-white" : "bg-white text-gray-500 hover:bg-blue-50"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* ── ภาพรวม ────────────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard label="เงินปล่อยกู้ทั้งหมด" value={formatCurrency(sum.totalLent)}
                icon={<TrendingUp size={22} />} colorClass="text-blue-700" bgClass="bg-blue-50" />
              <SummaryCard label="เงินที่รับแล้ว" value={formatCurrency(sum.totalCollected)}
                icon={<TrendingDown size={22} />} colorClass="text-green-700" bgClass="bg-green-50" />
              <SummaryCard label="ยอดค้างชำระ" value={formatCurrency(sum.totalOutstanding)}
                icon={<AlertCircle size={22} />} colorClass="text-amber-700" bgClass="bg-amber-50" />
              <SummaryCard label="ดอกเบี้ยที่ได้รับ" value={formatCurrency(sum.totalInterestEarned)}
                icon={<DollarSign size={22} />} colorClass="text-purple-700" bgClass="bg-purple-50" />
            </div>

            {debtors.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-gray-700 flex items-center gap-2">
                    <Percent size={18} className="text-blue-500" />อัตราการเก็บเงิน
                  </h2>
                  <span className="text-2xl font-extrabold text-blue-600">{collectionRate}%</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${collectionRate}%` }} />
                </div>
              </div>
            )}

            {pieData.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
                <h2 className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-500" />สถานะลูกหนี้
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                      paddingAngle={3} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {pieData.map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-1.5 text-sm font-semibold">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-600">{entry.name} ({entry.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {barData.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
                <h2 className="text-base font-bold text-gray-700 mb-3">สรุปรายลูกหนี้</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f0f7ff" }} />
                    <Legend wrapperStyle={{ fontSize: "13px", fontWeight: 600 }} />
                    <Bar dataKey="ปล่อยกู้" fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={28} />
                    <Bar dataKey="ชำระแล้ว" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={28} />
                    <Bar dataKey="คงเหลือ"  fill="#f59e0b" radius={[4,4,0,0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {debtors.length === 0 && (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-blue-100">
                <TrendingUp size={48} className="text-blue-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium text-lg">ยังไม่มีข้อมูล เพิ่มลูกหนี้เพื่อดูรายงาน</p>
              </div>
            )}
          </div>
        )}

        {/* ── รายเดือน ──────────────────────────────────────────────────────── */}
        {tab === "monthly" && (
          <div className="space-y-4">
            {/* Year selector */}
            <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-blue-100">
              <button
                onClick={() => setSelectedYear((y) => y - 1)}
                className="p-2 rounded-xl hover:bg-blue-50 transition-colors"
              >
                <ChevronLeft size={22} className="text-blue-600" />
              </button>
              <div className="text-center">
                <p className="text-xl font-extrabold text-blue-800">ปี {selectedYear + 543}</p>
                <p className="text-xs text-gray-400">({selectedYear})</p>
              </div>
              <button
                onClick={() => setSelectedYear((y) => y + 1)}
                className="p-2 rounded-xl hover:bg-blue-50 transition-colors"
              >
                <ChevronRight size={22} className="text-blue-600" />
              </button>
            </div>

            {/* Year summary row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-600 text-white rounded-2xl p-4">
                <p className="text-xs opacity-80">ให้ยืมทั้งปี</p>
                <p className="text-lg font-extrabold mt-1">{formatCurrency(yearTotalLent)}</p>
              </div>
              <div className="bg-green-600 text-white rounded-2xl p-4">
                <p className="text-xs opacity-80">เก็บได้ทั้งปี</p>
                <p className="text-lg font-extrabold mt-1">{formatCurrency(yearTotalCollected)}</p>
              </div>
              <div className="bg-purple-600 text-white rounded-2xl p-4">
                <p className="text-xs opacity-80">ดอกเบี้ยที่ควรได้</p>
                <p className="text-lg font-extrabold mt-1">{formatCurrency(yearTotalExpectedInterest)}</p>
              </div>
              <div className="bg-amber-500 text-white rounded-2xl p-4">
                <p className="text-xs opacity-80">ดอกเบี้ยที่ได้จริง (ประมาณ)</p>
                <p className="text-lg font-extrabold mt-1">{formatCurrency(yearTotalEstInterest)}</p>
              </div>
            </div>

            {/* Month cards */}
            <div className="space-y-2">
              {yearStats.map((s) => {
                const isCurrent = s.year === nowYear && s.month === nowMonth;
                const hasTx = s.lentAmount > 0 || s.actualCollected > 0 || s.expectedInterest > 0;
                const interestGap = s.expectedInterest - s.estimatedInterestCollected;
                return (
                  <div
                    key={s.month}
                    className={`bg-white rounded-2xl p-4 shadow-sm border-2 transition-colors ${
                      isCurrent ? "border-blue-400" : hasTx ? "border-blue-100" : "border-gray-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-base font-extrabold ${isCurrent ? "text-blue-700" : "text-gray-700"}`}>
                          {THAI_MONTHS[s.month - 1]}
                        </span>
                        {isCurrent && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                            เดือนนี้
                          </span>
                        )}
                        {s.newDebtorCount > 0 && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                            +{s.newDebtorCount} คน
                          </span>
                        )}
                      </div>
                      {hasTx ? (
                        <span className="text-sm font-bold text-green-700">
                          เก็บได้ {formatCurrency(s.actualCollected)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-300">ไม่มีรายการ</span>
                      )}
                    </div>

                    {hasTx && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                        <StatRow label="ให้ยืม" value={formatCurrency(s.lentAmount)} color="text-blue-700" />
                        <StatRow label="ดอกเบี้ยที่ควรได้" value={formatCurrency(s.expectedInterest)} color="text-purple-700" />
                        <StatRow label="ดอกเบี้ยที่ได้จริง" value={formatCurrency(s.estimatedInterestCollected)} color="text-green-700" />
                        {interestGap > 0.01 && (
                          <StatRow label="ค้างดอกเบี้ย" value={formatCurrency(interestGap)} color="text-red-600" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {availableYears.length === 0 && (
              <p className="text-center text-gray-400 py-8">ยังไม่มีข้อมูล เพิ่มลูกหนี้เพื่อดูรายงานรายเดือน</p>
            )}
          </div>
        )}

        {/* ── เครดิต ────────────────────────────────────────────────────────── */}
        {tab === "credit" && (
          <div className="space-y-4">
            {/* Credit legend */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100 space-y-2">
              <p className="font-bold text-gray-700 text-sm mb-3">เกณฑ์การประเมินเครดิต</p>
              {[
                { tag: "excellent" as CreditTag, label: "ดีเยี่ยม", desc: "จ่ายตรงเวลา 90%+" },
                { tag: "good"      as CreditTag, label: "ดี",       desc: "จ่ายตรงเวลา 70–89%" },
                { tag: "slow"      as CreditTag, label: "จ่ายช้า", desc: "จ่ายตรงเวลา 40–69%" },
                { tag: "bad"       as CreditTag, label: "ไม่ดี",   desc: "จ่ายตรงเวลา <40% หรือค้างชำระ" },
                { tag: "new"       as CreditTag, label: "ใหม่",    desc: "ยังไม่มีประวัติการจ่าย" },
              ].map(({ tag, label, desc }) => (
                <div key={tag} className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${creditBadgeCls(tag)}`}>{label}</span>
                  <span className="text-xs text-gray-500">{desc}</span>
                </div>
              ))}
            </div>

            {/* Filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {creditFilterOptions.filter((o) => creditCounts[o.key] > 0 || o.key === "all").map((o) => (
                <button
                  key={o.key}
                  onClick={() => setCreditFilter(o.key)}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-colors ${
                    creditFilter === o.key
                      ? o.key !== "all" ? `${creditBadgeCls(o.key)} border-current` : "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-500 border-gray-200 hover:border-blue-300"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Debtor credit cards */}
            {filteredCredit.length === 0 ? (
              <p className="text-center text-gray-400 py-8">ไม่มีข้อมูล</p>
            ) : (
              filteredCredit.map(({ debtor: d, info }) => {
                const balance = parseFloat((d.totalAmount - d.amountPaid).toFixed(2));
                const paid = balance <= 0;
                return (
                  <div key={d.id} className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {d.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{d.name}</p>
                          <p className="text-xs text-gray-400">{paid ? "ชำระครบแล้ว" : `ค้าง ${formatCurrency(balance)}`}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-extrabold px-3 py-1.5 rounded-full border-2 ${creditBadgeCls(info.tag)}`}>
                        {info.label}
                      </span>
                    </div>

                    {(info.onTimeCount + info.lateCount) > 0 ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>จ่ายตรงเวลา {info.onTimeCount} รอบ</span>
                          <span>จ่ายช้า {info.lateCount} รอบ</span>
                          <span className="font-bold text-gray-700">{info.onTimePct}% ตรงเวลา</span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              info.tag === "excellent" ? "bg-emerald-500"
                              : info.tag === "good" ? "bg-blue-500"
                              : info.tag === "slow" ? "bg-amber-400"
                              : "bg-red-500"
                            }`}
                            style={{ width: `${info.onTimePct}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">
                        {info.tag === "new" ? "ยังไม่มีประวัติการจ่าย" : "ค้างชำระ ยังไม่มีการจ่ายที่ตรวจสอบได้"}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        <div className="h-4" />
      </div>
    </>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}

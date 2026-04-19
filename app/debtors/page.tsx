"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Users, History } from "lucide-react";
import Header from "@/components/Header";
import DebtorCard from "@/components/DebtorCard";
import { getDebtors, getPayments } from "@/lib/store";
import { analyzeCreditTag, type CreditInfo } from "@/lib/credit";
import type { Debtor, Payment } from "@/types";
import Link from "next/link";

type ActiveFilter = "all" | "overdue" | "active";
type MainTab = "current" | "history";

export default function DebtorsPage() {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [mainTab, setMainTab] = useState<MainTab>("current");

  useEffect(() => {
    setDebtors(getDebtors());
    setPayments(getPayments());
  }, []);

  const now = new Date();

  const creditMap = new Map<string, CreditInfo>(
    debtors.map((d) => [d.id, analyzeCreditTag(d, payments)])
  );

  const activeDebtors = debtors.filter((d) => d.totalAmount - d.amountPaid > 0.01);
  const paidDebtors = debtors.filter((d) => d.totalAmount - d.amountPaid <= 0.01);

  const filteredActive = activeDebtors.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const balance = d.totalAmount - d.amountPaid;
    const overdue = new Date(d.dueDate) < now && balance > 0;
    switch (activeFilter) {
      case "overdue": return matchSearch && overdue;
      case "active":  return matchSearch && !overdue;
      default:        return matchSearch;
    }
  });

  const filteredPaid = paidDebtors.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const overdueCount = activeDebtors.filter((d) => new Date(d.dueDate) < now).length;

  const filterLabels: Record<ActiveFilter, string> = {
    all:     `ทั้งหมด (${activeDebtors.length})`,
    overdue: `เกินกำหนด (${overdueCount})`,
    active:  `ปกติ`,
  };

  return (
    <>
      <Header title="ลูกหนี้" />
      <div className="px-4 pt-5 space-y-4">

        {/* Main tabs */}
        <div className="flex rounded-xl border-2 border-blue-100 overflow-hidden">
          <button
            onClick={() => setMainTab("current")}
            className={`flex-1 py-3 text-base font-bold transition-colors flex items-center justify-center gap-2 ${
              mainTab === "current"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-500 hover:bg-blue-50"
            }`}
          >
            <Users size={18} />
            ปัจจุบัน ({activeDebtors.length})
          </button>
          <button
            onClick={() => setMainTab("history")}
            className={`flex-1 py-3 text-base font-bold transition-colors flex items-center justify-center gap-2 ${
              mainTab === "history"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-500 hover:bg-green-50"
            }`}
          >
            <History size={18} />
            ประวัติ ({paidDebtors.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="ค้นหาด้วยชื่อ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-white text-lg focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* Active filter tabs (current tab only) */}
        {mainTab === "current" && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(Object.keys(filterLabels) as ActiveFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                  activeFilter === f
                    ? f === "overdue" ? "bg-red-500 text-white border-red-500"
                      : "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-500 border-gray-200 hover:border-blue-300"
                }`}
              >
                {filterLabels[f]}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        {mainTab === "current" ? (
          filteredActive.length === 0 ? (
            <EmptyState search={search} />
          ) : (
            filteredActive.map((d) => (
              <DebtorCard key={d.id} debtor={d} creditInfo={creditMap.get(d.id)} />
            ))
          )
        ) : (
          filteredPaid.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-green-100">
              <History size={48} className="text-green-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium text-lg">
                {search ? `ไม่พบ "${search}"` : "ยังไม่มีลูกหนี้ที่ชำระครบ"}
              </p>
            </div>
          ) : (
            filteredPaid.map((d) => (
              <DebtorCard key={d.id} debtor={d} creditInfo={creditMap.get(d.id)} />
            ))
          )
        )}
      </div>

      {/* FAB */}
      <Link
        href="/add-debt"
        className="fixed bottom-24 right-5 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center z-30 transition-transform active:scale-95"
        aria-label="เพิ่มลูกหนี้"
      >
        <Plus size={28} />
      </Link>
    </>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-blue-100">
      <Users size={48} className="text-blue-200 mx-auto mb-3" />
      <p className="text-gray-500 font-medium text-lg">
        {search ? `ไม่พบ "${search}"` : "ยังไม่มีลูกหนี้"}
      </p>
      {!search && (
        <Link
          href="/add-debt"
          className="mt-4 inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold text-base hover:bg-blue-700 transition-colors"
        >
          + เพิ่มลูกหนี้คนแรก
        </Link>
      )}
    </div>
  );
}

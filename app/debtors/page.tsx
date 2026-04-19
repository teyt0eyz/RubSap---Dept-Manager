"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Users, SlidersHorizontal } from "lucide-react";
import Header from "@/components/Header";
import DebtorCard from "@/components/DebtorCard";
import { getDebtors } from "@/lib/store";
import type { Debtor } from "@/types";
import Link from "next/link";

type Filter = "all" | "active" | "overdue" | "paid";

export default function DebtorsPage() {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    setDebtors(getDebtors());
  }, []);

  const now = new Date();

  const filtered = debtors.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const balance = d.totalAmount - d.amountPaid;
    const overdue = new Date(d.dueDate) < now && balance > 0;
    const paid = balance <= 0;
    const active = !overdue && !paid;

    switch (filter) {
      case "active":
        return matchSearch && active;
      case "overdue":
        return matchSearch && overdue;
      case "paid":
        return matchSearch && paid;
      default:
        return matchSearch;
    }
  });

  const filterLabels: Record<Filter, string> = {
    all: `All (${debtors.length})`,
    active: `Active`,
    overdue: `Overdue`,
    paid: `Paid`,
  };

  return (
    <>
      <Header title="Debtors" />
      <div className="px-4 pt-5 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-white text-lg focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <SlidersHorizontal size={18} className="text-gray-400 flex-shrink-0 mt-2.5" />
          {(Object.keys(filterLabels) as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-500 border-gray-200 hover:border-blue-300"
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-blue-100">
            <Users size={48} className="text-blue-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium text-lg">
              {search ? `No results for "${search}"` : "No debtors yet"}
            </p>
            {!search && (
              <Link
                href="/add-debt"
                className="mt-4 inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold text-base hover:bg-blue-700 transition-colors"
              >
                + Add First Debtor
              </Link>
            )}
          </div>
        ) : (
          filtered.map((d) => <DebtorCard key={d.id} debtor={d} />)
        )}
      </div>

      {/* FAB */}
      <Link
        href="/add-debt"
        className="fixed bottom-24 right-5 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center z-30 transition-transform active:scale-95"
        aria-label="Add debtor"
      >
        <Plus size={28} />
      </Link>
    </>
  );
}

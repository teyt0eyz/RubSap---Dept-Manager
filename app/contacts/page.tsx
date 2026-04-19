"use client";

import { useEffect, useState } from "react";
import { Search, ChevronDown, ChevronRight, Plus, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import Header from "@/components/Header";
import { getDebtors, getPayments } from "@/lib/store";
import { analyzeCreditTag, creditBadgeCls } from "@/lib/credit";
import { formatCurrency, formatDate, isOverdue } from "@/lib/calculator";
import type { Debtor, Payment } from "@/types";
import Link from "next/link";

interface Contact {
  name: string;
  debtors: Debtor[];
  activeBalance: number;
  hasActive: boolean;
}

function buildContacts(debtors: Debtor[]): Contact[] {
  const map = new Map<string, Debtor[]>();
  for (const d of debtors) {
    const list = map.get(d.name) ?? [];
    list.push(d);
    map.set(d.name, list);
  }
  return Array.from(map.entries())
    .map(([name, ds]) => {
      const activeBalance = ds.reduce((s, d) => s + Math.max(0, d.totalAmount - d.amountPaid), 0);
      return { name, debtors: ds.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), activeBalance, hasActive: activeBalance > 0 };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "th"));
}

export default function ContactsPage() {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setDebtors(getDebtors());
    setPayments(getPayments());
  }, []);

  const contacts = buildContacts(debtors);
  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const letters = Array.from(new Set(filtered.map((c) => c.name.charAt(0).toUpperCase()))).sort();

  return (
    <>
      <Header title="สมุดรายชื่อ" />
      <div className="px-4 pt-5 space-y-4">

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-600 text-white rounded-2xl p-4">
            <p className="text-xs opacity-80">ลูกหนี้ทั้งหมด</p>
            <p className="text-2xl font-extrabold">{contacts.length} คน</p>
          </div>
          <div className="bg-amber-500 text-white rounded-2xl p-4">
            <p className="text-xs opacity-80">ยังค้างอยู่</p>
            <p className="text-2xl font-extrabold">
              {contacts.filter((c) => c.hasActive).length} คน
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="ค้นหาชื่อ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 bg-white text-lg focus:outline-none focus:border-blue-400"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-blue-100">
            <p className="text-gray-400 text-lg font-medium">
              {search ? `ไม่พบ "${search}"` : "ยังไม่มีลูกหนี้"}
            </p>
          </div>
        ) : (
          letters.map((letter) => {
            const group = filtered.filter((c) => c.name.charAt(0).toUpperCase() === letter);
            return (
              <div key={letter}>
                {/* Letter divider */}
                <div className="px-1 py-1 mb-1">
                  <span className="text-xs font-extrabold text-blue-400 uppercase tracking-widest">{letter}</span>
                </div>
                {group.map((contact) => {
                  const isOpen = expanded === contact.name;
                  const allPayments = payments.filter((p) =>
                    contact.debtors.some((d) => d.id === p.debtorId)
                  );
                  const creditInfo = analyzeCreditTag(
                    contact.debtors[0],
                    allPayments
                  );

                  return (
                    <div key={contact.name} className="bg-white rounded-2xl shadow-sm border border-blue-100 mb-2 overflow-hidden">
                      {/* Contact row */}
                      <button
                        onClick={() => setExpanded(isOpen ? null : contact.name)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 transition-colors"
                      >
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg font-bold text-gray-800">{contact.name}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${creditBadgeCls(creditInfo.tag)}`}>
                              {creditInfo.label}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {contact.debtors.length} สัญญา · {" "}
                            {contact.hasActive
                              ? <span className="text-amber-600 font-semibold">ค้าง {formatCurrency(contact.activeBalance)}</span>
                              : <span className="text-green-600 font-semibold">ชำระครบแล้ว</span>
                            }
                          </div>
                        </div>

                        {/* Chevron */}
                        {isOpen
                          ? <ChevronDown size={20} className="text-blue-400 flex-shrink-0" />
                          : <ChevronRight size={20} className="text-gray-300 flex-shrink-0" />
                        }
                      </button>

                      {/* Expanded loan list */}
                      {isOpen && (
                        <div className="border-t border-blue-50">
                          {contact.debtors.map((d) => {
                            const bal = parseFloat((d.totalAmount - d.amountPaid).toFixed(2));
                            const done = bal <= 0;
                            const over = !done && isOverdue(d.dueDate);
                            return (
                              <Link
                                key={d.id}
                                href={`/debtors/${d.id}`}
                                className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                              >
                                <div className="flex items-center gap-2">
                                  {done
                                    ? <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                                    : over
                                    ? <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                                    : <Clock size={16} className="text-blue-400 flex-shrink-0" />
                                  }
                                  <div>
                                    <p className="text-sm font-bold text-gray-700">
                                      ยืม {formatCurrency(d.principalAmount)}
                                    </p>
                                    <p className="text-xs text-gray-400">{formatDate(d.startDate)}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {done
                                    ? <span className="text-xs font-bold text-green-600">ชำระครบ</span>
                                    : <span className="text-sm font-bold text-gray-700">ค้าง {formatCurrency(bal)}</span>
                                  }
                                  <p className="text-xs text-gray-400">ครบ {formatDate(d.dueDate)}</p>
                                </div>
                              </Link>
                            );
                          })}

                          {/* Action buttons */}
                          <div className="flex gap-2 px-4 py-3 bg-gray-50">
                            {contact.hasActive ? (
                              <Link
                                href={`/debtors/${contact.debtors.find((d) => d.totalAmount - d.amountPaid > 0)?.id}`}
                                className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm text-center hover:bg-orange-600 transition-colors"
                              >
                                เพิ่มยอดกู้
                              </Link>
                            ) : null}
                            <Link
                              href={`/add-debt?name=${encodeURIComponent(contact.name)}`}
                              className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm text-center hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                            >
                              <Plus size={15} />
                              กู้ใหม่
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
        <div className="h-4" />
      </div>
    </>
  );
}

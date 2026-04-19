"use client";

import type { Debtor, Payment } from "@/types";
import { getNextPaymentDate } from "@/lib/calculator";

export type CreditTag = "excellent" | "good" | "slow" | "bad" | "new";

export interface CreditInfo {
  tag: CreditTag;
  label: string;
  onTimeCount: number;
  lateCount: number;
  onTimePct: number;
}

export function analyzeCreditTag(debtor: Debtor, allPayments: Payment[]): CreditInfo {
  const payments = allPayments
    .filter((p) => p.debtorId === debtor.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  const balance = parseFloat((debtor.totalAmount - debtor.amountPaid).toFixed(2));
  const paid = balance <= 0;
  const overdue = !paid && new Date(debtor.dueDate) < new Date();

  if (payments.length === 0) {
    if (overdue) return mk("bad", "ค้างชำระ", 0, 0);
    return mk("new", "ใหม่", 0, 0);
  }

  // Fully-paid debts: skip round-by-round (expected dates may be future)
  if (paid) {
    const lastPaidAt = new Date(Math.max(...payments.map((p) => new Date(p.date).getTime())));
    return lastPaidAt <= new Date(debtor.dueDate)
      ? mk("excellent", "ดีเยี่ยม", 0, 0)
      : mk("good", "ดี", 0, 0);
  }

  const now = new Date();
  let onTimeCount = 0;
  let lateCount = 0;

  for (let round = 1; round <= debtor.totalRounds; round++) {
    const expected = getNextPaymentDate(debtor.startDate, round - 1, debtor.interestPeriod);
    if (expected > now) break;

    const deadline = new Date(expected.getTime() + 24 * 60 * 60 * 1000); // 1-day grace
    const expectedCumulative = Math.min(round * debtor.paymentPerRound, debtor.totalAmount);
    const paidByDeadline = payments
      .filter((p) => new Date(p.date) <= deadline)
      .reduce((s, p) => s + p.amount, 0);

    if (paidByDeadline >= expectedCumulative - 0.01) {
      onTimeCount++;
    } else {
      lateCount++;
    }
  }

  const total = onTimeCount + lateCount;
  if (total === 0) {
    if (overdue) return mk("bad", "ค้างชำระ", 0, 0);
    return mk("new", "ใหม่", 0, 0);
  }

  const onTimePct = Math.round((onTimeCount / total) * 100);

  if (overdue) return mk("bad", "ค้างชำระ", onTimeCount, lateCount);
  if (onTimePct >= 90) return mk("excellent", "ดีเยี่ยม", onTimeCount, lateCount);
  if (onTimePct >= 70) return mk("good", "ดี", onTimeCount, lateCount);
  if (onTimePct >= 40) return mk("slow", "จ่ายช้า", onTimeCount, lateCount);
  return mk("bad", "ไม่ดี", onTimeCount, lateCount);
}

function mk(tag: CreditTag, label: string, onTimeCount: number, lateCount: number): CreditInfo {
  const total = onTimeCount + lateCount;
  return { tag, label, onTimeCount, lateCount, onTimePct: total > 0 ? Math.round((onTimeCount / total) * 100) : 0 };
}

export function creditBadgeCls(tag: CreditTag): string {
  switch (tag) {
    case "excellent": return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "good":      return "bg-blue-100 text-blue-700 border-blue-300";
    case "slow":      return "bg-amber-100 text-amber-700 border-amber-300";
    case "bad":       return "bg-red-100 text-red-700 border-red-300";
    case "new":       return "bg-gray-100 text-gray-500 border-gray-200";
  }
}

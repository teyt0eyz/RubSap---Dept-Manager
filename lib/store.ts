"use client";

import type { Debtor, Payment, AppState, DebtSummary, LoanAddition } from "@/types";
import {
  calculateInterest,
  calculateTotalRounds,
  calculateDueDate,
  getNextPaymentDate,
} from "@/lib/calculator";
import { saveDebtorsToIDB } from "@/lib/idb";

const STORAGE_KEY = "rubsap_data";

function syncIDB(state: AppState) {
  saveDebtorsToIDB(state.debtors).catch(() => {});
}

function getDefaultState(): AppState {
  return { debtors: [], payments: [] };
}

export function loadState(): AppState {
  if (typeof window === "undefined") return getDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppState) : getDefaultState();
  } catch {
    return getDefaultState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ── Debtors ───────────────────────────────────────────────────────────────────

export function getDebtors(): Debtor[] {
  return loadState().debtors.map(normalize);
}

export function getDebtor(id: string): Debtor | undefined {
  const d = loadState().debtors.find((d) => d.id === id);
  return d ? normalize(d) : undefined;
}

export function addDebtor(debtor: Debtor): void {
  const state = loadState();
  state.debtors.push(debtor);
  saveState(state);
  syncIDB(state);
}

export function updateDebtor(updated: Debtor): void {
  const state = loadState();
  state.debtors = state.debtors.map((d) => (d.id === updated.id ? updated : d));
  saveState(state);
  syncIDB(state);
}

export function deleteDebtor(id: string): void {
  const state = loadState();
  state.debtors = state.debtors.filter((d) => d.id !== id);
  state.payments = state.payments.filter((p) => p.debtorId !== id);
  saveState(state);
  syncIDB(state);
}

// ── เพิ่มยอดกู้ ───────────────────────────────────────────────────────────────
// วันครบกำหนดถูกคำนวณอัตโนมัติจาก startDate + rounds × period

export function addMoreLoan(
  debtorId: string,
  additionalAmount: number,
  newPaymentPerRound: number,
  notes?: string
): void {
  const state = loadState();
  const debtor = state.debtors.find((d) => d.id === debtorId);
  if (!debtor) return;

  const currentBalance = parseFloat(
    (debtor.totalAmount - debtor.amountPaid).toFixed(2)
  );
  const newPrincipal = parseFloat(
    (currentBalance + additionalAmount).toFixed(2)
  );
  const newStartDate = new Date().toISOString().split("T")[0];

  const { totalInterest, totalAmount } = calculateInterest(
    newPrincipal,
    debtor.interestRate,
    debtor.interestType ?? "percent"
  );

  const totalRounds = calculateTotalRounds(newPrincipal, newPaymentPerRound);
  const netPerRound = parseFloat((totalAmount / totalRounds).toFixed(2));
  const newDueDate = calculateDueDate(
    newStartDate,
    totalRounds,
    debtor.interestPeriod
  );

  const addition: LoanAddition = {
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    previousBalance: currentBalance,
    additionalAmount,
    newPrincipal,
    newTotalAmount: totalAmount,
    newPaymentPerRound,
    notes,
  };

  debtor.principalAmount = newPrincipal;
  debtor.startDate = newStartDate;
  debtor.dueDate = newDueDate;
  debtor.totalInterest = totalInterest;
  debtor.totalAmount = totalAmount;
  debtor.paymentPerRound = netPerRound;
  debtor.totalRounds = totalRounds;
  debtor.amountPaid = 0;
  debtor.loanAdditions = [...(debtor.loanAdditions ?? []), addition];
  debtor.updatedAt = new Date().toISOString();

  saveState(state);
  syncIDB(state);
}

// ── Payments ──────────────────────────────────────────────────────────────────

export function getPayments(debtorId?: string): Payment[] {
  const payments = loadState().payments;
  return debtorId ? payments.filter((p) => p.debtorId === debtorId) : payments;
}

export function addPayment(payment: Payment): void {
  const state = loadState();
  state.payments.push(payment);
  const debtor = state.debtors.find((d) => d.id === payment.debtorId);
  if (debtor) {
    debtor.amountPaid = parseFloat(
      (debtor.amountPaid + payment.amount).toFixed(2)
    );
    debtor.updatedAt = new Date().toISOString();
  }
  saveState(state);
  syncIDB(state);
}

export function deletePayment(paymentId: string): void {
  const state = loadState();
  const payment = state.payments.find((p) => p.id === paymentId);
  if (payment) {
    const debtor = state.debtors.find((d) => d.id === payment.debtorId);
    if (debtor) {
      debtor.amountPaid = parseFloat(
        Math.max(0, debtor.amountPaid - payment.amount).toFixed(2)
      );
      debtor.updatedAt = new Date().toISOString();
    }
  }
  state.payments = state.payments.filter((p) => p.id !== paymentId);
  saveState(state);
  syncIDB(state);
}

// ── Summary ───────────────────────────────────────────────────────────────────

export function getSummary(): DebtSummary {
  const { debtors } = loadState();
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return debtors.map(normalize).reduce<DebtSummary>(
    (acc, d) => {
      const balance = parseFloat((d.totalAmount - d.amountPaid).toFixed(2));
      acc.totalLent += d.principalAmount;
      acc.totalCollected += d.amountPaid;
      acc.totalOutstanding += Math.max(0, balance);
      acc.totalInterestEarned +=
        d.amountPaid > d.principalAmount ? d.amountPaid - d.principalAmount : 0;
      const due = new Date(d.dueDate);
      if (balance > 0 && due < now) acc.overdueCount++;
      if (balance > 0 && due >= now && due <= sevenDays) acc.dueSoonCount++;
      return acc;
    },
    {
      totalLent: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      totalInterestEarned: 0,
      overdueCount: 0,
      dueSoonCount: 0,
    }
  );
}

// ── Backward-compat normalizer ────────────────────────────────────────────────

function normalize(d: Debtor): Debtor {
  return {
    ...d,
    paymentPerRound: d.paymentPerRound ?? d.totalAmount,
    totalRounds: d.totalRounds ?? 1,
    loanAdditions: d.loanAdditions ?? [],
    interestType: d.interestType ?? "percent",
  };
}

// ── Unique debtor names (for autocomplete) ────────────────────────────────────

export function getDebtorNames(): string[] {
  const { debtors } = loadState();
  return Array.from(new Set(debtors.map((d) => d.name))).sort();
}

// ── Monthly statistics ────────────────────────────────────────────────────────

export interface MonthlyStats {
  year: number;
  month: number;
  lentAmount: number;
  expectedInterest: number;
  actualCollected: number;
  estimatedInterestCollected: number;
  newDebtorCount: number;
}

export function getMonthlyStats(): MonthlyStats[] {
  const { debtors, payments } = loadState();
  const map = new Map<string, MonthlyStats>();

  const key = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
  const ensure = (y: number, m: number): MonthlyStats => {
    const k = key(y, m);
    if (!map.has(k)) {
      map.set(k, { year: y, month: m, lentAmount: 0, expectedInterest: 0, actualCollected: 0, estimatedInterestCollected: 0, newDebtorCount: 0 });
    }
    return map.get(k)!;
  };

  for (const raw of debtors) {
    const d = normalize(raw);

    // New debtor: lent amount & debtor count
    const created = new Date(d.createdAt);
    const cs = ensure(created.getFullYear(), created.getMonth() + 1);
    cs.newDebtorCount++;
    const additionsTotal = d.loanAdditions.reduce((s, a) => s + a.additionalAmount, 0);
    cs.lentAmount += parseFloat(Math.max(0, d.principalAmount - additionsTotal).toFixed(2));

    // Loan additions: additional principal lent
    for (const a of d.loanAdditions) {
      const ad = new Date(a.date);
      const as = ensure(ad.getFullYear(), ad.getMonth() + 1);
      as.lentAmount += a.additionalAmount;
    }

    // Expected interest distributed per round
    const interestPerRound = d.totalRounds > 0 ? d.totalInterest / d.totalRounds : 0;
    for (let round = 1; round <= d.totalRounds; round++) {
      const due = getNextPaymentDate(d.startDate, round - 1, d.interestPeriod);
      const rs = ensure(due.getFullYear(), due.getMonth() + 1);
      rs.expectedInterest += interestPerRound;
    }
  }

  // Actual payments & estimated interest portion
  const debtorMap = new Map(debtors.map((d) => [d.id, normalize(d)]));
  for (const p of payments) {
    const pd = new Date(p.date);
    const ps = ensure(pd.getFullYear(), pd.getMonth() + 1);
    ps.actualCollected += p.amount;
    const d = debtorMap.get(p.debtorId);
    if (d && d.totalAmount > 0) {
      ps.estimatedInterestCollected += p.amount * (d.totalInterest / d.totalAmount);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .map((s) => ({
      ...s,
      lentAmount: parseFloat(s.lentAmount.toFixed(2)),
      expectedInterest: parseFloat(s.expectedInterest.toFixed(2)),
      actualCollected: parseFloat(s.actualCollected.toFixed(2)),
      estimatedInterestCollected: parseFloat(s.estimatedInterestCollected.toFixed(2)),
    }));
}

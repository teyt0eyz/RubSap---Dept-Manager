"use client";

import type { Debtor, Payment, AppState, DebtSummary, LoanAddition } from "@/types";
import {
  calculateInterest,
  calculateTotalRounds,
  calculateDueDate,
} from "@/lib/calculator";

const STORAGE_KEY = "rubsap_data";

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
}

export function updateDebtor(updated: Debtor): void {
  const state = loadState();
  state.debtors = state.debtors.map((d) => (d.id === updated.id ? updated : d));
  saveState(state);
}

export function deleteDebtor(id: string): void {
  const state = loadState();
  state.debtors = state.debtors.filter((d) => d.id !== id);
  state.payments = state.payments.filter((p) => p.debtorId !== id);
  saveState(state);
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
    debtor.interestRate
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
  };
}

"use client";

import type { Debtor, Payment, AppState, DebtSummary } from "@/types";

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

// ── Debtors ──────────────────────────────────────────────────────────────────

export function getDebtors(): Debtor[] {
  return loadState().debtors;
}

export function getDebtor(id: string): Debtor | undefined {
  return loadState().debtors.find((d) => d.id === id);
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

// ── Payments ─────────────────────────────────────────────────────────────────

export function getPayments(debtorId?: string): Payment[] {
  const payments = loadState().payments;
  return debtorId ? payments.filter((p) => p.debtorId === debtorId) : payments;
}

export function addPayment(payment: Payment): void {
  const state = loadState();
  state.payments.push(payment);
  const debtor = state.debtors.find((d) => d.id === payment.debtorId);
  if (debtor) {
    debtor.amountPaid = parseFloat((debtor.amountPaid + payment.amount).toFixed(2));
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

  return debtors.reduce<DebtSummary>(
    (acc, d) => {
      const balance = parseFloat((d.totalAmount - d.amountPaid).toFixed(2));
      acc.totalLent += d.principalAmount;
      acc.totalCollected += d.amountPaid;
      acc.totalOutstanding += Math.max(0, balance);
      acc.totalInterestEarned += d.amountPaid > d.principalAmount
        ? d.amountPaid - d.principalAmount
        : 0;
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

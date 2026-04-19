import type { InterestPeriod } from "@/types";

// ── Interest ──────────────────────────────────────────────────────────────────

export function calculateInterest(
  principal: number,
  ratePercent: number,
  startDate: string,
  dueDate: string,
  period: InterestPeriod
): { totalInterest: number; totalAmount: number } {
  const start = new Date(startDate);
  const end = new Date(dueDate);
  const diffMs = end.getTime() - start.getTime();

  if (diffMs <= 0 || isNaN(diffMs)) {
    return { totalInterest: 0, totalAmount: principal };
  }

  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const rate = ratePercent / 100;

  let periods = 0;
  switch (period) {
    case "daily":    periods = diffDays;      break;
    case "weekly":   periods = diffDays / 7;  break;
    case "biweekly": periods = diffDays / 15; break;
    case "monthly":  periods = diffDays / 30; break;
  }

  const totalInterest = principal * rate * periods;
  const totalAmount = principal + totalInterest;

  return {
    totalInterest: parseFloat(totalInterest.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
}

// ── Round-based payment helpers ───────────────────────────────────────────────

/** จำนวนรอบทั้งหมด = ceil(ยอดรวม / เก็บต่อรอบ) */
export function calculateTotalRounds(
  totalAmount: number,
  paymentPerRound: number
): number {
  if (paymentPerRound <= 0) return 0;
  return Math.ceil(totalAmount / paymentPerRound);
}

/** รอบที่จ่ายไปแล้ว = floor(ยอดที่จ่าย / เก็บต่อรอบ) */
export function calculateRoundsPaid(
  amountPaid: number,
  paymentPerRound: number
): number {
  if (paymentPerRound <= 0) return 0;
  return Math.floor(amountPaid / paymentPerRound);
}

/** จำนวนรอบที่เหลือ = ceil(ยอดคงเหลือ / เก็บต่อรอบ) */
export function calculateRoundsRemaining(
  balance: number,
  paymentPerRound: number
): number {
  if (paymentPerRound <= 0 || balance <= 0) return 0;
  return Math.ceil(balance / paymentPerRound);
}

/** จำนวนเงินรอบถัดไป — รอบสุดท้ายอาจน้อยกว่า paymentPerRound */
export function getNextPaymentAmount(
  balance: number,
  paymentPerRound: number
): number {
  if (balance <= 0) return 0;
  return parseFloat(Math.min(balance, paymentPerRound).toFixed(2));
}

/** จำนวนวันต่อรอบ */
export function daysPerPeriod(period: InterestPeriod): number {
  switch (period) {
    case "daily":    return 1;
    case "weekly":   return 7;
    case "biweekly": return 15;
    case "monthly":  return 30;
  }
}

/** วันที่เก็บรอบถัดไป */
export function getNextPaymentDate(
  startDate: string,
  roundsPaid: number,
  period: InterestPeriod
): Date {
  const start = new Date(startDate);
  const days = (roundsPaid + 1) * daysPerPeriod(period);
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}

// ── Label helpers ─────────────────────────────────────────────────────────────

export function getPeriodLabel(period: InterestPeriod): string {
  const labels: Record<InterestPeriod, string> = {
    daily:    "รายวัน",
    weekly:   "รายสัปดาห์",
    biweekly: "ราย 15 วัน",
    monthly:  "รายเดือน",
  };
  return labels[period];
}

// ── Date / status helpers ─────────────────────────────────────────────────────

export function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

export function isDueSoon(dueDate: string, days = 7): boolean {
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

export function daysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Formatting ────────────────────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

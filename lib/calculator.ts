import type { InterestPeriod } from "@/types";

// ── Interest (flat, one-time on principal) ────────────────────────────────────
// ดอกเบี้ยคิดจากเงินต้นครั้งเดียว ไม่ใช่รายวัน/เดือน

export function calculateInterest(
  principal: number,
  rateOrAmount: number,
  type: "percent" | "fixed" = "percent"
): { totalInterest: number; totalAmount: number } {
  const totalInterest = type === "fixed"
    ? parseFloat(rateOrAmount.toFixed(2))
    : parseFloat(((principal * rateOrAmount) / 100).toFixed(2));
  const totalAmount = parseFloat((principal + totalInterest).toFixed(2));
  return { totalInterest, totalAmount };
}

// ── Round helpers ─────────────────────────────────────────────────────────────

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

// ── Due date auto-calculation ─────────────────────────────────────────────────

/** จำนวนวันต่อรอบ */
export function daysPerPeriod(period: InterestPeriod): number {
  switch (period) {
    case "daily":    return 1;
    case "weekly":   return 7;
    case "biweekly": return 15;
    case "monthly":  return 30;
  }
}

/** จำนวนรอบจากจำนวนเดือน = ceil(เดือน × 30 / วันต่อรอบ) */
export function calculateRoundsFromMonths(months: number, period: InterestPeriod): number {
  if (months <= 0) return 0;
  return Math.ceil((months * 30) / daysPerPeriod(period));
}

/**
 * คำนวณวันครบกำหนดอัตโนมัติ
 * = วันเริ่มต้น + (จำนวนรอบ × วันต่อรอบ)
 */
export function calculateDueDate(
  startDate: string,
  totalRounds: number,
  period: InterestPeriod
): string {
  const start = new Date(startDate);
  const days = totalRounds * daysPerPeriod(period);
  const due = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return due.toISOString().split("T")[0];
}

/** วันเก็บเงินรอบถัดไป = วันเริ่ม + (รอบที่จ่ายแล้ว + 1) × วันต่อรอบ */
export function getNextPaymentDate(
  startDate: string,
  roundsPaid: number,
  period: InterestPeriod
): Date {
  const start = new Date(startDate);
  const days = (roundsPaid + 1) * daysPerPeriod(period);
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}

// ── Status helpers ────────────────────────────────────────────────────────────

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

// ── Labels ────────────────────────────────────────────────────────────────────

export function getPeriodLabel(period: InterestPeriod): string {
  const labels: Record<InterestPeriod, string> = {
    daily:    "ทวงรายวัน",
    weekly:   "ทวงรายสัปดาห์",
    biweekly: "ทวงราย 15 วัน",
    monthly:  "ทวงรายเดือน",
  };
  return labels[period];
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

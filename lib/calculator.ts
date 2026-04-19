import type { InterestPeriod } from "@/types";

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
    case "daily":
      periods = diffDays;
      break;
    case "weekly":
      periods = diffDays / 7;
      break;
    case "biweekly":
      periods = diffDays / 15;
      break;
    case "monthly":
      periods = diffDays / 30;
      break;
  }

  const totalInterest = principal * rate * periods;
  const totalAmount = principal + totalInterest;

  return {
    totalInterest: parseFloat(totalInterest.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
}

export function getPeriodLabel(period: InterestPeriod): string {
  const labels: Record<InterestPeriod, string> = {
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Bi-weekly (15 days)",
    monthly: "Monthly",
  };
  return labels[period];
}

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

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

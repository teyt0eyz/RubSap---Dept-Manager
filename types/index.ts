export type InterestPeriod = "daily" | "weekly" | "biweekly" | "monthly";

export interface Debtor {
  id: string;
  name: string;
  principalAmount: number;
  startDate: string;       // ISO date string
  dueDate: string;         // ISO date string
  interestRate: number;    // percentage, e.g. 5 = 5%
  interestPeriod: InterestPeriod;
  totalInterest: number;
  totalAmount: number;     // principal + totalInterest
  amountPaid: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  debtorId: string;
  amount: number;
  date: string;           // ISO date string
  notes?: string;
}

export interface AppState {
  debtors: Debtor[];
  payments: Payment[];
}

export interface DebtSummary {
  totalLent: number;
  totalCollected: number;
  totalOutstanding: number;
  totalInterestEarned: number;
  overdueCount: number;
  dueSoonCount: number;
}

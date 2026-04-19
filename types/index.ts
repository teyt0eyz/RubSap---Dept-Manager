export type InterestPeriod = "daily" | "weekly" | "biweekly" | "monthly";

export interface LoanAddition {
  id: string;
  date: string;
  previousBalance: number;
  additionalAmount: number;
  newPrincipal: number;
  newTotalAmount: number;
  newPaymentPerRound: number;
  notes?: string;
}

export type InterestType = "percent" | "fixed";

export interface Debtor {
  id: string;
  name: string;
  principalAmount: number;
  startDate: string;
  dueDate: string;
  interestRate: number;
  interestType: InterestType;
  interestPeriod: InterestPeriod;

  // Payment schedule
  paymentPerRound: number;   // เก็บต่อรอบ
  totalRounds: number;       // รวมกี่รอบ (ceil(totalAmount / paymentPerRound))

  // Calculated totals
  totalInterest: number;
  totalAmount: number;
  amountPaid: number;

  // History of loan additions (เพิ่มยอดกู้)
  loanAdditions: LoanAddition[];

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  debtorId: string;
  amount: number;
  date: string;
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

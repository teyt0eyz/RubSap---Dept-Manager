"use client";

import { Debtor } from "@/types";
import {
  formatCurrency, formatDate, isOverdue, isDueSoon, daysUntilDue,
  calculateRoundsRemaining, getNextPaymentAmount,
} from "@/lib/calculator";
import { type CreditInfo, creditBadgeCls } from "@/lib/credit";
import { AlertTriangle, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function DebtorCard({ debtor, creditInfo }: { debtor: Debtor; creditInfo?: CreditInfo }) {
  const balance = parseFloat((debtor.totalAmount - debtor.amountPaid).toFixed(2));
  const overdue = isOverdue(debtor.dueDate);
  const dueSoon = isDueSoon(debtor.dueDate);
  const days = daysUntilDue(debtor.dueDate);
  const paid = balance <= 0;
  const progress = Math.min(100, Math.round((debtor.amountPaid / debtor.totalAmount) * 100));

  const ppr = debtor.paymentPerRound ?? debtor.totalAmount;
  const roundsRemaining = calculateRoundsRemaining(balance, ppr);
  const nextAmt = getNextPaymentAmount(balance, ppr);

  let statusColor = "bg-blue-50 border-blue-200";
  let statusIcon = <Clock size={18} className="text-blue-500" />;
  let statusText = `ครบกำหนด ${formatDate(debtor.dueDate)}`;

  if (paid) {
    statusColor = "bg-green-50 border-green-200";
    statusIcon = <CheckCircle2 size={18} className="text-green-500" />;
    statusText = "ชำระครบแล้ว";
  } else if (overdue) {
    statusColor = "bg-red-50 border-red-200";
    statusIcon = <AlertTriangle size={18} className="text-red-500" />;
    statusText = `เกินกำหนด ${Math.abs(days)} วัน`;
  } else if (dueSoon) {
    statusColor = "bg-amber-50 border-amber-200";
    statusIcon = <AlertTriangle size={18} className="text-amber-500" />;
    statusText = days === 0 ? "ครบกำหนดวันนี้!" : `อีก ${days} วันครบกำหนด`;
  }

  return (
    <Link href={`/debtors/${debtor.id}`}>
      <div className={`border-2 rounded-2xl p-4 mb-3 ${statusColor} active:scale-[0.98] transition-transform`}>
        {/* Top row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {debtor.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-lg font-bold text-gray-800 truncate">{debtor.name}</h3>
                {creditInfo && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${creditBadgeCls(creditInfo.tag)}`}>
                    {creditInfo.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {statusIcon}
                <span className="text-sm font-medium text-gray-600">{statusText}</span>
              </div>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400 flex-shrink-0 ml-2" />
        </div>

        {/* Amount row */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div>
            <p className="text-xs text-gray-500">ยอดรวม</p>
            <p className="text-base font-bold text-gray-800">{formatCurrency(debtor.totalAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">ยอดคงเหลือ</p>
            <p className={`text-base font-bold ${paid ? "text-green-600" : overdue ? "text-red-600" : "text-gray-800"}`}>
              {paid ? "ชำระแล้ว" : formatCurrency(balance)}
            </p>
          </div>
        </div>

        {/* Rounds row */}
        {!paid && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <p className="text-xs text-gray-500">เหลืออีก</p>
              <p className={`text-base font-bold ${overdue ? "text-red-600" : "text-blue-700"}`}>
                {roundsRemaining} รอบ
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">รอบหน้า</p>
              <p className="text-base font-bold text-green-700">{formatCurrency(nextAmt)}</p>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>ชำระแล้ว {formatCurrency(debtor.amountPaid)}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2.5 bg-white rounded-full overflow-hidden border border-gray-200">
            <div
              className={`h-full rounded-full transition-all ${paid ? "bg-green-500" : overdue ? "bg-red-500" : "bg-blue-500"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

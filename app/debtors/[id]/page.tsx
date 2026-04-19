"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Edit2,
  Trash2,
  Plus,
  DollarSign,
  Calendar,
  Percent,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Minus,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  getPeriodLabel,
  isOverdue,
  daysUntilDue,
} from "@/lib/calculator";
import {
  getDebtor,
  deleteDebtor,
  addPayment,
  getPayments,
  deletePayment,
} from "@/lib/store";
import type { Debtor, Payment } from "@/types";

export default function DebtorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [debtor, setDebtor] = useState<Debtor | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function reload() {
    const d = getDebtor(id);
    if (d) {
      setDebtor(d);
      setPayments(getPayments(id).sort((a, b) => b.date.localeCompare(a.date)));
    }
  }

  useEffect(() => {
    reload();
  }, [id]);

  if (!debtor) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 text-lg">ไม่พบลูกหนี้</p>
        <Link href="/debtors" className="text-blue-600 font-semibold mt-2 block">
          กลับไปรายการลูกหนี้
        </Link>
      </div>
    );
  }

  const balance = parseFloat((debtor.totalAmount - debtor.amountPaid).toFixed(2));
  const paid = balance <= 0;
  const overdue = isOverdue(debtor.dueDate) && !paid;
  const days = daysUntilDue(debtor.dueDate);
  const progress = Math.min(100, Math.round((debtor.amountPaid / debtor.totalAmount) * 100));

  function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) {
      setPayError("กรุณาใส่จำนวนเงินที่ถูกต้อง");
      return;
    }
    if (amount > balance + 0.01) {
      setPayError(`จำนวนสูงสุดที่รับได้ ${formatCurrency(balance)}`);
      return;
    }
    const payment: Payment = {
      id: crypto.randomUUID(),
      debtorId: id,
      amount: parseFloat(amount.toFixed(2)),
      date: new Date().toISOString(),
      notes: payNote.trim() || undefined,
    };
    addPayment(payment);
    setPayAmount("");
    setPayNote("");
    setPayError("");
    setShowAddPayment(false);
    reload();
  }

  function handleDeletePayment(payId: string) {
    deletePayment(payId);
    reload();
  }

  function handleDelete() {
    deleteDebtor(id);
    router.push("/debtors");
  }

  const statusBg = paid
    ? "bg-green-600"
    : overdue
    ? "bg-red-600"
    : "bg-blue-600";

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-blue-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Link
              href="/debtors"
              className="p-2 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <ChevronLeft size={26} className="text-blue-700" />
            </Link>
            <h1 className="text-xl font-bold text-blue-800 truncate max-w-[160px]">
              {debtor.name}
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/add-debt?edit=${id}`}
              className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <Edit2 size={20} className="text-blue-600" />
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 transition-colors"
            >
              <Trash2 size={20} className="text-red-500" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-4">
        {/* Status Banner */}
        <div className={`${statusBg} text-white rounded-2xl p-5 shadow-md`}>
          <div className="flex items-center gap-2 mb-1">
            {paid ? (
              <CheckCircle2 size={22} />
            ) : overdue ? (
              <AlertTriangle size={22} />
            ) : (
              <Clock size={22} />
            )}
            <span className="text-lg font-bold">
              {paid
                ? "ชำระครบแล้ว"
                : overdue
                ? `เกินกำหนด ${Math.abs(days)} วัน`
                : days === 0
                ? "ครบกำหนดวันนี้!"
                : `อีก ${days} วันครบกำหนด`}
            </span>
          </div>
          <p className="text-3xl font-extrabold mt-2">
            {paid ? formatCurrency(debtor.totalAmount) : formatCurrency(balance)}
          </p>
          <p className="text-sm opacity-80 mt-1">
            {paid ? "ยอดรวมที่เก็บได้" : "ยอดคงเหลือ"}
          </p>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1 opacity-90">
              <span>ชำระแล้ว {formatCurrency(debtor.amountPaid)}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100 space-y-3">
          <h2 className="text-base font-bold text-gray-700 mb-1">รายละเอียดเงินกู้</h2>
          <DetailRow
            icon={<DollarSign size={18} className="text-blue-500" />}
            label="เงินต้น"
            value={formatCurrency(debtor.principalAmount)}
          />
          <DetailRow
            icon={<Percent size={18} className="text-purple-500" />}
            label="อัตราดอกเบี้ย"
            value={`${debtor.interestRate}% ${getPeriodLabel(debtor.interestPeriod)}`}
          />
          <DetailRow
            icon={<DollarSign size={18} className="text-amber-500" />}
            label="ดอกเบี้ยรวม"
            value={formatCurrency(debtor.totalInterest)}
          />
          <DetailRow
            icon={<DollarSign size={18} className="text-green-500" />}
            label="ยอดรวมทั้งหมด"
            value={formatCurrency(debtor.totalAmount)}
          />
          <DetailRow
            icon={<Calendar size={18} className="text-blue-500" />}
            label="วันที่เริ่มต้น"
            value={formatDate(debtor.startDate)}
          />
          <DetailRow
            icon={<Calendar size={18} className="text-red-500" />}
            label="วันครบกำหนด"
            value={formatDate(debtor.dueDate)}
          />
          {debtor.notes && (
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 border border-gray-200 mt-2">
              📝 {debtor.notes}
            </div>
          )}
        </div>

        {/* Add Payment */}
        {!paid && (
          <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
            <button
              onClick={() => setShowAddPayment(!showAddPayment)}
              className="w-full flex items-center justify-between px-4 py-4 text-base font-bold text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Plus size={20} />
                บันทึกการชำระเงิน
              </span>
              <span className="text-sm text-gray-400">
                ยอดคงเหลือ: {formatCurrency(balance)}
              </span>
            </button>

            {showAddPayment && (
              <form
                onSubmit={handleAddPayment}
                className="px-4 pb-4 border-t border-blue-100 pt-3 space-y-3"
              >
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">
                    จำนวนเงิน (฿)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-medium focus:outline-none focus:border-blue-400"
                    placeholder="0.00"
                    value={payAmount}
                    onChange={(e) => {
                      setPayAmount(e.target.value);
                      setPayError("");
                    }}
                    min="0.01"
                    step="0.01"
                    autoFocus
                  />
                  {payError && (
                    <p className="text-red-500 text-sm mt-1">{payError}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">
                    หมายเหตุ (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-400"
                    placeholder="เช่น ชำระบางส่วน"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddPayment(false)}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700"
                  >
                    บันทึกการชำระ
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Payment History */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
          <h2 className="text-base font-bold text-gray-700 mb-3">
            ประวัติการชำระเงิน ({payments.length})
          </h2>
          {payments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              ยังไม่มีประวัติการชำระเงิน
            </p>
          ) : (
            payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                    <DollarSign size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">
                      {formatCurrency(p.amount)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(p.date)}{p.notes ? ` · ${p.notes}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePayment(p.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Minus size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-2">ลบลูกหนี้?</h3>
            <p className="text-gray-500 mb-5">
              การลบนี้จะลบ <strong>{debtor.name}</strong> และประวัติการชำระเงินทั้งหมดอย่างถาวร
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-lg hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3.5 rounded-xl bg-red-600 text-white font-bold text-lg hover:bg-red-700"
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-gray-500">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-base font-bold text-gray-800">{value}</span>
    </div>
  );
}

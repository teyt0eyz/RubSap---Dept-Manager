"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Edit2, Trash2, Plus, DollarSign,
  Calendar, Percent, Clock, CheckCircle2, AlertTriangle,
  Minus, RefreshCw, PlusCircle, CalendarCheck,
} from "lucide-react";
import {
  formatCurrency, formatDate, getPeriodLabel,
  isOverdue, daysUntilDue,
  calculateRoundsPaid, calculateRoundsRemaining,
  calculateTotalRounds, getNextPaymentAmount,
  getNextPaymentDate, calculateInterest, calculateDueDate,
} from "@/lib/calculator";
import {
  getDebtor, deleteDebtor, addPayment, getPayments,
  deletePayment, addMoreLoan,
} from "@/lib/store";
import type { Debtor, Payment } from "@/types";

export default function DebtorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [debtor, setDebtor] = useState<Debtor | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Payment state
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState("");

  // Add More Loan state
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addPPR, setAddPPR] = useState("");
  const [addNote, setAddNote] = useState("");
  const [addError, setAddError] = useState("");
  const [addPreview, setAddPreview] = useState<{
    newPrincipal: number;
    totalInterest: number;
    totalAmount: number;
    totalRounds: number;
    netPerRound: number;
    newDueDate: string;
  } | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function reload() {
    const d = getDebtor(id);
    if (d) {
      setDebtor(d);
      setAddPPR(String(d.paymentPerRound));
      setPayments(getPayments(id).sort((a, b) => b.date.localeCompare(a.date)));
    }
  }

  useEffect(() => { reload(); }, [id]);

  // Live preview for addMoreLoan — due date auto-calculated
  useEffect(() => {
    if (!debtor) return;
    const extra = parseFloat(addAmount);
    const ppr = parseFloat(addPPR);
    if (!isNaN(extra) && extra > 0 && !isNaN(ppr) && ppr > 0) {
      const balance = parseFloat((debtor.totalAmount - debtor.amountPaid).toFixed(2));
      const newPrincipal = parseFloat((balance + extra).toFixed(2));
      const today = new Date().toISOString().split("T")[0];
      const { totalInterest, totalAmount } = calculateInterest(newPrincipal, debtor.interestRate);
      const totalRounds = calculateTotalRounds(newPrincipal, ppr);
      const netPerRound = parseFloat((totalAmount / totalRounds).toFixed(2));
      const newDueDate = calculateDueDate(today, totalRounds, debtor.interestPeriod);
      setAddPreview({ newPrincipal, totalInterest, totalAmount, totalRounds, netPerRound, newDueDate });
    } else {
      setAddPreview(null);
    }
  }, [addAmount, addPPR, debtor]);

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

  const roundsPaid = calculateRoundsPaid(debtor.amountPaid, debtor.paymentPerRound);
  const roundsRemaining = calculateRoundsRemaining(balance, debtor.paymentPerRound);
  const nextPayAmt = getNextPaymentAmount(balance, debtor.paymentPerRound);
  const nextPayDate = paid ? null : getNextPaymentDate(debtor.startDate, roundsPaid, debtor.interestPeriod);


  function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) { setPayError("กรุณาใส่จำนวนเงินที่ถูกต้อง"); return; }
    if (amount > balance + 0.01) { setPayError(`จำนวนสูงสุดที่รับได้ ${formatCurrency(balance)}`); return; }
    addPayment({ id: crypto.randomUUID(), debtorId: id, amount: parseFloat(amount.toFixed(2)), date: new Date().toISOString(), notes: payNote.trim() || undefined });
    setPayAmount(""); setPayNote(""); setPayError(""); setShowAddPayment(false);
    reload();
  }

  function handleQuickPay() {
    addPayment({ id: crypto.randomUUID(), debtorId: id, amount: nextPayAmt, date: new Date().toISOString(), notes: `รอบที่ ${roundsPaid + 1}` });
    reload();
  }

  function handleAddMoreLoan(e: React.FormEvent) {
    e.preventDefault();
    const extra = parseFloat(addAmount);
    const ppr = parseFloat(addPPR);
    if (isNaN(extra) || extra <= 0) { setAddError("กรุณาใส่จำนวนเงินที่ถูกต้อง"); return; }
    if (isNaN(ppr) || ppr <= 0) { setAddError("กรุณาใส่จำนวนเงินเก็บต่อรอบ"); return; }
    addMoreLoan(id, extra, ppr, addNote.trim() || undefined);
    setAddAmount(""); setAddNote(""); setAddError(""); setShowAddLoan(false); setAddPreview(null);
    reload();
  }

  const statusBg = paid ? "bg-green-600" : overdue ? "bg-red-600" : "bg-blue-600";

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b-2 border-blue-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Link href="/debtors" className="p-2 rounded-xl hover:bg-blue-50 transition-colors">
              <ChevronLeft size={26} className="text-blue-700" />
            </Link>
            <h1 className="text-xl font-bold text-blue-800 truncate max-w-[160px]">{debtor.name}</h1>
          </div>
          <div className="flex gap-2">
            <Link href={`/add-debt?edit=${id}`} className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors">
              <Edit2 size={20} className="text-blue-600" />
            </Link>
            <button onClick={() => setShowDeleteConfirm(true)} className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 transition-colors">
              <Trash2 size={20} className="text-red-500" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-4">

        {/* Status Banner */}
        <div className={`${statusBg} text-white rounded-2xl p-5 shadow-md`}>
          <div className="flex items-center gap-2 mb-1">
            {paid ? <CheckCircle2 size={22} /> : overdue ? <AlertTriangle size={22} /> : <Clock size={22} />}
            <span className="text-lg font-bold">
              {paid ? "ชำระครบแล้ว"
                : overdue ? `เกินกำหนด ${Math.abs(days)} วัน`
                : days === 0 ? "ครบกำหนดวันนี้!"
                : `อีก ${days} วันครบกำหนด`}
            </span>
          </div>
          <p className="text-3xl font-extrabold mt-2">
            {paid ? formatCurrency(debtor.totalAmount) : formatCurrency(balance)}
          </p>
          <p className="text-sm opacity-80 mt-1">{paid ? "ยอดรวมที่เก็บได้" : "ยอดคงเหลือ"}</p>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1 opacity-90">
              <span>ชำระแล้ว {formatCurrency(debtor.amountPaid)}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-3 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>

        {/* ตารางการทวง */}
        {!paid && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
            <h2 className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
              <CalendarCheck size={18} className="text-blue-500" />
              ตารางการทวง ({getPeriodLabel(debtor.interestPeriod)})
            </h2>

            {/* Round counters */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <RoundBox label="จ่ายไปแล้ว" value={`${roundsPaid} รอบ`} color="green" />
              <RoundBox label="เหลืออีก"   value={`${roundsRemaining} รอบ`} color="amber" />
              <RoundBox label="ทั้งหมด"    value={`${debtor.totalRounds} รอบ`} color="blue" />
            </div>

            {/* Visual round tracker */}
            <div className="flex gap-1 flex-wrap mb-4">
              {Array.from({ length: debtor.totalRounds }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3 rounded-full transition-colors ${
                    i < roundsPaid ? "bg-green-500"
                    : i === roundsPaid ? "bg-amber-400 animate-pulse"
                    : "bg-gray-200"
                  }`}
                  style={{ width: `${Math.max(4, Math.floor(96 / Math.max(debtor.totalRounds, 1)) - 1)}%` }}
                  title={`รอบที่ ${i + 1}`}
                />
              ))}
            </div>

            {/* Per-round net amount info */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3 text-sm">
              <p className="font-bold text-gray-600 mb-2">จำนวนสุทธิต่อรอบ (รวมดอกเบี้ยแล้ว)</p>
              <div className="flex justify-between">
                <span className="text-gray-500">ทุกรอบเท่ากัน ({debtor.totalRounds} รอบ)</span>
                <span className="font-extrabold text-blue-700 text-base">{formatCurrency(debtor.paymentPerRound)} / รอบ</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                รวมดอกเบี้ยเฉลี่ยไว้แล้ว · ยอดรวม {formatCurrency(debtor.totalAmount)}
              </p>
            </div>

            {/* Next payment */}
            <div className="bg-blue-50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-700">
                  รอบที่ {roundsPaid + 1} (ถัดไป)
                </span>
                <span className="text-lg font-extrabold text-blue-800">{formatCurrency(nextPayAmt)}</span>
              </div>
              {nextPayDate && (
                <div className="flex items-center justify-between text-sm text-blue-600">
                  <span>วันเก็บเงิน</span>
                  <span className="font-semibold">{formatDate(nextPayDate.toISOString())}</span>
                </div>
              )}
              {roundsRemaining === 1 && (
                <p className="text-xs text-green-700 font-semibold bg-green-50 rounded-lg p-2">
                  🎉 รอบนี้เป็นรอบสุดท้าย!
                </p>
              )}
            </div>

            {/* Quick Pay */}
            <button
              onClick={handleQuickPay}
              className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors"
            >
              <CheckCircle2 size={20} />
              รับเงิน {formatCurrency(nextPayAmt)} — รอบที่ {roundsPaid + 1}
            </button>
          </div>
        )}

        {/* รายละเอียดเงินกู้ */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100 space-y-3">
          <h2 className="text-base font-bold text-gray-700 mb-1">รายละเอียดเงินกู้</h2>
          <DRow icon={<DollarSign size={18} className="text-blue-500" />}   label="เงินต้น"           value={formatCurrency(debtor.principalAmount)} />
          <DRow icon={<Percent size={18} className="text-purple-500" />}    label="อัตราดอกเบี้ย"    value={`${debtor.interestRate}% ของเงินต้น`} />
          <DRow icon={<DollarSign size={18} className="text-amber-500" />}  label="ดอกเบี้ยรวม"      value={formatCurrency(debtor.totalInterest)} />
          <DRow icon={<DollarSign size={18} className="text-green-500" />}  label="ยอดรวมทั้งหมด"   value={formatCurrency(debtor.totalAmount)} />
          <DRow icon={<RefreshCw size={18} className="text-blue-400" />}    label="เก็บต่อรอบ"       value={formatCurrency(debtor.paymentPerRound)} />
          <DRow icon={<CalendarCheck size={18} className="text-blue-500" />} label="วิธีการทวง"      value={getPeriodLabel(debtor.interestPeriod)} />
          <DRow icon={<Calendar size={18} className="text-blue-500" />}     label="วันที่เริ่มต้น"   value={formatDate(debtor.startDate)} />
          <DRow icon={<Calendar size={18} className="text-red-500" />}      label="วันครบกำหนด"      value={formatDate(debtor.dueDate)} />
          {debtor.notes && (
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 border border-gray-200 mt-2">
              📝 {debtor.notes}
            </div>
          )}
        </div>

        {/* เพิ่มยอดกู้ */}
        {!paid && (
          <div className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
            <button
              onClick={() => setShowAddLoan(!showAddLoan)}
              className="w-full flex items-center justify-between px-4 py-4 text-base font-bold text-orange-700 hover:bg-orange-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <PlusCircle size={20} />
                เพิ่มยอดกู้ (ยืมเพิ่ม)
              </span>
              <span className="text-sm text-gray-400 font-normal">
                ค้างอยู่ {formatCurrency(balance)}
              </span>
            </button>

            {showAddLoan && (
              <form onSubmit={handleAddMoreLoan} className="px-4 pb-4 border-t border-orange-100 pt-3 space-y-3">
                <p className="text-sm text-orange-700 bg-orange-50 rounded-xl p-3 font-medium">
                  ยอดค้าง <strong>{formatCurrency(balance)}</strong> + เงินที่ยืมเพิ่ม
                  = เงินต้นใหม่ คิดดอกเบี้ย {debtor.interestRate}% ใหม่ทั้งหมด
                  และคำนวณวันครบกำหนดให้อัตโนมัติ
                </p>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">ยืมเพิ่มอีก (฿) *</label>
                  <input
                    type="number" inputMode="decimal"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-medium focus:outline-none focus:border-orange-400"
                    placeholder="0.00" value={addAmount}
                    onChange={(e) => { setAddAmount(e.target.value); setAddError(""); }}
                    min="0.01" step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">เก็บเงินต่อรอบ (฿) *</label>
                  <input
                    type="number" inputMode="decimal"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-medium focus:outline-none focus:border-orange-400"
                    placeholder="0.00" value={addPPR}
                    onChange={(e) => { setAddPPR(e.target.value); setAddError(""); }}
                    min="0.01" step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">หมายเหตุ (ถ้ามี)</label>
                  <input
                    type="text"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-orange-400"
                    placeholder="เช่น ยืมเพิ่มเพื่อซื้อของ"
                    value={addNote} onChange={(e) => setAddNote(e.target.value)}
                  />
                </div>

                {addError && <p className="text-red-500 text-sm">{addError}</p>}

                {/* Preview */}
                {addPreview && (
                  <div className="bg-orange-500 text-white rounded-xl p-4 space-y-2">
                    <p className="font-bold text-sm mb-2">ตัวอย่างการคำนวณใหม่</p>
                    <APRow label="เงินต้นใหม่"   value={formatCurrency(addPreview.newPrincipal)} />
                    <APRow label={`ดอกเบี้ย ${debtor.interestRate}%`} value={formatCurrency(addPreview.totalInterest)} />
                    <div className="h-px bg-orange-400" />
                    <APRow label="ยอดรวมใหม่"   value={formatCurrency(addPreview.totalAmount)} bold />
                    <APRow label="จำนวนรอบ"     value={`${addPreview.totalRounds} รอบ`} bold />
                    <div className="bg-orange-400/40 rounded-xl p-2.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-orange-100">เก็บต่อรอบ (รวมดอกเบี้ย)</span>
                        <span className="font-extrabold text-yellow-300 text-base">{formatCurrency(addPreview.netPerRound)}</span>
                      </div>
                      <p className="text-xs text-orange-200 mt-1">ทุกรอบเท่ากัน · ดอกเบี้ยเฉลี่ยแล้ว</p>
                    </div>
                    <div className="flex items-center justify-between bg-green-500/30 rounded-xl px-3 py-2 mt-1">
                      <span className="text-sm font-semibold flex items-center gap-1">
                        <CalendarCheck size={14} /> วันครบกำหนดใหม่
                      </span>
                      <span className="font-extrabold text-yellow-300">
                        {formatDate(addPreview.newDueDate)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowAddLoan(false); setAddPreview(null); }}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold hover:bg-orange-600"
                  >
                    ยืนยันเพิ่มยอด
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* บันทึกชำระ (manual) */}
        {!paid && (
          <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
            <button
              onClick={() => setShowAddPayment(!showAddPayment)}
              className="w-full flex items-center justify-between px-4 py-4 text-base font-bold text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Plus size={20} />
                บันทึกชำระเงิน (จำนวนอื่น)
              </span>
            </button>
            {showAddPayment && (
              <form onSubmit={handleAddPayment} className="px-4 pb-4 border-t border-blue-100 pt-3 space-y-3">
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">จำนวนเงิน (฿)</label>
                  <input
                    type="number" inputMode="decimal"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-medium focus:outline-none focus:border-blue-400"
                    placeholder="0.00" value={payAmount}
                    onChange={(e) => { setPayAmount(e.target.value); setPayError(""); }}
                    min="0.01" step="0.01" autoFocus
                  />
                  {payError && <p className="text-red-500 text-sm mt-1">{payError}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">หมายเหตุ (ถ้ามี)</label>
                  <input
                    type="text"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-blue-400"
                    placeholder="เช่น ชำระบางส่วน"
                    value={payNote} onChange={(e) => setPayNote(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowAddPayment(false)}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50">
                    ยกเลิก
                  </button>
                  <button type="submit"
                    className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700">
                    บันทึกการชำระ
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ประวัติการชำระ */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
          <h2 className="text-base font-bold text-gray-700 mb-3">
            ประวัติการชำระเงิน ({payments.length})
          </h2>
          {payments.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">ยังไม่มีประวัติการชำระเงิน</p>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                    <DollarSign size={16} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-gray-400">{formatDate(p.date)}{p.notes ? ` · ${p.notes}` : ""}</p>
                  </div>
                </div>
                <button
                  onClick={() => { deletePayment(p.id); reload(); }}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Minus size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* ประวัติเพิ่มยอดกู้ */}
        {debtor.loanAdditions.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100">
            <h2 className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
              <RefreshCw size={16} className="text-orange-500" />
              ประวัติการเพิ่มยอดกู้ ({debtor.loanAdditions.length})
            </h2>
            {debtor.loanAdditions.map((a) => (
              <div key={a.id} className="py-3 border-b border-gray-100 last:border-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-orange-700">+{formatCurrency(a.additionalAmount)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(a.date)}{a.notes ? ` · ${a.notes}` : ""}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>ยอดเก่า: {formatCurrency(a.previousBalance)}</p>
                    <p>เงินต้นใหม่: {formatCurrency(a.newPrincipal)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-2">ลบลูกหนี้?</h3>
            <p className="text-gray-500 mb-5">
              การลบนี้จะลบ <strong>{debtor.name}</strong> และประวัติการชำระเงินทั้งหมดอย่างถาวร
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-lg hover:bg-gray-50">
                ยกเลิก
              </button>
              <button onClick={() => { deleteDebtor(id); router.push("/debtors"); }}
                className="flex-1 py-3.5 rounded-xl bg-red-600 text-white font-bold text-lg hover:bg-red-700">
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
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

function RoundBox({ label, value, color }: { label: string; value: string; color: "green" | "amber" | "blue" }) {
  const cls = { green: "bg-green-50 text-green-700 border-green-200", amber: "bg-amber-50 text-amber-700 border-amber-200", blue: "bg-blue-50 text-blue-700 border-blue-200" };
  return (
    <div className={`rounded-xl p-3 border-2 text-center ${cls[color]}`}>
      <p className="text-xs font-semibold opacity-70">{label}</p>
      <p className="text-lg font-extrabold mt-0.5">{value}</p>
    </div>
  );
}

function APRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-orange-100 text-sm">{label}</span>
      <span className={bold ? "text-white font-extrabold text-base" : "text-white font-bold text-sm"}>{value}</span>
    </div>
  );
}

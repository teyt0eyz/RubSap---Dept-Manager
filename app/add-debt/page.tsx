"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Save, Calculator, CalendarCheck } from "lucide-react";
import {
  calculateInterest,
  calculateTotalRounds,
  calculateDueDate,
  getPeriodLabel,
  formatCurrency,
  formatDate,
} from "@/lib/calculator";
import { addDebtor, updateDebtor, getDebtor } from "@/lib/store";
import type { Debtor, InterestPeriod } from "@/types";
import Link from "next/link";

const PERIODS: InterestPeriod[] = ["daily", "weekly", "biweekly", "monthly"];

// ── Preview type ──────────────────────────────────────────────────────────────
interface Preview {
  totalInterest: number;
  totalAmount: number;
  totalRounds: number;
  netPerRound: number;
  dueDate: string;
}

// ── Main form component ───────────────────────────────────────────────────────
function AddDebtForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditing = Boolean(editId);
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    name: "",
    principalAmount: "",
    startDate: today,
    interestRate: "",
    interestPeriod: "monthly" as InterestPeriod,
    paymentPerRound: "",
    notes: "",
  });

  const [preview, setPreview] = useState<Preview | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Load existing data when editing
  useEffect(() => {
    if (!editId) return;
    const d = getDebtor(editId);
    if (d) {
      setForm({
        name: d.name,
        principalAmount: String(d.principalAmount),
        startDate: d.startDate,
        interestRate: String(d.interestRate),
        interestPeriod: d.interestPeriod,
        paymentPerRound: String(d.paymentPerRound),
        notes: d.notes ?? "",
      });
    }
  }, [editId]);

  // Live preview — re-run whenever any input changes
  useEffect(() => {
    const principal = parseFloat(form.principalAmount);
    const rate = parseFloat(form.interestRate);
    const ppr = parseFloat(form.paymentPerRound);

    if (
      !isNaN(principal) && principal > 0 &&
      !isNaN(rate) && rate >= 0 &&
      form.startDate
    ) {
      const { totalInterest, totalAmount } = calculateInterest(principal, rate);

      if (!isNaN(ppr) && ppr > 0) {
        const totalRounds = calculateTotalRounds(principal, ppr);
        const netPerRound = parseFloat((totalAmount / totalRounds).toFixed(2));
        const dueDate = calculateDueDate(form.startDate, totalRounds, form.interestPeriod);
        setPreview({ totalInterest, totalAmount, totalRounds, netPerRound, dueDate });
      } else {
        setPreview({ totalInterest, totalAmount, totalRounds: 0, netPerRound: 0, dueDate: "" });
      }
    } else {
      setPreview(null);
    }
  }, [form.principalAmount, form.interestRate, form.startDate, form.interestPeriod, form.paymentPerRound]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "กรุณาใส่ชื่อลูกหนี้";
    const p = parseFloat(form.principalAmount);
    if (!form.principalAmount || isNaN(p) || p <= 0) e.principalAmount = "กรุณาใส่จำนวนเงินที่ถูกต้อง";
    const r = parseFloat(form.interestRate);
    if (!form.interestRate || isNaN(r) || r < 0) e.interestRate = "กรุณาใส่อัตราดอกเบี้ยที่ถูกต้อง";
    if (!form.startDate) e.startDate = "กรุณาเลือกวันที่เริ่มต้น";
    const ppr = parseFloat(form.paymentPerRound);
    if (!form.paymentPerRound || isNaN(ppr) || ppr <= 0) e.paymentPerRound = "กรุณาใส่จำนวนเงินที่เก็บต่อรอบ";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !preview || !preview.dueDate) return;
    setSaving(true);

    const principal = parseFloat(form.principalAmount);
    const rate = parseFloat(form.interestRate);
    const ppr = parseFloat(form.paymentPerRound);
    const { totalInterest, totalAmount } = calculateInterest(principal, rate);
    const totalRounds = calculateTotalRounds(principal, ppr);
    const netPerRound = parseFloat((totalAmount / totalRounds).toFixed(2));
    const dueDate = calculateDueDate(form.startDate, totalRounds, form.interestPeriod);
    const now = new Date().toISOString();

    if (isEditing && editId) {
      const existing = getDebtor(editId)!;
      updateDebtor({
        ...existing,
        name: form.name.trim(),
        principalAmount: principal,
        startDate: form.startDate,
        dueDate,
        interestRate: rate,
        interestPeriod: form.interestPeriod,
        paymentPerRound: netPerRound,
        totalRounds,
        totalInterest,
        totalAmount,
        notes: form.notes.trim() || undefined,
        updatedAt: now,
      });
    } else {
      const debtor: Debtor = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        principalAmount: principal,
        startDate: form.startDate,
        dueDate,
        interestRate: rate,
        interestPeriod: form.interestPeriod,
        paymentPerRound: netPerRound,
        totalRounds,
        totalInterest,
        totalAmount,
        amountPaid: 0,
        loanAdditions: [],
        notes: form.notes.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      };
      addDebtor(debtor);
    }

    setSaving(false);
    router.push("/debtors");
  }

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  const inputCls = (field: string) =>
    `w-full border-2 rounded-xl px-4 py-3.5 text-lg font-medium bg-white focus:outline-none focus:border-blue-400 transition-colors ${
      errors[field] ? "border-red-400 bg-red-50" : "border-gray-200"
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b-2 border-blue-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-4 max-w-lg mx-auto">
          <Link href="/debtors" className="p-2 rounded-xl hover:bg-blue-50 transition-colors">
            <ChevronLeft size={26} className="text-blue-700" />
          </Link>
          <h1 className="text-2xl font-bold text-blue-800">
            {isEditing ? "แก้ไขลูกหนี้" : "เพิ่มลูกหนี้ใหม่"}
          </h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 pt-5 space-y-5">

        {/* ชื่อ */}
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">ชื่อลูกหนี้ *</label>
          <input
            type="text" className={inputCls("name")}
            placeholder="เช่น สมชาย ใจดี"
            value={form.name} onChange={(e) => set("name", e.target.value)}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* เงินต้น */}
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">เงินต้น (฿) *</label>
          <input
            type="number" inputMode="decimal" className={inputCls("principalAmount")}
            placeholder="0.00" value={form.principalAmount}
            onChange={(e) => set("principalAmount", e.target.value)}
            min="0" step="0.01"
          />
          {errors.principalAmount && <p className="text-red-500 text-sm mt-1">{errors.principalAmount}</p>}
        </div>

        {/* วันที่เริ่มต้น */}
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">วันที่เริ่มต้น *</label>
          <input
            type="date" className={inputCls("startDate")}
            value={form.startDate} onChange={(e) => set("startDate", e.target.value)}
          />
          {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
        </div>

        {/* อัตราดอกเบี้ย */}
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">
            อัตราดอกเบี้ย (%) *
          </label>
          <input
            type="number" inputMode="decimal" className={inputCls("interestRate")}
            placeholder="เช่น 10 (หมายถึง 10% ของเงินต้น)"
            value={form.interestRate}
            onChange={(e) => set("interestRate", e.target.value)}
            min="0" step="0.01"
          />
          {errors.interestRate && <p className="text-red-500 text-sm mt-1">{errors.interestRate}</p>}
          <p className="text-xs text-gray-400 mt-1">
            คิดจากเงินต้นครั้งเดียว เช่น 10% ของ ฿10,000 = ฿1,000
          </p>
        </div>

        {/* วิธีการทวง */}
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">วิธีการทวงเงิน *</label>
          <div className="grid grid-cols-2 gap-2">
            {PERIODS.map((p) => (
              <button
                key={p} type="button"
                onClick={() => set("interestPeriod", p)}
                className={`py-3.5 px-4 rounded-xl text-base font-semibold border-2 transition-colors ${
                  form.interestPeriod === p
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                }`}
              >
                {getPeriodLabel(p)}
              </button>
            ))}
          </div>
        </div>

        {/* เก็บต่อรอบ */}
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">
            เก็บเงินต่อรอบ (฿) *
          </label>
          <input
            type="number" inputMode="decimal" className={inputCls("paymentPerRound")}
            placeholder="เช่น 1500"
            value={form.paymentPerRound}
            onChange={(e) => set("paymentPerRound", e.target.value)}
            min="0.01" step="0.01"
          />
          {errors.paymentPerRound && <p className="text-red-500 text-sm mt-1">{errors.paymentPerRound}</p>}
          <p className="text-xs text-gray-400 mt-1">
            ระบุเงินต้นที่ต้องการเก็บต่อรอบ ระบบจะเฉลี่ยดอกเบี้ยรวมในแต่ละรอบให้อัตโนมัติ
          </p>
        </div>

        {/* หมายเหตุ */}
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">หมายเหตุ (ถ้ามี)</label>
          <textarea
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-lg font-medium bg-white focus:outline-none focus:border-blue-400 resize-none"
            placeholder="รายละเอียดเพิ่มเติม..."
            rows={2} value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>

        {/* ── Preview ── */}
        {preview && (
          <div className="bg-blue-600 text-white rounded-2xl p-5 shadow-md space-y-0">
            <div className="flex items-center gap-2 mb-4">
              <Calculator size={20} />
              <span className="text-lg font-bold">ตัวอย่างการคำนวณ</span>
            </div>

            {/* ยอดเงิน */}
            <div className="space-y-2 mb-3">
              <PRow label="เงินต้น" value={formatCurrency(parseFloat(form.principalAmount) || 0)} />
              <PRow label={`ดอกเบี้ย ${form.interestRate || 0}%`} value={formatCurrency(preview.totalInterest)} />
              <div className="h-px bg-blue-500" />
              <PRow label="ยอดรวมทั้งหมด" value={formatCurrency(preview.totalAmount)} large />
            </div>

            {/* ตารางการทวง */}
            {preview.totalRounds > 0 && (
              <div className="bg-blue-500/40 rounded-2xl p-4 space-y-2.5 mt-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <CalendarCheck size={16} />
                  <span className="font-bold text-sm">ตารางการทวง ({getPeriodLabel(form.interestPeriod)})</span>
                </div>
                <PRow label="จำนวนรอบทั้งหมด" value={`${preview.totalRounds} รอบ`} large />

                {/* Per-round net amount */}
                <div className="bg-blue-600/50 rounded-xl p-3 mt-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-200">เก็บต่อรอบ (รวมดอกเบี้ย)</span>
                    <span className="font-extrabold text-yellow-300 text-base">
                      {formatCurrency(preview.netPerRound)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-blue-300 mt-1.5">
                    <span>เงินต้น {formatCurrency(parseFloat(form.principalAmount) || 0)} ÷ {preview.totalRounds} รอบ + ดอกเบี้ยเฉลี่ย</span>
                  </div>
                </div>

                {/* วันครบกำหนด auto */}
                {preview.dueDate && (
                  <div className="flex items-center justify-between bg-green-500/30 rounded-xl px-3 py-2.5 mt-2">
                    <span className="text-sm font-semibold flex items-center gap-1.5">
                      <CalendarCheck size={15} />
                      วันครบกำหนด (อัตโนมัติ)
                    </span>
                    <span className="font-extrabold text-yellow-300">
                      {formatDate(preview.dueDate)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit" disabled={saving || !preview?.dueDate}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-4 rounded-2xl text-xl font-bold shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save size={22} />
          {saving ? "กำลังบันทึก..." : isEditing ? "อัปเดตลูกหนี้" : "บันทึกลูกหนี้"}
        </button>
        <div className="h-4" />
      </form>
    </>
  );
}

// ── Helper row component ──────────────────────────────────────────────────────
function PRow({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={large ? "text-blue-100 font-bold" : "text-blue-200 text-sm"}>
        {label}
      </span>
      <span className={large ? "font-extrabold text-xl" : "font-bold text-sm"}>
        {value}
      </span>
    </div>
  );
}

export default function AddDebtPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">กำลังโหลด...</div>}>
      <AddDebtForm />
    </Suspense>
  );
}

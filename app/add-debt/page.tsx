"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Save, Calculator } from "lucide-react";
import {
  calculateInterest,
  calculateTotalRounds,
  getPeriodLabel,
  formatCurrency,
} from "@/lib/calculator";
import { addDebtor, updateDebtor, getDebtor } from "@/lib/store";
import type { Debtor, InterestPeriod } from "@/types";
import Link from "next/link";

const PERIODS: InterestPeriod[] = ["daily", "weekly", "biweekly", "monthly"];

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
    dueDate: "",
    interestRate: "",
    interestPeriod: "monthly" as InterestPeriod,
    paymentPerRound: "",
    notes: "",
  });

  const [preview, setPreview] = useState<{
    totalInterest: number;
    totalAmount: number;
    totalRounds: number;
    lastRoundAmount: number;
  } | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Load existing debtor when editing
  useEffect(() => {
    if (!editId) return;
    const d = getDebtor(editId);
    if (d) {
      setForm({
        name: d.name,
        principalAmount: String(d.principalAmount),
        startDate: d.startDate,
        dueDate: d.dueDate,
        interestRate: String(d.interestRate),
        interestPeriod: d.interestPeriod,
        paymentPerRound: String(d.paymentPerRound),
        notes: d.notes ?? "",
      });
    }
  }, [editId]);

  // Live calculation preview
  useEffect(() => {
    const principal = parseFloat(form.principalAmount);
    const rate = parseFloat(form.interestRate);
    const ppr = parseFloat(form.paymentPerRound);

    if (
      !isNaN(principal) && principal > 0 &&
      !isNaN(rate) && rate >= 0 &&
      form.startDate && form.dueDate
    ) {
      const { totalInterest, totalAmount } = calculateInterest(
        principal, rate, form.startDate, form.dueDate, form.interestPeriod
      );

      if (!isNaN(ppr) && ppr > 0) {
        const totalRounds = calculateTotalRounds(totalAmount, ppr);
        const lastRoundAmount = parseFloat(
          (totalAmount - (totalRounds - 1) * ppr).toFixed(2)
        );
        setPreview({ totalInterest, totalAmount, totalRounds, lastRoundAmount });
      } else {
        setPreview({ totalInterest, totalAmount, totalRounds: 0, lastRoundAmount: 0 });
      }
    } else {
      setPreview(null);
    }
  }, [
    form.principalAmount, form.interestRate, form.startDate,
    form.dueDate, form.interestPeriod, form.paymentPerRound,
  ]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "กรุณาใส่ชื่อลูกหนี้";
    const p = parseFloat(form.principalAmount);
    if (!form.principalAmount || isNaN(p) || p <= 0)
      e.principalAmount = "กรุณาใส่จำนวนเงินที่ถูกต้อง";
    const r = parseFloat(form.interestRate);
    if (!form.interestRate || isNaN(r) || r < 0)
      e.interestRate = "กรุณาใส่อัตราดอกเบี้ยที่ถูกต้อง";
    if (!form.startDate) e.startDate = "กรุณาเลือกวันที่เริ่มต้น";
    if (!form.dueDate) e.dueDate = "กรุณาเลือกวันครบกำหนด";
    if (form.startDate && form.dueDate && form.dueDate <= form.startDate)
      e.dueDate = "วันครบกำหนดต้องอยู่หลังวันที่เริ่มต้น";
    const ppr = parseFloat(form.paymentPerRound);
    if (!form.paymentPerRound || isNaN(ppr) || ppr <= 0)
      e.paymentPerRound = "กรุณาใส่จำนวนเงินที่เก็บต่อรอบ";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const principal = parseFloat(form.principalAmount);
    const rate = parseFloat(form.interestRate);
    const ppr = parseFloat(form.paymentPerRound);
    const { totalInterest, totalAmount } = calculateInterest(
      principal, rate, form.startDate, form.dueDate, form.interestPeriod
    );
    const totalRounds = calculateTotalRounds(totalAmount, ppr);
    const now = new Date().toISOString();

    if (isEditing && editId) {
      const existing = getDebtor(editId)!;
      updateDebtor({
        ...existing,
        name: form.name.trim(),
        principalAmount: principal,
        startDate: form.startDate,
        dueDate: form.dueDate,
        interestRate: rate,
        interestPeriod: form.interestPeriod,
        paymentPerRound: ppr,
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
        dueDate: form.dueDate,
        interestRate: rate,
        interestPeriod: form.interestPeriod,
        paymentPerRound: ppr,
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

  const inputClass = (field: string) =>
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
            type="text"
            className={inputClass("name")}
            placeholder="เช่น สมชาย ใจดี"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* เงินต้น */}
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">เงินต้น (฿) *</label>
          <input
            type="number" inputMode="decimal"
            className={inputClass("principalAmount")}
            placeholder="0.00"
            value={form.principalAmount}
            onChange={(e) => set("principalAmount", e.target.value)}
            min="0" step="0.01"
          />
          {errors.principalAmount && <p className="text-red-500 text-sm mt-1">{errors.principalAmount}</p>}
        </div>

        {/* วันที่ */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-base font-bold text-gray-700 mb-2">วันที่เริ่มต้น *</label>
            <input
              type="date" className={inputClass("startDate")}
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
            {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
          </div>
          <div>
            <label className="block text-base font-bold text-gray-700 mb-2">วันครบกำหนด *</label>
            <input
              type="date" className={inputClass("dueDate")}
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
              min={form.startDate}
            />
            {errors.dueDate && <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>}
          </div>
        </div>

        {/* อัตราดอกเบี้ย */}
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">อัตราดอกเบี้ย (%) *</label>
          <input
            type="number" inputMode="decimal"
            className={inputClass("interestRate")}
            placeholder="เช่น 5"
            value={form.interestRate}
            onChange={(e) => set("interestRate", e.target.value)}
            min="0" step="0.01"
          />
          {errors.interestRate && <p className="text-red-500 text-sm mt-1">{errors.interestRate}</p>}
        </div>

        {/* ระยะเวลาดอกเบี้ย */}
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">ระยะเวลาดอกเบี้ย *</label>
          <div className="grid grid-cols-2 gap-2">
            {PERIODS.map((p) => (
              <button
                key={p} type="button"
                onClick={() => set("interestPeriod", p)}
                className={`py-3 px-4 rounded-xl text-base font-semibold border-2 transition-colors ${
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

        {/* เก็บเงินต่อรอบ */}
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">
            เก็บเงินต่อรอบ (฿) *
          </label>
          <input
            type="number" inputMode="decimal"
            className={inputClass("paymentPerRound")}
            placeholder="เช่น 1500"
            value={form.paymentPerRound}
            onChange={(e) => set("paymentPerRound", e.target.value)}
            min="0.01" step="0.01"
          />
          {errors.paymentPerRound && (
            <p className="text-red-500 text-sm mt-1">{errors.paymentPerRound}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            ระบบจะคำนวณจำนวนรอบให้อัตโนมัติ
          </p>
        </div>

        {/* หมายเหตุ */}
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">หมายเหตุ (ถ้ามี)</label>
          <textarea
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-lg font-medium bg-white focus:outline-none focus:border-blue-400 transition-colors resize-none"
            placeholder="รายละเอียดเพิ่มเติม..."
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>

        {/* Preview */}
        {preview && (
          <div className="bg-blue-600 text-white rounded-2xl p-5 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <Calculator size={20} />
              <span className="text-lg font-bold">ตัวอย่างการคำนวณ</span>
            </div>
            <div className="space-y-2.5">
              <Row label="เงินต้น" value={formatCurrency(parseFloat(form.principalAmount) || 0)} />
              <Row label="ดอกเบี้ยรวม" value={formatCurrency(preview.totalInterest)} />
              <div className="h-px bg-blue-500 my-1" />
              <Row label="ยอดรวมทั้งหมด" value={formatCurrency(preview.totalAmount)} large />

              {preview.totalRounds > 0 && (
                <>
                  <div className="h-px bg-blue-500 my-1" />
                  <Row
                    label="เก็บต่อรอบ"
                    value={formatCurrency(parseFloat(form.paymentPerRound))}
                  />
                  <Row
                    label="จำนวนทั้งหมด"
                    value={`${preview.totalRounds} รอบ`}
                    large
                  />
                  {preview.totalRounds > 1 && (
                    <>
                      <div className="bg-blue-500/40 rounded-xl p-3 mt-2 space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-200">
                            รอบที่ 1 – {preview.totalRounds - 1}
                          </span>
                          <span className="font-bold">
                            {formatCurrency(parseFloat(form.paymentPerRound))} / รอบ
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-200">
                            รอบที่ {preview.totalRounds} (สุดท้าย)
                          </span>
                          <span className="font-bold">
                            {formatCurrency(preview.lastRoundAmount)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white py-4 rounded-2xl text-xl font-bold shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Save size={22} />
          {saving ? "กำลังบันทึก..." : isEditing ? "อัปเดตลูกหนี้" : "บันทึกลูกหนี้"}
        </button>

        <div className="h-4" />
      </form>
    </>
  );
}

function Row({
  label,
  value,
  large,
}: {
  label: string;
  value: string;
  large?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={large ? "text-blue-100 font-bold text-base" : "text-blue-200 text-sm"}>
        {label}
      </span>
      <span className={large ? "font-extrabold text-xl" : "font-bold"}>
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

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Save, Calculator } from "lucide-react";
import { calculateInterest, getPeriodLabel, formatCurrency } from "@/lib/calculator";
import { addDebtor, updateDebtor, getDebtor } from "@/lib/store";
import type { Debtor, InterestPeriod } from "@/types";
import Link from "next/link";
import { Suspense } from "react";

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
    notes: "",
  });

  const [preview, setPreview] = useState<{
    totalInterest: number;
    totalAmount: number;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editId) {
      const d = getDebtor(editId);
      if (d) {
        setForm({
          name: d.name,
          principalAmount: String(d.principalAmount),
          startDate: d.startDate,
          dueDate: d.dueDate,
          interestRate: String(d.interestRate),
          interestPeriod: d.interestPeriod,
          notes: d.notes ?? "",
        });
      }
    }
  }, [editId]);

  useEffect(() => {
    const principal = parseFloat(form.principalAmount);
    const rate = parseFloat(form.interestRate);
    if (
      !isNaN(principal) &&
      !isNaN(rate) &&
      form.startDate &&
      form.dueDate &&
      principal > 0
    ) {
      setPreview(
        calculateInterest(
          principal,
          rate,
          form.startDate,
          form.dueDate,
          form.interestPeriod
        )
      );
    } else {
      setPreview(null);
    }
  }, [
    form.principalAmount,
    form.interestRate,
    form.startDate,
    form.dueDate,
    form.interestPeriod,
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
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const principal = parseFloat(form.principalAmount);
    const rate = parseFloat(form.interestRate);
    const calc = calculateInterest(
      principal,
      rate,
      form.startDate,
      form.dueDate,
      form.interestPeriod
    );

    const now = new Date().toISOString();
    if (isEditing && editId) {
      const existing = getDebtor(editId)!;
      const updated: Debtor = {
        ...existing,
        name: form.name.trim(),
        principalAmount: principal,
        startDate: form.startDate,
        dueDate: form.dueDate,
        interestRate: rate,
        interestPeriod: form.interestPeriod,
        totalInterest: calc.totalInterest,
        totalAmount: calc.totalAmount,
        notes: form.notes.trim() || undefined,
        updatedAt: now,
      };
      updateDebtor(updated);
    } else {
      const debtor: Debtor = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        principalAmount: principal,
        startDate: form.startDate,
        dueDate: form.dueDate,
        interestRate: rate,
        interestPeriod: form.interestPeriod,
        totalInterest: calc.totalInterest,
        totalAmount: calc.totalAmount,
        amountPaid: 0,
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
          <Link
            href="/debtors"
            className="p-2 rounded-xl hover:bg-blue-50 transition-colors"
          >
            <ChevronLeft size={26} className="text-blue-700" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-blue-800">
              {isEditing ? "แก้ไขลูกหนี้" : "เพิ่มลูกหนี้ใหม่"}
            </h1>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 pt-5 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">
            ชื่อลูกหนี้ *
          </label>
          <input
            type="text"
            className={inputClass("name")}
            placeholder="เช่น สมชาย ใจดี"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        {/* Principal */}
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">
            เงินต้น (฿) *
          </label>
          <input
            type="number"
            inputMode="decimal"
            className={inputClass("principalAmount")}
            placeholder="0.00"
            value={form.principalAmount}
            onChange={(e) => set("principalAmount", e.target.value)}
            min="0"
            step="0.01"
          />
          {errors.principalAmount && (
            <p className="text-red-500 text-sm mt-1">{errors.principalAmount}</p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-base font-bold text-gray-700 mb-2">
              วันที่เริ่มต้น *
            </label>
            <input
              type="date"
              className={inputClass("startDate")}
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
            {errors.startDate && (
              <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>
            )}
          </div>
          <div>
            <label className="block text-base font-bold text-gray-700 mb-2">
              วันครบกำหนด *
            </label>
            <input
              type="date"
              className={inputClass("dueDate")}
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
              min={form.startDate}
            />
            {errors.dueDate && (
              <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>
            )}
          </div>
        </div>

        {/* Interest Rate */}
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">
            อัตราดอกเบี้ย (%) *
          </label>
          <input
            type="number"
            inputMode="decimal"
            className={inputClass("interestRate")}
            placeholder="เช่น 5"
            value={form.interestRate}
            onChange={(e) => set("interestRate", e.target.value)}
            min="0"
            step="0.01"
          />
          {errors.interestRate && (
            <p className="text-red-500 text-sm mt-1">{errors.interestRate}</p>
          )}
        </div>

        {/* Interest Period */}
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">
            ระยะเวลาดอกเบี้ย *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
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

        {/* Notes */}
        <div>
          <label className="block text-base font-bold text-gray-700 mb-2">
            หมายเหตุ (ถ้ามี)
          </label>
          <textarea
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-lg font-medium bg-white focus:outline-none focus:border-blue-400 transition-colors resize-none"
            placeholder="รายละเอียดเพิ่มเติม..."
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>

        {/* Calculation Preview */}
        {preview && (
          <div className="bg-blue-600 text-white rounded-2xl p-5 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <Calculator size={20} />
              <span className="text-lg font-bold">ตัวอย่างการคำนวณ</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-blue-200">เงินต้น</span>
                <span className="font-bold">
                  {formatCurrency(parseFloat(form.principalAmount) || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-200">ดอกเบี้ยรวม</span>
                <span className="font-bold">
                  {formatCurrency(preview.totalInterest)}
                </span>
              </div>
              <div className="h-px bg-blue-500 my-2" />
              <div className="flex justify-between">
                <span className="text-blue-100 font-bold text-lg">
                  ยอดรวมที่ต้องเก็บ
                </span>
                <span className="font-extrabold text-xl">
                  {formatCurrency(preview.totalAmount)}
                </span>
              </div>
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

export default function AddDebtPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">กำลังโหลด...</div>}>
      <AddDebtForm />
    </Suspense>
  );
}

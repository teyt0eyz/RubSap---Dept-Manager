"use client";

import type { Debtor } from "@/types";
import { getNextPaymentDate, calculateRoundsPaid, formatCurrency } from "@/lib/calculator";
import { saveDebtorsToIDB } from "@/lib/idb";

export function isNotifSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPermission(): NotificationPermission {
  if (!isNotifSupported()) return "denied";
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!isNotifSupported()) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

// ── Show notification via SW (works in background on Android PWA) ─────────────

async function show(title: string, body: string, tag: string) {
  if (typeof window === "undefined" || Notification.permission !== "granted") return;
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        tag,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        data: { url: "/" },
      } as NotificationOptions);
    } else {
      new Notification(title, { body, tag });
    }
  } catch {
    try { new Notification(title, { body, tag }); } catch { /* unsupported */ }
  }
}

// ── Dedup: avoid sending same notification twice on same day ──────────────────

const STORAGE_KEY = "rubsap_notified";

function getMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); }
  catch { return {}; }
}

function notifiedToday(key: string): boolean {
  return getMap()[key] === new Date().toISOString().split("T")[0];
}

function markSent(key: string) {
  const map = getMap();
  const today = new Date().toISOString().split("T")[0];
  map[key] = today;
  // prune keys older than 14 days
  const cutoff = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];
  for (const k of Object.keys(map)) {
    if (map[k] < cutoff) delete map[k];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

// ── Periodic Background Sync registration ─────────────────────────────────────

export async function registerPeriodicSync(debtors: Debtor[]): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  await saveDebtorsToIDB(debtors);
  try {
    const reg = await navigator.serviceWorker.ready;
    if ("periodicSync" in reg) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (reg as any).periodicSync.register("check-payments", {
        minInterval: 60 * 60 * 1000,
      });
    }
  } catch { /* periodicSync not supported on this device */ }
}

// ── Main check ────────────────────────────────────────────────────────────────

export async function checkAndNotify(debtors: Debtor[]): Promise<void> {
  if (Notification.permission !== "granted") return;

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split("T")[0];

  for (const d of debtors) {
    const balance = parseFloat((d.totalAmount - d.amountPaid).toFixed(2));
    if (balance <= 0) continue;

    // Overdue
    if (new Date(d.dueDate) < now) {
      const key = `overdue-${d.id}`;
      if (!notifiedToday(key)) {
        await show(
          `⚠️ เกินกำหนด: ${d.name}`,
          `ค้างชำระ ${formatCurrency(balance)} — ทวงเงินด่วน!`,
          key
        );
        markSent(key);
      }
      continue;
    }

    const roundsPaid = calculateRoundsPaid(d.amountPaid, d.paymentPerRound);
    const nextPayDate = getNextPaymentDate(d.startDate, roundsPaid, d.interestPeriod);
    const nextStr = nextPayDate.toISOString().split("T")[0];
    const nextAmt = parseFloat(Math.min(balance, d.paymentPerRound).toFixed(2));

    // Due today
    if (nextStr === today) {
      const key = `collect-${d.id}-${today}`;
      if (!notifiedToday(key)) {
        await show(
          `💰 ทวงเงินวันนี้: ${d.name}`,
          `รอบที่ ${roundsPaid + 1} — ${formatCurrency(nextAmt)}`,
          key
        );
        markSent(key);
      }
    }

    // Due tomorrow (advance reminder)
    if (nextStr === tomorrow) {
      const key = `upcoming-${d.id}-${today}`;
      if (!notifiedToday(key)) {
        await show(
          `📅 พรุ่งนี้ทวงเงิน: ${d.name}`,
          `รอบที่ ${roundsPaid + 1} — ${formatCurrency(nextAmt)}`,
          key
        );
        markSent(key);
      }
    }
  }
}

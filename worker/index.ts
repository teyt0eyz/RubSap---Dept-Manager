// Custom service worker additions — appended by next-pwa
/* eslint-disable no-restricted-globals */
/* eslint-disable @typescript-eslint/no-explicit-any */

const _sw = self as any;

// ── Notification click: open app ─────────────────────────────────────────────
_sw.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? "/";
  event.waitUntil(
    _sw.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients: any[]) => {
        const existing = clients.find((c: any) => c.url.includes(_sw.location.origin));
        if (existing) {
          existing.focus();
          return existing.navigate(url);
        }
        return _sw.clients.openWindow(url);
      })
  );
});

// ── IndexedDB helpers (SW can't use localStorage) ────────────────────────────
function idbOpen(): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = (_sw.indexedDB as IDBFactory).open("rubsap_db", 1);
    req.onupgradeneeded = (e: any) => {
      const db: IDBDatabase = e.target.result;
      if (!db.objectStoreNames.contains("debtors")) db.createObjectStore("debtors");
      if (!db.objectStoreNames.contains("notified")) db.createObjectStore("notified");
    };
    req.onsuccess = (e: any) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(store: string, key: string): Promise<any> {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store, "readonly").objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(store: string, key: string, value: any): Promise<void> {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Notification dedup via IDB ────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

async function notifiedToday(key: string): Promise<boolean> {
  const val = await idbGet("notified", key);
  return val === todayStr();
}

async function markSent(key: string): Promise<void> {
  await idbPut("notified", key, todayStr());
}

// ── Payment helpers (mirrors lib/calculator.ts) ───────────────────────────────
function daysPerPeriod(period: string): number {
  if (period === "daily") return 1;
  if (period === "weekly") return 7;
  if (period === "biweekly") return 14;
  return 30; // monthly default
}

function getNextPayDate(startDate: string, roundsPaid: number, period: string): Date {
  const base = new Date(startDate);
  return new Date(base.getTime() + roundsPaid * daysPerPeriod(period) * 86400000);
}

function roundsPaid(amountPaid: number, paymentPerRound: number): number {
  if (paymentPerRound <= 0) return 0;
  return Math.floor(amountPaid / paymentPerRound);
}

function fmt(amount: number): string {
  return "฿" + amount.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ── Core check: reads debtors from IDB and fires notifications ────────────────
async function checkPaymentsAndNotify(): Promise<void> {
  const debtors: any[] = (await idbGet("debtors", "all")) ?? [];
  if (!debtors.length) return;

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split("T")[0];

  for (const d of debtors) {
    const balance = parseFloat((d.totalAmount - d.amountPaid).toFixed(2));
    if (balance <= 0) continue;

    if (new Date(d.dueDate) < now) {
      const key = `overdue-${d.id}`;
      if (!(await notifiedToday(key))) {
        await _sw.registration.showNotification(`⚠️ เกินกำหนด: ${d.name}`, {
          body: `ค้างชำระ ${fmt(balance)} — ทวงเงินด่วน!`,
          tag: key,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-192x192.png",
          data: { url: "/" },
        });
        await markSent(key);
      }
      continue;
    }

    const paid = roundsPaid(d.amountPaid, d.paymentPerRound);
    const nextDate = getNextPayDate(d.startDate, paid, d.interestPeriod);
    const nextStr = nextDate.toISOString().split("T")[0];
    const nextAmt = parseFloat(Math.min(balance, d.paymentPerRound).toFixed(2));

    if (nextStr === today) {
      const key = `collect-${d.id}-${today}`;
      if (!(await notifiedToday(key))) {
        await _sw.registration.showNotification(`💰 ทวงเงินวันนี้: ${d.name}`, {
          body: `รอบที่ ${paid + 1} — ${fmt(nextAmt)}`,
          tag: key,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-192x192.png",
          data: { url: "/" },
        });
        await markSent(key);
      }
    }

    if (nextStr === tomorrow) {
      const key = `upcoming-${d.id}-${today}`;
      if (!(await notifiedToday(key))) {
        await _sw.registration.showNotification(`📅 พรุ่งนี้ทวงเงิน: ${d.name}`, {
          body: `รอบที่ ${paid + 1} — ${fmt(nextAmt)}`,
          tag: key,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-192x192.png",
          data: { url: "/" },
        });
        await markSent(key);
      }
    }
  }
}

// ── Periodic Background Sync ──────────────────────────────────────────────────
_sw.addEventListener("periodicsync", (event: any) => {
  if (event.tag === "check-payments") {
    event.waitUntil(checkPaymentsAndNotify());
  }
});

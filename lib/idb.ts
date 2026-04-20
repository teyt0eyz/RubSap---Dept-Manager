const DB_NAME = "rubsap_db";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("debtors")) db.createObjectStore("debtors");
      if (!db.objectStoreNames.contains("notified")) db.createObjectStore("notified");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDebtorsToIDB(debtors: unknown[]): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("debtors", "readwrite");
      tx.objectStore("debtors").put(debtors, "all");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore — IDB unavailable */ }
}

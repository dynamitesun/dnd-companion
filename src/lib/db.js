// Tiny IndexedDB key-value store. Everything the app saves lives here,
// so large things (PDF text, map images) don't hit localStorage limits.
const DB_NAME = 'solo-dm';
const STORE = 'kv';
let dbPromise;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx(mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const req = fn(store);
        t.oncomplete = () => resolve(req && req.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

export const kv = {
  get: (key) => tx('readonly', (s) => s.get(key)),
  set: (key, val) => tx('readwrite', (s) => s.put(val, key)),
  del: (key) => tx('readwrite', (s) => s.delete(key)),
  keys: () => tx('readonly', (s) => s.getAllKeys()),
};

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

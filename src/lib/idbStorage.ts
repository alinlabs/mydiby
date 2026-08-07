import { DatabaseTable } from '../types';

const DB_NAME = 'MyDiby_IndexedDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_databases';
const KEY_ACTIVE_ID = 'datacraft_active_db_id_v1';
const LEGACY_STORAGE_KEY_TABLES = 'datacraft_databases_v1';

// Open or create IndexedDB connection
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get item from IndexedDB
export async function getIDBItem<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve((request.result as T) || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB read fallback:', err);
    return null;
  }
}

// Set item in IndexedDB
export async function setIDBItem<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB write error:', err);
  }
}

// Load databases with automatic migration from localStorage if available
export async function loadDatabasesAsync(): Promise<DatabaseTable[]> {
  try {
    // 1. Try loading from IndexedDB
    const idbData = await getIDBItem<DatabaseTable[]>('databases');
    if (idbData && Array.isArray(idbData) && idbData.length > 0) {
      return idbData;
    }

    // 2. Migration: check if legacy localStorage exists
    const rawLegacy = localStorage.getItem(LEGACY_STORAGE_KEY_TABLES);
    if (rawLegacy) {
      try {
        const parsedLegacy = JSON.parse(rawLegacy);
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
          // Save to IndexedDB asynchronously
          await setIDBItem('databases', parsedLegacy);
          console.log('Migrated databases from localStorage to IndexedDB successfully!');
          return parsedLegacy;
        }
      } catch (e) {
        console.error('Error parsing legacy localStorage data:', e);
      }
    }
  } catch (err) {
    console.error('Error in loadDatabasesAsync:', err);
  }

  // Default database if empty
  const defaultDb: DatabaseTable = {
    id: 'default_db',
    name: 'Database Utama Perusahaan',
    description: 'Daftar perusahaan & kontak PIC industri',
    records: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await setIDBItem('databases', [defaultDb]);
  return [defaultDb];
}

// Save databases asynchronously to IndexedDB
export async function saveDatabasesAsync(databases: DatabaseTable[]): Promise<void> {
  await setIDBItem('databases', databases);
}

// Active database ID
export function loadActiveDatabaseId(): string {
  return localStorage.getItem(KEY_ACTIVE_ID) || 'default_db';
}

export function saveActiveDatabaseId(id: string): void {
  localStorage.setItem(KEY_ACTIVE_ID, id);
}

// Estimate storage memory usage in MB
export async function getStorageEstimate(): Promise<{ usedMB: string; quotaMB: string; recordCount: number }> {
  let recordCount = 0;
  try {
    const dbs = await getIDBItem<DatabaseTable[]>('databases');
    if (dbs) {
      dbs.forEach(db => {
        recordCount += db.records?.length || 0;
      });
    }
  } catch (e) {
    // ignore
  }

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
      const quotaMB = ((estimate.quota || 0) / (1024 * 1024)).toFixed(0);
      return { usedMB, quotaMB, recordCount };
    } catch (e) {
      // ignore
    }
  }

  return { usedMB: '0.5', quotaMB: 'Unrestricted', recordCount };
}

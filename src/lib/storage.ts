import { CompanyRecord, DatabaseTable } from '../types';
import { loadDatabasesAsync, saveDatabasesAsync, loadActiveDatabaseId, saveActiveDatabaseId } from './idbStorage';

export { loadDatabasesAsync, saveDatabasesAsync, loadActiveDatabaseId, saveActiveDatabaseId };

const STORAGE_KEY_TABLES = 'datacraft_databases_v1';

export const INITIAL_SAMPLE_RECORDS: Omit<CompanyRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [];

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

export function createDefaultDatabase(): DatabaseTable {
  const now = new Date().toISOString();
  return {
    id: 'default_db',
    name: 'Database Utama Perusahaan',
    description: 'Daftar perusahaan & kontak PIC industri',
    records: [],
    createdAt: now,
    updatedAt: now
  };
}

// Synchronous fallback loader for immediate initial state
export function loadDatabases(): DatabaseTable[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TABLES);
    if (!raw) {
      const defaultDb = createDefaultDatabase();
      return [defaultDb];
    }
    const parsed: DatabaseTable[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const defaultDb = createDefaultDatabase();
      return [defaultDb];
    }
    return parsed;
  } catch (err) {
    const defaultDb = createDefaultDatabase();
    return [defaultDb];
  }
}

// Synchronous and asynchronous saving
export function saveDatabases(databases: DatabaseTable[]): void {
  // Save asynchronously to IndexedDB (unrestricted capacity for 50,000+ items)
  saveDatabasesAsync(databases).catch(err => {
    console.error('Failed to save to IndexedDB', err);
  });

  // Attempt lightweight sync save to localStorage if small enough, or catch QuotaExceeded
  try {
    localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(databases));
  } catch (err) {
    // Quota exceeds 5MB, which is expected for 10,000+ items. IndexedDB already handles it!
  }
}

export function resequenceRecords(records: CompanyRecord[]): CompanyRecord[] {
  return records.map((record, idx) => ({
    ...record,
    no: idx + 1
  }));
}


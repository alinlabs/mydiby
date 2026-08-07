export interface CompanyRecord {
  id: string;
  no: number;
  areaKota: string;
  kawasan: string; // Opsional kawasan industri
  namaPerusahaan: string;
  bidang: string;
  namaPic: string;
  jabatanPic?: string;
  whatsapp: string;
  emailPic: string;
  telponKantor: string;
  emailKantor: string;
  website?: string;
  alamat: string;
  longitude?: string;
  latitude?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseTable {
  id: string;
  name: string;
  description?: string;
  records: CompanyRecord[];
  createdAt: string;
  updatedAt: string;
}

export type ExportFormat = 'json' | 'sql' | 'text' | 'csv' | 'pdf';

export interface ColumnOption {
  key: keyof CompanyRecord;
  jsonKey: string;
  label: string;
}

export type InputMode = 'manual' | 'quick' | 'import' | 'scan_ai' | 'paste_ai' | 'json_manual';

export interface SqlOptions {
  tableName: string;
  dialect: 'mysql' | 'postgresql' | 'sqlite';
  includeCreateTable: boolean;
}

export interface AiExtractionResult {
  records: Partial<CompanyRecord>[];
  rawSummary?: string;
}

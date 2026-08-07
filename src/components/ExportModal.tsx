import React from 'react';
import { X, Copy, Download, Check, Code, FileText, Database, Table, FileCheck2, CheckSquare, ChevronDown, ChevronUp, Filter, MapPin, Building2 } from 'lucide-react';
import { CompanyRecord, ExportFormat, SqlOptions } from '../types';
import { ALL_COLUMNS, exportToJSON, exportToSQL, exportToText, exportToCSV, downloadPDF, downloadFile, copyToClipboard } from '../lib/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: CompanyRecord[];
  selectedRecords?: CompanyRecord[];
  databaseName: string;
  initialFormat?: ExportFormat;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  records,
  selectedRecords = [],
  databaseName,
  initialFormat
}) => {
  const [activeFormat, setActiveFormat] = React.useState<ExportFormat>(initialFormat || 'json');
  const [copied, setCopied] = React.useState<boolean>(false);
  const [exportScope, setExportScope] = React.useState<'all' | 'selected'>('all');
  const [showColumnSelector, setShowColumnSelector] = React.useState<boolean>(false); // Default hidden/collapsed
  const [filterKota, setFilterKota] = React.useState<string>('ALL');
  const [filterKawasan, setFilterKawasan] = React.useState<string>('ALL');

  // Unique Kotas and Kawasans for Filter Dropdowns
  const uniqueKotas = React.useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.areaKota) set.add(r.areaKota.trim());
    });
    return Array.from(set).sort();
  }, [records]);

  const uniqueKawasans = React.useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.kawasan) set.add(r.kawasan.trim());
    });
    return Array.from(set).sort();
  }, [records]);

  // Sync state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (initialFormat) {
        setActiveFormat(initialFormat);
      }
      if (selectedRecords.length > 0) {
        setExportScope('selected');
      } else {
        setExportScope('all');
      }
      setShowColumnSelector(false); // Reset to collapsed on open
      setFilterKota('ALL');
      setFilterKawasan('ALL');
    }
  }, [isOpen, initialFormat, selectedRecords.length]);

  // Checkbox column selection (default: all 14 columns selected)
  const [selectedKeys, setSelectedKeys] = React.useState<(keyof CompanyRecord)[]>(
    ALL_COLUMNS.map(c => c.key)
  );

  // SQL options
  const [sqlDialect, setSqlDialect] = React.useState<'mysql' | 'postgresql' | 'sqlite'>('postgresql');
  const [includeCreateTable, setIncludeCreateTable] = React.useState<boolean>(true);

  const targetRecords = React.useMemo(() => {
    let list = exportScope === 'selected' && selectedRecords.length > 0 ? selectedRecords : records;
    if (filterKota !== 'ALL') {
      list = list.filter(r => (r.areaKota || '').trim() === filterKota);
    }
    if (filterKawasan !== 'ALL') {
      list = list.filter(r => (r.kawasan || '').trim() === filterKawasan);
    }
    return list;
  }, [exportScope, selectedRecords, records, filterKota, filterKawasan]);

  // Toggle single column checkbox
  const toggleColumn = (key: keyof CompanyRecord) => {
    if (selectedKeys.includes(key)) {
      if (selectedKeys.length <= 1) return; // Keep at least 1 column selected
      setSelectedKeys(selectedKeys.filter(k => k !== key));
    } else {
      setSelectedKeys([...selectedKeys, key]);
    }
  };

  const selectAllColumns = () => {
    setSelectedKeys(ALL_COLUMNS.map(c => c.key));
  };

  const deselectAllColumns = () => {
    setSelectedKeys(['namaPerusahaan']); // Keep at least 1 key
  };

  // Generate output string based on format and selected columns (for copy/download)
  const generatedOutput = React.useMemo(() => {
    switch (activeFormat) {
      case 'json':
        return exportToJSON(targetRecords, selectedKeys);
      case 'sql':
        const sqlOptions: SqlOptions = {
          tableName: databaseName || 'database_perusahaan',
          dialect: sqlDialect,
          includeCreateTable
        };
        return exportToSQL(targetRecords, sqlOptions, selectedKeys);
      case 'text':
        return exportToText(targetRecords, databaseName, selectedKeys);
      case 'csv':
        return exportToCSV(targetRecords, selectedKeys);
      default:
        return '';
    }
  }, [activeFormat, targetRecords, databaseName, sqlDialect, includeCreateTable, selectedKeys]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (activeFormat === 'pdf') return;
    copyToClipboard(generatedOutput).then((success) => {
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  };

  const handleDownload = () => {
    const cleanDbName = (databaseName || 'database').toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${cleanDbName}_${timestamp}`;

    if (activeFormat === 'pdf') {
      downloadPDF(targetRecords, databaseName || 'Database Perusahaan', `${filename}.pdf`, selectedKeys);
      return;
    }

    let ext = '.txt';
    let mimeType = 'text/plain';

    switch (activeFormat) {
      case 'json':
        ext = '.json';
        mimeType = 'application/json';
        break;
      case 'sql':
        ext = '.sql';
        mimeType = 'application/sql';
        break;
      case 'text':
        ext = '.txt';
        mimeType = 'text/plain';
        break;
      case 'csv':
        ext = '.csv';
        mimeType = 'text/csv;charset=utf-8;';
        break;
    }

    downloadFile(generatedOutput, `${filename}${ext}`, mimeType);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-xs shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Export Database Table</h2>
              <p className="text-xs text-slate-500">Pilih format file dan unduh data langsung</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 bg-slate-50/30">
          
          {/* Format Tabs & Scope Selector */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Format File Export
                </span>
              </div>

              {/* Scope Selector (All vs Selected) */}
              {selectedRecords.length > 0 && (
                <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => setExportScope('all')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      exportScope === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Semua ({records.length})
                  </button>
                  <button
                    onClick={() => setExportScope('selected')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      exportScope === 'selected' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Terpilih ({selectedRecords.length})
                  </button>
                </div>
              )}
            </div>

            {/* Format Buttons Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                onClick={() => setActiveFormat('json')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  activeFormat === 'json'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-600/30'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Code className="w-4 h-4" />
                <span>JSON</span>
              </button>

              <button
                onClick={() => setActiveFormat('sql')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  activeFormat === 'sql'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-600/30'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>SQL</span>
              </button>

              <button
                onClick={() => setActiveFormat('text')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  activeFormat === 'text'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-600/30'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Text</span>
              </button>

              <button
                onClick={() => setActiveFormat('csv')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  activeFormat === 'csv'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-600/30'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Table className="w-4 h-4" />
                <span>CSV</span>
              </button>

              <button
                onClick={() => setActiveFormat('pdf')}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-bold transition-all border col-span-2 sm:col-span-1 cursor-pointer ${
                  activeFormat === 'pdf'
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-md ring-2 ring-emerald-600/30'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FileCheck2 className="w-4 h-4" />
                <span>PDF</span>
              </button>
            </div>

            {/* SQL Specific Options */}
            {activeFormat === 'sql' && (
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-medium">Dialek SQL:</span>
                  <select
                    value={sqlDialect}
                    onChange={(e: any) => setSqlDialect(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-800 text-xs px-2.5 py-1 rounded-lg focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-2xs font-semibold"
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL / MariaDB</option>
                    <option value="sqlite">SQLite</option>
                  </select>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={includeCreateTable}
                    onChange={(e) => setIncludeCreateTable(e.target.checked)}
                    className="accent-emerald-600 rounded"
                  />
                  <span>Sertakan Perintah 'CREATE TABLE'</span>
                </label>
              </div>
            )}
          </div>

          {/* Filter Wilayah / Kawasan / Terlengkap */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Filter Data Export
                </span>
              </div>
              {(filterKota !== 'ALL' || filterKawasan !== 'ALL') ? (
                <button
                  onClick={() => { setFilterKota('ALL'); setFilterKawasan('ALL'); }}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                >
                  Reset (Data Terlengkap)
                </button>
              ) : (
                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Status: Terlengkap (Semua Data)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Filter Kota */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Filter Kota / Area:</span>
                </label>
                <select
                  value={filterKota}
                  onChange={(e) => setFilterKota(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="ALL">Semua Kota ({uniqueKotas.length} Kota - Terlengkap)</option>
                  {uniqueKotas.map(kota => (
                    <option key={kota} value={kota}>{kota}</option>
                  ))}
                </select>
              </div>

              {/* Filter Kawasan */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Filter Kawasan Industri:</span>
                </label>
                <select
                  value={filterKawasan}
                  onChange={(e) => setFilterKawasan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="ALL">Semua Kawasan ({uniqueKawasans.length} Kawasan)</option>
                  {uniqueKawasans.map(kawasan => (
                    <option key={kawasan} value={kawasan}>{kawasan}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Minimalist Collapsible Column Selector Dropdown (Default Hidden) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50/80 transition-colors text-left cursor-pointer select-none"
            >
              <div className="flex items-center gap-2.5">
                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800">
                  Pilih Kolom Yang Akan Diexport
                </span>
                <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[11px] border border-emerald-200/80">
                  {selectedKeys.length} / {ALL_COLUMNS.length} Kolom
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                <span className="hidden sm:inline text-[11px]">
                  {showColumnSelector ? 'Sembunyikan' : 'Atur Kolom'}
                </span>
                {showColumnSelector ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </button>

            {/* Collapsible Panel */}
            {showColumnSelector && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/40 space-y-3 animate-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between text-xs pb-1">
                  <span className="text-slate-500 text-[11px]">Centang kolom yang ingin dimasukkan ke file:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAllColumns}
                      className="text-emerald-700 hover:text-emerald-800 font-bold text-[11px] hover:underline cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={deselectAllColumns}
                      className="text-slate-500 hover:text-slate-700 text-[11px] hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Checkbox Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ALL_COLUMNS.map((col) => {
                    const isChecked = selectedKeys.includes(col.key);
                    return (
                      <label
                        key={col.key}
                        onClick={() => toggleColumn(col.key)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all select-none ${
                          isChecked
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100/70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by outer label click
                          className="accent-emerald-600 w-3.5 h-3.5 rounded shrink-0"
                        />
                        <div className="truncate">
                          <span className="block font-semibold truncate text-[11px]">{col.label}</span>
                          <span className="block text-[10px] text-slate-400 font-mono font-normal truncate">{col.jsonKey}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Export Summary Bar */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50/60 border border-emerald-200/60 rounded-xl text-xs text-emerald-900">
            <span>Akan mengeksport <strong>{targetRecords.length.toLocaleString('id-ID')}</strong> data dengan <strong>{selectedKeys.length}</strong> kolom.</span>
            <span className="font-mono text-[10px] font-bold uppercase text-emerald-700 bg-white/80 px-2 py-0.5 rounded border border-emerald-200/50">
              .{activeFormat}
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Batal
          </button>

          <div className="flex items-center gap-2">
            {activeFormat !== 'pdf' && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
              </button>
            )}

            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all hover:scale-102 active:scale-98 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh File ({activeFormat.toUpperCase()})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};


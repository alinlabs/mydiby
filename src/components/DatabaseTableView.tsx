import React from 'react';
import { 
  Building2, Phone, Mail, MapPin, Edit2, Trash2, Globe,
  MessageSquare, ArrowUpDown, CheckSquare, Square, ExternalLink,
  ChevronDown, ChevronUp, Filter, Layers, LayoutTemplate, LayoutList, List, Smartphone,
  WrapText, Search, Plus, Download, UserPlus, Zap, Upload, Scan, Sparkles, FileText, FileJson,
  Table as TableIcon, Code, Database, MoreVertical, CheckCheck, PieChart,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, HardDrive, Wifi, WifiOff
} from 'lucide-react';
import { CompanyRecord, InputMode, ExportFormat } from '../types';
import { formatWhatsAppUrl } from '../lib/exportUtils';
import { formatTelponKantor, formatWhatsApp, cleanRawPhone } from '../lib/phoneUtils';
import { BottomNavigation } from './BottomNavigation';

export const calculateCompleteness = (r: CompanyRecord): number => {
  const fields: (keyof CompanyRecord)[] = [
    'namaPerusahaan',
    'areaKota',
    'kawasan',
    'bidang',
    'namaPic',
    'jabatanPic',
    'whatsapp',
    'emailPic',
    'telponKantor',
    'emailKantor',
    'website',
    'alamat',
    'latitude',
    'longitude',
  ];
  const filled = fields.filter(f => String(r[f] || '').trim().length > 0).length;
  return Math.round((filled / fields.length) * 100);
};

const CompletenessCircle: React.FC<{ percent: number }> = ({ percent }) => {
  let colorClass = "text-rose-600 font-extrabold";
  if (percent >= 80) {
    colorClass = "text-emerald-600 font-extrabold";
  } else if (percent >= 50) {
    colorClass = "text-amber-600 font-extrabold";
  }

  return (
    <span
      className={`font-mono text-xs ${colorClass}`}
      title={`Kelengkapan Data: ${percent}%`}
    >
      {percent}%
    </span>
  );
};

interface DatabaseTableViewProps {
  records: CompanyRecord[];
  selectedIds: string[];
  onToggleSelectRow: (id: string) => void;
  onToggleSelectAll: () => void;
  onEditRecord: (record: CompanyRecord) => void;
  onDeleteRecord: (id: string) => void;
  onUpdateRecordCell: (id: string, field: keyof CompanyRecord, value: string) => void;
  selectedAreaFilter: string;
  onAreaFilterChange: (area: string) => void;
  selectedBidangFilter: string;
  onBidangFilterChange: (bidang: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenInputMode: (mode: InputMode) => void;
  onExport: (format?: ExportFormat) => void;
  isExampleMode?: boolean;
}

/**
 * Generates a stable pseudo-random scrambled text to preserve string structure
 * (retains spacing, dashes, email @ sign and dots) but makes the actual text
 * content 100% scrambled at the character level.
 * This ensures absolute security against any Vision AI/OCR/de-blurrer,
 * while maintaining the realistic, highly intriguing visual look of a blurred field.
 */
const getScrambledText = (text: string, id: string): string => {
  if (!text) return '-';
  
  // Calculate a stable simple hash based on the id to avoid flickering on re-render
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  
  const charsLower = 'abcdefghijklmnopqrstuvwxyz';
  const charsUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  
  return text
    .split('')
    .map((char, index) => {
      if (/[a-z]/.test(char)) {
        const idx = Math.abs((hash + index * 17) % charsLower.length);
        return charsLower[idx];
      }
      if (/[A-Z]/.test(char)) {
        const idx = Math.abs((hash + index * 31) % charsUpper.length);
        return charsUpper[idx];
      }
      if (/[0-9]/.test(char)) {
        const idx = Math.abs((hash + index * 13) % digits.length);
        return digits[idx];
      }
      return char;
    })
    .join('');
};

type SortField = 'no' | 'areaKota' | 'kawasan' | 'namaPerusahaan' | 'bidang' | 'namaPic';

export const DatabaseTableView: React.FC<DatabaseTableViewProps> = ({
  records,
  selectedIds,
  onToggleSelectRow,
  onToggleSelectAll,
  onEditRecord,
  onDeleteRecord,
  onUpdateRecordCell,
  selectedAreaFilter,
  onAreaFilterChange,
  selectedBidangFilter,
  onBidangFilterChange,
  searchQuery,
  onSearchChange,
  onOpenInputMode,
  onExport,
  isExampleMode = false
}) => {
  const [sortField, setSortField] = React.useState<SortField>('no');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [editingCell, setEditingCell] = React.useState<{ id: string; field: keyof CompanyRecord } | null>(null);
  const [tempCellVal, setTempCellVal] = React.useState<string>('');
  const [viewMode, setViewMode] = React.useState<'terpisah' | 'ringkas' | 'minimalis'>(
    isExampleMode ? 'ringkas' : 'terpisah'
  );
  const [isWrapText, setIsWrapText] = React.useState<boolean>(isExampleMode ? true : false);

  // Left Column Mode Toggles: showPilih (Checkbox) and showKelengkapan (Percentage circle)
  const [showPilih, setShowPilih] = React.useState<boolean>(false);
  const [showKelengkapan, setShowKelengkapan] = React.useState<boolean>(false);
  const [completenessFilter, setCompletenessFilter] = React.useState<'default' | 'terlengkap' | 'tidak_lengkap'>('default');

  // Keep states in sync with isExampleMode
  React.useEffect(() => {
    if (isExampleMode) {
      setViewMode('ringkas');
      setIsWrapText(true);
      setShowPilih(false);
      setShowKelengkapan(false);
      setCompletenessFilter('default');
    }
  }, [isExampleMode]);

  // Dropdown states for Add & Export & Actions & Filters/Tabs
  const [showAddMenu, setShowAddMenu] = React.useState(false);
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const [showFiltersAndTabs, setShowFiltersAndTabs] = React.useState(true);
  const [activeActionRecord, setActiveActionRecord] = React.useState<{ record: CompanyRecord; top: number; right: number } | null>(null);

  // Close action menu on scroll
  React.useEffect(() => {
    if (!activeActionRecord) return;
    const handleScroll = () => {
      setActiveActionRecord(null);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [activeActionRecord]);

  // Extract unique Area/Kota and Bidang for quick filters
  const areaOptions = React.useMemo(() => {
    const areas = records.map(r => r.areaKota?.trim()).filter(Boolean);
    return Array.from(new Set(areas)).sort();
  }, [records]);

  const bidangOptions = React.useMemo(() => {
    const bidangList = records.map(r => r.bidang?.trim()).filter(Boolean);
    return Array.from(new Set(bidangList)).sort();
  }, [records]);

  // Handle Sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedRecords = React.useMemo(() => {
    let processed = [...records];

    const fieldsInOrder: (keyof CompanyRecord)[] = [
      'namaPerusahaan',
      'bidang',
      'telponKantor',
      'emailKantor',
      'website',
      'namaPic',
      'jabatanPic',
      'whatsapp',
      'emailPic',
      'areaKota',
      'kawasan',
      'alamat',
      'longitude',
      'latitude',
    ];

    const compareLeftColumnsPriority = (a: CompanyRecord, b: CompanyRecord): number => {
      for (const f of fieldsInOrder) {
        const hasA = Boolean(String(a[f] || '').trim());
        const hasB = Boolean(String(b[f] || '').trim());
        if (hasA && !hasB) return -1;
        if (!hasA && hasB) return 1;
      }
      return 0;
    };

    return processed.sort((a, b) => {
      if (completenessFilter === 'terlengkap') {
        const cA = calculateCompleteness(a);
        const cB = calculateCompleteness(b);
        if (cB !== cA) return cB - cA;
        const tie = compareLeftColumnsPriority(a, b);
        if (tie !== 0) return tie;
      } else if (completenessFilter === 'tidak_lengkap') {
        const cA = calculateCompleteness(a);
        const cB = calculateCompleteness(b);
        if (cA !== cB) return cA - cB;
        const tie = compareLeftColumnsPriority(a, b);
        if (tie !== 0) return tie;
      }

      let valA: any = a[sortField] || '';
      let valB: any = b[sortField] || '';

      if (sortField === 'no') {
        valA = Number(valA);
        valB = Number(valB);
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [records, sortField, sortDirection, completenessFilter]);

  // Pagination state for handling 10,000+ to 50,000+ records smoothly
  const [pageSize, setPageSize] = React.useState<number>(50);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  // Reset page when filters, search, or record count changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedAreaFilter, selectedBidangFilter, records.length]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));

  // Ensure currentPage is within bounds
  React.useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Paginated records chunk rendering
  const displayedRecords = React.useMemo(() => {
    if (isExampleMode) {
      return sortedRecords.slice(0, 25);
    }
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, isExampleMode, currentPage, pageSize]);

  // Inline Cell Editing
  const startCellEdit = (record: CompanyRecord, field: keyof CompanyRecord) => {
    if (isExampleMode) return;
    setEditingCell({ id: record.id, field });
    let val = String(record[field] || '');
    if (field === 'telponKantor') val = formatTelponKantor(val);
    if (field === 'whatsapp') val = formatWhatsApp(val);
    setTempCellVal(val);
  };

  const saveCellEdit = () => {
    if (editingCell) {
      let finalVal = tempCellVal;
      if (editingCell.field === 'telponKantor' || editingCell.field === 'whatsapp') {
        finalVal = cleanRawPhone(tempCellVal);
      }
      onUpdateRecordCell(editingCell.id, editingCell.field, finalVal);
      setEditingCell(null);
    }
  };

  const isAllSelected = displayedRecords.length > 0 && selectedIds.length === displayedRecords.length;

  return (
    <div className="space-y-3 pb-20">
      
      {/* Unified Control Card (Search, Actions, Export, Dropdown Toggle, & Collapsible Filters/Tabs) */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm text-xs text-slate-700 space-y-2.5">
        
        {/* Top Header Row: SearchBar, + Data, Export, & Dropdown Toggle */}
        <div className="flex items-center justify-between gap-2 w-full">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="main-search-input"
              placeholder="Cari perusahaan, kota, bidang, PIC..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 pl-9 pr-8 py-2 rounded-lg focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Buttons: + Data, Export, and Filter Dropdown Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* + Data Button & Dropdown */}
            {!isExampleMode && (
              <div className="relative">
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Data</span>
                </button>

                {showAddMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowAddMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-50 text-xs">
                      <button
                        onClick={() => {
                          setShowAddMenu(false);
                          onOpenInputMode('manual');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"
                      >
                        <UserPlus className="w-4 h-4 text-blue-500" />
                        <div className="font-semibold text-slate-700">Input Manual</div>
                      </button>

                      <button
                        onClick={() => {
                          setShowAddMenu(false);
                          onOpenInputMode('quick');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"
                      >
                        <Zap className="w-4 h-4 text-amber-500" />
                        <div className="font-semibold text-slate-700">Input Cepat (Koma)</div>
                      </button>

                      <button
                        onClick={() => {
                          setShowAddMenu(false);
                          onOpenInputMode('json_manual');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left"
                      >
                        <FileJson className="w-4 h-4 text-emerald-500" />
                        <div className="font-semibold text-slate-700">Tulis Manual JSON</div>
                      </button>

                      <button
                        onClick={() => {
                          setShowAddMenu(false);
                          onOpenInputMode('import');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-emerald-50 rounded-lg transition-colors text-left"
                      >
                        <Upload className="w-4 h-4 text-emerald-600" />
                        <div className="font-semibold text-slate-700">Import File</div>
                      </button>

                      <button
                        onClick={() => {
                          setShowAddMenu(false);
                          onOpenInputMode('scan_ai');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-emerald-50 rounded-lg transition-colors text-left"
                      >
                        <Scan className="w-4 h-4 text-emerald-600" />
                        <div className="font-semibold text-slate-700">Scan Gambar AI</div>
                      </button>

                      <button
                        onClick={() => {
                          setShowAddMenu(false);
                          onOpenInputMode('paste_ai');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-emerald-50 rounded-lg transition-colors text-left"
                      >
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <div className="font-semibold text-slate-700">Paste Teks AI</div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Export Button & Dropdown */}
            {!isExampleMode && (
              <div className="relative">
                <button
                  onClick={() => onExport()}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-md shadow-emerald-700/20 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>

                {showExportMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowExportMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-50 text-xs">
                      <button
                        onClick={() => {
                          setShowExportMenu(false);
                          onExport('pdf');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-slate-700 hover:bg-emerald-50 rounded-lg transition-colors text-left"
                      >
                        <FileText className="w-4 h-4 text-emerald-700" />
                        <div>
                          <div className="font-semibold text-slate-900">Dokumen PDF</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowExportMenu(false);
                          onExport('csv');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-slate-700 hover:bg-emerald-50 rounded-lg transition-colors text-left"
                      >
                        <TableIcon className="w-4 h-4 text-emerald-700" />
                        <div>
                          <div className="font-semibold text-slate-900">CSV (Excel)</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowExportMenu(false);
                          onExport('json');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-slate-700 hover:bg-emerald-50 rounded-lg transition-colors text-left"
                      >
                        <Code className="w-4 h-4 text-emerald-700" />
                        <div>
                          <div className="font-semibold text-slate-900">JSON</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowExportMenu(false);
                          onExport('sql');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-slate-700 hover:bg-emerald-50 rounded-lg transition-colors text-left"
                      >
                        <Database className="w-4 h-4 text-emerald-700" />
                        <div>
                          <div className="font-semibold text-slate-900">SQL</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setShowExportMenu(false);
                          onExport('text');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-slate-700 hover:bg-emerald-50 rounded-lg transition-colors text-left"
                      >
                        <FileText className="w-4 h-4 text-slate-600" />
                        <div>
                          <div className="font-semibold text-slate-900">Text Biasa</div>
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Dropdown Toggle Icon Button (di kanan samping tombol Export) */}
            <button
              onClick={() => setShowFiltersAndTabs(!showFiltersAndTabs)}
              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                showFiltersAndTabs || selectedAreaFilter || selectedBidangFilter
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
              title={showFiltersAndTabs ? "Sembunyikan Filter & Tab" : "Tampilkan Filter & Tab"}
            >
              <Filter className="w-3.5 h-3.5" />
              {showFiltersAndTabs ? (
                <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              )}
            </button>

          </div>
        </div>

        {/* Collapsible Section: Filters and Tab View Modes */}
        {showFiltersAndTabs && (
          <div className="pt-2 space-y-2.5">

            {/* City, Category, & Data Kelengkapan Dropdowns Row */}
            <div className="flex items-center gap-2 w-full">
              {/* Area / Kota Filter Dropdown */}
              <div className="flex-1 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 min-w-0">
                <span className="text-slate-500 whitespace-nowrap">Kota:</span>
                <select
                  value={selectedAreaFilter}
                  onChange={(e) => onAreaFilterChange(e.target.value)}
                  className="bg-transparent text-slate-900 font-medium outline-none cursor-pointer text-xs w-full min-w-0"
                >
                  <option value="" className="bg-white">Semua ({areaOptions.length})</option>
                  {areaOptions.map(area => (
                    <option key={area} value={area} className="bg-white">{area}</option>
                  ))}
                </select>
              </div>

              {/* Bidang Industri Filter Dropdown */}
              <div className="flex-1 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 min-w-0">
                <span className="text-slate-500 whitespace-nowrap">Kawasan:</span>
                <select
                  value={selectedBidangFilter}
                  onChange={(e) => onBidangFilterChange(e.target.value)}
                  className="bg-transparent text-slate-900 font-medium outline-none cursor-pointer text-xs w-full min-w-0 truncate"
                >
                  <option value="" className="bg-white">Semua ({bidangOptions.length})</option>
                  {bidangOptions.map(bidang => (
                    <option key={bidang} value={bidang} className="bg-white">{bidang}</option>
                  ))}
                </select>
              </div>

              {/* Data / Kelengkapan Filter Dropdown */}
              {!isExampleMode && (
                <div className="flex-1 flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 min-w-0">
                  <span className="text-slate-500 whitespace-nowrap">Data:</span>
                  <select
                    value={completenessFilter}
                    onChange={(e) => setCompletenessFilter(e.target.value as any)}
                    className="bg-transparent text-slate-900 font-medium outline-none cursor-pointer text-xs w-full min-w-0 truncate"
                  >
                    <option value="default" className="bg-white">Default</option>
                    <option value="terlengkap" className="bg-white">Terlengkap</option>
                    <option value="tidak_lengkap" className="bg-white">Tidak Lengkap</option>
                  </select>
                </div>
              )}

              {(selectedAreaFilter || selectedBidangFilter || completenessFilter !== 'default') && (
                <button
                  onClick={() => {
                    onAreaFilterChange('');
                    onBidangFilterChange('');
                    setCompletenessFilter('default');
                  }}
                  className="text-xs text-rose-600 font-semibold hover:underline whitespace-nowrap px-1 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {/* View Mode Tabs (Terpisah, Ringkas, Minimalis) + Wrap Text + Pilih + Kelengkapan Icon Buttons */}
            {!isExampleMode && (
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                  <button 
                    onClick={() => setViewMode('terpisah')}
                    className={`flex-1 px-2 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === 'terpisah' 
                        ? 'bg-white shadow-sm text-emerald-800 font-bold' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Tampilan Terpisah"
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    <span>Terpisah</span>
                  </button>

                  <button 
                    onClick={() => setViewMode('ringkas')}
                    className={`flex-1 px-2 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === 'ringkas' 
                        ? 'bg-white shadow-sm text-emerald-800 font-bold' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Tampilan Ringkas"
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    <span>Ringkas</span>
                  </button>

                  <button 
                    onClick={() => setViewMode('minimalis')}
                    className={`flex-1 px-2 py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 rounded-lg transition-all cursor-pointer ${
                      viewMode === 'minimalis' 
                        ? 'bg-white shadow-sm text-emerald-800 font-bold' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Tampilan Minimalis"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Minimalis</span>
                  </button>
                </div>

                {/* Wrap Text Button */}
                <button 
                  onClick={() => setIsWrapText(!isWrapText)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm ${
                    isWrapText 
                      ? 'bg-emerald-700 border-emerald-700 text-white' 
                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title={isWrapText ? "Wrap Teks: Aktif" : "Wrap Teks: Nonaktif"}
                >
                  <WrapText className="w-4 h-4" />
                </button>

                {/* Icon Pilih (Checkbox) Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (showPilih) {
                      setShowPilih(false);
                      if (selectedIds.length > 0) {
                        selectedIds.forEach(id => onToggleSelectRow(id));
                      }
                    } else {
                      setShowPilih(true);
                    }
                  }}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm ${
                    showPilih
                      ? 'bg-emerald-700 border-emerald-700 text-white font-bold'
                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title={showPilih ? "Kolom Pilih Baris (Checkbox): Aktif" : "Kolom Pilih Baris (Checkbox): Nonaktif"}
                >
                  <CheckSquare className="w-4 h-4" />
                </button>

                {/* Icon Kelengkapan (%) Button */}
                <button
                  type="button"
                  onClick={() => setShowKelengkapan(prev => !prev)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm ${
                    showKelengkapan
                      ? 'bg-emerald-700 border-emerald-700 text-white font-bold'
                      : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  title={showKelengkapan ? "Kolom Kelengkapan Data (%): Aktif" : "Kolom Kelengkapan Data (%): Nonaktif"}
                >
                  <PieChart className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Main Table Grid */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-800 border-collapse">
            
            {/* Table Header */}
            {viewMode === 'terpisah' ? (
              <thead className="bg-slate-100 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider font-bold select-none sticky top-0">
              <tr>
                {showPilih && (
                  <th className="px-3 py-3 w-10 text-center">
                    <button
                      onClick={onToggleSelectAll}
                      className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title="Pilih Semua"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-slate-900" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                  </th>
                )}

                {showKelengkapan && (
                  <th className="px-3 py-3 w-14 text-center text-slate-700 font-bold" title="Persentase Kelengkapan Data">
                    % Lengkap
                  </th>
                )}

                <th 
                  onClick={() => handleSort('no')} 
                  className="px-3 py-3 cursor-pointer hover:text-slate-900 transition-colors w-12"
                >
                  <div className="flex items-center gap-1">
                    <span>No.</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('namaPerusahaan')} 
                  className="px-3 py-3 cursor-pointer hover:text-slate-900 transition-colors min-w-[180px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Perusahaan</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('bidang')} 
                  className="px-3 py-3 cursor-pointer hover:text-slate-900 transition-colors min-w-[130px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Bidang</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                <th className="px-3 py-3 min-w-[120px]">Telpon</th>
                <th className="px-3 py-3 min-w-[140px]">Email</th>
                <th className="px-3 py-3 min-w-[140px]">Website</th>

                <th 
                  onClick={() => handleSort('namaPic')} 
                  className="px-3 py-3 cursor-pointer hover:text-slate-900 transition-colors min-w-[120px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama PIC</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-3 py-3 min-w-[130px]">Jabatan</th>

                <th className="px-3 py-3 min-w-[130px]">WhatsApp</th>
                <th className="px-3 py-3 min-w-[140px]">Email</th>

                <th 
                  onClick={() => handleSort('areaKota')} 
                  className="px-3 py-3 cursor-pointer hover:text-slate-900 transition-colors min-w-[120px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Kota</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                <th 
                  onClick={() => handleSort('kawasan')} 
                  className="px-3 py-3 cursor-pointer hover:text-slate-900 transition-colors min-w-[140px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Kawasan</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                <th className="px-3 py-3 min-w-[200px]">Alamat</th>
                <th className="px-3 py-3 min-w-[100px]">Longitude</th>
                <th className="px-3 py-3 min-w-[100px]">Latitude</th>
                {!isExampleMode && <th className="px-3 py-3 w-20 text-center sticky right-0 bg-slate-100">Aksi</th>}
              </tr>
            </thead>
            ) : (
              <thead className="bg-slate-100 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider font-bold select-none sticky top-0">
                <tr>
                  {showPilih && (
                    <th className="px-3 py-3 w-10 text-center">
                      <button
                        onClick={onToggleSelectAll}
                        className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        title="Pilih Semua"
                      >
                        {isAllSelected ? (
                          <CheckSquare className="w-4 h-4 text-slate-900" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                    </th>
                  )}

                  {showKelengkapan && (
                    <th className="px-3 py-3 w-14 text-center text-slate-700 font-bold" title="Persentase Kelengkapan Data">
                      % Lengkap
                    </th>
                  )}

                  <th 
                    onClick={() => handleSort('no')} 
                    className="px-3 py-3 cursor-pointer hover:text-slate-900 transition-colors w-12"
                  >
                    <div className="flex items-center gap-1">
                      <span>No.</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('namaPerusahaan')} 
                    className="px-3 py-3 cursor-pointer hover:text-slate-900 transition-colors min-w-[200px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Perusahaan & Bidang</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-3 py-3 min-w-[160px]">Kontak Kantor</th>
                  <th 
                    onClick={() => handleSort('namaPic')} 
                    className="px-3 py-3 cursor-pointer hover:text-slate-900 transition-colors min-w-[180px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>PIC & Jabatan</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-3 py-3 min-w-[180px]">Kontak PIC</th>
                  <th 
                    onClick={() => handleSort('areaKota')} 
                    className="px-3 py-3 cursor-pointer hover:text-slate-900 transition-colors min-w-[220px]"
                  >
                    <div className="flex items-center gap-1">
                      <span>Lokasi & Alamat</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-3 py-3 min-w-[150px]">Maps Koordinat</th>
                  {!isExampleMode && <th className="px-3 py-3 w-20 text-center sticky right-0 bg-slate-100">Aksi</th>}
                </tr>
              </thead>
            )}


            {/* Table Body */}
            <tbody className={`divide-y divide-slate-100 bg-white ${isWrapText ? 'whitespace-normal' : 'whitespace-nowrap'}`}>
              {displayedRecords.length === 0 ? (
                <tr>
                  <td colSpan={(viewMode === 'terpisah' ? (isExampleMode ? 15 : 16) : (isExampleMode ? 7 : 8)) + (showPilih ? 1 : 0) + (showKelengkapan ? 1 : 0)} className="px-6 py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="text-sm font-semibold text-slate-600">Data Tabel Kosong</div>
                      <p className="text-xs text-slate-400">
                        {isExampleMode 
                          ? 'Mulai dengan database asli (klik tombol "Buat Baru" di atas) untuk menginput, mengedit, atau mengekspor data Anda sendiri.'
                          : 'Gunakan tombol "+ Tambah Data" di atas untuk menambah baris manual, import file, scan foto AI, atau paste teks.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedRecords.map((r) => {
                  const isSelected = selectedIds.includes(r.id);

                  return (
                    <tr 
                      key={r.id} 
                      onClick={() => {
                        if (showPilih) {
                          onToggleSelectRow(r.id);
                        }
                      }}
                      className={`hover:bg-emerald-50/60 transition-colors ${
                        showPilih ? 'cursor-pointer' : ''
                      } ${
                        (showPilih && isSelected) ? 'bg-emerald-100/70 border-l-2 border-emerald-600' : ''
                      }`}
                    >
                    {viewMode === 'terpisah' ? (
                      <React.Fragment>
                        
                      {/* Left Column Mode rendering */}
                      {showPilih && (
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSelectRow(r.id);
                            }}
                            className="text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-slate-900" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>
                      )}

                      {showKelengkapan && (
                        <td className="px-3 py-2.5 text-center">
                          <CompletenessCircle percent={calculateCompleteness(r)} />
                        </td>
                      )}

                      {/* No. */}
                      <td className="px-3 py-2.5 font-mono text-slate-400 font-semibold text-[11px]">
                        {r.no}
                      </td>
                      {/* Nama Perusahaan */}
                      <td 
                        onDoubleClick={() => viewMode === 'terpisah' && startCellEdit(r, 'namaPerusahaan')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                        title="Klik 2x untuk edit sel"
                      >
                        {editingCell?.id === r.id && editingCell?.field === 'namaPerusahaan' ? (
                          <input
                            autoFocus
                            type="text"
                            value={tempCellVal}
                            onChange={(e) => setTempCellVal(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="bg-white border border-emerald-500 text-xs text-slate-900 px-2 py-1 rounded w-full outline-none ring-1 ring-emerald-500 font-bold"
                          />
                        ) : (
                          <span className="font-bold text-slate-900">
                            {r.namaPerusahaan || '-'}
                          </span>
                        )}
                      </td>

                      {/* Bidang */}
                      <td 
                        onDoubleClick={() => viewMode === 'terpisah' && startCellEdit(r, 'bidang')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                        title="Klik 2x untuk edit sel"
                      >
                        {editingCell?.id === r.id && editingCell?.field === 'bidang' ? (
                          <input
                            autoFocus
                            type="text"
                            value={tempCellVal}
                            onChange={(e) => setTempCellVal(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="bg-white border border-emerald-500 text-xs text-slate-900 px-2 py-1 rounded w-full outline-none ring-1 ring-emerald-500"
                          />
                        ) : (
                          <span className="text-slate-700">
                            {r.bidang || '-'}
                          </span>
                        )}
                      </td>

                      {/* Telpon Kantor */}
                      <td 
                        onDoubleClick={() => !isExampleMode && viewMode === 'terpisah' && startCellEdit(r, 'telponKantor')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                        title={isExampleMode ? undefined : "Klik 2x untuk edit sel"}
                      >
                        {editingCell?.id === r.id && editingCell?.field === 'telponKantor' ? (
                          <input
                            autoFocus
                            type="text"
                            value={tempCellVal}
                            onChange={(e) => setTempCellVal(formatTelponKantor(e.target.value))}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="bg-white border border-emerald-500 text-xs text-slate-900 px-2 py-1 rounded w-full outline-none ring-1 ring-emerald-500 font-mono"
                          />
                        ) : r.telponKantor ? (
                          isExampleMode ? (
                            <span 
                              className="text-slate-700 font-mono select-none pointer-events-none filter blur-[6px] tracking-wide inline-block"
                              style={{ userSelect: 'none' }}
                            >
                              {getScrambledText(formatTelponKantor(r.telponKantor), r.id)}
                            </span>
                          ) : (
                            <a
                              href={`tel:${r.telponKantor}`}
                              className="text-slate-700 hover:text-slate-900 font-mono hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {formatTelponKantor(r.telponKantor)}
                            </a>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Email Kantor */}
                      <td 
                        onDoubleClick={() => !isExampleMode && viewMode === 'terpisah' && startCellEdit(r, 'emailKantor')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                        title={isExampleMode ? undefined : "Klik 2x untuk edit sel"}
                      >
                        {editingCell?.id === r.id && editingCell?.field === 'emailKantor' ? (
                          <input
                            autoFocus
                            type="text"
                            value={tempCellVal}
                            onChange={(e) => setTempCellVal(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="bg-white border border-emerald-500 text-xs text-slate-900 px-2 py-1 rounded w-full outline-none ring-1 ring-emerald-500"
                          />
                        ) : r.emailKantor ? (
                          isExampleMode ? (
                            <span 
                              className="text-slate-600 truncate max-w-[140px] block select-none pointer-events-none filter blur-[6px] tracking-wide"
                              style={{ userSelect: 'none' }}
                            >
                              {getScrambledText(r.emailKantor, r.id)}
                            </span>
                          ) : (
                            <a
                              href={`mailto:${r.emailKantor}`}
                              className="text-slate-600 hover:underline truncate max-w-[140px] block"
                              title={r.emailKantor}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {r.emailKantor}
                            </a>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Website */}
                      <td 
                        onDoubleClick={() => viewMode === 'terpisah' && startCellEdit(r, 'website')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                        title="Klik 2x untuk edit sel"
                      >
                        {editingCell?.id === r.id && editingCell?.field === 'website' ? (
                          <input
                            autoFocus
                            type="text"
                            value={tempCellVal}
                            onChange={(e) => setTempCellVal(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="bg-white border border-emerald-500 text-xs text-slate-900 px-2 py-1 rounded w-full outline-none ring-1 ring-emerald-500"
                          />
                        ) : r.website ? (
                          isExampleMode ? (
                            <span 
                              className="text-slate-600 truncate max-w-[140px] block select-none pointer-events-none filter blur-[6px] tracking-wide"
                              style={{ userSelect: 'none' }}
                            >
                              {getScrambledText(r.website, r.id)}
                            </span>
                          ) : (
                            <a
                              href={r.website.startsWith('http') ? r.website : `https://${r.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-600 hover:underline truncate max-w-[140px] block"
                              title={r.website}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {r.website}
                            </a>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Nama PIC */}
                      <td 
                        onDoubleClick={() => !isExampleMode && viewMode === 'terpisah' && startCellEdit(r, 'namaPic')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors text-slate-800"
                        title={isExampleMode ? undefined : "Klik 2x untuk edit sel"}
                      >
                        {editingCell?.id === r.id && editingCell?.field === 'namaPic' ? (
                          <input
                            autoFocus
                            type="text"
                            value={tempCellVal}
                            onChange={(e) => setTempCellVal(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="bg-white border border-emerald-500 text-xs text-slate-900 px-2 py-1 rounded w-full outline-none ring-1 ring-emerald-500 font-bold"
                          />
                        ) : (
                          isExampleMode ? (
                            <span 
                              className="font-bold text-slate-900 select-none pointer-events-none filter blur-[6px] tracking-wide inline-block"
                              style={{ userSelect: 'none' }}
                            >
                              {getScrambledText(r.namaPic || '-', r.id)}
                            </span>
                          ) : (
                            <span className="font-bold text-slate-900">{r.namaPic || '-'}</span>
                          )
                        )}
                      </td>

                      {/* Jabatan PIC */}
                      <td 
                        onDoubleClick={() => !isExampleMode && viewMode === 'terpisah' && startCellEdit(r, 'jabatanPic')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors text-slate-700"
                        title={isExampleMode ? undefined : "Klik 2x untuk edit sel"}
                      >
                        {editingCell?.id === r.id && editingCell?.field === 'jabatanPic' ? (
                          <input
                            autoFocus
                            type="text"
                            value={tempCellVal}
                            onChange={(e) => setTempCellVal(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="bg-white border border-emerald-500 text-xs text-slate-900 px-2 py-1 rounded w-full outline-none ring-1 ring-emerald-500"
                          />
                        ) : (
                          isExampleMode ? (
                            <span 
                              className="text-slate-700 select-none pointer-events-none filter blur-[6px] tracking-wide inline-block"
                              style={{ userSelect: 'none' }}
                            >
                              {getScrambledText(r.jabatanPic || '-', r.id)}
                            </span>
                          ) : (
                            <span>{r.jabatanPic || '-'}</span>
                          )
                        )}
                      </td>

                      {/* WhatsApp */}
                      <td 
                        onDoubleClick={() => !isExampleMode && viewMode === 'terpisah' && startCellEdit(r, 'whatsapp')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                        title={isExampleMode ? undefined : "Klik 2x untuk edit sel"}
                      >
                        {editingCell?.id === r.id && editingCell?.field === 'whatsapp' ? (
                          <input
                            autoFocus
                            type="text"
                            value={tempCellVal}
                            onChange={(e) => setTempCellVal(formatWhatsApp(e.target.value))}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="bg-white border border-emerald-500 text-xs text-slate-900 px-2 py-1 rounded w-full outline-none ring-1 ring-emerald-500 font-mono"
                          />
                        ) : r.whatsapp ? (
                          isExampleMode ? (
                            <span 
                              className="text-slate-500 select-none pointer-events-none filter blur-[6px] tracking-wide inline-block font-mono"
                              style={{ userSelect: 'none' }}
                            >
                              {getScrambledText(formatWhatsApp(r.whatsapp) || '-', r.id)}
                            </span>
                          ) : (
                            <a
                              href={formatWhatsAppUrl(r.whatsapp)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-slate-900 hover:text-slate-900 font-mono hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span>{formatWhatsApp(r.whatsapp)}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Email PIC */}
                      <td 
                        onDoubleClick={() => !isExampleMode && viewMode === 'terpisah' && startCellEdit(r, 'emailPic')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                        title={isExampleMode ? undefined : "Klik 2x untuk edit sel"}
                      >
                        {editingCell?.id === r.id && editingCell?.field === 'emailPic' ? (
                          <input
                            autoFocus
                            type="text"
                            value={tempCellVal}
                            onChange={(e) => setTempCellVal(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="bg-white border border-emerald-500 text-xs text-slate-900 px-2 py-1 rounded w-full outline-none ring-1 ring-emerald-500"
                          />
                        ) : r.emailPic ? (
                          isExampleMode ? (
                            <span 
                              className="text-slate-500 select-none pointer-events-none filter blur-[6px] tracking-wide inline-block"
                              style={{ userSelect: 'none' }}
                            >
                              {getScrambledText(r.emailPic || '-', r.id)}
                            </span>
                          ) : (
                            <a
                              href={`mailto:${r.emailPic}`}
                              className="text-slate-700 hover:underline truncate max-w-[140px] block"
                              title={r.emailPic}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {r.emailPic}
                            </a>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Area Kota */}
                      <td 
                        onDoubleClick={() => viewMode === 'terpisah' && startCellEdit(r, 'areaKota')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
                        title="Klik 2x untuk edit sel"
                      >
                        {editingCell?.id === r.id && editingCell?.field === 'areaKota' ? (
                          <input
                            autoFocus
                            type="text"
                            value={tempCellVal}
                            onChange={(e) => setTempCellVal(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="bg-white border border-emerald-500 text-xs text-slate-900 px-2 py-1 rounded w-full outline-none ring-1 ring-emerald-500"
                          />
                        ) : (
                          <span className="font-semibold text-slate-800">{r.areaKota || '-'}</span>
                        )}
                      </td>

                      {/* Kawasan */}
                      <td 
                        onDoubleClick={() => viewMode === 'terpisah' && startCellEdit(r, 'kawasan')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors italic text-slate-500"
                        title="Klik 2x untuk edit sel"
                      >
                        {editingCell?.id === r.id && editingCell?.field === 'kawasan' ? (
                          <input
                            autoFocus
                            type="text"
                            value={tempCellVal}
                            onChange={(e) => setTempCellVal(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="bg-white border border-emerald-500 text-xs text-slate-900 px-2 py-1 rounded w-full outline-none ring-1 ring-emerald-500"
                          />
                        ) : (
                          <span>{r.kawasan || '-'}</span>
                        )}
                      </td>

                      {/* Alamat */}
                      <td 
                        onDoubleClick={() => !isExampleMode && viewMode === 'terpisah' && startCellEdit(r, 'alamat')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors text-slate-500 truncate max-w-[220px]"
                        title={isExampleMode ? undefined : (editingCell?.id === r.id && editingCell?.field === 'alamat' ? undefined : (r.alamat || 'Klik 2x untuk edit sel'))}
                      >
                        {editingCell?.id === r.id && editingCell?.field === 'alamat' ? (
                          <input
                            autoFocus
                            type="text"
                            value={tempCellVal}
                            onChange={(e) => setTempCellVal(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="bg-white border border-emerald-500 text-xs text-slate-900 px-2 py-1 rounded w-full outline-none ring-1 ring-emerald-500"
                          />
                        ) : (
                          isExampleMode ? (
                            <span 
                              className="text-slate-500 select-none pointer-events-none filter blur-[6px] tracking-wide inline-block"
                              style={{ userSelect: 'none' }}
                            >
                              {getScrambledText(r.alamat || '-', r.id)}
                            </span>
                          ) : (
                            <span>{r.alamat || '-'}</span>
                          )
                        )}
                      </td>

                      {/* Longitude */}
                      <td 
                        onDoubleClick={() => !isExampleMode && viewMode === 'terpisah' && startCellEdit(r, 'longitude')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors text-slate-500 truncate max-w-[120px] font-mono text-[10px]"
                        title={isExampleMode ? undefined : (editingCell?.id === r.id && editingCell?.field === 'longitude' ? undefined : (r.longitude || 'Klik 2x untuk edit sel'))}
                      >
                        {editingCell?.id === r.id && editingCell?.field === 'longitude' ? (
                          <input
                            autoFocus
                            type="text"
                            value={tempCellVal}
                            onChange={(e) => setTempCellVal(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="bg-white border border-emerald-500 text-xs text-slate-900 px-2 py-1 rounded w-full outline-none ring-1 ring-emerald-500"
                          />
                        ) : (
                          isExampleMode ? (
                            <span 
                              className="text-slate-500 select-none pointer-events-none filter blur-[6px] tracking-wide inline-block"
                              style={{ userSelect: 'none' }}
                            >
                              {getScrambledText(r.longitude || '-', r.id)}
                            </span>
                          ) : (
                            <span>{r.longitude || '-'}</span>
                          )
                        )}
                      </td>

                      {/* Latitude */}
                      <td 
                        onDoubleClick={() => !isExampleMode && viewMode === 'terpisah' && startCellEdit(r, 'latitude')}
                        className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors text-slate-500 truncate max-w-[120px] font-mono text-[10px]"
                        title={isExampleMode ? undefined : (editingCell?.id === r.id && editingCell?.field === 'latitude' ? undefined : (r.latitude || 'Klik 2x untuk edit sel'))}
                      >
                        {editingCell?.id === r.id && editingCell?.field === 'latitude' ? (
                          <input
                            autoFocus
                            type="text"
                            value={tempCellVal}
                            onChange={(e) => setTempCellVal(e.target.value)}
                            onBlur={saveCellEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveCellEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="bg-white border border-emerald-500 text-xs text-slate-900 px-2 py-1 rounded w-full outline-none ring-1 ring-emerald-500"
                          />
                        ) : (
                          isExampleMode ? (
                            <span 
                              className="text-slate-500 select-none pointer-events-none filter blur-[6px] tracking-wide inline-block"
                              style={{ userSelect: 'none' }}
                            >
                              {getScrambledText(r.latitude || '-', r.id)}
                            </span>
                          ) : (
                            <span>{r.latitude || '-'}</span>
                          )
                        )}
                      </td>

                      {/* Actions Sticky Column */}
                      {!isExampleMode && (
                        <td className="px-3 py-2.5 text-center sticky right-0 bg-white group-hover:bg-slate-50 transition-colors">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeActionRecord?.record.id === r.id) {
                                setActiveActionRecord(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const menuHeight = 170;
                                const top = (spaceBelow < menuHeight && rect.top > menuHeight)
                                  ? rect.top - menuHeight
                                  : rect.bottom + 4;

                                setActiveActionRecord({
                                  record: r,
                                  top: Math.max(10, top),
                                  right: Math.max(10, window.innerWidth - rect.right),
                                });
                              }
                            }}
                            className={`p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ${
                              activeActionRecord?.record.id === r.id ? 'bg-slate-200 text-slate-900' : ''
                            }`}
                            title="Menu Aksi"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      )}

                    
                      </React.Fragment>
                    ) : (
                      <React.Fragment>
                        {/* Left Column Mode rendering */}
                        {showPilih && (
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleSelectRow(r.id);
                              }}
                              className="text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                              {selectedIds.includes(r.id) ? (
                                <CheckSquare className="w-4 h-4 text-slate-900" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                          </td>
                        )}

                        {showKelengkapan && (
                          <td className="px-3 py-2.5 text-center">
                            <CompletenessCircle percent={calculateCompleteness(r)} />
                          </td>
                        )}
                        
                        {/* No */}
                        <td className="px-3 py-2.5 font-mono text-slate-400 font-semibold text-[11px]">
                          {r.no}
                        </td>
                        
                        {/* Perusahaan & Bidang */}
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-900">{r.namaPerusahaan || '-'}</span>
                            <span className="text-[10px] text-slate-500">{r.bidang || 'Umum'}</span>
                          </div>
                        </td>

                        {/* Kontak Kantor */}
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-1">
                            {viewMode === 'minimalis' ? (
                              <div className="flex gap-2">
                                {r.telponKantor ? (
                                  isExampleMode ? (
                                    <span className="text-slate-400 select-none pointer-events-none filter blur-[6px]" style={{ userSelect: 'none' }}>
                                      <Phone className="w-4 h-4" />
                                    </span>
                                  ) : (
                                    <a href={`tel:${r.telponKantor}`} title={r.telponKantor} className="text-slate-500 hover:text-slate-900">
                                      <Phone className="w-4 h-4" />
                                    </a>
                                  )
                                ) : null}
                                {r.emailKantor ? (
                                  isExampleMode ? (
                                    <span className="text-slate-400 select-none pointer-events-none filter blur-[6px]" style={{ userSelect: 'none' }}>
                                      <Mail className="w-4 h-4" />
                                    </span>
                                  ) : (
                                    <a href={`mailto:${r.emailKantor}`} title={r.emailKantor} className="text-slate-500 hover:text-slate-900">
                                      <Mail className="w-4 h-4" />
                                    </a>
                                  )
                                ) : null}
                                {r.website ? (
                                  isExampleMode ? (
                                    <span className="text-slate-300 select-none pointer-events-none filter blur-[6px]" style={{ userSelect: 'none' }}>
                                      <Globe className="w-4 h-4" />
                                    </span>
                                  ) : (
                                    <a href={r.website.startsWith('http') ? r.website : `https://${r.website}`} target="_blank" rel="noopener noreferrer" title={r.website} className="text-slate-500 hover:text-slate-900">
                                      <Globe className="w-4 h-4" />
                                    </a>
                                  )
                                ) : null}
                                {!r.telponKantor && !r.emailKantor && !r.website && <span className="text-slate-400">-</span>}
                              </div>
                            ) : (
                              <React.Fragment>
                                {r.telponKantor ? (
                                  isExampleMode ? (
                                    <span 
                                      className="text-[11px] text-slate-700 font-mono select-none pointer-events-none filter blur-[6px] tracking-wide inline-block"
                                      style={{ userSelect: 'none' }}
                                    >
                                      {getScrambledText(formatTelponKantor(r.telponKantor), r.id)}
                                    </span>
                                  ) : (
                                    <a href={`tel:${r.telponKantor}`} className="text-[11px] text-slate-700 hover:text-slate-900 font-mono hover:underline flex items-center gap-1.5">
                                      {formatTelponKantor(r.telponKantor)}
                                    </a>
                                  )
                                ) : null}
                                {r.emailKantor ? (
                                  isExampleMode ? (
                                    <span 
                                      className="text-[11px] text-slate-600 select-none pointer-events-none filter blur-[6px] tracking-wide inline-block"
                                      style={{ userSelect: 'none' }}
                                    >
                                      {getScrambledText(r.emailKantor, r.id)}
                                    </span>
                                  ) : (
                                    <a href={`mailto:${r.emailKantor}`} className="text-[11px] text-slate-600 hover:underline flex items-center gap-1.5 truncate max-w-[140px]" title={r.emailKantor}>
                                      {r.emailKantor}
                                    </a>
                                  )
                                ) : null}
                                {r.website ? (
                                  isExampleMode ? (
                                    <span 
                                      className="text-[11px] text-slate-500 select-none pointer-events-none filter blur-[6px] tracking-wide inline-block"
                                      style={{ userSelect: 'none' }}
                                    >
                                      {getScrambledText(r.website, r.id)}
                                    </span>
                                  ) : (
                                    <a href={r.website.startsWith('http') ? r.website : `https://${r.website}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1.5 truncate max-w-[140px]" title={r.website}>
                                      {r.website}
                                    </a>
                                  )
                                ) : null}
                                {!r.telponKantor && !r.emailKantor && !r.website && <span className="text-slate-400">-</span>}
                              </React.Fragment>
                            )}
                          </div>
                        </td>

                        {/* PIC & Jabatan */}
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            {r.jabatanPic ? (
                              isExampleMode ? (
                                <span 
                                  className="text-[10px] text-slate-500 select-none pointer-events-none filter blur-[6px] tracking-wide inline-block"
                                  style={{ userSelect: 'none' }}
                                >
                                  {getScrambledText(r.jabatanPic, r.id)}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500">{r.jabatanPic}</span>
                              )
                            ) : null}
                            {isExampleMode ? (
                              <span 
                                className="font-bold text-slate-900 select-none pointer-events-none filter blur-[6px] tracking-wide inline-block"
                                style={{ userSelect: 'none' }}
                              >
                                {getScrambledText(r.namaPic || '-', r.id)}
                              </span>
                            ) : (
                              <span className="font-bold text-slate-900">{r.namaPic || '-'}</span>
                            )}
                          </div>
                        </td>

                        {/* Kontak PIC */}
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-1">
                            {viewMode === 'minimalis' ? (
                              <div className="flex gap-2">
                                {r.whatsapp ? (
                                  isExampleMode ? (
                                    <span className="text-slate-400 select-none pointer-events-none filter blur-[6px]" style={{ userSelect: 'none' }}>
                                      <MessageSquare className="w-4 h-4" />
                                    </span>
                                  ) : (
                                    <a href={formatWhatsAppUrl(r.whatsapp)} target="_blank" rel="noopener noreferrer" title={formatWhatsApp(r.whatsapp)} className="text-emerald-600 hover:text-emerald-700">
                                      <MessageSquare className="w-4 h-4" />
                                    </a>
                                  )
                                ) : null}
                                {r.emailPic ? (
                                  isExampleMode ? (
                                    <span className="text-slate-400 select-none pointer-events-none filter blur-[6px]" style={{ userSelect: 'none' }}>
                                      <Mail className="w-4 h-4" />
                                    </span>
                                  ) : (
                                    <a href={`mailto:${r.emailPic}`} title={r.emailPic} className="text-slate-500 hover:text-slate-900">
                                      <Mail className="w-4 h-4" />
                                    </a>
                                  )
                                ) : null}
                                {!r.whatsapp && !r.emailPic && <span className="text-slate-400">-</span>}
                              </div>
                            ) : (
                              <React.Fragment>
                                {r.whatsapp ? (
                                  isExampleMode ? (
                                    <span 
                                      className="text-[11px] font-medium text-slate-900 font-mono select-none pointer-events-none filter blur-[6px] tracking-wide inline-block"
                                      style={{ userSelect: 'none' }}
                                    >
                                      {getScrambledText(formatWhatsApp(r.whatsapp), r.id)}
                                    </span>
                                  ) : (
                                    <a href={formatWhatsAppUrl(r.whatsapp)} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-slate-900 font-mono flex items-center gap-1.5 hover:underline">
                                      {formatWhatsApp(r.whatsapp)}
                                    </a>
                                  )
                                ) : null}
                                {r.emailPic ? (
                                  isExampleMode ? (
                                    <span 
                                      className="text-[11px] text-slate-600 select-none pointer-events-none filter blur-[6px] tracking-wide inline-block"
                                      style={{ userSelect: 'none' }}
                                    >
                                      {getScrambledText(r.emailPic, r.id)}
                                    </span>
                                  ) : (
                                    <a href={`mailto:${r.emailPic}`} className="text-[11px] text-slate-600 hover:underline flex items-center gap-1.5 truncate max-w-[140px]" title={r.emailPic}>
                                      {r.emailPic}
                                    </a>
                                  )
                                ) : null}
                                {!r.whatsapp && !r.emailPic && <span className="text-slate-400">-</span>}
                              </React.Fragment>
                            )}
                          </div>
                        </td>

                        {/* Lokasi & Alamat */}
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-1 max-w-[240px]">
                            <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                              {r.areaKota || 'Area N/A'} {r.kawasan ? ` • ${r.kawasan}` : ''}
                            </div>
                            <div className="text-slate-600 truncate text-[11px]" title={isExampleMode ? undefined : r.alamat}>
                              {isExampleMode ? (
                                <span 
                                  className="text-slate-600 select-none pointer-events-none filter blur-[6px] tracking-wide inline-block"
                                  style={{ userSelect: 'none' }}
                                >
                                  {getScrambledText(r.alamat || '-', r.id)}
                                </span>
                              ) : (
                                r.alamat || '-'
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Maps Koordinat */}
                        <td className="px-3 py-2.5">
                          {r.latitude || r.longitude ? (
                            isExampleMode ? (
                              <div className="flex flex-col gap-0.5 font-mono text-[10px] select-none pointer-events-none filter blur-[6px]">
                                <span className="text-slate-700">Lat: {getScrambledText(r.latitude || '-', r.id)}</span>
                                <span className="text-slate-700">Long: {getScrambledText(r.longitude || '-', r.id)}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-0.5 font-mono text-[10px]" title={`${r.latitude || '-'}, ${r.longitude || '-'}`}>
                                <span className="text-slate-700">Lat: {r.latitude || '-'}</span>
                                <span className="text-slate-700">Long: {r.longitude || '-'}</span>
                                {r.latitude && r.longitude && (
                                  <a
                                    href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-700 hover:underline flex items-center gap-1 font-sans text-[10px] mt-0.5 font-bold"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MapPin className="w-3 h-3 text-emerald-600" />
                                    <span>Buka Map</span>
                                  </a>
                                )}
                              </div>
                            )
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>

                        {/* Actions Sticky Column */}
                        {!isExampleMode && (
                          <td className="px-3 py-2.5 text-center sticky right-0 bg-white group-hover:bg-slate-50 transition-colors">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeActionRecord?.record.id === r.id) {
                                  setActiveActionRecord(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  const menuHeight = 170;
                                  const top = (spaceBelow < menuHeight && rect.top > menuHeight)
                                    ? rect.top - menuHeight
                                    : rect.bottom + 4;

                                  setActiveActionRecord({
                                    record: r,
                                    top: Math.max(10, top),
                                    right: Math.max(10, window.innerWidth - rect.right),
                                  });
                                }
                              }}
                              className={`p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ${
                                activeActionRecord?.record.id === r.id ? 'bg-slate-200 text-slate-900' : ''
                              }`}
                              title="Menu Aksi"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </React.Fragment>
                    )}
                  </tr>
                  );
                })
              )}
            </tbody>

          </table>
        </div>

      {/* Fixed Floating Bottom Navigation Pagination Controls - Always Visible at Viewport Bottom */}
      <BottomNavigation
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalRecords={sortedRecords.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        isExampleMode={isExampleMode}
      />
      </div>



      {/* Global Action Menu Overlay - Rendered outside table & overflow to ensure max z-index priority */}
      {activeActionRecord && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={(e) => {
              e.stopPropagation();
              setActiveActionRecord(null);
            }}
          />
          <div 
            style={{
              position: 'fixed',
              top: `${activeActionRecord.top}px`,
              right: `${activeActionRecord.right}px`,
            }}
            className="z-[9999] w-48 bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5 text-xs font-medium text-left animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                const record = activeActionRecord.record;
                setActiveActionRecord(null);
                onEditRecord(record);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Edit Data Lengkap</span>
            </button>

            {activeActionRecord.record.whatsapp && (
              <a
                href={formatWhatsAppUrl(activeActionRecord.record.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveActionRecord(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kirim WhatsApp</span>
              </a>
            )}

            {(activeActionRecord.record.emailPic || activeActionRecord.record.emailKantor) && (
              <a
                href={`mailto:${activeActionRecord.record.emailPic || activeActionRecord.record.emailKantor}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveActionRecord(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-slate-700 hover:bg-emerald-50 rounded-lg transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>Kirim Email</span>
              </a>
            )}

            <div className="my-1 border-t border-slate-100" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                const recordId = activeActionRecord.record.id;
                setActiveActionRecord(null);
                onDeleteRecord(recordId);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-semibold cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus Perusahaan</span>
            </button>
          </div>
        </>
      )}

    </div>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CompanyRecord, DatabaseTable, InputMode, ExportFormat } from './types';
import { 
  loadDatabases,
  loadDatabasesAsync, 
  saveDatabases, 
  loadActiveDatabaseId, 
  saveActiveDatabaseId, 
  resequenceRecords, 
  generateId 
} from './lib/storage';
import { exportToJSON, exportToSQL, exportToText, exportToCSV, downloadFile } from './lib/exportUtils';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { DatabaseTableView } from './components/DatabaseTableView';
import { ManualFormModal } from './components/ManualFormModal';
import { QuickInputModal } from './components/QuickInputModal';
import { ImportModal } from './components/ImportModal';
import { ManualJsonModal } from './components/ManualJsonModal';
import { ScanAiModal } from './components/ScanAiModal';
import { PasteAiModal } from './components/PasteAiModal';
import { DatabaseManagerModal } from './components/DatabaseManagerModal';
import { DuplicateCheckerModal } from './components/DuplicateCheckerModal';
import { ExportModal } from './components/ExportModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { Trash2, Download, CheckSquare, Sparkles, Layers, RefreshCw, RotateCcw, MessageSquare } from 'lucide-react';

export default function App() {
  const [databases, setDatabases] = React.useState<DatabaseTable[]>([]);
  const [activeDbId, setActiveDbId] = React.useState<string>('default_db');
  const [isExampleMode, setIsExampleMode] = React.useState<boolean>(false);
  
  // Cache clearing state
  const [isClearingCache, setIsClearingCache] = React.useState<boolean>(false);
  const [clearingMessage, setClearingMessage] = React.useState<string>('');

  // UI States
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedAreaFilter, setSelectedAreaFilter] = React.useState<string>('');
  const [selectedBidangFilter, setSelectedBidangFilter] = React.useState<string>('');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // Modal States
  const [inputModalMode, setInputModalMode] = React.useState<InputMode | null>(null);
  const [editingRecord, setEditingRecord] = React.useState<CompanyRecord | null>(null);
  const [isDbManagerOpen, setIsDbManagerOpen] = React.useState<boolean>(false);
  const [showBulkExportMenu, setShowBulkExportMenu] = React.useState<boolean>(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = React.useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = React.useState<boolean>(false);
  const [exportInitialFormat, setExportInitialFormat] = React.useState<ExportFormat>('json');

  // Online / Offline Status
  const [isOnline, setIsOnline] = React.useState<boolean>(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Scroll to Top Search Icon Detector
  const [showSearchIcon, setShowSearchIcon] = React.useState<boolean>(false);

  React.useEffect(() => {
    const handleScroll = () => {
      const mainSearch = document.getElementById('main-search-input');
      const dupSearch = document.getElementById('duplicate-search-input');
      const activeSearch = mainSearch || dupSearch;

      if (activeSearch) {
        const rect = activeSearch.getBoundingClientRect();
        // Trigger if top of search bar is behind the sticky header (approx 64px)
        if (rect.top <= 64) {
          setShowSearchIcon(true);
        } else {
          setShowSearchIcon(false);
        }
      } else {
        setShowSearchIcon(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Also check on a slight delay to ensure render layout is fully drawn
    const timer = setTimeout(handleScroll, 100);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [isDuplicateModalOpen, activeDbId, searchQuery, selectedAreaFilter, selectedBidangFilter]);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      const mainSearch = document.getElementById('main-search-input');
      const dupSearch = document.getElementById('duplicate-search-input');
      const activeSearch = mainSearch || dupSearch;
      if (activeSearch) {
        activeSearch.focus();
      }
    }, 400);
  };

  const handleCreateNewFromExample = () => {
    const newUrl = window.location.origin + window.location.pathname + '?user=new';
    window.location.href = newUrl;
  };

  // Load from local storage on mount & check URL params for cache clear (?data=clear or ?user=new)
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    const userParam = urlParams.get('user');

    if (dataParam === 'clear' || userParam === 'new') {
      setIsClearingCache(true);
      setClearingMessage(
        dataParam === 'clear'
          ? 'Penghapusan data & cache browser sedang berlangsung...'
          : 'Mempersiapkan sesi pengguna baru & membersihkan cache...'
      );

      async function clearAllDataAndCache() {
        try {
          // Clear web storages
          localStorage.clear();
          sessionStorage.clear();

          // Clear Service Worker Caches if available
          if ('caches' in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map(k => caches.delete(k)));
          }

          // Clear IndexedDB if available
          if ('indexedDB' in window && indexedDB.databases) {
            const dbs = await indexedDB.databases();
            dbs.forEach(db => {
              if (db.name) indexedDB.deleteDatabase(db.name);
            });
          }

          // Unregister Service Workers
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
              await registration.unregister();
            }
          }
        } catch (err) {
          console.error('Error clearing data and cache:', err);
        }

        // Brief delay for visual user feedback
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Clean URL parameters and reload clean page
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        window.location.href = cleanUrl;
      }

      clearAllDataAndCache();
    } else if (dataParam === 'example') {
      setIsExampleMode(true);
      setIsClearingCache(true);
      setClearingMessage('Memuat data simulasi industri dari example.json...');

      fetch('/example.json')
        .then(res => res.json())
        .then(data => {
          const records = Array.isArray(data) ? data : [];
          const formattedRecords: CompanyRecord[] = records.map((item: any, idx: number) => ({
            id: item.id || `example_${idx}`,
            no: idx + 1,
            namaPerusahaan: item.nama_perusahaan || '',
            bidang: item.bidang_perusahaan || '',
            telponKantor: item.telpon_perusahaan || '',
            emailKantor: item.email_perusahaan || '',
            website: item.website_perusahaan || '',
            namaPic: item.nama_pic || '',
            jabatanPic: item.jabatan_pic || '',
            whatsapp: item.whatsapp_pic || '',
            emailPic: item.email_pic || '',
            areaKota: item.alamat_kota || '',
            kawasan: item.alamat_kawasan || '',
            alamat: item.alamat_detail || '',
            latitude: item.maps_latitude || '',
            longitude: item.maps_longitude || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));

          const exampleDb: DatabaseTable = {
            id: 'example_db',
            name: 'Simulasi MM 2100',
            description: 'Data simulasi kawasan industri MM2100',
            records: formattedRecords,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          setDatabases([exampleDb]);
          setActiveDbId('example_db');
          setIsClearingCache(false);
        })
        .catch(err => {
          console.error('Error fetching example json:', err);
          setIsClearingCache(false);
        });
    } else {
      // Async load from IndexedDB (supports tens of thousands of records without memory crash)
      loadDatabasesAsync().then(loadedDbs => {
        const activeId = loadActiveDatabaseId();
        setDatabases(loadedDbs);
        if (loadedDbs.some(db => db.id === activeId)) {
          setActiveDbId(activeId);
        } else if (loadedDbs.length > 0) {
          setActiveDbId(loadedDbs[0].id);
        }
      }).catch(err => {
        console.error('IndexedDB initial load error:', err);
        const fallbackDbs = loadDatabases();
        setDatabases(fallbackDbs);
      });
    }
  }, []);

  // Sync to local storage whenever databases or active id changes
  const updateDatabasesState = (newDbs: DatabaseTable[], newActiveId?: string) => {
    setDatabases(newDbs);
    saveDatabases(newDbs);
    if (newActiveId) {
      setActiveDbId(newActiveId);
      saveActiveDatabaseId(newActiveId);
    }
  };

  const activeDatabase = React.useMemo(() => {
    return databases.find(db => db.id === activeDbId) || databases[0] || {
      id: 'default',
      name: 'Database',
      records: [],
      createdAt: '',
      updatedAt: ''
    };
  }, [databases, activeDbId]);

  // Filter records based on search and field dropdowns
  const filteredRecords = React.useMemo(() => {
    let result = activeDatabase.records || [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r => 
        (r.namaPerusahaan && r.namaPerusahaan.toLowerCase().includes(q)) ||
        (r.areaKota && r.areaKota.toLowerCase().includes(q)) ||
        (r.kawasan && r.kawasan.toLowerCase().includes(q)) ||
        (r.bidang && r.bidang.toLowerCase().includes(q)) ||
        (r.namaPic && r.namaPic.toLowerCase().includes(q)) ||
        (r.whatsapp && r.whatsapp.includes(q)) ||
        (r.emailPic && r.emailPic.toLowerCase().includes(q)) ||
        (r.alamat && r.alamat.toLowerCase().includes(q))
      );
    }

    if (selectedAreaFilter) {
      result = result.filter(r => r.areaKota === selectedAreaFilter);
    }

    if (selectedBidangFilter) {
      result = result.filter(r => r.kawasan === selectedBidangFilter);
    }

    return result;
  }, [activeDatabase, searchQuery, selectedAreaFilter, selectedBidangFilter]);

  // Select Database
  const selectedRecordsList = React.useMemo(() => {
    return activeDatabase.records.filter(r => selectedIds.includes(r.id));
  }, [activeDatabase.records, selectedIds]);

  const handleOpenExportModal = (format: ExportFormat = 'json') => {
    setExportInitialFormat(format);
    setIsExportModalOpen(true);
  };

  const handleSelectDatabase = (id: string) => {
    setActiveDbId(id);
    saveActiveDatabaseId(id);
    setSelectedIds([]);
  };

  // Mutate Records in Active Database
  const saveRecordsToActiveDb = (recordsMutator: (prev: CompanyRecord[]) => CompanyRecord[]) => {
    const updatedDbs = databases.map(db => {
      if (db.id === activeDbId) {
        const newRecords = resequenceRecords(recordsMutator(db.records));
        return {
          ...db,
          records: newRecords,
          updatedAt: new Date().toISOString()
        };
      }
      return db;
    });

    updateDatabasesState(updatedDbs);
  };

  // Add or Edit Single Record
  const handleSaveSingleRecord = (formRecord: Partial<CompanyRecord>) => {
    const now = new Date().toISOString();

    if (editingRecord) {
      // Edit existing
      saveRecordsToActiveDb(prev => prev.map(r => {
        if (r.id === editingRecord.id) {
          return {
            ...r,
            ...formRecord,
            updatedAt: now
          } as CompanyRecord;
        }
        return r;
      }));
    } else {
      // Create new
      const newRec: CompanyRecord = {
        id: generateId(),
        no: (activeDatabase.records.length || 0) + 1,
        areaKota: formRecord.areaKota || '',
        kawasan: formRecord.kawasan || '',
        namaPerusahaan: formRecord.namaPerusahaan || '',
        bidang: formRecord.bidang || '',
        namaPic: formRecord.namaPic || '',
        jabatanPic: formRecord.jabatanPic || '',
        whatsapp: formRecord.whatsapp || '',
        emailPic: formRecord.emailPic || '',
        telponKantor: formRecord.telponKantor || '',
        emailKantor: formRecord.emailKantor || '',
        website: formRecord.website || '',
        alamat: formRecord.alamat || '',
        latitude: formRecord.latitude || '',
        longitude: formRecord.longitude || '',
        createdAt: now,
        updatedAt: now
      };

      saveRecordsToActiveDb(prev => [...prev, newRec]);
    }

    setEditingRecord(null);
  };

  // Bulk Import Records (from CSV, JSON, AI Scan, or AI Paste)
  const handleImportRecords = (extracted: Partial<CompanyRecord>[], replaceMode = false) => {
    const now = new Date().toISOString();
    const newRecords: CompanyRecord[] = extracted.map((r, idx) => ({
      id: generateId() + '_' + idx,
      no: idx + 1,
      areaKota: r.areaKota || '',
      kawasan: r.kawasan || '',
      namaPerusahaan: r.namaPerusahaan || 'Perusahaan Tanpa Nama',
      bidang: r.bidang || '',
      namaPic: r.namaPic || '',
      jabatanPic: r.jabatanPic || '',
      whatsapp: r.whatsapp || '',
      emailPic: r.emailPic || '',
      telponKantor: r.telponKantor || '',
      emailKantor: r.emailKantor || '',
      website: r.website || '',
      alamat: r.alamat || '',
      latitude: r.latitude || '',
      longitude: r.longitude || '',
      createdAt: now,
      updatedAt: now
    }));

    if (replaceMode) {
      saveRecordsToActiveDb(() => newRecords);
    } else {
      saveRecordsToActiveDb(prev => [...prev, ...newRecords]);
    }
  };

  // Delete Record
  const handleDeleteRecord = (id: string) => {
    saveRecordsToActiveDb(prev => prev.filter(r => r.id !== id));
    setSelectedIds(prev => prev.filter(i => i !== id));
  };

  // Delete Multiple Records
  const handleDeleteMultipleRecords = (ids: string[]) => {
    saveRecordsToActiveDb(prev => prev.filter(r => !ids.includes(r.id)));
    setSelectedIds(prev => prev.filter(i => !ids.includes(i)));
  };

  // Update All Records
  const handleUpdateRecords = (updatedRecords: CompanyRecord[]) => {
    saveRecordsToActiveDb(() => updatedRecords);
  };

  // Delete Selected Batch
  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Hapus ${selectedIds.length} baris perusahaan ter pilih?`)) return;

    saveRecordsToActiveDb(prev => prev.filter(r => !selectedIds.includes(r.id)));
    setSelectedIds([]);
  };

  // Inline Cell Update
  const handleUpdateRecordCell = (id: string, field: keyof CompanyRecord, value: string) => {
    saveRecordsToActiveDb(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value, updatedAt: new Date().toISOString() };
      }
      return r;
    }));
  };

  // Toggle Selection
  const handleToggleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map(r => r.id));
    }
  };

  if (isClearingCache) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center gap-5 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <RefreshCw className="w-6 h-6 text-emerald-400 absolute animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              <RotateCcw className="w-5 h-5 text-emerald-400" />
              Membersihkan Data & Cache
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {clearingMessage || 'Penghapusan data local & cache sedang diproses...'}
            </p>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full w-full animate-pulse" />
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Memuat ulang tampilan bersih...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      <PWAInstallPrompt />
      {/* Top Navbar */}
      <Header
        onOpenDbManager={() => setIsDbManagerOpen(true)}
        onOpenDuplicateChecker={() => setIsDuplicateModalOpen(prev => !prev)}
        isDuplicateActive={isDuplicateModalOpen}
        showSearchIcon={showSearchIcon}
        onSearchIconClick={handleScrollToTop}
        isExampleMode={isExampleMode}
        onCreateNew={handleCreateNewFromExample}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isDuplicateModalOpen ? (
          <DuplicateCheckerModal
            onClose={() => setIsDuplicateModalOpen(false)}
            records={activeDatabase.records}
            onDeleteRecords={handleDeleteMultipleRecords}
            onUpdateRecords={handleUpdateRecords}
          />
        ) : (
          <>
            {/* Stats Summary Row */}
            <StatsOverview records={activeDatabase.records} />

            {/* View Layout (Desktop Table) */}
            <DatabaseTableView
              records={filteredRecords}
              selectedIds={selectedIds}
              onToggleSelectRow={handleToggleSelectRow}
              onToggleSelectAll={handleToggleSelectAll}
              onEditRecord={(record) => {
                setEditingRecord(record);
                setInputModalMode('manual');
              }}
              onDeleteRecord={handleDeleteRecord}
              onUpdateRecordCell={handleUpdateRecordCell}
              selectedAreaFilter={selectedAreaFilter}
              onAreaFilterChange={setSelectedAreaFilter}
              selectedBidangFilter={selectedBidangFilter}
              onBidangFilterChange={setSelectedBidangFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenInputMode={(mode) => {
                if (mode === 'manual') {
                  setEditingRecord(null);
                }
                setInputModalMode(mode);
              }}
              onExport={handleOpenExportModal}
              isExampleMode={isExampleMode}
            />
          </>
        )}
      </main>

      {/* Floating Batch Actions Bar when rows are selected */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-40 bg-white/95 border border-slate-200 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-4 text-xs backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 font-semibold text-slate-800 border-r border-slate-200 pr-4">
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            <span>{selectedIds.length} Terpilih</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowBulkExportMenu(!showBulkExportMenu)}
              className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Terpilih</span>
            </button>
            {showBulkExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowBulkExportMenu(false)} />
                <div className="absolute bottom-full left-0 mb-2 w-44 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 z-50 text-xs text-left">
                  <button
                    onClick={() => {
                      setShowBulkExportMenu(false);
                      handleOpenExportModal('pdf');
                    }}
                    className="w-full px-2.5 py-1.5 text-slate-700 hover:bg-emerald-50 rounded-lg transition-colors text-left font-semibold block"
                  >
                    Dokumen PDF
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkExportMenu(false);
                      handleOpenExportModal('csv');
                    }}
                    className="w-full px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left font-medium block"
                  >
                    CSV (Excel)
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkExportMenu(false);
                      handleOpenExportModal('json');
                    }}
                    className="w-full px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left font-medium block"
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkExportMenu(false);
                      handleOpenExportModal('sql');
                    }}
                    className="w-full px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left font-medium block"
                  >
                    SQL
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkExportMenu(false);
                      handleOpenExportModal('text');
                    }}
                    className="w-full px-2.5 py-1.5 text-slate-700 hover:bg-slate-50 rounded-lg transition-colors text-left font-medium block"
                  >
                    Text Biasa
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-1.5 text-rose-600 hover:text-rose-700 font-semibold transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Hapus Terpilih</span>
          </button>

          <button
            onClick={() => setSelectedIds([])}
            className="text-slate-400 hover:text-slate-600 text-[11px]"
          >
            Batal
          </button>
        </div>
      )}

      {/* Floating Action Button for Example Mode */}
      {isExampleMode && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-[92vw]">
          <a
            href="https://wa.me/6281807000054?text=Halo%20Admin%2C%20saya%20ingin%20melihat%209999%2B%20data%20lengkap"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm px-5 py-3 rounded-full shadow-2xl shadow-emerald-700/50 border border-emerald-400/40 transition-all hover:scale-105 active:scale-95 group cursor-pointer backdrop-blur-md"
          >
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:bg-white/30 transition-colors">
              <MessageSquare className="w-4 h-4 text-white fill-white animate-pulse" />
            </div>
            <span className="tracking-tight text-center drop-shadow-xs">
              Lihat 9,999+ Data Lengkap? Hubungi Admin
            </span>
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0 hidden sm:block" />
          </a>
        </div>
      )}

      {/* Modals */}
      <ManualFormModal
        isOpen={inputModalMode === 'manual'}
        onClose={() => {
          setInputModalMode(null);
          setEditingRecord(null);
        }}
        onSave={handleSaveSingleRecord}
        editingRecord={editingRecord}
        totalRecordsCount={activeDatabase.records.length}
      />

      <QuickInputModal
        isOpen={inputModalMode === 'quick'}
        onClose={() => setInputModalMode(null)}
        onImport={(recs) => handleImportRecords(recs, false)}
      />

      <ImportModal
        isOpen={inputModalMode === 'import'}
        onClose={() => setInputModalMode(null)}
        onImport={handleImportRecords}
      />

      <ManualJsonModal
        isOpen={inputModalMode === 'json_manual'}
        onClose={() => setInputModalMode(null)}
        onImport={handleImportRecords}
      />

      <ScanAiModal
        isOpen={inputModalMode === 'scan_ai'}
        onClose={() => setInputModalMode(null)}
        onImport={(recs) => handleImportRecords(recs, false)}
      />

      <PasteAiModal
        isOpen={inputModalMode === 'paste_ai'}
        onClose={() => setInputModalMode(null)}
        onImport={(recs) => handleImportRecords(recs, false)}
      />

      <DatabaseManagerModal
        isOpen={isDbManagerOpen}
        onClose={() => setIsDbManagerOpen(false)}
        databases={databases}
        activeDbId={activeDbId}
        onSelectDatabase={handleSelectDatabase}
        onUpdateDatabases={updateDatabasesState}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        records={filteredRecords}
        selectedRecords={selectedRecordsList}
        databaseName={activeDatabase?.name || 'Database Perusahaan'}
        initialFormat={exportInitialFormat}
      />

      {/* Status Bar Footer */}
      <footer className="h-10 bg-slate-100 border-t border-slate-200 text-slate-500 flex items-center justify-between px-4 sm:px-6 shrink-0 text-xs mt-auto">
        <div className="flex items-center gap-4 sm:gap-6 text-[10px] font-bold tracking-wider text-slate-600 uppercase">
          <div className="flex items-center gap-1.5" title="Kapasitas IndexedDB hingga puluhan ribu data tanpa lemot">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>IndexedDB Engine (Kapasitas Tak Terbatas)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            <span>{isOnline ? 'Online Sync Ready' : 'Mode Offline Aktif (Data Tersimpan Lokal)'}</span>
          </div>
        </div>
        <div className="text-[11px] font-medium hidden md:block text-slate-500">
          MyDiby &copy; 2026 — High-Performance Offline PWA
        </div>
      </footer>

    </div>
  );
}

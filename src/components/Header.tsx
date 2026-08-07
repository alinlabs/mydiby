import React from 'react';
import { Database, Layers, Cloud, Search, Copy, Plus } from 'lucide-react';

interface HeaderProps {
  onOpenDbManager: () => void;
  onOpenDuplicateChecker: () => void;
  isDuplicateActive?: boolean;
  showSearchIcon?: boolean;
  onSearchIconClick?: () => void;
  isExampleMode?: boolean;
  onCreateNew?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenDbManager,
  onOpenDuplicateChecker,
  isDuplicateActive,
  showSearchIcon,
  onSearchIconClick,
  isExampleMode = false,
  onCreateNew
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 border-b border-emerald-900/10 text-slate-900 shadow-xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              MyDiby
            </h1>
            {isExampleMode ? (
              <p className="text-[10px] text-slate-400 font-light tracking-wide">
                Create By Alvareza
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Spreadsheet & Database Manager
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Scroll to Top Search Button */}
          {showSearchIcon && (
            <button
              onClick={onSearchIconClick}
              className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 transition-all cursor-pointer animate-in fade-in zoom-in-95 duration-200"
              title="Kembali ke Atas"
              id="header-scroll-search-btn"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {isExampleMode ? (
            <button
              onClick={onCreateNew}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold border border-emerald-700 text-xs px-3.5 py-2 rounded-lg transition-all cursor-pointer shadow-md shadow-emerald-700/10 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              title="Mulai dengan Database Baru"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Baru</span>
            </button>
          ) : (
            <>
              {/* Database Manager Button */}
              <button
                onClick={onOpenDbManager}
                className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs"
                title="Kelola Banyak Database"
              >
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Kelola DB</span>
              </button>

              {/* Duplicate Checker Button */}
              <button
                onClick={onOpenDuplicateChecker}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs ${
                  isDuplicateActive 
                    ? 'bg-red-700 hover:bg-red-800 text-white font-bold border border-red-700'
                    : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                }`}
                title={isDuplicateActive ? "Kembali ke Tabel Database Utama" : "Cek Duplikasi Data"}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{isDuplicateActive ? "Kembali ke Tabel" : "Duplikasi"}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};


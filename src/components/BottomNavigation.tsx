import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface BottomNavigationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isExampleMode?: boolean;
  unitLabel?: string;
  pageSizeOptions?: number[];
  actionButton?: React.ReactNode;
  showRecordSummary?: boolean;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  isExampleMode = false,
  unitLabel = 'data',
  pageSizeOptions = [25, 50, 100, 250, 500],
  actionButton,
  showRecordSummary = true,
}) => {
  if (isExampleMode) {
    return null;
  }

  if (totalRecords === 0 && !actionButton) {
    return null;
  }

  const startIndex = totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 py-2.5 sm:px-6 sm:py-3 flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs text-slate-700 shadow-[0_-8px_25px_rgba(0,0,0,0.12)]">
      {/* Left Side: Record Count & Range Summary OR Action Button */}
      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-center md:text-left shrink-0">
        {!showRecordSummary && actionButton ? (
          <div>{actionButton}</div>
        ) : showRecordSummary ? (
          totalRecords > 0 ? (
            <span className="font-medium text-slate-600">
              <span className="font-bold text-slate-900">{startIndex.toLocaleString('id-ID')}</span> - <span className="font-bold text-slate-900">{endIndex.toLocaleString('id-ID')}</span> dari <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">{totalRecords.toLocaleString('id-ID')}</span> {unitLabel}
            </span>
          ) : (
            <span className="font-semibold text-slate-500">
              Semua {unitLabel} bersih &amp; tidak ada duplikasi
            </span>
          )
        ) : null}
      </div>

      {/* Right Side: Navigation Controls, Rows Selector, and Optional Action Button (if summary is shown) */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
        {showRecordSummary && actionButton && (
          <div className="shrink-0">{actionButton}</div>
        )}

        {totalRecords > 0 && (
          <>
            {/* Rows Per Page Dropdown */}
            <div className="flex items-center">
              <select
                value={pageSize}
                onChange={(e) => {
                  onPageSizeChange(Number(e.target.value));
                  onPageChange(1);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-emerald-600 cursor-pointer shadow-xs"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} / hal
                  </option>
                ))}
              </select>
            </div>

            {/* Next / Prev / First / Last Navigation Buttons */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-white hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-400 text-slate-700 transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs"
                title="Halaman Pertama"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-400 text-slate-700 font-semibold transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs text-xs"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>

              <div className="px-3 py-1 font-bold text-slate-800 text-xs bg-white rounded-lg border border-slate-200/60 shadow-xs min-w-[70px] text-center">
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-white disabled:text-slate-400 disabled:opacity-40 font-semibold transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs text-xs"
                title="Halaman Selanjutnya"
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg bg-white hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-400 text-slate-700 transition-all cursor-pointer disabled:cursor-not-allowed shadow-xs"
                title="Halaman Terakhir"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

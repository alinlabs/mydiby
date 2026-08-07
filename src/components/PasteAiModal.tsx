import React from 'react';
import { X, FileText, Sparkles, AlertCircle, Clipboard } from 'lucide-react';
import { CompanyRecord } from '../types';
import { AiApprovalList } from './AiApprovalList';

interface PasteAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (extractedRecords: Partial<CompanyRecord>[]) => void;
}

export const PasteAiModal: React.FC<PasteAiModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [rawText, setRawText] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [extractedRecords, setExtractedRecords] = React.useState<Partial<CompanyRecord>[]>([]);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setRawText('');
      setExtractedRecords([]);
      setIsLoading(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProcessText = async () => {
    if (!rawText.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setExtractedRecords([]);

    try {
      const response = await fetch('/api/ai-extract-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rawText })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengekstrak teks dengan AI.');
      }

      setExtractedRecords(data.records || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses ekstraksi teks AI.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSampleText = () => {
    setRawText(
      `Daftar Kontak Perusahaan Hasil Pameran:\n` +
      `1. PT Sinar Baru Industri - Kawasan Industri MM2100 Bekasi - PIC: Pak Hendra (WA 081299887766), Email: hendra@sinarbaru.co.id, Telp Kantor: 0218909988, Alamat: Jl. Jawa Blok G-3 Cikarang\n` +
      `2. CV Karya Utama Logistik - Surabaya SIER, bidang Ekspedisi kargo. Kontak Bu Siska wa 085611223344 email siska@karyautama.com telp 0318439900\n` +
      `3. PT Techno Mandiri Jaya - Jakarta Selatan, bidang Software & IT. PIC Pak Budi (WA 081122334455), email budi@technomandiri.co.id`
    );
  };

  const handleConfirmExport = (approvedRecords: Partial<CompanyRecord>[]) => {
    if (approvedRecords.length === 0) return;
    onImport(approvedRecords);
    onClose();
  };

  const handleResetText = () => {
    setExtractedRecords([]);
    setErrorMsg(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Paste Teks Unstructured AI
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900">
                Tempel Teks Mentah / Catatan Kontak (1 atau Banyak Baris):
              </label>

              <button
                type="button"
                onClick={loadSampleText}
                className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Clipboard className="w-3 h-3" />
                <span>Isi Contoh Teks Multi-Perusahaan</span>
              </button>
            </div>

            <textarea
              rows={4}
              placeholder="e.g. PT Mitra Logistik Jaya, lokasi Karawang KIIC, PIC Pak Slamet WA 08123456789 email slamet@mitralog.co.id... (Bisa tempel banyak perusahaan berbaris-baris)"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full bg-white border border-slate-300 text-xs text-slate-900 p-3 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-none font-mono placeholder:text-slate-500 shadow-sm"
            />

            <div className="flex justify-end">
              <button
                disabled={!rawText.trim() || isLoading}
                onClick={handleProcessText}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg shadow-md transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Analisis & Ekstrak Multi-Data AI</span>
              </button>
            </div>
          </div>

          {/* Loading Animation */}
          {isLoading && (
            <div className="p-6 text-center bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-2">
              <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
              <div className="text-xs font-bold text-emerald-700 animate-pulse">
                Gemini AI sedang memilah dan menguraikan seluruh entitas perusahaan & kontak...
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* Step 2: Approval List View */}
          {extractedRecords.length > 0 && !isLoading && (
            <AiApprovalList
              initialRecords={extractedRecords}
              onConfirmExport={handleConfirmExport}
              onReset={handleResetText}
              themeColor="emerald"
              sourceTitle="Hasil Ekstraksi Teks AI"
            />
          )}

        </div>

      </div>
    </div>
  );
};


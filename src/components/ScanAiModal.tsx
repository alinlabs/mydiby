import React from 'react';
import { X, Scan, Sparkles, AlertCircle, Camera } from 'lucide-react';
import { CompanyRecord } from '../types';
import { AiApprovalList } from './AiApprovalList';

interface ScanAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (extractedRecords: Partial<CompanyRecord>[]) => void;
}

export const ScanAiModal: React.FC<ScanAiModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [mimeType, setMimeType] = React.useState<string>('image/jpeg');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [extractedRecords, setExtractedRecords] = React.useState<Partial<CompanyRecord>[]>([]);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setImagePreview(null);
      setExtractedRecords([]);
      setIsLoading(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      setImagePreview(base64);
      triggerAiScan(base64, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const triggerAiScan = async (base64Image: string, type: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setExtractedRecords([]);

    try {
      const response = await fetch('/api/ai-extract-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: type
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengekstrak gambar dengan AI.');
      }

      setExtractedRecords(data.records || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses AI OCR.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmExport = (approvedRecords: Partial<CompanyRecord>[]) => {
    if (approvedRecords.length === 0) return;
    onImport(approvedRecords);
    onClose();
  };

  const handleResetScan = () => {
    setImagePreview(null);
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
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Scan Gambar / Kartu Nama AI
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
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Step 1: Upload Box */}
          {!imagePreview && (
            <div className="border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-8 text-center space-y-4 hover:border-emerald-400 transition-all">
              <input
                type="file"
                id="scanImageInput"
                accept="image/*,application/pdf,.pdf"
                onChange={handleImageSelect}
                className="hidden"
              />
              <label htmlFor="scanImageInput" className="cursor-pointer space-y-3 block">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-sm">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Pilih Gambar atau File PDF Dokumen (Bisa Berisi 1 atau Banyak Perusahaan)
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    AI Gemini akan memindai teks dokumen/gambar, mengekstrak seluruh entitas perusahaan hingga koordinat lat & long.
                  </p>
                </div>
                <div className="inline-block bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-md">
                  Upload Foto / File PDF
                </div>
              </label>
            </div>
          )}

          {/* Loading Animation */}
          {isLoading && (
            <div className="p-8 text-center bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
              <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
              <div className="text-xs font-bold text-emerald-700 animate-pulse">
                Gemini AI sedang membaca dan mengekstrak semua data perusahaan dari gambar...
              </div>
              <p className="text-[11px] text-slate-500">Menganalisis Nama Perusahaan, PIC, WhatsApp, Email, dan Alamat...</p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* Step 2: Approval List View */}
          {imagePreview && !isLoading && extractedRecords.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-12 rounded border bg-white overflow-hidden shrink-0 flex items-center justify-center">
                    <img src={imagePreview} alt="Preview scan" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Gambar Berhasil Dipindai</span>
                    <span className="text-[11px] text-slate-500">Ditemukan {extractedRecords.length} data perusahaan dari gambar ini</span>
                  </div>
                </div>

                <input
                  type="file"
                  id="scanImageInputRetry"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <label
                  htmlFor="scanImageInputRetry"
                  className="text-xs text-emerald-700 font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Ganti Foto Gambar
                </label>
              </div>

              <AiApprovalList
                initialRecords={extractedRecords}
                onConfirmExport={handleConfirmExport}
                onReset={handleResetScan}
                themeColor="emerald"
                sourceTitle="Hasil Scan Gambar AI"
              />
            </div>
          )}

          {imagePreview && !isLoading && extractedRecords.length === 0 && !errorMsg && (
            <div className="p-8 bg-slate-50 text-center rounded-2xl border border-slate-200 space-y-3">
              <p className="text-xs text-slate-600 font-medium">Tidak ada entitas data perusahaan yang terdeteksi pada gambar ini.</p>
              <button
                type="button"
                onClick={handleResetScan}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                Coba Pilih Foto Lain
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};


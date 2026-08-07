import React from 'react';
import { X, Upload, FileCode, CheckCircle2, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { CompanyRecord } from '../types';
import { parseCSVToRecords, parseJSONToRecords } from '../lib/importUtils';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newRecords: Partial<CompanyRecord>[], replaceMode: boolean) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [file, setFile] = React.useState<File | null>(null);
  const [previewRecords, setPreviewRecords] = React.useState<Partial<CompanyRecord>[]>([]);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [replaceMode, setReplaceMode] = React.useState<boolean>(false);
  const [isDragging, setIsDragging] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setPreviewRecords([]);
      setErrorMsg(null);
      setReplaceMode(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const processFileContent = (content: string, filename: string) => {
    try {
      setErrorMsg(null);
      let records: Partial<CompanyRecord>[] = [];

      if (filename.endsWith('.json')) {
        records = parseJSONToRecords(content);
      } else {
        // Default treat as CSV
        records = parseCSVToRecords(content);
      }

      if (records.length === 0) {
        setErrorMsg('File tidak berisi data baris yang dapat dibaca.');
        setPreviewRecords([]);
        return;
      }

      setPreviewRecords(records);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memproses format file.');
      setPreviewRecords([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      processFileContent(text, selected.name);
    };
    reader.readAsText(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        processFileContent(text, droppedFile.name);
      };
      reader.readAsText(droppedFile);
    }
  };

  const handleRemoveRow = (idx: number) => {
    setPreviewRecords(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmImport = () => {
    if (previewRecords.length === 0) return;
    onImport(previewRecords, replaceMode);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Import File Data</h2>
              <p className="text-xs text-slate-500">Dukungan format file .CSV dan .JSON</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* File Upload Drag & Drop Area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/50'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <input
              type="file"
              id="fileImportInput"
              accept=".csv,.json,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <label htmlFor="fileImportInput" className="cursor-pointer space-y-2 block">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <FileCode className="w-6 h-6" />
              </div>
              <div className="text-xs font-semibold text-slate-800">
                {file ? file.name : 'Klik untuk pilih file CSV / JSON atau tarik file ke sini'}
              </div>
              <p className="text-[11px] text-slate-500">
                Format yang didukung: CSV (delimiter koma/titik koma) atau JSON Array
              </p>
            </label>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* Preview Table */}
          {previewRecords.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Preview Hasil Parse ({previewRecords.length} baris ditemukan)</span>
                </span>

                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] shadow-sm">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={replaceMode}
                      onChange={(e) => setReplaceMode(e.target.checked)}
                      className="accent-emerald-600 rounded"
                    />
                    <span>Gantikan (timpa) data lama</span>
                  </label>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white max-h-56 shadow-sm">
                <table className="w-full text-[11px] text-left text-slate-700 border-collapse">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="px-3 py-2">No</th>
                      <th className="px-3 py-2 whitespace-nowrap">Nama Perusahaan</th>
                      <th className="px-3 py-2 whitespace-nowrap">Bidang</th>
                      <th className="px-3 py-2 whitespace-nowrap">Kota / Area</th>
                      <th className="px-3 py-2 whitespace-nowrap">Kawasan</th>
                      <th className="px-3 py-2 whitespace-nowrap">Detail Alamat</th>
                      <th className="px-3 py-2 whitespace-nowrap">Telpon Kantor</th>
                      <th className="px-3 py-2 whitespace-nowrap">Email Kantor</th>
                      <th className="px-3 py-2 whitespace-nowrap">Website</th>
                      <th className="px-3 py-2 whitespace-nowrap">PIC</th>
                      <th className="px-3 py-2 whitespace-nowrap">Jabatan</th>
                      <th className="px-3 py-2 whitespace-nowrap">WhatsApp</th>
                      <th className="px-3 py-2 whitespace-nowrap">Email PIC</th>
                      <th className="px-3 py-2 whitespace-nowrap">Latitude</th>
                      <th className="px-3 py-2 whitespace-nowrap">Longitude</th>
                      <th className="px-3 py-2 text-right whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRecords.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 font-mono text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2 font-bold text-slate-900 whitespace-nowrap">{r.namaPerusahaan || '-'}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.bidang || '-'}</td>
                        <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{r.areaKota || '-'}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.kawasan || '-'}</td>
                        <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={r.alamat}>{r.alamat || '-'}</td>
                        <td className="px-3 py-2 font-mono text-slate-600 whitespace-nowrap">{r.telponKantor || '-'}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.emailKantor || '-'}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.website || '-'}</td>
                        <td className="px-3 py-2 text-slate-800 font-medium whitespace-nowrap">{r.namaPic || '-'}</td>
                        <td className="px-3 py-2 text-slate-800 whitespace-nowrap">{r.jabatanPic || '-'}</td>
                        <td className="px-3 py-2 font-mono text-slate-600 whitespace-nowrap">{r.whatsapp || '-'}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.emailPic || '-'}</td>
                        <td className="px-3 py-2 font-mono text-slate-500 text-[10px] whitespace-nowrap">{r.latitude || '-'}</td>
                        <td className="px-3 py-2 font-mono text-slate-500 text-[10px] whitespace-nowrap">{r.longitude || '-'}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1 text-slate-500 hover:text-rose-600 rounded transition-colors"
                            title="Hapus baris ini dari import"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Batal
          </button>

          <button
            disabled={previewRecords.length === 0}
            onClick={handleConfirmImport}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg shadow-md transition-all"
          >
            <span>Masukkan {previewRecords.length} Data Ke Tabel</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

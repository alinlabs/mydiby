import React from 'react';
import { X, Zap, Sparkles, AlertCircle, ArrowRight, Trash2, CheckCircle2, Copy, FileSpreadsheet } from 'lucide-react';
import { CompanyRecord } from '../types';
import { formatTelponKantor, formatWhatsApp } from '../lib/phoneUtils';
import { copyToClipboard } from '../lib/exportUtils';

interface QuickInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (records: Partial<CompanyRecord>[]) => void;
}

export function parseCommaSeparatedText(text: string): Partial<CompanyRecord>[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const records: Partial<CompanyRecord>[] = [];

  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('//')) continue;

    const parts = line.split(',').map(p => p.trim());
    if (parts.length === 0 || !parts[0]) continue;

    const namaPerusahaan = parts[0] || '';
    const bidang = parts[1] || '';
    const telponKantor = parts[2] || '';
    const emailKantor = parts[3] || '';
    const website = parts[4] || '';
    const namaPic = parts[5] || '';
    const jabatanPic = parts[6] || '';
    const whatsapp = parts[7] || '';
    const emailPic = parts[8] || '';
    const areaKota = parts[9] || '';
    const kawasan = parts[10] || '';
    const alamat = parts.slice(11).join(', ') || '';

    records.push({
      namaPerusahaan,
      bidang,
      telponKantor,
      emailKantor,
      website,
      namaPic,
      jabatanPic,
      whatsapp,
      emailPic,
      areaKota,
      kawasan,
      alamat
    });
  }

  return records;
}

export const QuickInputModal: React.FC<QuickInputModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [inputText, setInputText] = React.useState<string>('');
  const [copiedNotification, setCopiedNotification] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!isOpen) {
      setInputText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const parsedRecords = parseCommaSeparatedText(inputText);

  const loadSample = () => {
    const sample = 
      `PT Toyota Motor Manufacturing, Manufaktur Otomotif, 0218980123, info@toyota.co.id, Budi Santoso, Purchasing Manager, 081298765432, budi.s@toyota.co.id, Karawang, Kawasan Industri KIIC, Jl. Kiic Utama No. 1 Karawang\n` +
      `PT Samsung Electronics Indonesia, Manufaktur Elektronik, 0218909911, contact@samsung.co.id, Anita Wijaya, HR Specialist, 081388776655, anita.w@samsung.com, Bekasi, Jababeka II, Jl. Jababeka XIV Block C No. 1 Cikarang\n` +
      `CV Utama Karya Logistik, Jasa Ekspedisi, 0318439922, cs@utamakarya.com, Hendra Kusuma, Direktur, 081234567890, hendra@utamakarya.com, Surabaya, Rungkut Industri, Jl. Rungkut Industri III No. 12`;
    setInputText(sample);
  };

  const handleSave = () => {
    if (parsedRecords.length === 0) return;
    onImport(parsedRecords);
    onClose();
  };

  const copyFormatHint = () => {
    const hint = `Nama Perusahaan, Bidang, Telpon Kantor, Email Kantor, Nama PIC, Jabatan PIC, WhatsApp, Email PIC, Area/Kota, Kawasan, Alamat`;
    copyToClipboard(hint).then((success) => {
      if (success) {
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 2000);
      }
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
              <Zap className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Input Cepat (Format Koma)
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Urutan Format Info Box */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 space-y-2">
            <div className="flex items-center justify-between font-bold text-emerald-950">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Urutan Kolom Pemisahan Koma:</span>
              </span>
              <button
                type="button"
                onClick={copyFormatHint}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold underline flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedNotification ? 'Tersalin!' : 'Salin Header Format'}</span>
              </button>
            </div>

            <div className="bg-white/80 border border-emerald-200 p-2.5 rounded-lg text-[11px] font-mono text-slate-700 leading-relaxed overflow-x-auto">
              Nama Perusahaan, Bidang, Telpon Kantor, Email Kantor, Website, Nama PIC, Jabatan PIC, WhatsApp, Email PIC, Area/Kota, Kawasan, Alamat
            </div>
            <p className="text-[11px] text-emerald-800/90 italic">
              * Tips: Setiap baris mewakili 1 perusahaan. Jika kolom opsional kosong, cukup biarkan kosong di antara dua koma (contoh: <code className="bg-emerald-100 px-1 rounded font-bold">PT ABC, Otomotif, , , , Pak Budi, , 081234567, , Jakarta, , Jl. Merdeka</code>).
            </p>
          </div>

          {/* Text Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900">
                Ketik atau Paste Teks Dipisah Koma:
              </label>
              <button
                type="button"
                onClick={loadSample}
                className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Isi Contoh Teks Koma</span>
              </button>
            </div>

            <textarea
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. PT Jaya Abadi, Otomotif, 021888999, info@jaya.com, www.jaya.com, Budi, Manager, 081234567, budi@jaya.com, Bekasi, Jababeka, Jl. Raya Industri No. 1"
              className="w-full bg-white border border-slate-300 text-xs text-slate-900 p-3 rounded-xl focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono resize-none shadow-sm placeholder:text-slate-400"
            />
          </div>

          {/* Live Preview Table */}
          {parsedRecords.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span className="flex items-center gap-1.5 text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Preview Hasil Parsing ({parsedRecords.length} perusahaan)</span>
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white max-h-60 shadow-sm">
                <table className="w-full text-[11px] text-left text-slate-700 border-collapse">
                  <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-3 py-2">No</th>
                      <th className="px-3 py-2">Perusahaan</th>
                      <th className="px-3 py-2">Bidang</th>
                      <th className="px-3 py-2">Telp Kantor</th>
                      <th className="px-3 py-2">Email Kantor</th>
                      <th className="px-3 py-2">PIC & Jabatan</th>
                      <th className="px-3 py-2">WA PIC</th>
                      <th className="px-3 py-2">Kota & Kawasan</th>
                      <th className="px-3 py-2">Alamat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {parsedRecords.map((r, idx) => (
                      <tr key={idx} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="px-3 py-2 font-mono text-slate-400 font-bold">{idx + 1}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{r.namaPerusahaan || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{r.bidang || '-'}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{formatTelponKantor(r.telponKantor) || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{r.emailKantor || '-'}</td>
                        <td className="px-3 py-2">
                          <span className="font-semibold text-slate-800">{r.namaPic || '-'}</span>
                          {r.jabatanPic ? <span className="text-slate-400 text-[10px] block">({r.jabatanPic})</span> : null}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-600">{formatWhatsApp(r.whatsapp) || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{r.areaKota || '-'}{r.kawasan ? ` (${r.kawasan})` : ''}</td>
                        <td className="px-3 py-2 text-slate-500 truncate max-w-[150px]">{r.alamat || '-'}</td>
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
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Batal
          </button>

          <button
            disabled={parsedRecords.length === 0}
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg shadow-md transition-all"
          >
            <span>Simpan {parsedRecords.length} Data Ke Database</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

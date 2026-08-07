import React from 'react';
import { 
  Building2, 
  MapPin, 
  User, 
  MessageSquare, 
  Phone, 
  Mail, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  CheckSquare, 
  Square,
  Factory
} from 'lucide-react';
import { CompanyRecord } from '../types';
import { formatWhatsAppUrl } from '../lib/exportUtils';

interface MobileCardViewProps {
  records: CompanyRecord[];
  selectedIds: string[];
  onToggleSelectRow: (id: string) => void;
  onEditRecord: (record: CompanyRecord) => void;
  onDeleteRecord: (id: string) => void;
  isExampleMode?: boolean;
}

/**
 * Generates a stable pseudo-random scrambled text to preserve string structure
 * (retains spacing, dashes, email @ sign and dots) but makes the actual text
 * content 100% scrambled at the character level.
 */
const getScrambledText = (text: string, id: string): string => {
  if (!text) return '';
  
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

export const MobileCardView: React.FC<MobileCardViewProps> = ({
  records,
  selectedIds,
  onToggleSelectRow,
  onEditRecord,
  onDeleteRecord,
  isExampleMode = false
}) => {
  const [expandedIds, setExpandedIds] = React.useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  if (records.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 shadow-sm">
        {isExampleMode 
          ? 'Data tabel kosong. Klik tombol "Buat Baru" di atas untuk membuat database asli Anda sendiri.' 
          : 'Data tabel kosong. Gunakan tombol Tambah Data di atas.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((r) => {
        const isSelected = selectedIds.includes(r.id);
        const isExpanded = expandedIds.includes(r.id);

        return (
          <div
            key={r.id}
            className={`bg-white border rounded-xl p-4 shadow-sm transition-all ${
              isSelected ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            {/* Top Bar: No, Checkbox, Company Name & Category */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <button
                  onClick={() => onToggleSelectRow(r.id)}
                  className="mt-0.5 text-slate-400 hover:text-emerald-700 transition-colors shrink-0"
                >
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-emerald-700" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-300" />
                  )}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                      #{r.no}
                    </span>
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      {r.bidang || 'Umum'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-emerald-950 mt-1 leading-snug">
                    {r.namaPerusahaan || 'Tanpa Nama'}
                  </h3>
                </div>
              </div>

              {/* Actions */}
              {isExampleMode ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onEditRecord(r)}
                    className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-slate-100"
                    title="Lihat Detail"
                  >
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5">
                      Lihat
                    </span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onEditRecord(r)}
                    className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-slate-100"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteRecord(r.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Quick Location & PIC Info */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-700 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate font-medium">{r.areaKota || 'Kota -'}</span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-600">
                <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className={`truncate font-bold text-slate-900 ${isExampleMode ? 'filter blur-[6px] select-none pointer-events-none' : ''}`}>
                  {isExampleMode && r.namaPic ? getScrambledText(r.namaPic, r.id) : (r.namaPic || 'PIC -')}
                </span>
              </div>
            </div>

            {/* Quick Contact Touch Action Buttons */}
            <div className="mt-3 flex items-center gap-2">
              {r.whatsapp ? (
                isExampleMode ? (
                  <div className="flex-1 bg-slate-50 text-slate-400 text-xs py-2 text-center rounded-lg border border-slate-200 select-none pointer-events-none filter blur-[6px]" style={{ userSelect: 'none' }}>
                    WhatsApp {getScrambledText(r.whatsapp, r.id)}
                  </div>
                ) : (
                  <a
                    href={formatWhatsAppUrl(r.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-sm transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-white" />
                    <span>WhatsApp</span>
                  </a>
                )
              ) : (
                <div className="flex-1 bg-slate-50 text-slate-400 text-xs py-2 text-center rounded-lg border border-slate-200">
                  No WA -
                </div>
              )}

              {r.telponKantor && (
                isExampleMode ? (
                  <span className="p-2 bg-slate-100 text-slate-400 rounded-lg border border-slate-200 select-none pointer-events-none filter blur-[6px]" style={{ userSelect: 'none' }}>
                    <Phone className="w-4 h-4" />
                  </span>
                ) : (
                  <a
                    href={`tel:${r.telponKantor}`}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                    title="Telepon Kantor"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )
              )}

              {r.emailPic && (
                isExampleMode ? (
                  <span className="p-2 bg-slate-100 text-slate-400 rounded-lg border border-slate-200 select-none pointer-events-none filter blur-[6px]" style={{ userSelect: 'none' }}>
                    <Mail className="w-4 h-4" />
                  </span>
                ) : (
                  <a
                    href={`mailto:${r.emailPic}`}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                    title="Kirim Email"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                )
              )}

              <button
                onClick={() => toggleExpand(r.id)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200 transition-colors shrink-0"
                title="Lihat Detail"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Expandable Details */}
            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-2 text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                {r.kawasan && (
                  <div className="flex items-start gap-2">
                    <Factory className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500">Kawasan: </span>
                      <span className="font-medium italic text-slate-800">{r.kawasan}</span>
                    </div>
                  </div>
                )}

                {r.emailPic && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <div>
                      <span className="text-slate-500">Email PIC: </span>
                      {isExampleMode ? (
                        <span className="text-emerald-800 font-medium select-none pointer-events-none filter blur-[6px]" style={{ userSelect: 'none' }}>
                          {getScrambledText(r.emailPic, r.id)}
                        </span>
                      ) : (
                        <a href={`mailto:${r.emailPic}`} className="text-emerald-800 underline font-medium">{r.emailPic}</a>
                      )}
                    </div>
                  </div>
                )}

                {r.emailKantor && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <div>
                      <span className="text-slate-500">Email Kantor: </span>
                      {isExampleMode ? (
                        <span className="text-slate-700 select-none pointer-events-none filter blur-[6px]" style={{ userSelect: 'none' }}>
                          {getScrambledText(r.emailKantor, r.id)}
                        </span>
                      ) : (
                        <span>{r.emailKantor}</span>
                      )}
                    </div>
                  </div>
                )}

                {r.alamat && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500">Alamat: </span>
                      {isExampleMode ? (
                        <span className="text-slate-600 select-none pointer-events-none filter blur-[6px]" style={{ userSelect: 'none' }}>
                          {getScrambledText(r.alamat, r.id)}
                        </span>
                      ) : (
                        <span className="text-slate-600">{r.alamat}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
};

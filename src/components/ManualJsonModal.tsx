import React from 'react';
import { X, FileJson, CheckCircle2, AlertCircle, Trash2, ArrowRight, Sparkles, Copy, RefreshCw, Code2, Clipboard, ZoomIn, ZoomOut, List, WrapText } from 'lucide-react';
import { CompanyRecord } from '../types';
import { parseJSONToRecords, preprocessAndCleanJSON } from '../lib/importUtils';
import { formatTelponKantor, formatWhatsApp } from '../lib/phoneUtils';
import { copyToClipboard } from '../lib/exportUtils';

interface ManualJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newRecords: Partial<CompanyRecord>[], replaceMode: boolean) => void;
}

const SAMPLE_JSON_TEMPLATE = `[
  {
    "nama_perusahaan": "PT Teknologi Sinar Digital",
    "bidang_perusahaan": "Teknologi Informasi & Perangkat Lunak",
    "telpon_perusahaan": "021-5551234",
    "email_perusahaan": "info@sinardigital.co.id",
    "website_perusahaan": "www.sinardigital.co.id",
    "nama_pic": "Ahmad Rizky",
    "jabatan_pic": "Business Development",
    "whatsapp_pic": "081298765432",
    "email_pic": "ahmad.rizky@sinardigital.co.id",
    "alamat_kota": "Jakarta Selatan",
    "alamat_kawasan": "Kawasan Mega Kuningan",
    "alamat_detail": "Jl. Dr. Ide Anak Agung Gde Agung No. 5",
    "maps_latitude": "-6.226875",
    "maps_longitude": "106.827725"
  },
  {
    "nama_perusahaan": "CV Agro Mandiri Sejahtera",
    "bidang_perusahaan": "Pertanian & Pengolahan Pangan",
    "telpon_perusahaan": "031-8431122",
    "email_perusahaan": "contact@agromandiri.com",
    "website_perusahaan": "www.agromandiri.com",
    "nama_pic": "Budi Santoso",
    "jabatan_pic": "Manager Operasional",
    "whatsapp_pic": "081134567890",
    "email_pic": "budi.s@agromandiri.com",
    "alamat_kota": "Surabaya",
    "alamat_kawasan": "Kawasan Industri Rungkut",
    "alamat_detail": "Jl. Rungkut Industri III No. 12",
    "maps_latitude": "-7.329864",
    "maps_longitude": "112.766785"
  }
]`;

export const ManualJsonModal: React.FC<ManualJsonModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [jsonText, setJsonText] = React.useState<string>('');
  const [parsedRecords, setParsedRecords] = React.useState<Partial<CompanyRecord>[]>([]);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [errorIndex, setErrorIndex] = React.useState<number | null>(null);
  const [errorLine, setErrorLine] = React.useState<number | null>(null);
  const [errorColumn, setErrorColumn] = React.useState<number | null>(null);
  const [replaceMode, setReplaceMode] = React.useState<boolean>(false);
  const [isFormatted, setIsFormatted] = React.useState<boolean>(false);
  const [isCopied, setIsCopied] = React.useState<boolean>(false);
  const [fontSize, setFontSize] = React.useState<number>(12);
  const [isLineMode, setIsLineMode] = React.useState<boolean>(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setJsonText('');
      setParsedRecords([]);
      setErrorMsg(null);
      setErrorIndex(null);
      setErrorLine(null);
      setErrorColumn(null);
      setReplaceMode(false);
      setIsFormatted(false);
      setIsCopied(false);
      setFontSize(12);
      setIsLineMode(false);
    }
  }, [isOpen]);

  // Extract error character position from SyntaxError message
  const getErrorPosition = (text: string): number | null => {
    try {
      JSON.parse(text);
      return null;
    } catch (err: any) {
      const message = err.message || '';
      let match = message.match(/at position (\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
      match = message.match(/line (\d+) column (\d+)/i);
      if (match) {
        const lineNum = parseInt(match[1], 10);
        const colNum = parseInt(match[2], 10);
        const lines = text.split('\n');
        let pos = 0;
        for (let i = 0; i < Math.min(lineNum - 1, lines.length); i++) {
          pos += lines[i].length + 1;
        }
        pos += colNum - 1;
        return pos;
      }
      match = message.match(/column (\d+)/i);
      if (match) {
        return Math.max(0, parseInt(match[1], 10) - 1);
      }
      return null;
    }
  };

  // Realtime parse JSON whenever text changes
  React.useEffect(() => {
    if (!jsonText.trim()) {
      setParsedRecords([]);
      setErrorMsg(null);
      setErrorIndex(null);
      setErrorLine(null);
      setErrorColumn(null);
      return;
    }

    try {
      // First try standard JSON parse
      let parsedObj: any;
      let isParsed = false;
      try {
        parsedObj = JSON.parse(jsonText.trim());
        isParsed = true;
      } catch (e) {
        // Fallback to cleaned preprocessed version
        const cleaned = preprocessAndCleanJSON(jsonText);
        parsedObj = JSON.parse(cleaned);
        isParsed = true;
      }

      if (isParsed) {
        const records = parseJSONToRecords(jsonText);
        if (records.length === 0) {
          setErrorMsg('JSON valid tetapi tidak menemukan array data perusahaan.');
          setParsedRecords([]);
          setErrorIndex(null);
          setErrorLine(null);
          setErrorColumn(null);
        } else {
          setParsedRecords(records);
          setErrorMsg(null);
          setErrorIndex(null);
          setErrorLine(null);
          setErrorColumn(null);
        }
      }
    } catch (err: any) {
      const errMsg = err.message || '';
      setErrorMsg(errMsg.startsWith('Nama field') || errMsg.startsWith('Data pada') || errMsg.startsWith('Hasil parse') ? errMsg : `Format JSON belum valid: ${errMsg}`);
      setParsedRecords([]);
      
      // Try to find the exact character error index in the raw text so we can highlight it
      let rawPos = getErrorPosition(jsonText);
      if (rawPos === null) {
        const cleaned = preprocessAndCleanJSON(jsonText);
        rawPos = getErrorPosition(cleaned);
      }
      
      setErrorIndex(rawPos);

      // Now determine the exact line and column from the error message or calculated position
      let lineNum: number | null = null;
      let colNum: number | null = null;

      // 1. Try to find line/column patterns from error message
      let match = errMsg.match(/line (\d+) column (\d+)/i);
      if (match) {
        lineNum = parseInt(match[1], 10);
        colNum = parseInt(match[2], 10);
      } else {
        match = errMsg.match(/column (\d+)/i);
        if (match) {
          colNum = parseInt(match[1], 10);
        }
      }

      // 2. If we have raw position, compute line and column precisely
      if (rawPos !== null && lineNum === null) {
        const substring = jsonText.substring(0, rawPos);
        const lines = substring.split('\n');
        lineNum = lines.length;
        colNum = lines[lines.length - 1].length + 1;
      }

      setErrorLine(lineNum);
      setErrorColumn(colNum);
    }
  }, [jsonText]);

  if (!isOpen) return null;

  const formatJSONString = (parsed: any, lineMode: boolean): string => {
    if (lineMode) {
      if (Array.isArray(parsed)) {
        return '[\n' + parsed.map(item => '  ' + JSON.stringify(item)).join(',\n') + '\n]';
      }
      return JSON.stringify(parsed);
    } else {
      return JSON.stringify(parsed, null, 2);
    }
  };

  const handleFormatJson = () => {
    if (!jsonText.trim()) return;
    try {
      const cleaned = preprocessAndCleanJSON(jsonText);
      const parsed = JSON.parse(cleaned);
      setJsonText(formatJSONString(parsed, isLineMode));
      setIsFormatted(true);
      setTimeout(() => setIsFormatted(false), 2000);
    } catch (err: any) {
      setErrorMsg(`Tidak dapat memformat JSON: ${err.message}`);
    }
  };

  const handleToggleMode = () => {
    const nextMode = !isLineMode;
    setIsLineMode(nextMode);
    
    if (jsonText.trim()) {
      try {
        const cleaned = preprocessAndCleanJSON(jsonText);
        const parsed = JSON.parse(cleaned);
        setJsonText(formatJSONString(parsed, nextMode));
      } catch (err) {
        console.log('Skipping auto-reformat on toggle as JSON is incomplete or invalid');
      }
    }
  };

  const handleLoadSample = () => {
    setJsonText(SAMPLE_JSON_TEMPLATE);
  };

  const handleCopyText = () => {
    if (!jsonText.trim()) return;
    copyToClipboard(jsonText).then((success) => {
      if (success) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    });
  };

  const handlePasteText = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setJsonText(text);
          setErrorMsg(null);
          return;
        }
      }
    } catch (err) {
      console.warn('Iframe permissions policy blocked automated clipboard readText:', err);
    }

    // Fallback if readText is blocked by browser policy
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleClear = () => {
    setJsonText('');
    setParsedRecords([]);
    setErrorMsg(null);
  };

  const handleRemoveRow = (idx: number) => {
    const updated = parsedRecords.filter((_, i) => i !== idx);
    setParsedRecords(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  const handleConfirmWrite = () => {
    if (parsedRecords.length === 0) return;
    onImport(parsedRecords, replaceMode);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shadow-sm">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Input JSON
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFontSize(prev => Math.min(prev + 1, 24))}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer shadow-sm inline-flex items-center justify-center"
              title="Perbesar Teks"
            >
              <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
            </button>

            <button
              type="button"
              onClick={() => setFontSize(prev => Math.max(prev - 1, 10))}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg transition-all cursor-pointer shadow-sm inline-flex items-center justify-center"
              title="Perkecil Teks"
            >
              <ZoomOut className="w-3.5 h-3.5 text-slate-600" />
            </button>

            <div className="w-[1px] h-5 bg-slate-200 mx-1 self-center" />

            <button
              type="button"
              onClick={handleLoadSample}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold rounded-lg text-xs transition-all cursor-pointer shadow-sm"
              title="Isi Contoh Template JSON"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
              <span>Contoh</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Action Toolbar above textarea */}
          <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFormatJson}
                disabled={!jsonText.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                <span>{isFormatted ? 'Telah Diformat!' : 'Rapikan'}</span>
              </button>

              <button
                type="button"
                onClick={handlePasteText}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
                title="Tempel dari Clipboard"
              >
                <Clipboard className="w-3.5 h-3.5 text-slate-600" />
                <span>Tempel</span>
              </button>

              <button
                type="button"
                onClick={handleCopyText}
                disabled={!jsonText.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                title="Salin ke Clipboard"
              >
                <Copy className="w-3.5 h-3.5 text-slate-600" />
                <span>{isCopied ? 'Tersalin!' : 'Salin'}</span>
              </button>

              <div className="w-[1px] h-5 bg-slate-200 mx-1 self-center" />

              <button
                type="button"
                onClick={handleToggleMode}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
                title={isLineMode ? "Ubah ke Mode List (Baris Baru)" : "Ubah ke Mode Line (Satu Baris)"}
              >
                {isLineMode ? (
                  <>
                    <List className="w-3.5 h-3.5 text-slate-600" />
                    <span>Mode List</span>
                  </>
                ) : (
                  <>
                    <WrapText className="w-3.5 h-3.5 text-slate-600" />
                    <span>Mode Line</span>
                  </>
                )}
              </button>
            </div>

            {jsonText.trim() && (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 px-2.5 py-1.5 text-slate-400 hover:text-rose-600 transition-colors text-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus</span>
              </button>
            )}
          </div>
 
          {/* Textarea Input */}
          <div className="relative">
            <style>{`
              #json-manual-textarea {
                font-size: ${fontSize}px !important;
                ${isLineMode ? 'white-space: pre !important; overflow-x: auto !important;' : ''}
              }
            `}</style>
            <textarea
              ref={textareaRef}
              id="json-manual-textarea"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              wrap={isLineMode ? 'off' : 'soft'}
              placeholder={`Contoh format JSON array:\n[\n  {\n    "nama_perusahaan": "PT Example Jaya",\n    "bidang_perusahaan": "Teknologi",\n    "telpon_perusahaan": "021-5551234",\n    "email_perusahaan": "info@example.com",\n    "website_perusahaan": "www.example.com",\n    "nama_pic": "Ahmad",\n    "jabatan_pic": "Manager",\n    "whatsapp_pic": "081234567890",\n    "email_pic": "ahmad@example.com",\n    "alamat_kota": "Jakarta Selatan",\n    "alamat_kawasan": "Mega Kuningan",\n    "alamat_detail": "Jl. Dr. Ide Anak Agung Gde Agung No. 5",\n    "maps_latitude": "-6.226875",\n    "maps_longitude": "106.827725"\n  }\n]`}
              className="w-full h-52 font-mono p-3.5 bg-slate-900 text-emerald-400 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-inner resize-y leading-relaxed"
            />
          </div>

          {/* Validation Status Error Message */}
          {errorMsg && (
            <div className="space-y-3">
              <div className="p-4.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex flex-col gap-2.5 shadow-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="font-bold text-rose-800 text-sm">Kesalahan Format JSON Terdeteksi!</div>
                </div>
                
                {errorLine !== null && (
                  <div className="bg-rose-100/60 rounded-xl p-3 border border-rose-200/50 space-y-1.5">
                    <div className="text-[11px] font-extrabold text-rose-900 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                      <span>Masalah ditemukan pada Baris {errorLine}{errorColumn !== null ? `, Kolom ${errorColumn}` : ''}:</span>
                    </div>
                    <div className="font-mono text-[11px] text-rose-950 overflow-x-auto whitespace-pre p-2 bg-white/85 rounded-lg border border-rose-200/40">
                      <span className="text-rose-600 font-bold select-none mr-2">{errorLine} |</span>
                      {jsonText.split('\n')[errorLine - 1] || ''}
                    </div>
                  </div>
                )}

                <div className="pl-6 text-rose-700 leading-relaxed font-semibold">
                  Detail: <span className="font-medium text-rose-600">{errorMsg.replace('Format JSON belum valid: ', '')}</span>
                </div>
              </div>

              {errorIndex !== null && errorIndex >= 0 && errorIndex <= jsonText.length && (
                <div className="bg-slate-950 p-4 rounded-xl border border-rose-950 font-mono text-[11px] overflow-auto max-h-64 whitespace-pre-wrap leading-relaxed shadow-inner">
                  <div className="text-[10px] text-rose-400 font-semibold mb-2.5 uppercase tracking-wider flex items-center gap-1.5 border-b border-rose-950/40 pb-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>Visualisasi Titik Error (Teks berubah merah mulai dari sini):</span>
                  </div>
                  <span className="text-slate-400">{jsonText.substring(0, errorIndex)}</span>
                  <span className="text-rose-500 bg-rose-500/25 border-b-2 border-rose-500 font-bold px-0.5" title="Diperkirakan mulai salah di sini">
                    {jsonText.substring(errorIndex, errorIndex + 1) || ' '}
                  </span>
                  <span className="text-rose-400 bg-rose-500/10 text-rose-400">{jsonText.substring(errorIndex + 1)}</span>
                </div>
              )}
            </div>
          )}

          {/* Preview Table of Parsed JSON */}
          {parsedRecords.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Hasil Parse JSON ({parsedRecords.length})</span>
                </span>

                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1 shadow-sm">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={replaceMode}
                      onChange={(e) => setReplaceMode(e.target.checked)}
                      className="accent-emerald-700 rounded cursor-pointer"
                    />
                    <span>Timpa Data Lama</span>
                  </label>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white max-h-52 shadow-sm">
                <table className="w-full text-[11px] text-left text-slate-700 border-collapse min-w-[1200px]">
                  <thead className="bg-slate-100 text-slate-600 sticky top-0 border-b border-slate-200 uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="px-3 py-2 w-12 text-center">No</th>
                      <th className="px-3 py-2">Perusahaan</th>
                      <th className="px-3 py-2">Bidang</th>
                      <th className="px-3 py-2">Telpon</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Website</th>
                      <th className="px-3 py-2">Nama PIC</th>
                      <th className="px-3 py-2">Jabatan</th>
                      <th className="px-3 py-2">WhatsApp</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Kota</th>
                      <th className="px-3 py-2">Kawasan</th>
                      <th className="px-3 py-2">Alamat</th>
                      <th className="px-3 py-2">Longitude</th>
                      <th className="px-3 py-2">Latitude</th>
                      <th className="px-3 py-2 text-center sticky right-0 bg-slate-100 shadow-sm w-16">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRecords.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2 font-mono text-slate-400 font-bold text-center">{idx + 1}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{r.namaPerusahaan || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{r.bidang || '-'}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{formatTelponKantor(r.telponKantor) || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{r.emailKantor || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{r.website || '-'}</td>
                        <td className="px-3 py-2 text-slate-800 font-medium">{r.namaPic || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{r.jabatanPic || '-'}</td>
                        <td className="px-3 py-2 font-mono text-slate-800">{formatWhatsApp(r.whatsapp) || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{r.emailPic || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{r.areaKota || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{r.kawasan || '-'}</td>
                        <td className="px-3 py-2 text-slate-600 max-w-xs truncate" title={r.alamat || undefined}>
                          {r.alamat || '-'}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-500">{r.longitude || '-'}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{r.latitude || '-'}</td>
                        <td className="px-3 py-2 text-center sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-100 shadow-sm">
                          <button
                            onClick={() => handleRemoveRow(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Hapus baris ini"
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

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            disabled={parsedRecords.length === 0}
            onClick={handleConfirmWrite}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-lg shadow-emerald-700/20 transition-all cursor-pointer"
          >
            <span>Tulis {parsedRecords.length > 0 ? `${parsedRecords.length} Data ` : ''}Ke Tabel</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

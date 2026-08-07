import React from 'react';
import { 
  CheckSquare, 
  Square, 
  Check, 
  X, 
  Trash2, 
  Edit3, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Building2, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  RefreshCw,
  Search,
  CheckCheck
} from 'lucide-react';
import { CompanyRecord } from '../types';
import { formatTelponKantor, formatWhatsApp, cleanRawPhone } from '../lib/phoneUtils';

export interface AiApprovalItem {
  tempId: string;
  approved: boolean;
  data: Partial<CompanyRecord>;
  isEditing?: boolean;
}

interface AiApprovalListProps {
  initialRecords: Partial<CompanyRecord>[];
  onConfirmExport: (approvedRecords: Partial<CompanyRecord>[]) => void;
  onReset: () => void;
  themeColor?: 'emerald' | 'cyan';
  sourceTitle?: string;
}

export const AiApprovalList: React.FC<AiApprovalListProps> = ({
  initialRecords,
  onConfirmExport,
  onReset,
  themeColor = 'emerald',
  sourceTitle = 'Data Ekstraksi AI'
}) => {
  const [items, setItems] = React.useState<AiApprovalItem[]>(() => 
    initialRecords.map((rec, index) => ({
      tempId: `tmp_${Date.now()}_${index}`,
      approved: true, // Default setujui semua
      data: { ...rec },
      isEditing: false
    }))
  );

  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [searchFilter, setSearchFilter] = React.useState<string>('');

  // Toggle individual item approval
  const handleToggleApprove = (tempId: string) => {
    setItems(prev => prev.map(item => 
      item.tempId === tempId ? { ...item, approved: !item.approved } : item
    ));
  };

  // Toggle ALL approve / unapprove
  const allApproved = items.length > 0 && items.every(i => i.approved);
  const handleToggleApproveAll = () => {
    const nextState = !allApproved;
    setItems(prev => prev.map(item => ({ ...item, approved: nextState })));
  };

  // Delete individual item
  const handleDeleteItem = (tempId: string) => {
    setItems(prev => prev.filter(i => i.tempId !== tempId));
  };

  // Remove unapproved items
  const handleRemoveUnapproved = () => {
    setItems(prev => prev.filter(i => i.approved));
  };

  // Update item data
  const handleUpdateField = (tempId: string, field: keyof CompanyRecord, value: string) => {
    let val = value;
    if (field === 'telponKantor') val = formatTelponKantor(value);
    if (field === 'whatsapp') val = formatWhatsApp(value);

    setItems(prev => prev.map(item => {
      if (item.tempId === tempId) {
        return {
          ...item,
          data: {
            ...item.data,
            [field]: val
          }
        };
      }
      return item;
    }));
  };

  // Toggle Edit mode for a row
  const handleToggleEdit = (tempId: string) => {
    setItems(prev => prev.map(item => 
      item.tempId === tempId ? { ...item, isEditing: !item.isEditing } : item
    ));
  };

  const approvedItems = items.filter(i => i.approved);
  const approvedCount = approvedItems.length;

  const filteredItems = React.useMemo(() => {
    if (!searchFilter.trim()) return items;
    const q = searchFilter.toLowerCase().trim();
    return items.filter(i => 
      (i.data.namaPerusahaan && i.data.namaPerusahaan.toLowerCase().includes(q)) ||
      (i.data.areaKota && i.data.areaKota.toLowerCase().includes(q)) ||
      (i.data.bidang && i.data.bidang.toLowerCase().includes(q)) ||
      (i.data.namaPic && i.data.namaPic.toLowerCase().includes(q)) ||
      (i.data.whatsapp && i.data.whatsapp.includes(q))
    );
  }, [items, searchFilter]);

  const handleExport = () => {
    if (approvedCount === 0) return;
    const recordsToExport = approvedItems.map(i => ({
      ...i.data,
      telponKantor: cleanRawPhone(i.data.telponKantor),
      whatsapp: cleanRawPhone(i.data.whatsapp)
    }));
    onConfirmExport(recordsToExport);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Stats & Control Toolbar */}
      <div className="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 bg-emerald-50/70 border-emerald-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm bg-emerald-700 text-white">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900">
                {sourceTitle} ({items.length} Perusahaan Terdeteksi)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-100 border-emerald-300 text-emerald-800">
                Pilih & Setujui Data
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Centang item yang disetujui, edit jika ada koreksi, lalu klik eksport ke tabel utama.
            </p>
          </div>
        </div>

        {/* Quick Bulk Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleApproveAll}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-sm ${
              allApproved
                ? 'bg-emerald-700 text-white border-emerald-800 hover:bg-emerald-800'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
            title="Klik untuk setujui semua atau batalkan semua"
          >
            <CheckCheck className="w-4 h-4" />
            <span>{allApproved ? 'Semua Disetujui' : 'Setujui Semua'}</span>
          </button>

          {items.some(i => !i.approved) && (
            <button
              type="button"
              onClick={handleRemoveUnapproved}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Hapus baris yang tidak dicentang"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Unchecked</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Pindai atau proses ulang"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Proses Ulang</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar if items > 3 */}
      {items.length > 3 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari perusahaan, kota, PIC, atau bidang dalam daftar ekstraksi..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-1.5 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white"
          />
        </div>
      )}

      {/* Data Approval List Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="max-h-[380px] overflow-y-auto">
          <table className="w-full text-xs text-left text-slate-700 border-collapse">
            <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-3 py-2.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleApproveAll}
                    className="p-1 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                    title="Setujui Semua"
                  >
                    {allApproved ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="px-2 py-2.5 w-8 text-center">No</th>
                <th className="px-3 py-2.5 min-w-[150px]">Nama Perusahaan</th>
                <th className="px-3 py-2.5 min-w-[110px]">Bidang</th>
                <th className="px-3 py-2.5 min-w-[110px]">Telpon Kantor</th>
                <th className="px-3 py-2.5 min-w-[120px]">Email Kantor</th>
                <th className="px-3 py-2.5 min-w-[120px]">PIC / Jabatan</th>
                <th className="px-3 py-2.5 min-w-[110px]">WhatsApp</th>
                <th className="px-3 py-2.5 min-w-[120px]">Email PIC</th>
                <th className="px-3 py-2.5 min-w-[110px]">Kota / Area</th>
                <th className="px-3 py-2.5 min-w-[110px]">Kawasan</th>
                <th className="px-3 py-2.5 w-20 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-slate-500">
                    Tidak ada data perusahaan yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const isExpanded = expandedId === item.tempId;
                  const rec = item.data;

                  return (
                    <React.Fragment key={item.tempId}>
                      <tr className={`transition-colors ${
                        item.approved 
                          ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                          : 'bg-slate-50/80 text-slate-400 hover:bg-slate-100'
                      }`}>
                        {/* Checkbox */}
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleApprove(item.tempId)}
                            className="p-1 rounded cursor-pointer transition-transform active:scale-95"
                          >
                            {item.approved ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>

                        {/* No */}
                        <td className="px-2 py-2 text-center font-mono text-[11px] text-slate-500">
                          {index + 1}
                        </td>

                        {/* Nama Perusahaan */}
                        <td className="px-3 py-2">
                          {item.isEditing ? (
                            <input
                              type="text"
                              value={rec.namaPerusahaan || ''}
                              onChange={(e) => handleUpdateField(item.tempId, 'namaPerusahaan', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-900"
                              placeholder="Nama Perusahaan"
                            />
                          ) : (
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{rec.namaPerusahaan || <span className="text-rose-400 italic">Tanpa Nama</span>}</span>
                            </div>
                          )}
                        </td>

                        {/* Bidang */}
                        <td className="px-3 py-2">
                          {item.isEditing ? (
                            <input
                              type="text"
                              value={rec.bidang || ''}
                              onChange={(e) => handleUpdateField(item.tempId, 'bidang', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                              placeholder="Bidang"
                            />
                          ) : (
                            <span className="inline-block bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200">
                              {rec.bidang || 'Lainnya'}
                            </span>
                          )}
                        </td>

                        {/* Telpon Kantor */}
                        <td className="px-3 py-2">
                          {item.isEditing ? (
                            <input
                              type="text"
                              value={rec.telponKantor || ''}
                              onChange={(e) => handleUpdateField(item.tempId, 'telponKantor', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                              placeholder="Telpon Kantor"
                            />
                          ) : (
                            <span className="font-mono text-slate-600 text-xs">{rec.telponKantor || '-'}</span>
                          )}
                        </td>

                        {/* Email Kantor */}
                        <td className="px-3 py-2">
                          {item.isEditing ? (
                            <input
                              type="text"
                              value={rec.emailKantor || ''}
                              onChange={(e) => handleUpdateField(item.tempId, 'emailKantor', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                              placeholder="Email Kantor"
                            />
                          ) : (
                            <span className="text-slate-600 text-xs truncate max-w-[110px] block">{rec.emailKantor || '-'}</span>
                          )}
                        </td>

                        {/* PIC / Jabatan */}
                        <td className="px-3 py-2">
                          {item.isEditing ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={rec.namaPic || ''}
                                onChange={(e) => handleUpdateField(item.tempId, 'namaPic', e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-semibold"
                                placeholder="Nama PIC"
                              />
                              <input
                                type="text"
                                value={rec.jabatanPic || ''}
                                onChange={(e) => handleUpdateField(item.tempId, 'jabatanPic', e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-2 py-0.5 text-[11px]"
                                placeholder="Jabatan PIC"
                              />
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold text-slate-800 flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{rec.namaPic || '-'}</span>
                              </div>
                              {rec.jabatanPic && (
                                <div className="text-[10px] text-slate-500">{rec.jabatanPic}</div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* WhatsApp */}
                        <td className="px-3 py-2">
                          {item.isEditing ? (
                            <input
                              type="text"
                              value={rec.whatsapp || ''}
                              onChange={(e) => handleUpdateField(item.tempId, 'whatsapp', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                              placeholder="No WhatsApp"
                            />
                          ) : (
                            <span className="font-mono text-slate-900 font-semibold">{formatWhatsApp(rec.whatsapp) || '-'}</span>
                          )}
                        </td>

                        {/* Email PIC */}
                        <td className="px-3 py-2">
                          {item.isEditing ? (
                            <input
                              type="text"
                              value={rec.emailPic || ''}
                              onChange={(e) => handleUpdateField(item.tempId, 'emailPic', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                              placeholder="Email PIC"
                            />
                          ) : (
                            <span className="text-slate-600 text-xs truncate max-w-[110px] block">{rec.emailPic || '-'}</span>
                          )}
                        </td>

                        {/* Kota / Area */}
                        <td className="px-3 py-2">
                          {item.isEditing ? (
                            <input
                              type="text"
                              value={rec.areaKota || ''}
                              onChange={(e) => handleUpdateField(item.tempId, 'areaKota', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                              placeholder="Kota"
                            />
                          ) : (
                            <div className="text-slate-700 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{rec.areaKota || '-'}</span>
                            </div>
                          )}
                        </td>

                        {/* Kawasan */}
                        <td className="px-3 py-2">
                          {item.isEditing ? (
                            <input
                              type="text"
                              value={rec.kawasan || ''}
                              onChange={(e) => handleUpdateField(item.tempId, 'kawasan', e.target.value)}
                              className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                              placeholder="Kawasan"
                            />
                          ) : (
                            <span className="text-slate-600">{rec.kawasan || '-'}</span>
                          )}
                        </td>

                        {/* Actions Column */}
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : item.tempId)}
                              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded"
                              title="Lihat detail lengkap"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleEdit(item.tempId)}
                              className={`p-1 rounded transition-colors ${
                                item.isEditing ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:text-emerald-700 hover:bg-slate-200/60'
                              }`}
                              title={item.isEditing ? "Selesai Edit" : "Edit Baris Ini"}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.tempId)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Hapus Dari Daftar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Detail Section */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={12} className="px-6 py-3 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                              <div>
                                <span className="font-bold text-slate-500 block text-[10px] uppercase">Email PIC:</span>
                                {item.isEditing ? (
                                  <input
                                    type="text"
                                    value={rec.emailPic || ''}
                                    onChange={(e) => handleUpdateField(item.tempId, 'emailPic', e.target.value)}
                                    className="w-full bg-white border rounded px-2 py-1"
                                  />
                                ) : (
                                  <span className="text-slate-800 font-mono">{rec.emailPic || '-'}</span>
                                )}
                              </div>

                              <div>
                                <span className="font-bold text-slate-500 block text-[10px] uppercase">Telepon Kantor:</span>
                                {item.isEditing ? (
                                  <input
                                    type="text"
                                    value={rec.telponKantor || ''}
                                    onChange={(e) => handleUpdateField(item.tempId, 'telponKantor', e.target.value)}
                                    className="w-full bg-white border rounded px-2 py-1"
                                  />
                                ) : (
                                  <span className="text-slate-800 font-mono">{formatTelponKantor(rec.telponKantor) || '-'}</span>
                                )}
                              </div>

                              <div>
                                <span className="font-bold text-slate-500 block text-[10px] uppercase">Email Kantor:</span>
                                {item.isEditing ? (
                                  <input
                                    type="text"
                                    value={rec.emailKantor || ''}
                                    onChange={(e) => handleUpdateField(item.tempId, 'emailKantor', e.target.value)}
                                    className="w-full bg-white border rounded px-2 py-1"
                                  />
                                ) : (
                                  <span className="text-slate-800 font-mono">{rec.emailKantor || '-'}</span>
                                )}
                              </div>

                              <div>
                                <span className="font-bold text-slate-500 block text-[10px] uppercase">Website:</span>
                                {item.isEditing ? (
                                  <input
                                    type="text"
                                    value={rec.website || ''}
                                    onChange={(e) => handleUpdateField(item.tempId, 'website', e.target.value)}
                                    className="w-full bg-white border rounded px-2 py-1 text-xs"
                                  />
                                ) : (
                                  <span className="text-slate-800 font-mono">{rec.website || '-'}</span>
                                )}
                              </div>

                              <div>
                                <span className="font-bold text-slate-500 block text-[10px] uppercase">Latitude:</span>
                                {item.isEditing ? (
                                  <input
                                    type="text"
                                    value={rec.latitude || ''}
                                    onChange={(e) => handleUpdateField(item.tempId, 'latitude', e.target.value)}
                                    className="w-full bg-white border rounded px-2 py-1 text-xs font-mono"
                                  />
                                ) : (
                                  <span className="text-slate-800 font-mono">{rec.latitude || '-'}</span>
                                )}
                              </div>

                              <div>
                                <span className="font-bold text-slate-500 block text-[10px] uppercase">Longitude:</span>
                                {item.isEditing ? (
                                  <input
                                    type="text"
                                    value={rec.longitude || ''}
                                    onChange={(e) => handleUpdateField(item.tempId, 'longitude', e.target.value)}
                                    className="w-full bg-white border rounded px-2 py-1 text-xs font-mono"
                                  />
                                ) : (
                                  <span className="text-slate-800 font-mono">{rec.longitude || '-'}</span>
                                )}
                              </div>

                              <div className="sm:col-span-2 md:col-span-3">
                                <span className="font-bold text-slate-500 block text-[10px] uppercase">Alamat Lengkap:</span>
                                {item.isEditing ? (
                                  <textarea
                                    value={rec.alamat || ''}
                                    onChange={(e) => handleUpdateField(item.tempId, 'alamat', e.target.value)}
                                    className="w-full bg-white border rounded px-2 py-1 text-xs"
                                    rows={2}
                                  />
                                ) : (
                                  <span className="text-slate-800">{rec.alamat || '-'}</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Export Action */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs font-medium text-slate-600 flex items-center gap-2">
          <CheckCircle2 className={`w-4 h-4 ${approvedCount > 0 ? 'text-emerald-600' : 'text-slate-300'}`} />
          <span>
            Status Approval: <strong className="text-slate-900">{approvedCount} dari {items.length}</strong> data perusahaan disetujui
          </span>
        </div>

        <button
          type="button"
          disabled={approvedCount === 0}
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-lg shadow-emerald-700/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>Eksport {approvedCount} Data Disetujui Ke Tabel Utama</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

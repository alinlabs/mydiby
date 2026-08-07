import React from 'react';
import { X, Save, Building2, User, Phone, Mail, MapPin, Sparkles } from 'lucide-react';
import { CompanyRecord } from '../types';
import { formatTelponKantor, formatWhatsApp, cleanRawPhone } from '../lib/phoneUtils';

interface ManualFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: Partial<CompanyRecord>) => void;
  editingRecord?: CompanyRecord | null;
  totalRecordsCount: number;
  isExampleMode?: boolean;
}

/**
 * Generates a stable pseudo-random scrambled text to preserve string structure
 * (retains spacing, dashes, email @ sign and dots) but makes the actual text
 * content 100% scrambled at the character level.
 */
const getScrambledText = (text: string, id: string): string => {
  if (!text) return '';
  
  // Calculate a stable simple hash based on the id to avoid flickering on re-render
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

export const ManualFormModal: React.FC<ManualFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRecord,
  totalRecordsCount,
  isExampleMode = false
}) => {
  const [formData, setFormData] = React.useState<Partial<CompanyRecord>>({
    areaKota: '',
    kawasan: '',
    namaPerusahaan: '',
    bidang: '',
    namaPic: '',
    jabatanPic: '',
    whatsapp: '',
    emailPic: '',
    telponKantor: '',
    emailKantor: '',
    alamat: '',
    longitude: '',
    latitude: ''
  });

  const getDisplayValue = (field: keyof CompanyRecord, realValue: string) => {
    if (!isExampleMode || !realValue) return realValue;
    const nonBlurredFields: (keyof CompanyRecord)[] = ['namaPerusahaan', 'areaKota', 'kawasan', 'bidang', 'website'];
    if (nonBlurredFields.includes(field)) {
      return realValue;
    }
    return getScrambledText(realValue, editingRecord?.id || 'sample');
  };

  const [errors, setErrors] = React.useState<{ [key: string]: string }>({});

  React.useEffect(() => {
    if (editingRecord) {
      setFormData({
        ...editingRecord,
        telponKantor: formatTelponKantor(editingRecord.telponKantor),
        whatsapp: formatWhatsApp(editingRecord.whatsapp)
      });
    } else {
      setFormData({
        areaKota: '',
        kawasan: '',
        namaPerusahaan: '',
        bidang: '',
        namaPic: '',
        whatsapp: '',
        emailPic: '',
        telponKantor: '',
        emailKantor: '',
        alamat: '',
        longitude: '',
        latitude: ''
      });
    }
    setErrors({});
  }, [editingRecord, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof CompanyRecord, value: string) => {
    let formattedVal = value;
    if (field === 'telponKantor') {
      formattedVal = formatTelponKantor(value);
    } else if (field === 'whatsapp') {
      formattedVal = formatWhatsApp(value);
    }

    setFormData(prev => ({ ...prev, [field]: formattedVal }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaPerusahaan?.trim()) {
      setErrors({ namaPerusahaan: 'Nama Perusahaan wajib diisi.' });
      return;
    }
    
    // Save clean digits text to stored data
    const cleanData: Partial<CompanyRecord> = {
      ...formData,
      telponKantor: cleanRawPhone(formData.telponKantor),
      whatsapp: cleanRawPhone(formData.whatsapp)
    };

    onSave(cleanData);
    onClose();
  };

  const autoFillSample = () => {
    setFormData({
      areaKota: 'Bekasi',
      kawasan: 'Kawasan Industri Jababeka V',
      namaPerusahaan: 'PT Industri Sinar Jaya',
      bidang: 'Manufaktur Elektronik',
      namaPic: 'Andi Wijaya',
      whatsapp: formatWhatsApp('081234567890'),
      emailPic: 'andi.w@sinarjaya.co.id',
      telponKantor: formatTelponKantor('0218901234'),
      emailKantor: 'contact@sinarjaya.co.id',
      website: 'www.sinarjaya.co.id',
      alamat: 'Jl. Jababeka XVIIB Blok U No. 12, Cikarang Utara, Bekasi',
      longitude: '107.143714',
      latitude: '-6.273187'
    });
    setErrors({});
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {editingRecord ? 'Edit Data Perusahaan' : 'Tambah Perusahaan Baru'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isExampleMode && (
          <div className="bg-amber-50 border-b border-amber-100 px-6 py-3 flex items-start gap-2.5 text-xs text-amber-800 font-medium">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Mode Simulasi Aktif</strong>: Beberapa informasi kontak PIC, Telepon, Email, Alamat, dan Koordinat disamarkan secara dinamis demi privasi data perusahaan asli.
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Section: Identitas Perusahaan */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-900 tracking-wider uppercase flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-900" />
              <span>Identitas & Lokasi Perusahaan</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Nama Perusahaan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. PT Asahi Automotive Indonesia"
                  value={getDisplayValue('namaPerusahaan', formData.namaPerusahaan || '')}
                  onChange={(e) => handleChange('namaPerusahaan', e.target.value)}
                  readOnly={isExampleMode}
                  className={`w-full bg-white border ${
                    errors.namaPerusahaan ? 'border-rose-500' : 'border-slate-300'
                  } text-xs text-slate-900 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm ${
                    isExampleMode ? 'bg-slate-50 cursor-not-allowed' : ''
                  }`}
                />
                {errors.namaPerusahaan && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.namaPerusahaan}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Area Wilayah (Kota)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jakarta Selatan, Bekasi, Surabaya"
                  value={getDisplayValue('areaKota', formData.areaKota || '')}
                  onChange={(e) => handleChange('areaKota', e.target.value)}
                  readOnly={isExampleMode}
                  className={`w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm ${
                    isExampleMode ? 'bg-slate-50 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Kawasan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kawasan Industri MM2100 / KIIC"
                  value={getDisplayValue('kawasan', formData.kawasan || '')}
                  onChange={(e) => handleChange('kawasan', e.target.value)}
                  readOnly={isExampleMode}
                  className={`w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm ${
                    isExampleMode ? 'bg-slate-50 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Bidang Industri / Usaha
                </label>
                <input
                  type="text"
                  placeholder="e.g. Otomotif, Logistik, Tekstil, IT & Software"
                  value={getDisplayValue('bidang', formData.bidang || '')}
                  onChange={(e) => handleChange('bidang', e.target.value)}
                  readOnly={isExampleMode}
                  className={`w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm ${
                    isExampleMode ? 'bg-slate-50 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100 my-4" />

          {/* Section: Kontak PIC */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-900 tracking-wider uppercase flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-900" />
              <span>Person In Charge (PIC)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Nama PIC
                </label>
                <input
                  type="text"
                  placeholder="e.g. Budi Santoso"
                  value={getDisplayValue('namaPic', formData.namaPic || '')}
                  onChange={(e) => handleChange('namaPic', e.target.value)}
                  readOnly={isExampleMode}
                  className={`w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm ${
                    isExampleMode ? 'bg-slate-50 cursor-not-allowed filter blur-[6px] select-none pointer-events-none' : ''
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Jabatan PIC
                </label>
                <input
                  type="text"
                  placeholder="e.g. HR Manager..."
                  value={getDisplayValue('jabatanPic', formData.jabatanPic || '')}
                  onChange={(e) => handleChange('jabatanPic', e.target.value)}
                  readOnly={isExampleMode}
                  className={`w-full bg-white border border-slate-300 text-xs text-slate-900 px-3 py-2.5 rounded-lg focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm ${
                    isExampleMode ? 'bg-slate-50 cursor-not-allowed filter blur-[6px] select-none pointer-events-none' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  WhatsApp PIC
                </label>
                <input
                  type="text"
                  placeholder="e.g. 081298765432"
                  value={getDisplayValue('whatsapp', formData.whatsapp || '')}
                  onChange={(e) => handleChange('whatsapp', e.target.value)}
                  readOnly={isExampleMode}
                  className={`w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm ${
                    isExampleMode ? 'bg-slate-50 cursor-not-allowed filter blur-[6px] select-none pointer-events-none' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Email PIC
                </label>
                <input
                  type="email"
                  placeholder="e.g. budi@perusahaan.co.id"
                  value={getDisplayValue('emailPic', formData.emailPic || '')}
                  onChange={(e) => handleChange('emailPic', e.target.value)}
                  readOnly={isExampleMode}
                  className={`w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm ${
                    isExampleMode ? 'bg-slate-50 cursor-not-allowed filter blur-[6px] select-none pointer-events-none' : ''
                  }`}
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100 my-4" />

          {/* Section: Kontak Resmi Kantor & Alamat */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-900 tracking-wider uppercase flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-900" />
              <span>Kontak Resmi Kantor & Alamat</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Telepon Kantor
                </label>
                <input
                  type="text"
                  placeholder="e.g. 02189801234"
                  value={getDisplayValue('telponKantor', formData.telponKantor || '')}
                  onChange={(e) => handleChange('telponKantor', e.target.value)}
                  readOnly={isExampleMode}
                  className={`w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm ${
                    isExampleMode ? 'bg-slate-50 cursor-not-allowed filter blur-[6px] select-none pointer-events-none' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Email Kantor
                </label>
                <input
                  type="email"
                  placeholder="e.g. info@perusahaan.co.id"
                  value={getDisplayValue('emailKantor', formData.emailKantor || '')}
                  onChange={(e) => handleChange('emailKantor', e.target.value)}
                  readOnly={isExampleMode}
                  className={`w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm ${
                    isExampleMode ? 'bg-slate-50 cursor-not-allowed filter blur-[6px] select-none pointer-events-none' : ''
                  }`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Website Perusahaan
                </label>
                <input
                  type="url"
                  placeholder="e.g. www.perusahaan.com"
                  value={getDisplayValue('website', formData.website || '')}
                  onChange={(e) => handleChange('website', e.target.value)}
                  readOnly={isExampleMode}
                  className={`w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm ${
                    isExampleMode ? 'bg-slate-50 cursor-not-allowed' : ''
                  }`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Alamat Lengkap Kantor / Pabrik
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Jl. Irian II Blok QQ-1, Kawasan Industri MM2100, Cikarang Barat"
                  value={getDisplayValue('alamat', formData.alamat || '')}
                  onChange={(e) => handleChange('alamat', e.target.value)}
                  readOnly={isExampleMode}
                  className={`w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm resize-none ${
                    isExampleMode ? 'bg-slate-50 cursor-not-allowed filter blur-[6px] select-none pointer-events-none' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Longitude (Garis Bujur)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 107.123456"
                  value={getDisplayValue('longitude', formData.longitude || '')}
                  onChange={(e) => handleChange('longitude', e.target.value)}
                  readOnly={isExampleMode}
                  className={`w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm ${
                    isExampleMode ? 'bg-slate-50 cursor-not-allowed filter blur-[6px] select-none pointer-events-none' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 mb-1">
                  Latitude (Garis Lintang)
                </label>
                <input
                  type="text"
                  placeholder="e.g. -6.123456"
                  value={getDisplayValue('latitude', formData.latitude || '')}
                  onChange={(e) => handleChange('latitude', e.target.value)}
                  readOnly={isExampleMode}
                  className={`w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 shadow-sm ${
                    isExampleMode ? 'bg-slate-50 cursor-not-allowed filter blur-[6px] select-none pointer-events-none' : ''
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {isExampleMode ? 'Tutup Detail' : 'Batal'}
            </button>
            {!isExampleMode && (
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-md transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Ke Database</span>
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};

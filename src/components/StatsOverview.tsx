import React from 'react';
import { Building2, MapPin, Factory, Users } from 'lucide-react';
import { CompanyRecord } from '../types';

interface StatsOverviewProps {
  records: CompanyRecord[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ records }) => {
  const totalCompanies = records.length;
  
  const uniqueCities = React.useMemo(() => {
    const cities = records.map(r => r.areaKota?.trim()).filter(Boolean);
    return new Set(cities).size;
  }, [records]);

  const uniqueKawasan = React.useMemo(() => {
    const kawasan = records.map(r => r.kawasan?.trim()).filter(Boolean);
    return new Set(kawasan).size;
  }, [records]);

  const totalContacts = React.useMemo(() => {
    return records.filter(r => r.namaPic || r.whatsapp || r.emailPic).length;
  }, [records]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="bg-white border border-emerald-900/10 rounded-xl p-3.5 shadow-sm flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500">Perusahaan</div>
          <div className="text-lg font-bold text-slate-900">{totalCompanies}</div>
        </div>
      </div>

      <div className="bg-white border border-emerald-900/10 rounded-xl p-3.5 shadow-sm flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
          <MapPin className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500">Kota Wilayah</div>
          <div className="text-lg font-bold text-slate-900">{uniqueCities}</div>
        </div>
      </div>

      <div className="bg-white border border-emerald-900/10 rounded-xl p-3.5 shadow-sm flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
          <Factory className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500">Kawasan</div>
          <div className="text-lg font-bold text-slate-900">{uniqueKawasan}</div>
        </div>
      </div>

      <div className="bg-white border border-emerald-900/10 rounded-xl p-3.5 shadow-sm flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium text-slate-500">Kontak PIC</div>
          <div className="text-lg font-bold text-slate-900">{totalContacts}</div>
        </div>
      </div>
    </div>
  );
};

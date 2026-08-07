import React from 'react';
import { 
  X, AlertTriangle, Trash2, Check, Sparkles, RefreshCw, Layers, 
  Info, CheckCircle2, ShieldCheck, ArrowRight, GitMerge, Search, Plus, PlusCircle, Save, Unlink, ArrowLeft
} from 'lucide-react';
import { CompanyRecord } from '../types';
import { cleanRawPhone, formatTelponKantor, formatWhatsApp } from '../lib/phoneUtils';
import { BottomNavigation } from './BottomNavigation';

interface DuplicateCheckerModalProps {
  isOpen?: boolean;
  onClose: () => void;
  records: CompanyRecord[];
  onDeleteRecords: (ids: string[]) => void;
  onUpdateRecords?: (records: CompanyRecord[]) => void;
}

export interface GeneralDuplicateGroup {
  id: string;
  title: string;
  primaryField: string;
  matchedFields: string[]; // e.g. ['Nama Perusahaan', 'Telpon Kantor']
  records: CompanyRecord[];
  similarityScore: number;
}

// Calculate completeness score for a record (Exactly 14 fields)
function getRecordCompleteness(r: CompanyRecord) {
  const fieldsToCheck: { key: keyof CompanyRecord; label: string }[] = [
    { key: 'namaPerusahaan', label: 'Nama Perusahaan' },
    { key: 'bidang', label: 'Bidang Industri' },
    { key: 'namaPic', label: 'Nama PIC' },
    { key: 'jabatanPic', label: 'Jabatan PIC' },
    { key: 'whatsapp', label: 'WhatsApp PIC' },
    { key: 'emailPic', label: 'Email PIC' },
    { key: 'telponKantor', label: 'Telpon Kantor' },
    { key: 'emailKantor', label: 'Email Kantor' },
    { key: 'website', label: 'Website' },
    { key: 'alamat', label: 'Alamat' },
    { key: 'areaKota', label: 'Kota / Area' },
    { key: 'kawasan', label: 'Kawasan' },
    { key: 'latitude', label: 'Latitude' },
    { key: 'longitude', label: 'Longitude' }
  ];

  const filled: string[] = [];
  const missing: { key: keyof CompanyRecord; label: string }[] = [];

  fieldsToCheck.forEach(f => {
    const val = r[f.key];
    if (val && String(val).trim() !== '') {
      filled.push(f.label);
    } else {
      missing.push(f);
    }
  });

  const total = fieldsToCheck.length;
  const score = filled.length;
  const percentage = Math.round((score / total) * 100);

  return { score, total, percentage, filled, missing };
}

// Normalization helper for strings
function normalizeString(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein distance for fuzzy string comparison
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
      }
    }
  }
  return dp[m][n];
}

// Calculate similarity score between two records (0 to 100)
function calculateRecordSimilarity(r1: CompanyRecord, r2: CompanyRecord): number {
  const fields: (keyof CompanyRecord)[] = [
    'namaPerusahaan', 'bidang', 'namaPic', 'jabatanPic', 'whatsapp', 
    'emailPic', 'telponKantor', 'emailKantor', 'website', 'alamat', 'areaKota', 'kawasan', 'latitude', 'longitude'
  ];
  let totalWeight = 0;
  let matchWeight = 0;

  fields.forEach(f => {
    const val1 = String(r1[f] || '').trim();
    const val2 = String(r2[f] || '').trim();

    if (!val1 && !val2) {
      // Both are empty: we don't penalize, but it's not active matching either
      totalWeight += 0.5;
      matchWeight += 0.5;
    } else if (val1 && val2) {
      totalWeight += 1.0;
      const norm1 = (f === 'whatsapp' || f === 'telponKantor') ? cleanRawPhone(val1) : normalizeString(val1);
      const norm2 = (f === 'whatsapp' || f === 'telponKantor') ? cleanRawPhone(val2) : normalizeString(val2);
      if (norm1 === norm2) {
        matchWeight += 1.0;
      } else if (norm1.includes(norm2) || norm2.includes(norm1)) {
        matchWeight += 0.85;
      } else if (norm1.length > 3 && norm2.length > 3) {
        const dist = levenshteinDistance(norm1, norm2);
        const maxLen = Math.max(norm1.length, norm2.length);
        const sim = 1 - dist / maxLen;
        if (sim >= 0.7) {
          matchWeight += sim;
        }
      }
    } else {
      // One is empty, one has value: could be merged cleanly, so we give a mild positive match
      totalWeight += 1.0;
      matchWeight += 0.45;
    }
  });

  return totalWeight > 0 ? Math.round((matchWeight / totalWeight) * 100) : 100;
}

// Calculate the similarity percentage of a duplicate group
function getGroupSimilarity(records: CompanyRecord[]): number {
  if (records.length < 2) return 100;
  // Use first record as anchor or sort to find the most complete
  const sorted = [...records].sort((a, b) => {
    const scoreA = getRecordCompleteness(a).score;
    const scoreB = getRecordCompleteness(b).score;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return a.no - b.no;
  });
  const anchor = sorted[0];
  const others = sorted.slice(1);
  let totalSim = 0;
  others.forEach(r => {
    totalSim += calculateRecordSimilarity(anchor, r);
  });
  return Math.round(totalSim / others.length);
}

// Check if a field value is identical across multiple records in the duplicate group
function isValueSharedAcrossGroup(
  records: CompanyRecord[], 
  fieldKey: keyof CompanyRecord, 
  value: string
): boolean {
  if (!value || value.trim() === '') return false;

  const normalizedTarget = (fieldKey === 'whatsapp' || fieldKey === 'telponKantor')
    ? cleanRawPhone(value)
    : normalizeString(value);

  if (!normalizedTarget) return false;

  let matchCount = 0;
  records.forEach(r => {
    const rVal = (r[fieldKey] || '').toString();
    const normalizedRVal = (fieldKey === 'whatsapp' || fieldKey === 'telponKantor')
      ? cleanRawPhone(rVal)
      : normalizeString(rVal);
    
    if (normalizedRVal === normalizedTarget) {
      matchCount++;
    }
  });

  return matchCount > 1;
}

// Find matched identical fields across records in a group
function getMatchedFieldsInGroup(records: CompanyRecord[]): string[] {
  if (records.length < 2) return [];

  const fieldDefs: { key: keyof CompanyRecord; label: string }[] = [
    { key: 'namaPerusahaan', label: 'Nama Perusahaan' },
    { key: 'telponKantor', label: 'Telpon Kantor' },
    { key: 'namaPic', label: 'Nama PIC' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'emailPic', label: 'Email PIC' },
    { key: 'emailKantor', label: 'Email Kantor' },
    { key: 'bidang', label: 'Bidang' },
    { key: 'alamat', label: 'Alamat' },
    { key: 'areaKota', label: 'Kota' },
  ];

  const matches: string[] = [];

  fieldDefs.forEach(f => {
    const vals = records
      .map(r => {
        const val = (r[f.key] || '').toString();
        if (f.key === 'whatsapp' || f.key === 'telponKantor') {
          return cleanRawPhone(val);
        }
        return normalizeString(val);
      })
      .filter(Boolean);

    if (vals.length > 1) {
      const first = vals[0];
      if (vals.every(v => v === first)) {
        matches.push(f.label);
      }
    }
  });

  return matches;
}

export type FieldStatusType = 'SAME' | 'CONFLICT' | 'NEW_DATA' | 'EMPTY';

// Determine field comparison status for left header column indicator
function getFieldStatusForGroup(
  records: CompanyRecord[], 
  fieldKey: keyof CompanyRecord, 
  recommendedId: string
): { status: FieldStatusType; label: string } {
  if (!records || records.length === 0) return { status: 'EMPTY', label: '' };

  const recommendedRecord = records.find(r => r.id === recommendedId) || records[0];
  const primaryRaw = (recommendedRecord[fieldKey] || '').toString().trim();
  const primaryNorm = (fieldKey === 'whatsapp' || fieldKey === 'telponKantor')
    ? cleanRawPhone(primaryRaw)
    : normalizeString(primaryRaw);

  const nonEmpties = records
    .map(r => {
      const raw = (r[fieldKey] || '').toString().trim();
      const norm = (fieldKey === 'whatsapp' || fieldKey === 'telponKantor')
        ? cleanRawPhone(raw)
        : normalizeString(raw);
      return { raw, norm, record: r };
    })
    .filter(item => item.norm !== '');

  if (nonEmpties.length === 0) {
    return { status: 'EMPTY', label: '' };
  }

  // Primary row is empty, but a secondary row has non-empty data
  if (primaryNorm === '' && nonEmpties.length > 0) {
    return { status: 'NEW_DATA', label: 'Ada Data Baru' };
  }

  // Multiple non-empty values across records
  if (nonEmpties.length >= 2) {
    const firstNorm = nonEmpties[0].norm;
    const allSame = nonEmpties.every(item => item.norm === firstNorm);

    if (allSame) {
      return { status: 'SAME', label: 'Sama' };
    } else {
      return { status: 'CONFLICT', label: 'Perlu Validasi' };
    }
  }

  return { status: 'EMPTY', label: '' };
}

// Smart merge logic: Keep target values, fill missing fields from highest completeness source records
function smartMergeGroupRecords(
  records: CompanyRecord[],
  targetRecordId: string
): { mergedRecord: CompanyRecord; idsToDelete: string[] } {
  const targetRecord = records.find(r => r.id === targetRecordId) || records[0];
  const otherRecords = records.filter(r => r.id !== targetRecord.id);

  // Sort other records descending by completeness score, then by no ascending
  const sortedOthers = [...otherRecords].sort((a, b) => {
    const scoreA = getRecordCompleteness(a).score;
    const scoreB = getRecordCompleteness(b).score;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return a.no - b.no;
  });

  const mergedRecord: CompanyRecord = { ...targetRecord };

  const fieldsToCheck: (keyof CompanyRecord)[] = [
    'namaPerusahaan', 'bidang', 'namaPic', 'jabatanPic', 'whatsapp', 
    'emailPic', 'telponKantor', 'emailKantor', 'website', 'alamat', 'areaKota', 'kawasan'
  ];

  fieldsToCheck.forEach(fKey => {
    const targetVal = (mergedRecord[fKey] || '').toString().trim();
    if (!targetVal) {
      // Find first non-empty value among sorted other records (highest completeness score first)
      for (const source of sortedOthers) {
        const sourceVal = (source[fKey] || '').toString().trim();
        if (sourceVal) {
          (mergedRecord as any)[fKey] = sourceVal;
          break;
        }
      }
    }
  });

  mergedRecord.updatedAt = new Date().toISOString();

  return {
    mergedRecord,
    idsToDelete: otherRecords.map(r => r.id)
  };
}

// Helper to generate unique company name suffix (e.g., PT. ABC -> PT. ABC 2 -> PT. ABC 3)
function generateUniqueCompanyName(originalName: string, allRecords: CompanyRecord[], currentRecordId: string): string {
  const trimmed = (originalName || '').trim();
  if (!trimmed) return 'Perusahaan ' + Date.now();

  const baseMatch = trimmed.match(/^(.*?)(?:\s+(\d+))?$/);
  let baseName = trimmed;
  if (baseMatch && baseMatch[2]) {
    baseName = baseMatch[1].trim();
  }
  if (!baseName) baseName = trimmed;

  const existingNames = new Set(
    allRecords
      .filter(r => r.id !== currentRecordId)
      .map(r => normalizeString(r.namaPerusahaan))
  );

  let counter = 2;
  let candidate = `${baseName} ${counter}`;
  while (existingNames.has(normalizeString(candidate))) {
    counter++;
    candidate = `${baseName} ${counter}`;
  }

  return candidate;
}

export const DuplicateCheckerModal: React.FC<DuplicateCheckerModalProps> = ({
  isOpen,
  onClose,
  records,
  onDeleteRecords,
  onUpdateRecords
}) => {
  const [localRecords, setLocalRecords] = React.useState<CompanyRecord[]>([]);
  const [searchFilter, setSearchFilter] = React.useState<string>('');
  const [selectedTargetMap, setSelectedTargetMap] = React.useState<Record<string, string>>({});
  const [unlinkedRecordIds, setUnlinkedRecordIds] = React.useState<Set<string>>(new Set());
  const [similarityFilter, setSimilarityFilter] = React.useState<'all' | 'gt80' | 'mid50_80' | 'lt50'>('all');

  // Sync local records when prop changes
  React.useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // General duplicate detection engine: Cluster records where (namaPerusahaan, areaKota, kawasan) are identical
  const duplicateGroups = React.useMemo(() => {
    // Exclude unlinked records
    const activeRecords = localRecords.filter(r => !unlinkedRecordIds.has(r.id));
    if (activeRecords.length < 2) return [];

    const compositeMap = new Map<string, CompanyRecord[]>();

    activeRecords.forEach(r => {
      const cName = normalizeString(r.namaPerusahaan);
      const city = normalizeString(r.areaKota);
      const kawasan = normalizeString(r.kawasan);

      if (cName && cName !== 'perusahaan tanpa nama') {
        const key = `${cName}||${city}||${kawasan}`;
        if (!compositeMap.has(key)) {
          compositeMap.set(key, []);
        }
        compositeMap.get(key)!.push(r);
      }
    });

    const groups: GeneralDuplicateGroup[] = [];

    compositeMap.forEach((recordsInGroup) => {
      if (recordsInGroup.length > 1) {
        const sorted = [...recordsInGroup].sort((a, b) => a.no - b.no);
        const primaryTitle = sorted[0].namaPerusahaan || `Grup Duplikat #${sorted[0].no}`;
        const matchedFields = getMatchedFieldsInGroup(sorted);

        groups.push({
          id: `group_${sorted[0].id}`,
          title: primaryTitle,
          primaryField: 'namaPerusahaan',
          matchedFields,
          records: sorted,
          similarityScore: getGroupSimilarity(sorted)
        });
      }
    });

    return groups;
  }, [localRecords, unlinkedRecordIds]);

  // Count groups for each similarity level
  const similarityCounts = React.useMemo(() => {
    let gt80 = 0;
    let mid50_80 = 0;
    let lt50 = 0;
    duplicateGroups.forEach(g => {
      if (g.similarityScore > 80) {
        gt80++;
      } else if (g.similarityScore >= 50 && g.similarityScore <= 80) {
        mid50_80++;
      } else {
        lt50++;
      }
    });
    return { gt80, mid50_80, lt50 };
  }, [duplicateGroups]);

  // Filtered Groups based on search and similarity level
  const filteredGroups = React.useMemo(() => {
    let result = [...duplicateGroups];

    // Apply similarity filter
    if (similarityFilter !== 'all') {
      result = result.filter(g => {
        if (similarityFilter === 'gt80') {
          return g.similarityScore > 80;
        } else if (similarityFilter === 'mid50_80') {
          return g.similarityScore >= 50 && g.similarityScore <= 80;
        } else if (similarityFilter === 'lt50') {
          return g.similarityScore < 50;
        }
        return true;
      });
    }

    // Sort by similarity score descending so higher similarity (recommended) appears first
    result.sort((a, b) => b.similarityScore - a.similarityScore);

    if (!searchFilter.trim()) return result;
    const q = searchFilter.toLowerCase();
    return result.filter(g => 
      g.title.toLowerCase().includes(q) ||
      g.records.some(r => 
        (r.namaPerusahaan && r.namaPerusahaan.toLowerCase().includes(q)) ||
        (r.namaPic && r.namaPic.toLowerCase().includes(q)) ||
        (r.telponKantor && r.telponKantor.includes(q)) ||
        (r.whatsapp && r.whatsapp.includes(q)) ||
        r.no.toString() === q
      )
    );
  }, [duplicateGroups, searchFilter, similarityFilter]);

  // Pagination states for Duplicate Groups
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter, similarityFilter]);

  const totalPages = Math.ceil(filteredGroups.length / pageSize) || 1;

  const paginatedGroups = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, currentPage, pageSize]);

  // Total Redundant Count
  const totalRedundantCount = React.useMemo(() => {
    const redundantIds = new Set<string>();
    duplicateGroups.forEach(g => {
      const sorted = [...g.records].sort((a, b) => {
        const scoreA = getRecordCompleteness(a).score;
        const scoreB = getRecordCompleteness(b).score;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.no - b.no;
      });
      sorted.slice(1).forEach(r => redundantIds.add(r.id));
    });
    return redundantIds.size;
  }, [duplicateGroups]);

  // Health Score
  const healthScore = React.useMemo(() => {
    if (localRecords.length === 0) return 100;
    const score = Math.round((1 - (totalRedundantCount / localRecords.length)) * 100);
    return Math.max(0, score);
  }, [localRecords, totalRedundantCount]);

  // Selection target record handler
  const handleSelectTargetRecord = (groupId: string, recordId: string) => {
    setSelectedTargetMap(prev => ({ ...prev, [groupId]: recordId }));
  };

  // Unlink record handler: auto-rename company name with increment counter (e.g., PT. ABC 2) so they don't duplicate
  const handleUnlinkRecord = (recordId: string, no: number) => {
    const targetRecord = localRecords.find(r => r.id === recordId);
    if (!targetRecord) return;

    const currentName = targetRecord.namaPerusahaan || targetRecord.namaPic || `Perusahaan #${no}`;
    const newName = generateUniqueCompanyName(currentName, localRecords, recordId);

    const updatedRecords = localRecords.map(r => {
      if (r.id === recordId) {
        return {
          ...r,
          namaPerusahaan: newName,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });

    setLocalRecords(updatedRecords);
    setUnlinkedRecordIds(prev => {
      const next = new Set(prev);
      next.add(recordId);
      return next;
    });

    if (onUpdateRecords) {
      onUpdateRecords(updatedRecords);
    }
  };

  // Single Delete
  const handleSingleDelete = (id: string, no: number, name: string) => {
    if (!confirm(`Hapus baris data #${no} ("${name || 'Data'}") dari tabel?`)) return;
    onDeleteRecords([id]);
  };

  // Smart clean single group
  const handleCleanGroup = (group: GeneralDuplicateGroup, defaultRecommendedId: string) => {
    const targetId = selectedTargetMap[group.id] || defaultRecommendedId;
    const { mergedRecord, idsToDelete } = smartMergeGroupRecords(group.records, targetId);

    const updatedRecords = localRecords
      .filter(r => !idsToDelete.includes(r.id))
      .map(r => r.id === mergedRecord.id ? mergedRecord : r);

    setLocalRecords(updatedRecords);

    if (onUpdateRecords) {
      onUpdateRecords(updatedRecords);
    }
    onDeleteRecords(idsToDelete);
  };

  // Transfer specific field to primary target
  const handleTransferSpecificField = (
    targetRecordId: string, 
    targetNo: number, 
    fieldKey: keyof CompanyRecord, 
    label: string, 
    newValue: string, 
    sourceNo: number
  ) => {
    if (!confirm(`Pindahkan ${label} "${newValue}" dari Baris #${sourceNo} ke Baris #${targetNo}?`)) return;

    const updatedRecords = localRecords.map(r => {
      if (r.id === targetRecordId) {
        return {
          ...r,
          [fieldKey]: newValue,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });

    setLocalRecords(updatedRecords);
    if (onUpdateRecords) {
      onUpdateRecords(updatedRecords);
    }
  };

  // Auto clean all duplicates using smart merge
  const handleAutoCleanAll = () => {
    if (filteredGroups.length === 0) return;

    const allIdsToDelete: string[] = [];
    let currentRecords = [...localRecords];

    filteredGroups.forEach(group => {
      const sorted = [...group.records].sort((a, b) => {
        const scoreA = getRecordCompleteness(a).score;
        const scoreB = getRecordCompleteness(b).score;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.no - b.no;
      });
      const defaultRecommendedId = sorted[0].id;
      const targetId = selectedTargetMap[group.id] || defaultRecommendedId;

      const { mergedRecord, idsToDelete } = smartMergeGroupRecords(group.records, targetId);

      allIdsToDelete.push(...idsToDelete);
      currentRecords = currentRecords.map(r => r.id === mergedRecord.id ? mergedRecord : r);
    });

    const finalRecords = currentRecords.filter(r => !allIdsToDelete.includes(r.id));

    if (confirm(`Pembersihan cerdas akan menyisakan baris patokan (dengan mengisi field kosong dari baris lain) dan menghapus ${allIdsToDelete.length} baris duplikat dari grup yang difilter. Lanjutkan?`)) {
      setLocalRecords(finalRecords);
      if (onUpdateRecords) {
        onUpdateRecords(finalRecords);
      }
      onDeleteRecords(allIdsToDelete);
    }
  };

  if (isOpen !== undefined && !isOpen) return null;

  return (
    <div 
      className="w-full space-y-5 pb-24 animate-in fade-in duration-200"
      id="duplicate-checker-view"
    >
      {/* Summary Cards Grid (3 Cards Side-by-Side) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            
            {/* Total Records */}
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 shadow-xs">
              <div className="p-2 sm:p-3 bg-slate-100 text-slate-700 rounded-lg shrink-0">
                <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 truncate">Total Data</div>
                <div className="text-base sm:text-2xl font-black text-slate-800">{localRecords.length}</div>
              </div>
            </div>

            {/* Total Duplicate Groups */}
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 shadow-xs">
              <div className={`p-2 sm:p-3 rounded-lg shrink-0 ${duplicateGroups.length > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                <AlertTriangle className={`w-4 h-4 sm:w-5 sm:h-5 ${duplicateGroups.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 truncate">Grup Duplikat</div>
                <div className="text-base sm:text-2xl font-black text-slate-800">{duplicateGroups.length} <span className="text-[10px] sm:text-xs font-normal text-slate-500">grup</span></div>
              </div>
            </div>

            {/* Health Score */}
            <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 shadow-xs">
              <div className="p-2 sm:p-3 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 truncate">Kesehatan</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-base sm:text-2xl font-black text-slate-800">{healthScore}%</span>
                  <span className="text-[8px] sm:text-[10px] font-semibold text-emerald-600 hidden xs:inline">Bersih</span>
                </div>
              </div>
            </div>

          </div>

          {/* Search & Similarity Filter Bar */}
          <div className="flex flex-row items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="duplicate-search-input"
                placeholder="Cari nama perusahaan, nomor telpon, PIC, atau baris..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white shadow-xs"
              />
            </div>
            
            <div className="shrink-0">
              <select
                value={similarityFilter}
                onChange={(e) => setSimilarityFilter(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-xs min-w-[140px] sm:min-w-[170px]"
              >
                <option value="all">Semua Kemiripan ({duplicateGroups.length})</option>
                <option value="gt80">&gt; 80% ({similarityCounts.gt80})</option>
                <option value="mid50_80">80%-50% ({similarityCounts.mid50_80})</option>
                <option value="lt50">&lt; 50% ({similarityCounts.lt50})</option>
              </select>
            </div>
          </div>

          {/* Horizontal Matrix Duplicate Groups */}
          <div className="space-y-6">
            {filteredGroups.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 shadow-xs">
                <div className="max-w-xs mx-auto space-y-3">
                  <div className="p-3 bg-emerald-50 text-emerald-700 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="text-sm font-bold text-slate-800">Tidak Ada Duplikat!</div>
                  <p className="text-xs text-slate-400">
                    {searchFilter ? 'Tidak ada duplikat yang cocok dengan kata kunci pencarian.' : 'Seluruh baris data di database ini unik dan bersih dari duplikasi.'}
                  </p>
                </div>
              </div>
            ) : (
              paginatedGroups.map((group) => {
                // Find record with highest completeness
                const sortedByCompleteness = [...group.records].sort((a, b) => {
                  const scoreA = getRecordCompleteness(a).score;
                  const scoreB = getRecordCompleteness(b).score;
                  if (scoreA !== scoreB) return scoreB - scoreA;
                  return a.no - b.no;
                });
                const recommendedRecord = sortedByCompleteness[0];
                const recommendedId = recommendedRecord.id;

                const isTargetValid = !!(selectedTargetMap[group.id] && group.records.some(r => r.id === selectedTargetMap[group.id]));
                const activeTargetId = isTargetValid ? selectedTargetMap[group.id] : recommendedId;

                const fieldsToDisplay: { key: keyof CompanyRecord; label: string }[] = [
                  { key: 'namaPerusahaan', label: 'Perusahaan' },
                  { key: 'telponKantor', label: 'Telpon' },
                  { key: 'namaPic', label: 'PIC' },
                  { key: 'whatsapp', label: 'WhatsApp' },
                  { key: 'jabatanPic', label: 'Jabatan' },
                  { key: 'emailPic', label: 'Email-PIC' },
                  { key: 'emailKantor', label: 'Email-Kantor' },
                  { key: 'bidang', label: 'Industri' },
                  { key: 'alamat', label: 'Alamat' },
                  { key: 'areaKota', label: 'Kota' },
                  { key: 'kawasan', label: 'Kawasan' },
                  { key: 'website', label: 'Website' },
                ];

                return (
                  <div key={group.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                    
                    {/* Card Header Info */}
                    <div className="bg-slate-50/90 px-4 py-2.5 border-b border-slate-200">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                            <div className="font-extrabold text-slate-900 text-sm truncate">
                              {group.title || '(Tanpa Nama)'}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-1.5 sm:ml-2">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black border uppercase tracking-wider ${
                              group.similarityScore >= 80 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : group.similarityScore >= 50 
                                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              Kemiripan: {group.similarityScore}%
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleCleanGroup(group, activeTargetId)}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                          title="Gabungkan data ke baris patokan & bersihkan duplikat"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Bersihkan Duplikasi</span>
                        </button>
                      </div>
                    </div>

                    {/* HORIZONTAL MATRIX TABLE - SCROLL SIDEWAYS */}
                    <div className="overflow-x-auto w-full bg-white">
                      <table className="w-full text-xs text-left border-collapse min-w-[550px]">
                        <thead>
                          <tr className="bg-slate-100/90 text-slate-700 font-extrabold border-b border-slate-200">
                            <th className="p-3 w-36 min-w-[130px] bg-slate-100 sticky left-0 z-10 border-r border-slate-200 shadow-xs">
                              Field
                            </th>
                            {group.records.map(r => {
                              const isTarget = r.id === activeTargetId;

                              return (
                                <th key={r.id} className={`p-2.5 border-r border-slate-200 min-w-[180px] align-middle transition-colors ${isTarget ? 'bg-emerald-50/80' : 'bg-slate-50/70'}`}>
                                  <div className="flex items-center justify-between gap-2">
                                    <label 
                                      className="inline-flex items-center gap-1.5 cursor-pointer select-none min-w-0"
                                      title={isTarget ? `Baris #${r.no} adalah Patokan Utama` : `Jadikan Baris #${r.no} sebagai Patokan`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isTarget}
                                        onChange={() => handleSelectTargetRecord(group.id, r.id)}
                                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600 shrink-0"
                                      />
                                      <span className={`px-2 py-0.5 rounded-md font-black text-xs truncate ${isTarget ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-800'}`}>
                                        #{r.no}
                                      </span>
                                    </label>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => handleUnlinkRecord(r.id, r.no)}
                                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                                        title={`Tetap Dipisahkan (Baris #${r.no} bukan duplikat)`}
                                      >
                                        <Unlink className="w-3.5 h-3.5 text-slate-600" />
                                      </button>
                                      <button
                                        onClick={() => handleSingleDelete(r.id, r.no, r.namaPerusahaan)}
                                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                                        title={`Hapus Baris #${r.no}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                      </button>
                                    </div>
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                          {fieldsToDisplay
                            .filter(f => {
                              return getFieldStatusForGroup(group.records, f.key, activeTargetId).status !== 'EMPTY';
                            })
                            .map(f => {
                              const activeTargetRecord = group.records.find(r => r.id === activeTargetId) || group.records[0];
                              const fieldStatus = getFieldStatusForGroup(group.records, f.key, activeTargetId);

                              return (
                                <tr key={f.key} className="hover:bg-slate-50/70 transition-colors">
                                  {/* Field Label Column with Pure Icon on the Right */}
                                  <td className="p-2.5 font-bold text-slate-700 bg-slate-50/90 sticky left-0 z-10 border-r border-slate-200 text-xs whitespace-nowrap min-w-[160px]">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-slate-800 font-extrabold">{f.label}</span>

                                      {/* PURE ICON INDICATORS WITHOUT TEXT OR WRAPPERS */}
                                      {fieldStatus.status === 'SAME' && (
                                        <Check 
                                          className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0" 
                                          title="Sama di semua baris" 
                                        />
                                      )}

                                      {fieldStatus.status === 'CONFLICT' && (
                                        <AlertTriangle 
                                          className="w-4 h-4 text-amber-500 stroke-[2.5] shrink-0" 
                                          title="Isi data berbeda antar baris (Perlu Validasi)" 
                                        />
                                      )}

                                      {fieldStatus.status === 'NEW_DATA' && (
                                        <Plus 
                                          className="w-4 h-4 text-blue-600 stroke-[3] shrink-0" 
                                          title="Ada data baru/tambahan yang akan diisi ke patokan" 
                                        />
                                      )}
                                    </div>
                                  </td>

                                {/* Values for each duplicate Baris */}
                                {group.records.map(r => {
                                  const rawVal = (r[f.key] || '').toString().trim();
                                  
                                  const formattedVal = f.key === 'telponKantor' 
                                    ? formatTelponKantor(rawVal) 
                                    : f.key === 'whatsapp' 
                                      ? formatWhatsApp(rawVal) 
                                      : rawVal;

                                  const isTarget = r.id === activeTargetId;
                                  const targetVal = (activeTargetRecord[f.key] || '').toString().trim();
                                  const canTransferToTarget = !isTarget && !targetVal && !!rawVal;

                                  return (
                                    <td key={r.id} className={`p-2.5 border-r border-slate-200 text-xs align-middle min-w-[180px] ${isTarget ? 'bg-emerald-50/30' : ''}`}>
                                      {rawVal ? (
                                        <div className="space-y-1">
                                          <div className={`leading-snug break-words ${fieldStatus.status === 'CONFLICT' ? 'text-amber-950 font-bold bg-amber-50/60 p-1.5 rounded border border-amber-200/50' : fieldStatus.status === 'SAME' ? 'text-emerald-950 font-semibold' : 'text-slate-800 font-medium'}`}>
                                            {formattedVal}
                                          </div>

                                          {canTransferToTarget && (
                                            <button
                                              onClick={() => handleTransferSpecificField(
                                                activeTargetRecord.id, 
                                                activeTargetRecord.no, 
                                                f.key, 
                                                f.label, 
                                                rawVal, 
                                                r.no
                                              )}
                                              className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer mt-0.5"
                                              title={`Salin ${f.label} dari Baris #${r.no} ke Baris Patokan #${activeTargetRecord.no}`}
                                            >
                                              <ArrowRight className="w-3 h-3 text-amber-600" />
                                              <span>Salin ke #${activeTargetRecord.no}</span>
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        /* KOSONG */
                                        <div>
                                          {isTarget && fieldStatus.status === 'NEW_DATA' ? (
                                            <span className="text-blue-600 font-semibold italic text-[10px] flex items-center gap-1">
                                              <Plus className="w-3 h-3" /> (Diisi Otomatis)
                                            </span>
                                          ) : (
                                            <span className="text-slate-300 italic text-xs">
                                              -
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                  </div>
                );
              })
            )}
          </div>

      {/* Fixed Bottom Navigation & Action Controls */}
      <BottomNavigation
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalRecords={filteredGroups.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[5, 10, 25, 50, 100]}
        showRecordSummary={false}
        unitLabel="grup duplikat"
        actionButton={
          filteredGroups.length > 0 ? (
            <button
              onClick={handleAutoCleanAll}
              className="py-1.5 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-600/50 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Bersihkan Semua ({filteredGroups.length})</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="py-1.5 px-3.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Selesai (Data Bersih)</span>
            </button>
          )
        }
      />

    </div>
  );
};

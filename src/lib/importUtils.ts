import { CompanyRecord } from '../types';
import { generateId } from './storage';

export function preprocessAndCleanJSON(rawText: string): string {
  let cleaned = rawText.trim();

  // Return early if the text is already perfectly valid JSON
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (e) {
    // Continue with auto-healing if invalid
  }

  // Detect if the text is Excel/CSV cell escaped (e.g., starts with " and ends with " and has doubled-quotes keys)
  const isExcelEscaped = cleaned.startsWith('"') && 
                         cleaned.endsWith('"') && 
                         /""[a-zA-Z0-9_]+""\s*:/.test(cleaned);

  const hasMultipleDoubledQuotes = (cleaned.match(/""/g) || []).length >= 4 && 
                                   /""[a-zA-Z0-9_]+""\s*:/.test(cleaned);

  if (isExcelEscaped) {
    // Strip outer quotes
    cleaned = cleaned.slice(1, -1).trim();
    // Replace all "" with "
    // Note: this turns """" into "" (valid empty string in standard JSON) and ""key"" into "key"
    cleaned = cleaned.replace(/""/g, '"');
  } else if (hasMultipleDoubledQuotes) {
    // Replace all "" with "
    cleaned = cleaned.replace(/""/g, '"');
  }

  // If there's a trailing quote left over from partial copy, e.g. }," or }", clean it
  if (cleaned.endsWith('",')) {
    cleaned = cleaned.slice(0, -2).trim();
    if (!cleaned.endsWith('}')) {
      cleaned += '}';
    }
  } else if (cleaned.endsWith('"')) {
    if (!cleaned.startsWith('"') && (cleaned.endsWith('}"') || cleaned.endsWith(']"'))) {
      cleaned = cleaned.slice(0, -1).trim();
    }
  }

  // 1. Strip outer string wrapper quotes if they exist, e.g. "{" -> { or "[{" -> [{
  if (cleaned.startsWith('"{') && cleaned.endsWith('}"')) {
    cleaned = cleaned.slice(1, -1).trim();
  } else if (cleaned.startsWith('"[') && cleaned.endsWith(']"')) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Also replace accidental "{" or "}" elsewhere
  cleaned = cleaned.replace(/"\{/g, '{');
  cleaned = cleaned.replace(/\}"/g, '}');
  cleaned = cleaned.replace(/"\[/g, '[');
  cleaned = cleaned.replace(/\]"/g, ']');

  // Remove trailing comma at the very end of the entire string if it exists
  if (cleaned.endsWith(',')) {
    cleaned = cleaned.slice(0, -1).trim();
  }

  // Auto-wrap with curly braces if it looks like key-value pairs but lacks braces
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    if (cleaned.endsWith('}')) {
      cleaned = '{' + cleaned;
    } else {
      cleaned = '{' + cleaned + '}';
    }
  }

  // 2. Double quotes cleanups:
  // E.g. ""abcd" or "abcd"" or ""abcd"" -> "abcd"
  // First, collapse any sequence of 3 or more double quotes to 1 double quote
  cleaned = cleaned.replace(/"{3,}/g, '"');
  // Handle doubled double quotes around values/keys without crossing colons, commas, braces or lines
  cleaned = cleaned.replace(/""+([^":,\{\}\[\]\n\r]+)""+/g, '"$1"');
  cleaned = cleaned.replace(/""+([^":,\{\}\[\]\n\r]+)"/g, '"$1"');
  cleaned = cleaned.replace(/"([^":,\{\}\[\]\n\r]+)""+/g, '"$1"');

  // 3. Fix missing commas between array elements/objects
  // e.g. }{ or } { or }\n{ -> },\n{
  cleaned = cleaned.replace(/\}\s*\{/g, '},\n{');

  // 4. Handle trailing punctuation typos inside/outside objects
  // e.g. }," or }, " -> },
  cleaned = cleaned.replace(/\}\s*,?\s*\"/g, '}, ');
  // Remove trailing commas in arrays/objects which break standard JSON parser
  cleaned = cleaned.replace(/,\s*\]/g, ']');
  cleaned = cleaned.replace(/,\s*\}/g, '}');

  // 5. Unquoted keys and single quoted keys
  // e.g. 'nama_perusahaan': "PT Sinar" -> "nama_perusahaan": "PT Sinar"
  cleaned = cleaned.replace(/'([a-zA-Z0-9_]+)'\s*:/g, '"$1":');
  // e.g. nama_perusahaan: "PT Sinar" -> "nama_perusahaan": "PT Sinar" (avoiding http:// or https://)
  cleaned = cleaned.replace(/([{\s,])([a-zA-Z0-9_]+)\s*:(?!\/)/g, '$1"$2":');

  // 6. Single quoted string values
  // e.g. : 'PT Sinar' -> : "PT Sinar"
  cleaned = cleaned.replace(/:\s*'([^']+)'/g, ': "$1"');

  // 6.5. Auto-quote unquoted string values that contain characters/slashes but are not already quoted
  // E.g. : adinton/adt or : adt/
  // We match : followed by an unquoted string of word chars, slashes, dots, dashes, spaces, etc.
  // which is not a number, boolean, or null, and doesn't start with standard delimiters.
  cleaned = cleaned.replace(/:\s*([a-zA-Z_][a-zA-Z0-9_\/\s.-]*)(?=\s*[,}\n\r])/g, (match, val) => {
    const trimmed = val.trim();
    if (trimmed === 'true' || trimmed === 'false' || trimmed === 'null') {
      return match;
    }
    return `: "${trimmed}"`;
  });

  // 7. Solve literal newlines/enters inside double quotes:
  // "aku adalah\nseorang" -> "aku adalah seorang"
  let inString = false;
  let finalResult = '';
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === '"') {
      // Check if this quote is escaped
      let backslashes = 0;
      let j = i - 1;
      while (j >= 0 && cleaned[j] === '\\') {
        backslashes++;
        j--;
      }
      if (backslashes % 2 === 0) {
        inString = !inString;
      }
      finalResult += char;
    } else if (inString && (char === '\n' || char === '\r')) {
      finalResult += ' ';
      // Skip any subsequent whitespace/indentation of the next line
      while (i + 1 < cleaned.length && (cleaned[i + 1] === ' ' || cleaned[i + 1] === '\t' || cleaned[i + 1] === '\r' || cleaned[i + 1] === '\n')) {
        i++;
      }
    } else {
      finalResult += char;
    }
  }
  cleaned = finalResult.trim();

  // Remove trailing comma at the very end again just in case
  if (cleaned.endsWith(',')) {
    cleaned = cleaned.slice(0, -1).trim();
  }

  // Let's do one final check: if it doesn't start with [ and end with ], but it contains list of objects, we can wrap it.
  // BUT only do this if there are actually multiple objects (to support formatting a single object as `{ ... }`).
  if (!cleaned.startsWith('[') && cleaned.startsWith('{')) {
    if (/\}\s*,\s*\{/.test(cleaned)) {
      cleaned = '[' + cleaned + ']';
    }
  }

  return cleaned;
}

export const VALID_JSON_KEYS_MAP: Record<string, string> = {
  // Standard Formula Keys (Snake Case)
  nama_perusahaan: 'namaPerusahaan',
  bidang_perusahaan: 'bidang',
  telpon_perusahaan: 'telponKantor',
  email_perusahaan: 'emailKantor',
  website_perusahaan: 'website',
  nama_pic: 'namaPic',
  jabatan_pic: 'jabatanPic',
  whatsapp_pic: 'whatsapp',
  email_pic: 'emailPic',
  alamat_kota: 'areaKota',
  alamat_kawasan: 'kawasan',
  alamat_detail: 'alamat',
  maps_latitude: 'latitude',
  maps_longitude: 'longitude',

  // Space-separated human titles (CSV headers)
  'nama perusahaan': 'namaPerusahaan',
  'bidang perusahaan': 'bidang',
  'telpon perusahaan': 'telponKantor',
  'telepon perusahaan': 'telponKantor',
  'email perusahaan': 'emailKantor',
  'website perusahaan': 'website',
  'nama pic': 'namaPic',
  'jabatan pic': 'jabatanPic',
  'whatsapp pic': 'whatsapp',
  'email pic': 'emailPic',
  'alamat kota': 'areaKota',
  'alamat kawasan': 'kawasan',
  'alamat detail': 'alamat',
  'maps latitude': 'latitude',
  'maps longitude': 'longitude',
  'telepon kantor': 'telponKantor',
  'telpon kantor': 'telponKantor',
  'email kantor': 'emailKantor',
  'area kota': 'areaKota',
  'kawasan industri': 'kawasan',

  // Standard camelCase / Record Property Keys
  namaPerusahaan: 'namaPerusahaan',
  bidang: 'bidang',
  telponKantor: 'telponKantor',
  emailKantor: 'emailKantor',
  website: 'website',
  namaPic: 'namaPic',
  jabatanPic: 'jabatanPic',
  whatsapp: 'whatsapp',
  emailPic: 'emailPic',
  areaKota: 'areaKota',
  kawasan: 'kawasan',
  alamat: 'alamat',
  latitude: 'latitude',
  longitude: 'longitude',

  // Allowed Aliases
  company: 'namaPerusahaan',
  perusahaan: 'namaPerusahaan',
  telpon_kantor: 'telponKantor',
  telepon_kantor: 'telponKantor',
  telp: 'telponKantor',
  telepon: 'telponKantor',
  phone: 'telponKantor',
  email_kantor: 'emailKantor',
  web: 'website',
  url: 'website',
  pic: 'namaPic',
  kontak: 'namaPic',
  person: 'namaPic',
  jabatan: 'jabatanPic',
  position: 'jabatanPic',
  title: 'jabatanPic',
  wa: 'whatsapp',
  no_wa: 'whatsapp',
  'no wa': 'whatsapp',
  hp: 'whatsapp',
  cell: 'whatsapp',
  area_kota: 'areaKota',
  area_wilayah_kota: 'areaKota',
  kota: 'areaKota',
  area: 'areaKota',
  wilayah: 'areaKota',
  city: 'areaKota',
  kawasan_industri: 'kawasan',
  industri: 'kawasan',
  zone: 'kawasan',
  address: 'alamat',
  lokasi: 'alamat',
  lat: 'latitude',
  long: 'longitude',
  bujur: 'longitude',
  lintang: 'latitude',

  // Metadata Keys
  id: 'id',
  no: 'no',
  nomor: 'no',
  '#': 'no',
  'no.': 'no',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

const COMMON_KEY_TYPOS: Record<string, string> = {
  'pic_jabatan': 'jabatan_pic',
  'pic_nama': 'nama_pic',
  'pic_whatsapp': 'whatsapp_pic',
  'pic_email': 'email_pic',
  'perusahaan_nama': 'nama_perusahaan',
  'perusahaan_bidang': 'bidang_perusahaan',
  'perusahaan_telpon': 'telpon_perusahaan',
  'perusahaan_email': 'email_perusahaan',
  'perusahaan_website': 'website_perusahaan',
  'kota_alamat': 'alamat_kota',
  'kawasan_alamat': 'alamat_kawasan',
  'detail_alamat': 'alamat_detail',
  'latitude_maps': 'maps_latitude',
  'longitude_maps': 'maps_longitude',
  'nomor_hp': 'whatsapp_pic',
  'no_hp': 'whatsapp_pic',
  'hp_pic': 'whatsapp_pic'
};

/**
 * Parses raw JSON string into CompanyRecord array with strict field validation
 */
export function parseJSONToRecords(jsonText: string): Partial<CompanyRecord>[] {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText.trim());
  } catch (e) {
    try {
      const cleaned = preprocessAndCleanJSON(jsonText);
      parsed = JSON.parse(cleaned);
    } catch (cleanErr: any) {
      throw new Error(`Syntax JSON tidak valid: ${cleanErr.message || 'Periksa tanda petik, koma, atau kurung kurawal.'}`);
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Hasil parse bukan merupakan objek atau array JSON.');
  }

  const list = Array.isArray(parsed) ? parsed : [parsed];

  if (list.length === 0) {
    return [];
  }

  // Validate keys in each item
  list.forEach((item, idx) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`Data pada baris/objek ke-${idx + 1} bukan objek JSON yang valid.`);
    }

    const keys = Object.keys(item);
    for (const key of keys) {
      if (!VALID_JSON_KEYS_MAP[key]) {
        const suggestion = COMMON_KEY_TYPOS[key] || 
          Object.keys(VALID_JSON_KEYS_MAP).find(k => k.replace(/_/g, '').toLowerCase() === key.replace(/_/g, '').toLowerCase());
        
        if (suggestion) {
          throw new Error(`Nama field "${key}" pada data ke-${idx + 1} tidak valid. Diduga salah ketik untuk "${suggestion}". Mohon sesuaikan dengan formula standar.`);
        } else {
          throw new Error(`Nama field "${key}" pada data ke-${idx + 1} tidak sesuai formula standar JSON. Gunakan nama field resmi seperti "nama_perusahaan", "jabatan_pic", "alamat_detail", dll.`);
        }
      }
    }
  });

  return list.map((item: Record<string, any>, idx: number) => ({
    id: generateId() + '_' + idx,
    namaPerusahaan: item.nama_perusahaan || item.namaPerusahaan || item.company || item.perusahaan || '',
    bidang: item.bidang_perusahaan || item.bidang || item.sektor || item.industry || '',
    telponKantor: item.telpon_perusahaan || item.telponKantor || item.telpon_kantor || item.telp || item.phone || '',
    emailKantor: item.email_perusahaan || item.emailKantor || item.email_kantor || item.info_email || '',
    website: item.website_perusahaan || item.website || item.web || '',
    namaPic: item.nama_pic || item.namaPic || item.pic || '',
    jabatanPic: item.jabatan_pic || item.jabatanPic || item.jabatan || item.position || '',
    whatsapp: item.whatsapp_pic || item.whatsapp || item.wa || item.no_wa || '',
    emailPic: item.email_pic || item.emailPic || item.email || '',
    areaKota: item.alamat_kota || item.areaKota || item.area_wilayah_kota || item.area_kota || item.area || item.kota || '',
    kawasan: item.alamat_kawasan || item.kawasan || item.kawasan_industri || '',
    alamat: item.alamat_detail || item.alamat || item.address || '',
    latitude: item.maps_latitude || item.latitude || item.lat || item.lintang || '',
    longitude: item.maps_longitude || item.longitude || item.long || item.bujur || ''
  }));
}

/**
 * Parses raw CSV string into CompanyRecord array with strict header validation
 */
export function parseCSVToRecords(csvText: string): Partial<CompanyRecord>[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Parse CSV line handling quotes
  const parseLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]);
  const headerToPropMap: Record<number, keyof CompanyRecord> = {};

  rawHeaders.forEach((rawH, idx) => {
    const cleanH = rawH.trim().toLowerCase().replace(/^\uFEFF/, '');
    if (!cleanH) return; // Ignore empty trailing header columns

    const cleanSnake = cleanH.replace(/\s+/g, '_');
    const cleanNoUnderscores = cleanH.replace(/[\s_]+/g, '');

    const mappedProp = VALID_JSON_KEYS_MAP[cleanH] ||
                       VALID_JSON_KEYS_MAP[cleanSnake] ||
                       VALID_JSON_KEYS_MAP[cleanNoUnderscores];

    if (!mappedProp) {
      const suggestion = COMMON_KEY_TYPOS[cleanH] || 
                         COMMON_KEY_TYPOS[cleanSnake] ||
                         Object.keys(VALID_JSON_KEYS_MAP).find(k => k.replace(/[\s_]+/g, '').toLowerCase() === cleanNoUnderscores);

      if (suggestion) {
        throw new Error(`Nama header kolom CSV "${rawH}" tidak valid. Diduga salah ketik untuk "${suggestion}". Mohon sesuaikan nama kolom dengan formula standar.`);
      } else {
        throw new Error(`Nama header kolom CSV "${rawH}" tidak sesuai formula standar. Gunakan nama kolom resmi seperti "nama_perusahaan", "jabatan_pic", "alamat_detail", dll.`);
      }
    }

    if (mappedProp !== 'id' && mappedProp !== 'no' && mappedProp !== 'createdAt' && mappedProp !== 'updatedAt') {
      headerToPropMap[idx] = mappedProp as keyof CompanyRecord;
    }
  });

  const dataLines = lines.slice(1);
  const results: Partial<CompanyRecord>[] = [];

  dataLines.forEach((line, idx) => {
    const cols = parseLine(line);
    if (cols.length === 0 || (cols.length === 1 && !cols[0])) return;

    const record: Partial<CompanyRecord> = {
      id: generateId() + '_' + idx,
      namaPerusahaan: '',
      bidang: '',
      telponKantor: '',
      emailKantor: '',
      website: '',
      namaPic: '',
      jabatanPic: '',
      whatsapp: '',
      emailPic: '',
      areaKota: '',
      kawasan: '',
      alamat: '',
      latitude: '',
      longitude: ''
    };

    cols.forEach((val, cIdx) => {
      const prop = headerToPropMap[cIdx];
      if (prop) {
        (record as any)[prop] = val;
      }
    });

    results.push(record);
  });

  return results;
}

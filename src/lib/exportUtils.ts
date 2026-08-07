import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanyRecord, ColumnOption, SqlOptions } from '../types';
import { formatTelponKantor, formatWhatsApp } from './phoneUtils';

export const ALL_COLUMNS: ColumnOption[] = [
  { key: 'namaPerusahaan', jsonKey: 'nama_perusahaan', label: 'Nama Perusahaan' },
  { key: 'bidang', jsonKey: 'bidang_perusahaan', label: 'Bidang Perusahaan' },
  { key: 'telponKantor', jsonKey: 'telpon_perusahaan', label: 'Telpon Kantor' },
  { key: 'emailKantor', jsonKey: 'email_perusahaan', label: 'Email Kantor' },
  { key: 'website', jsonKey: 'website_perusahaan', label: 'Website' },
  { key: 'namaPic', jsonKey: 'nama_pic', label: 'Nama PIC' },
  { key: 'jabatanPic', jsonKey: 'jabatan_pic', label: 'Jabatan PIC' },
  { key: 'whatsapp', jsonKey: 'whatsapp_pic', label: 'WhatsApp PIC' },
  { key: 'emailPic', jsonKey: 'email_pic', label: 'Email PIC' },
  { key: 'areaKota', jsonKey: 'alamat_kota', label: 'Area / Kota' },
  { key: 'kawasan', jsonKey: 'alamat_kawasan', label: 'Kawasan Industri' },
  { key: 'alamat', jsonKey: 'alamat_detail', label: 'Detail Alamat' },
  { key: 'latitude', jsonKey: 'maps_latitude', label: 'Latitude' },
  { key: 'longitude', jsonKey: 'maps_longitude', label: 'Longitude' }
];

function getSelectedCols(selectedKeys?: (keyof CompanyRecord)[]): ColumnOption[] {
  if (!selectedKeys || selectedKeys.length === 0) return ALL_COLUMNS;
  return ALL_COLUMNS.filter(c => selectedKeys.includes(c.key));
}

function getFormattedValue(record: CompanyRecord, key: keyof CompanyRecord): string {
  if (key === 'telponKantor') return formatTelponKantor(record.telponKantor) || '';
  if (key === 'whatsapp') return formatWhatsApp(record.whatsapp) || '';
  return String(record[key] || '');
}

/**
 * Format records as clean JSON with selected columns
 */
export function exportToJSON(records: CompanyRecord[], selectedKeys?: (keyof CompanyRecord)[]): string {
  const activeCols = getSelectedCols(selectedKeys);
  const exportData = records.map((r) => {
    const item: Record<string, string> = {};
    activeCols.forEach(col => {
      item[col.jsonKey] = getFormattedValue(r, col.key);
    });
    return item;
  });

  return JSON.stringify(exportData, null, 2);
}

/**
 * Format records as SQL script with selected columns
 */
export function exportToSQL(records: CompanyRecord[], options: SqlOptions, selectedKeys?: (keyof CompanyRecord)[]): string {
  const table = options.tableName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() || 'database_perusahaan';
  const activeCols = getSelectedCols(selectedKeys);

  let sql = `-- ==========================================\n`;
  sql += `-- Database Export: ${options.tableName}\n`;
  sql += `-- Exported on: ${new Date().toLocaleString('id-ID')}\n`;
  sql += `-- Total Records: ${records.length}\n`;
  sql += `-- Dialect: ${options.dialect.toUpperCase()}\n`;
  sql += `-- Columns: ${activeCols.map(c => c.jsonKey).join(', ')}\n`;
  sql += `-- ==========================================\n\n`;

  if (options.includeCreateTable) {
    const colDefs = activeCols.map(c => {
      const colName = c.jsonKey;
      if (options.dialect === 'mysql') {
        return `  \`${colName}\` TEXT`;
      } else if (options.dialect === 'sqlite') {
        return `  "${colName}" TEXT`;
      } else {
        return `  ${colName} TEXT`;
      }
    }).join(',\n');

    if (options.dialect === 'postgresql') {
      sql += `CREATE TABLE IF NOT EXISTS ${table} (\n  id SERIAL PRIMARY KEY,\n${colDefs}\n);\n\n`;
    } else if (options.dialect === 'mysql') {
      sql += `CREATE TABLE IF NOT EXISTS \`${table}\` (\n  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n${colDefs}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;
    } else {
      sql += `CREATE TABLE IF NOT EXISTS "${table}" (\n  "id" INTEGER PRIMARY KEY AUTOINCREMENT,\n${colDefs}\n);\n\n`;
    }
  }

  if (records.length === 0) {
    sql += `-- No records to insert\n`;
    return sql;
  }

  const escapeStr = (val: string): string => {
    if (!val) return 'NULL';
    const escaped = val.replace(/'/g, "''");
    return `'${escaped}'`;
  };

  const colNamesStr = activeCols.map(c => c.jsonKey).join(', ');

  sql += `-- Insert Data Statements\n`;
  records.forEach((r) => {
    const valsStr = activeCols.map(c => escapeStr(getFormattedValue(r, c.key))).join(', ');
    sql += `INSERT INTO ${table} (${colNamesStr}) VALUES (${valsStr});\n`;
  });

  return sql;
}

/**
 * Format records as readable plain text format or structured list with selected columns
 */
export function exportToText(records: CompanyRecord[], title = 'DATABASE PERUSAHAAN & KONTAK', selectedKeys?: (keyof CompanyRecord)[]): string {
  const activeCols = getSelectedCols(selectedKeys);

  let txt = `=================================================================\n`;
  txt += `${title.toUpperCase()}\n`;
  txt += `Tanggal Export: ${new Date().toLocaleString('id-ID')}\n`;
  txt += `Total Perusahaan: ${records.length}\n`;
  txt += `Kolom Terpilih: ${activeCols.map(c => c.label).join(', ')}\n`;
  txt += `=================================================================\n\n`;

  records.forEach((r, idx) => {
    txt += `[${idx + 1}] ${r.namaPerusahaan || 'Tanpa Nama'}\n`;
    txt += `-----------------------------------------------------------------\n`;
    activeCols.forEach(col => {
      const labelPadded = (col.label + '                     ').slice(0, 20);
      txt += `• ${labelPadded} : ${getFormattedValue(r, col.key) || '-'}\n`;
    });
    txt += `\n`;
  });

  return txt;
}

/**
 * Format records as CSV (Comma Separated Values) with selected columns
 */
export function exportToCSV(records: CompanyRecord[], selectedKeys?: (keyof CompanyRecord)[]): string {
  const activeCols = getSelectedCols(selectedKeys);

  const escapeCSV = (val: string | number | undefined): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headers = activeCols.map(c => c.jsonKey.replace(/_/g, ' '));
  const rows = records.map((r) => activeCols.map(col => escapeCSV(getFormattedValue(r, col.key))));

  const csvContent = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return '\uFEFF' + csvContent;
}

/**
 * Generate PDF document preview text representation
 */
export function exportToPDFPreviewText(records: CompanyRecord[], title: string, selectedKeys?: (keyof CompanyRecord)[]): string {
  const activeCols = getSelectedCols(selectedKeys);
  let txt = `[DOKUMEN PDF] ${title.toUpperCase()}\n`;
  txt += `Format: PDF Document (.pdf)\n`;
  txt += `Tanggal Export: ${new Date().toLocaleString('id-ID')}\n`;
  txt += `Jumlah Data: ${records.length} Baris\n`;
  txt += `Jumlah Kolom Terpilih: ${activeCols.length} Kolom (${activeCols.map(c => c.label).join(', ')})\n\n`;
  txt += `-----------------------------------------------------------------\n`;
  txt += `PRATINJAU TAMPILAN KONTEN HALAMAN PDF:\n`;
  txt += `-----------------------------------------------------------------\n\n`;

  records.slice(0, 10).forEach((r, idx) => {
    txt += `#${idx + 1}. ${r.namaPerusahaan || 'Perusahaan'}\n`;
    activeCols.forEach(c => {
      txt += `   - ${c.label}: ${getFormattedValue(r, c.key) || '-'}\n`;
    });
    txt += `\n`;
  });

  if (records.length > 10) {
    txt += `... dan ${records.length - 10} baris lainnya akan disertakan dalam file PDF lengkap saat diunduh.\n`;
  }

  return txt;
}

/**
 * Generate and download PDF file (100% Vector Text, Compact Grouped Cells & Single Header)
 */
export function downloadPDF(records: CompanyRecord[], title: string, fileName: string, selectedKeys?: (keyof CompanyRecord)[]): void {
  const isKeySelected = (k: keyof CompanyRecord) => !selectedKeys || selectedKeys.includes(k);

  // Group presence flags
  const hasGroupPerusahaan = isKeySelected('namaPerusahaan') || isKeySelected('bidang') || isKeySelected('produkUtama' as any);
  const hasGroupAlamat = isKeySelected('alamat') || isKeySelected('kawasan') || isKeySelected('areaKota') || isKeySelected('latitude') || isKeySelected('longitude') || isKeySelected('provinsi' as any);
  const hasGroupKontak = isKeySelected('telponKantor') || isKeySelected('emailKantor') || isKeySelected('website');
  const hasGroupPic = isKeySelected('namaPic') || isKeySelected('jabatanPic') || isKeySelected('whatsapp') || isKeySelected('emailPic');

  // Determine document orientation: landscape if > 2 groups active, else portrait
  const activeGroupCount = (hasGroupPerusahaan ? 1 : 0) + (hasGroupAlamat ? 1 : 0) + (hasGroupKontak ? 1 : 0) + (hasGroupPic ? 1 : 0);
  const isLandscape = activeGroupCount >= 3;

  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Color Palette - Soft & Professional Emerald / Slate Theme
  const emerald700: [number, number, number] = [4, 120, 87];
  const emerald800: [number, number, number] = [6, 95, 70];
  const slate900: [number, number, number] = [15, 23, 42];
  const slate600: [number, number, number] = [71, 85, 105];

  // 1. Top Header Banner
  doc.setFillColor(...emerald700);
  doc.rect(0, 0, pageWidth, 18, 'F');

  // Accent Line under header
  doc.setFillColor(...emerald800);
  doc.rect(0, 18, pageWidth, 1, 'F');

  // Header Title Text (Vector Text)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('MYDIBY - DATABASE EXPORT REPORT', 12, 11.5);

  // Top Header Sub-badge Right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('TEKS VEKTOR RESMI (COMPACT MODE)', pageWidth - 12, 11.5, { align: 'right' });

  // 2. Metadata Box
  const metaBoxY = 22;
  const metaBoxHeight = 16;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.2);
  doc.roundedRect(12, metaBoxY, pageWidth - 24, metaBoxHeight, 1.5, 1.5, 'FD');

  // Title inside Metadata Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...slate900);
  doc.text(`Database: ${title}`, 16, metaBoxY + 5.5);

  // Subtitle info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slate600);
  doc.text(`Waktu Cetak: ${new Date().toLocaleString('id-ID')} WIB`, 16, metaBoxY + 11.5);

  // Stats on Right Side of Metadata Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...emerald700);
  doc.text(`Total Data: ${records.length.toLocaleString('id-ID')} Baris`, pageWidth - 16, metaBoxY + 5.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...slate600);
  doc.text(`Format: Mode Ringkas (${activeGroupCount} Kelompok Informasi)`, pageWidth - 16, metaBoxY + 11.5, { align: 'right' });

  // 3. Build Active Headers & Columns
  const headCols: string[] = ['NO'];
  if (hasGroupPerusahaan) headCols.push('PERUSAHAAN & BIDANG');
  if (hasGroupAlamat) headCols.push('ALAMAT & LOKASI');
  if (hasGroupKontak) headCols.push('KONTAK KANTOR');
  if (hasGroupPic) headCols.push('PIC & WHATSAPP');

  // Build Body Rows (Compact Multi-Line Formatting)
  const body = records.map((r, idx) => {
    const row: (string | number)[] = [idx + 1];

    if (hasGroupPerusahaan) {
      const lines: string[] = [];
      if (isKeySelected('namaPerusahaan') && r.namaPerusahaan && r.namaPerusahaan.trim()) {
        lines.push(r.namaPerusahaan.trim());
      }
      if (isKeySelected('bidang') && r.bidang && r.bidang.trim()) {
        lines.push(r.bidang.trim());
      }
      row.push(lines.length > 0 ? lines.join('\n') : '-');
    }

    if (hasGroupAlamat) {
      const lines: string[] = [];
      if (isKeySelected('alamat') && r.alamat && r.alamat.trim()) {
        lines.push(r.alamat.trim());
      }
      
      const locParts: string[] = [];
      if (isKeySelected('kawasan') && r.kawasan && r.kawasan.trim()) locParts.push(r.kawasan.trim());
      if (isKeySelected('areaKota') && r.areaKota && r.areaKota.trim()) locParts.push(r.areaKota.trim());
      if (isKeySelected('provinsi' as any) && (r as any).provinsi && (r as any).provinsi.trim()) locParts.push((r as any).provinsi.trim());
      
      if (locParts.length > 0) lines.push(locParts.join(', '));

      const coordParts: string[] = [];
      if (isKeySelected('latitude') && r.latitude && r.latitude.trim()) coordParts.push(`Lat: ${r.latitude.trim()}`);
      if (isKeySelected('longitude') && r.longitude && r.longitude.trim()) coordParts.push(`Lng: ${r.longitude.trim()}`);
      if (coordParts.length > 0) lines.push(coordParts.join(' | '));

      row.push(lines.length > 0 ? lines.join('\n') : '-');
    }

    if (hasGroupKontak) {
      const lines: string[] = [];
      if (isKeySelected('telponKantor') && r.telponKantor && r.telponKantor.trim()) {
        lines.push(formatTelponKantor(r.telponKantor) || r.telponKantor.trim());
      }
      if (isKeySelected('emailKantor') && r.emailKantor && r.emailKantor.trim()) {
        lines.push(r.emailKantor.trim());
      }
      if (isKeySelected('website') && r.website && r.website.trim()) {
        lines.push(r.website.trim());
      }
      row.push(lines.length > 0 ? lines.join('\n') : '-');
    }

    if (hasGroupPic) {
      const lines: string[] = [];
      let picHeader = '';
      if (isKeySelected('namaPic') && r.namaPic && r.namaPic.trim()) picHeader = r.namaPic.trim();
      if (isKeySelected('jabatanPic') && r.jabatanPic && r.jabatanPic.trim()) {
        picHeader = picHeader ? `${picHeader} (${r.jabatanPic.trim()})` : r.jabatanPic.trim();
      }
      if (picHeader) lines.push(picHeader);

      if (isKeySelected('whatsapp') && r.whatsapp && r.whatsapp.trim()) {
        lines.push(formatWhatsApp(r.whatsapp) || r.whatsapp.trim());
      }
      if (isKeySelected('emailPic') && r.emailPic && r.emailPic.trim()) {
        lines.push(r.emailPic.trim());
      }
      row.push(lines.length > 0 ? lines.join('\n') : '-');
    }

    return row;
  });

  // Calculate Proportional Column Widths
  const columnStyles: { [key: number]: any } = {
    0: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: [71, 85, 105] }
  };

  const totalWidthAvailable = pageWidth - 24 - 10; // Printable area minus margins & NO col
  let colIdx = 1;

  if (hasGroupPerusahaan) {
    columnStyles[colIdx] = { cellWidth: totalWidthAvailable * 0.28 };
    colIdx++;
  }
  if (hasGroupAlamat) {
    columnStyles[colIdx] = { cellWidth: totalWidthAvailable * 0.30 };
    colIdx++;
  }
  if (hasGroupKontak) {
    columnStyles[colIdx] = { cellWidth: totalWidthAvailable * 0.21 };
    colIdx++;
  }
  if (hasGroupPic) {
    columnStyles[colIdx] = { cellWidth: totalWidthAvailable * 0.21 };
    colIdx++;
  }

  // Render Vector Table with Header ONLY on First Page (showHead: 'firstPage')
  autoTable(doc, {
    startY: 42,
    head: [headCols],
    body: body,
    showHead: 'firstPage', // Table header appears ONLY on Page 1
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      textColor: [30, 41, 59], // slate-800
      cellPadding: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 },
      lineColor: [226, 232, 240], // soft thin border
      lineWidth: 0.12,
      overflow: 'linebreak',
      valign: 'top' // Top-aligned multi-line text for clean layout
    },
    headStyles: {
      fillColor: emerald700,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      valign: 'middle',
      halign: 'left',
      lineWidth: 0.12,
      lineColor: emerald800
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50 soft row background
    },
    columnStyles: columnStyles,
    margin: { top: 12, right: 12, bottom: 14, left: 12 }
  });

  // 4. Post-processing Pass: Footer & Page Numbers
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    const footerY = pageHeight - 7;
    
    // Footer Separator Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.line(12, footerY - 3, pageWidth - 12, footerY - 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Dicetak Otomatis oleh MyDiby Database Manager  |  Teks Vektor Asli (Dapat Di-copy & Dicari)', 12, footerY);
    doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - 12, footerY, { align: 'right' });
  }

  doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

/**
 * Clean phone / WhatsApp string into WhatsApp click-to-chat URL format
 */
export function formatWhatsAppUrl(phone: string): string {
  if (!phone) return '#';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (!clean.startsWith('62') && clean.length >= 9) {
    clean = '62' + clean;
  }
  return `https://wa.me/${clean}`;
}

/**
 * Trigger file download in browser
 */
export function downloadFile(content: string, fileName: string, contentType: string): void {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Safely copy text to clipboard with fallback for restricted permissions / iframe environments
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('navigator.clipboard.writeText failed, attempting execCommand fallback:', err);
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copy to clipboard failed:', err);
    return false;
  }
}

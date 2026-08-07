/**
 * Helper utility for Indonesian Phone and WhatsApp number formatting (TypeScript)
 */

/**
 * Formats Office Telephone Number (Telpon Kantor) with area code dash
 * Examples:
 * - "02189801234" -> "021-89801234"
 * - "0221234567"  -> "022-1234567"
 * - "02518321234" -> "0251-8321234"
 */
export function formatTelponKantor(phone: string | number | undefined | null): string {
  if (phone === undefined || phone === null) return '';
  const str = String(phone).trim();
  if (!str) return '';

  // If already contains dash or special format, check digits
  let clean = str.replace(/[^\d+]/g, '');
  if (clean.startsWith('+62')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('62')) {
    clean = '0' + clean.slice(2);
  }

  const digits = clean.replace(/\D/g, '');
  if (!digits) return str;

  // 4-digit area codes in Indonesia
  const fourDigitAreaCodes = [
    '0251', '0274', '0271', '0281', '0361', '0761', '0542', '0341', '0293', '0283', '0252', '0253', '0254'
  ];

  if (digits.startsWith('0')) {
    const is4DigitArea = fourDigitAreaCodes.some(code => digits.startsWith(code));
    const prefixLen = is4DigitArea ? 4 : 3;

    if (digits.length > prefixLen) {
      const area = digits.slice(0, prefixLen);
      const main = digits.slice(prefixLen);
      return `${area}-${main}`;
    }
  }

  // Fallback: split after 3 digits if length >= 6
  if (digits.length >= 6 && !str.includes('-')) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return str;
}

/**
 * Formats Mobile / WhatsApp number into 4-digit grouped chunks with dashes
 * Examples:
 * - "082234567890"    -> "0822-3456-7890"
 * - "082234567890222" -> "0822-3456-7890-222"
 * - "+6281298765432"  -> "0812-9876-5432"
 */
export function formatWhatsApp(phone: string | number | undefined | null): string {
  if (phone === undefined || phone === null) return '';
  const str = String(phone).trim();
  if (!str) return '';

  let clean = str.replace(/[^\d+]/g, '');
  if (clean.startsWith('+62')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('62')) {
    clean = '0' + clean.slice(2);
  }

  const digits = clean.replace(/\D/g, '');
  if (!digits) return str;

  // Group into 4-digit chunks: 4 - 4 - 4 - rest
  if (digits.length >= 5) {
    const part1 = digits.slice(0, 4);
    const part2 = digits.slice(4, 8);
    const part3 = digits.slice(8, 12);
    const part4 = digits.slice(12);

    const parts = [part1, part2, part3, part4].filter(Boolean);
    return parts.join('-');
  }

  return str;
}

/**
 * Clean phone string to digits-only string preserving leading zeros (as string type)
 */
export function cleanRawPhone(phone: string | number | undefined | null): string {
  if (phone === undefined || phone === null) return '';
  const str = String(phone).trim();
  let clean = str.replace(/[^\d+]/g, '');
  if (clean.startsWith('+62')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('62')) {
    clean = '0' + clean.slice(2);
  }
  return clean.replace(/\D/g, '');
}

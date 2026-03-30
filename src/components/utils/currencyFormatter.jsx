/**
 * Format currency to Indonesian Rupiah format
 * Example: 21424275 → "Rp 21.424.275"
 * 
 * @param {number} amount - Amount to format
 * @param {boolean} showRp - Whether to show "Rp" prefix (default: true)
 * @returns {string} Formatted currency string
 */
export function formatRupiah(amount, showRp = true) {
  const number = Number(amount || 0);

  // Format dengan pemisah titik untuk ribuan
  const formatted = number.toLocaleString('id-ID');

  return showRp ? `Rp ${formatted}` : formatted;
}

export { formatRupiah as formatCurrency };

/**
 * Format to millions (for stats)
 * Example: 21424275 → "Rp 21.4M"
 */
export function formatRupiahShort(amount) {
  const number = Number(amount || 0);

  if (number >= 1000000000) {
    return `Rp ${(number / 1000000000).toFixed(1)}B`;
  }
  if (number >= 1000000) {
    return `Rp ${(number / 1000000).toFixed(1)}M`;
  }
  if (number >= 1000) {
    return `Rp ${(number / 1000).toFixed(1)}K`;
  }

  return `Rp ${number.toLocaleString('id-ID')}`;
}

/**
 * Parse formatted rupiah string back to number
 * Example: "Rp 21.424.275" → 21424275
 */
export function parseRupiah(formattedString) {
  if (!formattedString) return 0;

  const cleanString = String(formattedString)
    .replace(/Rp\s?/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');

  return parseFloat(cleanString) || 0;
}
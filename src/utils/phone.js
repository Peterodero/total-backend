/**
 * Normalise a Kenyan phone number to E.164 format (+254...)
 * Handles:
 *   07XXXXXXXX  → +25407XXXXXXXX (Kenyan local format)
 *   7XXXXXXXX   → +2547XXXXXXXX  (missing leading 0)
 *   254XXXXXXXXX → +254XXXXXXXXX (already has country code)
 *   +254XXXXXXXX → as-is (already in E.164)
 *
 * @param {string} raw - raw phone string from request
 * @returns {string} normalised E.164 phone string
 * @throws {Error} if the phone number is not recognisable
 */
const normalizePhone = (raw) => {
  // Strip all whitespace, dashes, parentheses
  let phone = raw.replace(/[\s\-().]/g, '');

  // Already E.164 with +
  if (/^\+254\d{9}$/.test(phone)) return phone;

  // Country code without +
  if (/^254\d{9}$/.test(phone)) return `+${phone}`;

  // Local Kenyan 07XXXXXXXX (10 digits)
  if (/^07\d{8}$/.test(phone)) return `+254${phone.slice(1)}`;

  // Local without leading 0: 7XXXXXXXX (9 digits)
  if (/^7\d{8}$/.test(phone)) return `+254${phone}`;

  throw new Error(
    `Phone number "${raw}" is not in a recognised Kenyan format. ` +
      'Use 07XXXXXXXX, +254XXXXXXXXX, or 254XXXXXXXXX.'
  );
};

module.exports = { normalizePhone };

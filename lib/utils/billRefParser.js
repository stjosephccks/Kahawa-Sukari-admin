/**
 * lib/utils/billRefParser.js
 *
 * Parses the free-text BillRefNumber field from M-Pesa C2B payments into
 * structured components: zaka number, payment month, year, and a confidence score.
 *
 * Handles all real-world input patterns observed in production:
 *   "1234"           → { zakaNumber: '1234', month: null,        year: null,  confidence: 'low' }
 *   "1234 september" → { zakaNumber: '1234', month: 'September', year: null,  confidence: 'high' }
 *   "1234 sept"      → { zakaNumber: '1234', month: 'September', year: null,  confidence: 'high' }
 *   "1234 9"         → { zakaNumber: '1234', month: 'September', year: null,  confidence: 'high' }
 *   "1234 sep 2024"  → { zakaNumber: '1234', month: 'September', year: 2024,  confidence: 'high' }
 *   "1234/jan"       → { zakaNumber: '1234', month: 'January',   year: null,  confidence: 'high' }
 *   "sept 1234"      → { zakaNumber: '1234', month: 'September', year: null,  confidence: 'high' }
 *   "1234sept"       → { zakaNumber: '1234', month: 'September', year: null,  confidence: 'high' }
 *   "augst 56"       → { zakaNumber: '56',   month: 'August',    year: null,  confidence: 'high' }
 */

// Canonical month names (index 0 = January)
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// All known aliases (abbreviations, common variants) for each month (lowercase)
const MONTH_ALIASES = {
  january:   ['jan', 'janu', 'janr'],
  february:  ['feb', 'febu', 'febr', 'febs'],
  march:     ['mar', 'marc', 'mach'],
  april:     ['apr', 'aprl', 'apri'],
  may:       ['may'],
  june:      ['jun'],
  july:      ['jul', 'jly'],
  august:    ['aug', 'augt', 'augst', 'agust', 'augu'],
  september: ['sep', 'sept', 'septem', 'septemb', 'septembe', 'setember', 'sepember'],
  october:   ['oct', 'octo', 'octr', 'otcober', 'octobr'],
  november:  ['nov', 'novem', 'novemb', 'novembe'],
  december:  ['dec', 'dece', 'decemb', 'decembe'],
};

// Build fast lookup: token (lowercase) → canonical month name
const ALIAS_TO_MONTH = {};
MONTHS.forEach((name) => {
  const key = name.toLowerCase();
  ALIAS_TO_MONTH[key] = name; // full name
  (MONTH_ALIASES[key] || []).forEach((alias) => {
    ALIAS_TO_MONTH[alias] = name;
  });
});

/**
 * Levenshtein edit distance between two strings.
 */
function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Try to resolve a text token to a canonical month name.
 * Priority: exact/alias match → fuzzy match (edit distance ≤ 2, only for tokens ≥ 4 chars)
 */
function resolveMonth(token) {
  const lower = token.toLowerCase();

  // Exact or alias match
  if (ALIAS_TO_MONTH[lower]) return ALIAS_TO_MONTH[lower];

  // Skip fuzzy for very short tokens to avoid false positives
  if (lower.length < 4) return null;

  // Fuzzy match against all known aliases
  let best = null;
  let bestDist = Infinity;
  for (const [alias, month] of Object.entries(ALIAS_TO_MONTH)) {
    if (Math.abs(alias.length - lower.length) > 2) continue;
    const dist = editDistance(lower, alias);
    if (dist < bestDist && dist <= 2) {
      bestDist = dist;
      best = month;
    }
  }
  return best;
}

/**
 * Try to resolve a numeric token (1–12) to a canonical month name.
 */
function resolveMonthNumber(token) {
  const n = parseInt(token, 10);
  if (!isNaN(n) && n >= 1 && n <= 12) return MONTHS[n - 1];
  return null;
}

/**
 * Main export: parse a BillRefNumber string.
 *
 * @param {string} billRef - Raw BillRefNumber from M-Pesa
 * @returns {{ zakaNumber: string|null, month: string|null, year: number|null, confidence: string, raw: string }}
 *   confidence: 'high' (zaka + month found) | 'low' (zaka found, no month) | 'none' (no zaka found)
 */
function parseBillRef(billRef) {
  const raw = billRef || '';

  if (!raw.trim()) {
    return { zakaNumber: null, month: null, year: null, confidence: 'none', raw };
  }

  // Normalise separators: replace /, -, _ with space
  const normalised = raw.trim().replace(/[\/\-_]+/g, ' ');

  // Split on spaces AND on transitions between letters and digits
  // e.g. "1234sept" → ["1234", "sept"], "sept1234" → ["sept", "1234"]
  const tokens = normalised
    .split(/\s+/)
    .flatMap(t => t.split(/(?<=\d)(?=[a-zA-Z])|(?<=[a-zA-Z])(?=\d)/))
    .map(t => t.trim())
    .filter(Boolean);

  let zakaNumber = null;
  let month = null;
  let year = null;
  const usedIndices = new Set();

  // --- Pass 1: Find year (4-digit 20xx) ---
  tokens.forEach((token, i) => {
    if (/^\d{4}$/.test(token)) {
      const n = parseInt(token, 10);
      if (n >= 2020 && n <= 2099) {
        year = n;
        usedIndices.add(i);
      }
    }
  });

  // --- Pass 2: Find month from text tokens ---
  tokens.forEach((token, i) => {
    if (usedIndices.has(i) || /^\d+$/.test(token)) return;
    const resolved = resolveMonth(token);
    if (resolved && !month) {
      month = resolved;
      usedIndices.add(i);
    }
  });

  // --- Pass 3: Identify digit-only tokens not yet consumed ---
  const digitTokens = tokens
    .map((token, i) => ({ token, i }))
    .filter(({ token, i }) => !usedIndices.has(i) && /^\d+$/.test(token));

  if (digitTokens.length === 1) {
    const { token, i } = digitTokens[0];
    if (!month) {
      // Single number — could be month or zaka. Prefer month if 1-12, else zaka.
      const asMonth = resolveMonthNumber(token);
      if (asMonth) {
        month = asMonth;
        usedIndices.add(i);
        // No zaka number can be identified in this case
      } else {
        zakaNumber = token;
        usedIndices.add(i);
      }
    } else {
      // Month already found via text — this number is the zaka number
      zakaNumber = token;
      usedIndices.add(i);
    }
  } else if (digitTokens.length >= 2) {
    // Multiple digit groups: longest is zaka number, shorter one(s) may be month
    const sorted = [...digitTokens].sort((a, b) => b.token.length - a.token.length);
    zakaNumber = sorted[0].token;
    usedIndices.add(sorted[0].i);

    // Try remaining digit tokens as month number (if month not already found)
    for (const { token, i } of sorted.slice(1)) {
      if (month) break;
      const asMonth = resolveMonthNumber(token);
      if (asMonth) {
        month = asMonth;
        usedIndices.add(i);
      }
    }
  }

  // --- Determine confidence ---
  let confidence;
  if (!zakaNumber) {
    confidence = 'none';
  } else if (month) {
    confidence = 'high';
  } else {
    confidence = 'low'; // zaka found but no month → caller will use current month
  }

  return { zakaNumber, month, year, confidence, raw };
}

module.exports = { parseBillRef, resolveMonth, MONTHS };

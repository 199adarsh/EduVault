/**
 * Attendance & Subject Abbreviations Utility
 * E.g., Present: DS (Data Structures), ML (Machine Learning); Absent: AWT-L (AWT Lab)
 */

export function getSubjectAbbreviation(name) {
  if (!name || typeof name !== 'string') return 'SUB';
  const clean = name.trim();

  // Known direct overrides for precision
  const lower = clean.toLowerCase();
  if (lower.includes('data structures') && lower.includes('lab')) return 'DS-P';
  if (lower.includes('data structures')) return 'DS';
  if (lower.includes('advanced web technology') && lower.includes('lab')) return 'AWT-P';
  if (lower.includes('advanced web technology') || lower.includes('awt')) return 'AWT';
  if (lower.includes('machine learning') && (lower.includes('lab') || lower.includes('python'))) return 'ML-P';
  if (lower.includes('machine learning') || lower.includes('ml')) return 'ML';
  if (lower.includes('database engineering') && lower.includes('lab')) return 'DE-P';
  if (lower.includes('database engineering') || lower.includes('database systems')) return 'DE';
  if (lower.includes('feature engineering') && lower.includes('lab')) return 'FE-P';
  if (lower.includes('feature engineering')) return 'FE';
  if (lower.includes('startup') || lower.includes('entrepreneurship')) return 'SE';
  if (lower.includes('raspberry pi') && lower.includes('lab')) return 'IoT-P';
  if (lower.includes('raspberry pi') || lower.includes('iot')) return 'IoT';
  if (lower.includes('mini project')) return 'MP-II';
  if (lower.includes('operating systems') && lower.includes('lab')) return 'OS-P';
  if (lower.includes('operating systems')) return 'OS';
  if (lower.includes('computer networks') && lower.includes('lab')) return 'CN-P';
  if (lower.includes('computer networks')) return 'CN';

  // Heuristic abbreviation for any dynamic or future subject
  const isLab = /\b(lab|laboratory|practical)\b/i.test(clean);
  const core = clean
    .replace(/\b(lab|laboratory|practical|using|and|in|of|the|for|ii|i)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();

  const words = core.split(/\s+/).filter(Boolean);
  let abbr = words.map(w => w[0].toUpperCase()).join('');

  if (abbr.length > 4) abbr = abbr.slice(0, 4);
  if (!abbr) abbr = clean.slice(0, 3).toUpperCase();

  return isLab ? `${abbr}-P` : abbr;
}

export function formatAttendanceDaySubjects(lectures, compact = false) {
  if (!lectures || lectures.length === 0) return 'No scheduled lectures';

  const presentList = [];
  const absentList = [];
  const seenP = new Set();
  const seenA = new Set();

  lectures.forEach(l => {
    const rawName = l.name || 'Subject';
    const abbr = getSubjectAbbreviation(rawName);
    const label = compact ? abbr : `${abbr} (${rawName})`;

    if (l.status === 'Present') {
      if (!seenP.has(label)) {
        seenP.add(label);
        presentList.push(label);
      }
    } else {
      if (!seenA.has(label)) {
        seenA.add(label);
        absentList.push(label);
      }
    }
  });

  const parts = [];
  if (presentList.length > 0) {
    parts.push(`Present: ${presentList.join(', ')}`);
  }
  if (absentList.length > 0) {
    parts.push(`Absent: ${absentList.join(', ')}`);
  }

  return parts.length > 0 ? parts.join('; ') : 'No recorded sessions';
}

/**
 * Normalizes date keys into DD-MM-YYYY and YYYY-MM-DD
 */
export function normalizeDateKey(dateStr) {
  if (!dateStr) return { ddmmyyyy: '', yyyymmdd: '' };
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return {
        ddmmyyyy: `${parts[2]}-${parts[1]}-${parts[0]}`,
        yyyymmdd: dateStr
      };
    } else {
      // DD-MM-YYYY
      return {
        ddmmyyyy: dateStr,
        yyyymmdd: `${parts[2]}-${parts[1]}-${parts[0]}`
      };
    }
  }
  return { ddmmyyyy: dateStr, yyyymmdd: dateStr };
}

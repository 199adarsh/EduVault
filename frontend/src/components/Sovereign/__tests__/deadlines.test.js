import { parseDeadlineDate, getDaysRemainingInfo, formatDeadlineDate } from '../deadlineUtils.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`PASS: ${message}`);
  }
}

console.log('--- Testing parseDeadlineDate ---');
const d1 = parseDeadlineDate('2026-11-15');
assert(d1 instanceof Date && d1.getFullYear() === 2026 && d1.getMonth() === 10 && d1.getDate() === 15, 'parse YYYY-MM-DD correctly');

const d2 = parseDeadlineDate('2026-11-15T18:30:00Z');
assert(d2 instanceof Date && !isNaN(d2.getTime()), 'parse ISO string correctly');

const d3 = parseDeadlineDate(null);
assert(d3 === null, 'null returns null');

const d4 = parseDeadlineDate('invalid-date');
assert(d4 === null, 'invalid string returns null');

console.log('--- Testing formatDeadlineDate ---');
const formatted = formatDeadlineDate('2026-11-15');
assert(typeof formatted === 'string' && formatted.includes('2026'), 'format valid date string');
assert(formatDeadlineDate(null) === '', 'format null returns empty string');

console.log('--- Testing getDaysRemainingInfo ---');
const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const todayInfo = getDaysRemainingInfo(todayStr);
assert(todayInfo.status === 'today' && todayInfo.label === 'Due Today', 'today status correct');

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
const tomorrowInfo = getDaysRemainingInfo(tomorrowStr);
assert(tomorrowInfo.status === 'tomorrow' && tomorrowInfo.label === 'Tomorrow', 'tomorrow status correct');

const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
const pastStr = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
const pastInfo = getDaysRemainingInfo(pastStr);
assert(pastInfo.status === 'overdue' && pastInfo.label === '3d overdue', 'overdue status correct');

const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
const futureStr = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
const futureInfo = getDaysRemainingInfo(futureStr);
assert(futureInfo.status === 'upcoming' && futureInfo.label === '10 days left', 'future status correct');

console.log('All deadline tests passed successfully!');

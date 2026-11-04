import { isLinkNote, getNoteBadge, cleanSubjectName, isSubjectNameMatch, getCleanTitle } from '../../../lib/noteUtils.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`PASS: ${message}`);
  }
}

console.log('--- Testing isLinkNote ---');
assert(isLinkNote(null) === false, 'null note returns false');
assert(isLinkNote({ fileUrl: 'https://example.com/slides' }) === true, 'http link returns true');
assert(isLinkNote({ fileUrl: 'https://example.com/slides.pdf' }) === false, 'pdf url returns false');
assert(isLinkNote({ category: 'link' }) === true, 'link category returns true');

console.log('--- Testing getNoteBadge ---');
assert(getNoteBadge({ fileUrl: 'lecture1.pdf' }) === 'PDF', 'pdf file badge is PDF');
assert(getNoteBadge({ fileUrl: 'notes.docx' }) === 'DOCX', 'docx file badge is DOCX');
assert(getNoteBadge({ fileUrl: 'https://docs.google.com/doc' }) === 'LINK', 'url badge is LINK');

console.log('--- Testing cleanSubjectName & isSubjectNameMatch ---');
const name1 = 'Data Structures & Algorithms (CS201)';
const name2 = 'Data Structures and Algorithms';
assert(cleanSubjectName(name1).includes('data structures'), 'cleanSubjectName cleans codes and parens');
assert(isSubjectNameMatch('Database Management Lab', 'Database Management') === false, 'lab and theory do not match');
assert(isSubjectNameMatch('Database Management Lab', 'Database Management Practical') === true, 'lab and practical match');
assert(isSubjectNameMatch('AI & DS', 'AIDS') === true, 'AI&DS alias matches AIDS');

console.log('--- Testing getCleanTitle ---');
assert(getCleanTitle('uploads/notes/unit1_intro.pdf') === 'Unit1 Intro.Pdf', 'getCleanTitle extracts and formats basename');

console.log('--- Testing Truthful OKF Status Evaluation ---');
const sampleNotes = [
  { id: '1', subjectId: 'cs101', okfStatus: 'PROCESSED' },
  { id: '2', subjectId: 'cs101', okfStatus: 'PENDING' },
  { id: '3', subjectId: 'cs102', okfStatus: 'PENDING' },
  { id: '4', subjectId: 'cs103', okfStatus: 'FAILED' }
];

// Helper mimicking AIAssistant metrics
function evaluateOkfMetrics(notesForSubject) {
  const compiledCount = notesForSubject.filter(n => n.okfStatus === 'PROCESSED').length;
  const pendingCount = notesForSubject.filter(n => n.okfStatus === 'PENDING' || !n.okfStatus).length;
  const hasCompiledOkf = compiledCount > 0;
  return { compiledCount, pendingCount, hasCompiledOkf };
}

const cs101 = evaluateOkfMetrics(sampleNotes.filter(n => n.subjectId === 'cs101'));
assert(cs101.hasCompiledOkf === true && cs101.compiledCount === 1, 'cs101 truthfully reports 1 compiled note');

const cs102 = evaluateOkfMetrics(sampleNotes.filter(n => n.subjectId === 'cs102'));
assert(cs102.hasCompiledOkf === false && cs102.pendingCount === 1, 'cs102 truthfully reports 0 compiled, 1 pending');

const cs103 = evaluateOkfMetrics(sampleNotes.filter(n => n.subjectId === 'cs103'));
assert(cs103.hasCompiledOkf === false && cs103.compiledCount === 0 && cs103.pendingCount === 0, 'cs103 truthfully reports 0 compiled, 0 pending');

console.log('All noteUtils and OKF evaluation tests passed successfully!');

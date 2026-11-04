import React, { useState, useMemo, useCallback } from 'react';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search,
    Upload,
    BookOpen,
    FileText,
    ArrowUpRight,
    RefreshCw,
    Inbox,
    ChevronDown,
    GraduationCap,
    Download
} from 'lucide-react';
import { cn } from '../../lib/utils';
import DocumentLoadingBar from '../DocumentLoadingBar';
import LmsSyncModal from './LmsSyncModal';
import PYQsDatabase from './PYQsDatabase';
import { FluidTabs } from '../fluid-tabs';

const normalizeDept = (dept) => {
    if (!dept) return 'GENERAL';
    const upper = dept.toUpperCase();
    if (upper.includes('UAD') || upper.includes('AIDS') || upper.includes('AI&DS') || upper.includes('AI & DS') || upper.includes('ARTIFICIAL')) return 'AIDS';
    if (upper.includes('CSE') || upper.includes('COMPUTER')) return 'CSE';
    if (upper.includes('ECE') || upper.includes('ELECTRONIC')) return 'ECE';
    if (upper.includes('MECH')) return 'MECH';
    if (upper.includes('CIVIL')) return 'CIVIL';
    return upper.replace(/[^A-Z0-9]/g, '');
};

const normalizeSem = (sem) => {
    if (!sem) return 'S01';
    const m = sem.toString().match(/(?:sem|semester|s)?\s*0?([1-8])/i);
    return m ? `S0${m[1]}` : sem.toString().toUpperCase().trim();
};

const normalizeUnit = (u) => (u || '').toString().toLowerCase().replace(/[^0-9]/g, '');

// Core 4-5 categories for filtering
const CORE_CATEGORIES = [
    { id: 'All', label: 'All' },
    { id: 'Notes', label: 'Notes' },
    { id: 'Links', label: 'Links' },
    { id: 'PYQ', label: 'PYQ' },
    { id: 'Syllabus', label: 'Syllabus' },
    { id: 'Lab Manual', label: 'Lab Manual' },
    { id: 'Lecture Plan', label: 'Lecture Plan' },
];





export const isLinkNote = (note) => {
    if (!note) return false;
    const raw = (note.fileUrl || note.sourceUrl || '').trim();
    if (!raw) return (note.category || '').toLowerCase() === 'link';
    const hasDocExt = raw.match(/\.(pdf|docx?|pptx?|xlsx?|txt|zip)(\?.*)?$/i);
    if (hasDocExt) return false;
    return raw.startsWith('http') || raw.includes('/') || (note.category || '').toLowerCase() === 'link';
};

export const getNoteBadge = (note) => {
    if (isLinkNote(note)) return 'LINK';
    const raw = note.fileUrl || '';
    const parts = raw.split('.');
    if (parts.length > 1) {
        const ext = parts.pop().split(/[?#]/)[0].toUpperCase();
        if (ext.length <= 5) return ext;
    }
    return 'PDF';
};

export const cleanSubjectName = (str) => {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/\([a-z0-9\s_-]+\)/gi, '')
        .replace(/[0-9]{2}[a-z]{2,6}[0-9]{3,4}[a-z]?/gi, '')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

export const isSubjectNameMatch = (nameA, nameB) => {
    if (!nameA || !nameB) return false;
    const ca = cleanSubjectName(nameA);
    const cb = cleanSubjectName(nameB);
    if (!ca || !cb) return false;
    const isLabA = ca.includes('lab') || ca.includes('practical');
    const isLabB = cb.includes('lab') || cb.includes('practical');
    if (isLabA !== isLabB) return false;
    if (ca === cb || ca.includes(cb) || cb.includes(ca)) return true;

    const wa = ca.split(' ').filter(w => w.length > 2);
    const wb = cb.split(' ').filter(w => w.length > 2);
    const common = wa.filter(w => wb.some(x => x.includes(w) || w.includes(x))).length;
    const minWords = Math.min(wa.length, wb.length);
    return minWords > 0 && common >= (minWords >= 3 ? minWords - 1 : minWords);
};

export const getCleanTitle = (title) => {
    if (!title) return 'Study Material';
    if (title.includes('/') && !title.includes(' ')) {
        const last = title.split('/').filter(Boolean).pop();
        if (last) {
            return last.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
    }
    return title;
};

const matchesCategory = (note, cat) => {
    if (!cat || cat === 'All') return true;
    const noteCat = (note.category || '').toLowerCase();
    const noteTitle = (note.title || '').toLowerCase();
    const target = cat.toLowerCase();

    if (noteCat === target) return true;

    if (cat === 'PYQ') {
        return noteCat.includes('pyq') ||
            noteCat.includes('question paper') ||
            noteTitle.includes('pyq') ||
            noteTitle.includes('question paper') ||
            Boolean(note.examType && note.examType.toLowerCase() !== 'mid-sem');
    }
    if (cat === 'Lab Manual') {
        return noteCat.includes('lab') ||
            noteCat.includes('manual') ||
            noteTitle.includes('lab') ||
            noteTitle.includes('experiment');
    }
    if (cat === 'Syllabus') {
        return noteCat.includes('syllabus') ||
            noteTitle.includes('syllabus');
    }
    if (cat === 'Lecture Plan') {
        return noteCat.includes('lecture') ||
            noteTitle.includes('lecture plan') ||
            noteTitle.includes('teaching plan');
    }
    if (cat === 'Links' || cat === 'Link') {
        return isLinkNote(note);
    }
    if (cat === 'Notes') {
        return !note.category ||
            noteCat.includes('note') ||
            noteCat === 'material' ||
            (!noteCat.includes('lab') && !noteCat.includes('syllabus') && !noteCat.includes('lecture') && !noteCat.includes('question') && !noteCat.includes('pyq'));
    }
    return false;
};

const NotesLibrary = ({ defaultTab = 'notes' }) => {
    const { profile, subjects, catalogSubjects: outletCatalogSubjects, notes, refreshData, setShowUpload } = useOutletContext();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || defaultTab);
    const [showLmsSync, setShowLmsSync] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedUnit, setSelectedUnit] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [pyqSearch, setPyqSearch] = useState('');
    const [pyqSubject, setPyqSubject] = useState('');
    const [pyqExam, setPyqExam] = useState('');

    const userRole = localStorage.getItem('eduvault_user_role') || (profile?.dob === 'TEACHER' ? 'teacher' : 'student');
    const isTeacher = userRole === 'teacher' || userRole === 'faculty' || userRole === 'admin';

    const studentDept = normalizeDept(profile?.department);
    const studentSem = normalizeSem(profile?.semester);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchParams(tab === 'notes' ? {} : { tab });
    };

    // Unified catalog pool of subjects for complete metadata
    const allKnownSubjects = useMemo(() => {
        const pool = (outletCatalogSubjects && outletCatalogSubjects.length > 0)
            ? outletCatalogSubjects
            : (subjects || []);
        const map = new Map();
        pool.forEach(s => {
            if (s && s.id) map.set(s.id, s);
        });
        (subjects || []).forEach(s => {
            if (s && s.id && !map.has(s.id)) map.set(s.id, s);
        });
        return Array.from(map.values());
    }, [outletCatalogSubjects, subjects]);

    // Subject resolution helper
    const resolveSubjectId = useCallback((note) => {
        if (!note) return null;
        if (note.subjectId) {
            if (allKnownSubjects.some(s => s.id === note.subjectId)) return note.subjectId;
            const matchedSub = allKnownSubjects.find(s =>
                (s.code && s.code.toLowerCase() === note.subjectId.toLowerCase()) ||
                (s.name && s.name.toLowerCase() === note.subjectId.toLowerCase())
            );
            if (matchedSub) return matchedSub.id;
        }
        if (note.title) {
            const match = allKnownSubjects.find(s =>
                (s.code && note.title.toLowerCase().includes(s.code.toLowerCase())) ||
                (s.name && note.title.toLowerCase().includes(s.name.toLowerCase()))
            );
            if (match) return match.id;
        }
        return null;
    }, [allKnownSubjects]);

    // Check if a subject has notes available (s.noteCount > 0 or has at least 1 note in notes array)
    const subjectHasNotes = useCallback((s) => {
        if (!s) return false;
        if (typeof s.noteCount === 'number' && s.noteCount > 0) return true;
        if (s.noteCount && Number(s.noteCount) > 0) return true;
        if (!notes || notes.length === 0) return false;
        return notes.some(note => {
            const resolvedId = resolveSubjectId(note);
            if (resolvedId && resolvedId === s.id) return true;
            if (note.subjectId && (note.subjectId === s.id || (s.code && note.subjectId.toLowerCase() === s.code.toLowerCase()))) return true;
            if (note.subjectName && s.name && note.subjectName.toLowerCase().trim() === s.name.toLowerCase().trim()) return true;
            if (note.subjectName && isSubjectNameMatch(note.subjectName, s.name)) return true;
            if (note.title && isSubjectNameMatch(note.title, s.name)) return true;
            if (note.fileUrl && isSubjectNameMatch(note.fileUrl, s.name)) return true;
            if (note.b2ObjectKey && isSubjectNameMatch(note.b2ObjectKey, s.name)) return true;
            if (s.code && (
                (note.title && note.title.toUpperCase().includes(s.code.toUpperCase())) ||
                (note.b2ObjectKey && note.b2ObjectKey.toUpperCase().includes(s.code.toUpperCase()))
            )) return true;
            return false;
        });
    }, [notes, resolveSubjectId]);

    // Subjects available for current user (filtered strictly to subjects with available notes)
    const availableSubjects = useMemo(() => {
        let baseList = [];
        if (isTeacher) {
            try {
                const saved = localStorage.getItem('eduvault_teacher_subjects');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const matched = allKnownSubjects.filter(s =>
                            parsed.includes(s.id) || parsed.includes(s.name) || parsed.includes(s.code)
                        );
                        if (matched.length > 0) baseList = matched;
                    }
                }
            } catch {
                /* ignore */
            }
            if (baseList.length === 0) baseList = allKnownSubjects;
        } else {
            if (subjects && subjects.length > 0) {
                baseList = subjects;
            } else {
                const catalogMatch = allKnownSubjects.filter(s => {
                    const d = normalizeDept(s.department);
                    const sem = normalizeSem(s.semester);
                    const csAllied = new Set(['AIDS', 'CSE', 'AIML']);
                    const deptOk = d === studentDept || (csAllied.has(studentDept) && csAllied.has(d));
                    return deptOk && sem === studentSem;
                });
                baseList = catalogMatch.length > 0 ? catalogMatch : (subjects || []);
            }
        }

        // Strictly show only current sem subjects that match student attendance
        if (!isTeacher) {
            const enrolled = subjects || [];
            // Order resolved subjects first, unresolved separate
            const resolved = enrolled.filter(s => s.id && !s.isUnresolved);
            const unresolved = enrolled.filter(s => s.isUnresolved || !s.id);
            return [...resolved, ...unresolved];
        }
        return baseList.filter(s => subjectHasNotes(s));
    }, [isTeacher, subjects, allKnownSubjects, profile, studentDept, studentSem, subjectHasNotes]);

    // Animated dummy loading states for opening and downloading notes
    const [openingNote, setOpeningNote] = useState(null);
    const [openProgress, setOpenProgress] = useState(0);
    const [downloadingNote, setDownloadingNote] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState(0);

    const handleOpenNote = (note) => {
        setOpeningNote(note);
        setOpenProgress(12);

        const interval = setInterval(() => {
            setOpenProgress(p => {
                if (p >= 92) {
                    clearInterval(interval);
                    return 95;
                }
                return p + Math.floor(Math.random() * 18 + 12);
            });
        }, 90);

        setTimeout(() => {
            clearInterval(interval);
            setOpenProgress(100);
            setTimeout(() => {
                navigate(`/notes/${note.id}`);
            }, 250);
        }, 550);
    };

    const handleDownloadNote = (e, note) => {
        e.stopPropagation();
        const downloadUrl = note?.fileUrl
            ? (note.fileUrl.startsWith('http') ? note.fileUrl : `${import.meta.env.VITE_API_BASE || '/api'}/files/raw/${note.fileUrl}`)
            : null;

        if (!downloadUrl) {
            handleOpenNote(note);
            return;
        }

        setDownloadingNote(note);
        setDownloadProgress(12);

        const interval = setInterval(() => {
            setDownloadProgress(p => {
                if (p >= 92) {
                    clearInterval(interval);
                    return 95;
                }
                return p + Math.floor(Math.random() * 15 + 10);
            });
        }, 110);

        setTimeout(() => {
            clearInterval(interval);
            setDownloadProgress(100);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = note.fileUrl ? note.fileUrl.split('/').pop() : `${note.title || 'document'}.pdf`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => {
                setDownloadingNote(null);
                setDownloadProgress(0);
            }, 500);
        }, 650);
    };

    // Subject selection state
    const [selectedSubject, setSelectedSubject] = useState(() => {
        return searchParams.get('subject') || '';
    });

    // Derive active subject ID: pick selected if in availableSubjects, else first available
    const activeSubjectId = useMemo(() => {
        if (!availableSubjects || availableSubjects.length === 0) return '';
        const match = availableSubjects.find(s => s.id === selectedSubject);
        return match ? match.id : availableSubjects[0].id;
    }, [availableSubjects, selectedSubject]);

    const activeSubjectObj = useMemo(() => {
        return availableSubjects.find(s => s.id === activeSubjectId) || null;
    }, [availableSubjects, activeSubjectId]);

    // Filter notes: ONLY display notes that match the selected subject. Other notes should not be visible.
    const displayNotes = useMemo(() => {
        if (!activeSubjectId) return [];
        return (notes || []).filter(note => {
            const resolvedId = resolveSubjectId(note);

            // 1. Match selected subject by canonical ID first, then canonical subject code
            const isMatch = resolvedId === activeSubjectId || note.subjectId === activeSubjectId ||
                (activeSubjectObj?.code && (
                    (note.b2ObjectKey && note.b2ObjectKey.toUpperCase().includes(activeSubjectObj.code.toUpperCase())) ||
                    (note.fileUrl && note.fileUrl.toUpperCase().includes(activeSubjectObj.code.toUpperCase()))
                ));
            if (!isMatch) return false;

            // 2. Unit & Category match
            if (selectedUnit !== 'all') {
                if (selectedUnit === 'cat:Lab Manual') {
                    if (!matchesCategory(note, 'Lab Manual')) return false;
                } else if (selectedUnit === 'cat:Other') {
                    if (normalizeUnit(note.unit) || matchesCategory(note, 'Lab Manual')) return false;
                } else if (normalizeUnit(note.unit) !== normalizeUnit(selectedUnit)) {
                    return false;
                }
            }

            // 3. Category match (Notes, PYQ, Syllabus, Lab Manual, Lecture Plan)
            if (!matchesCategory(note, selectedCategory)) {
                return false;
            }

            // 4. Search query match
            if (searchQuery.trim()) {
                const term = searchQuery.toLowerCase().trim();
                const titleMatch = (note.title || '').toLowerCase().includes(term);
                const unitMatch = (note.unit || '').toLowerCase().includes(term);
                if (!titleMatch && !unitMatch) return false;
            }

            return true;
        });
    }, [notes, activeSubjectId, selectedUnit, selectedCategory, searchQuery, resolveSubjectId]);

    const units = ['UNIT 01', 'UNIT 02', 'UNIT 03', 'UNIT 04', 'UNIT 05', 'UNIT 06'];

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-background text-slate-900 antialiased overflow-y-auto">
            {/* Animated Dummy Loading Bars for Opening & Downloading Notes */}
            {openingNote && (
                <DocumentLoadingBar
                    progress={openProgress}
                    message="Loading document..."
                    submessage={openingNote.title}
                />
            )}
            {downloadingNote && (
                <DocumentLoadingBar
                    progress={downloadProgress}
                    message="Downloading document..."
                    submessage={downloadingNote.title}
                />
            )}
            <main className="p-3.5 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto flex flex-col gap-5 pb-24 md:pb-12">

                {/* Page Header */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                    <div>
                        <span className="text-[10px] font-bold text-[#0073E6] uppercase tracking-wider block mb-0.5">
                            Academic Vault
                        </span>
                        <h1 className="text-xl sm:text-2xl font-bold text-[#383838] tracking-tight">Study Notes &amp; Question Papers</h1>
                        <p className="text-xs text-[#727272] mt-0.5">
                            Verified unit modules, lecture notes, and past examination papers
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {isTeacher && (
                            <button
                                onClick={() => setShowLmsSync(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] transition cursor-pointer"
                                title="Teacher access: Sync latest materials from Moodle LMS"
                            >
                                <RefreshCw className="w-3.5 h-3.5 text-[#0071E3]" />
                                <span>Sync Moodle</span>
                            </button>
                        )}
                        <button
                            onClick={() => setShowUpload(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-[#0073E6] hover:bg-[#174073] transition-all cursor-pointer shadow-2xs"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Material</span>
                        </button>
                    </div>
                </header>

                {/* Unified Control Console: Tabs, Search & Subject Filters */}
                <section className="bg-white border border-[#E2E2E2] rounded-xl p-3 sm:p-3.5 shadow-2xs space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        {/* Navigation Tabs */}
                        <FluidTabs
                            value={activeTab}
                            onChange={handleTabChange}
                            size="sm"
                            layoutId="notes-library-fluid-tabs"
                            className="bg-[#DEEDFC]/40 border-[#D9ECFF] shrink-0"
                            activeClassName="font-semibold text-[#0073E6]"
                            inactiveClassName="font-medium text-[#727272] hover:text-[#383838]"
                            indicatorClassName="absolute inset-0 rounded-full border border-[#D9ECFF] bg-white shadow-xs"
                            tabs={[
                                {
                                    id: 'notes',
                                    label: (
                                        <span className="inline-flex items-center gap-1.5">
                                            <span>Subject Notes</span>
                                            <span className={cn(
                                                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                                                activeTab === 'notes' ? "bg-[#DEEDFC] text-[#0073E6]" : "bg-slate-200/70 text-[#727272]"
                                            )}>
                                                {notes?.length || 0}
                                            </span>
                                        </span>
                                    ),
                                    icon: <BookOpen className="w-3.5 h-3.5" />
                                },
                                {
                                    id: 'pyqs',
                                    label: 'Previous Year Questions (PYQs)',
                                    icon: <GraduationCap className="w-3.5 h-3.5" />
                                }
                            ]}
                        />

                        {/* Search & Filters */}
                        {activeTab === 'notes' ? (
                            <div className="flex items-center gap-2 flex-1 lg:max-w-md w-full">
                                <div className="relative flex-1">
                                    <Search className="w-3.5 h-3.5 text-[#727272] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search notes, chapters, topics..."
                                        className="w-full pl-8 pr-3 py-1.5 text-xs text-[#383838] placeholder-[#727272] bg-[#F2F7FC] border border-[#E2E2E2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0073E6] focus:bg-white transition-all"
                                    />
                                </div>
                                <div className="relative shrink-0 w-28 sm:w-32">
                                    <select
                                        value={selectedUnit}
                                        onChange={(e) => setSelectedUnit(e.target.value)}
                                        className="w-full bg-[#F2F7FC] border border-[#E2E2E2] rounded-lg py-1.5 pl-3 pr-7 text-xs font-medium text-[#383838] focus:outline-none focus:ring-1 focus:ring-[#0073E6] focus:bg-white appearance-none cursor-pointer"
                                    >
                                        <option value="all">All</option>
                                        <option value="UNIT 01">Unit 1</option>
                                        <option value="UNIT 02">Unit 2</option>
                                        <option value="UNIT 03">Unit 3</option>
                                        <option value="UNIT 04">Unit 4</option>
                                        <option value="UNIT 05">Unit 5</option>
                                        <option value="UNIT 06">Unit 6</option>
                                        <option value="cat:Lab Manual">Lab</option>
                                        <option value="cat:Other">Other</option>
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-[#727272] pointer-events-none w-3.5 h-3.5" />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 flex-1 lg:max-w-lg w-full">
                                <div className="relative flex-1">
                                    <Search className="w-3.5 h-3.5 text-[#727272] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={pyqSearch}
                                        onChange={(e) => setPyqSearch(e.target.value)}
                                        placeholder="Search past question papers, subjects, years..."
                                        className="w-full pl-8 pr-3 py-1.5 text-xs text-[#383838] placeholder-[#727272] bg-[#F2F7FC] border border-[#E2E2E2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0073E6] focus:bg-white transition-all"
                                    />
                                </div>
                                <div className="relative shrink-0 w-36">
                                    <select
                                        value={pyqExam}
                                        onChange={(e) => setPyqExam(e.target.value)}
                                        className="w-full bg-[#F2F7FC] border border-[#E2E2E2] rounded-lg py-1.5 pl-3 pr-7 text-xs font-medium text-[#383838] focus:outline-none focus:ring-1 focus:ring-[#0073E6] focus:bg-white appearance-none cursor-pointer"
                                    >
                                        <option value="">All Exams</option>
                                        <option value="ESE">End Semester (ESE)</option>
                                        <option value="MSE">Mid Semester (MSE)</option>
                                        <option value="ISE">In-Sem (ISE)</option>
                                        <option value="UT-1">Unit Test 1 (UT-1)</option>
                                        <option value="UT-2">Unit Test 2 (UT-2)</option>
                                        <option value="Backlog">Backlog Exam</option>
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-[#727272] pointer-events-none w-3.5 h-3.5" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Integrated Subject Pills Row */}
                    <div className="pt-2.5 border-t border-[#E2E2E2] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        <span className="text-[10px] font-bold text-[#727272] uppercase tracking-wider mr-1 shrink-0">
                            Subject:
                        </span>
                        {activeTab === 'notes' ? (
                            availableSubjects.map(sub => (
                                <button
                                    key={sub.id}
                                    onClick={() => setSelectedSubject(sub.id)}
                                    className={cn(
                                        "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0",
                                        activeSubjectId === sub.id ? "bg-[#0073E6] text-white shadow-xs" : "bg-[#F2F7FC] border border-[#E2E2E2] text-[#383838] hover:bg-[#DEEDFC]/40 hover:border-[#0073E6]/40"
                                    )}
                                >
                                    {sub.name} {sub.code ? `(${sub.code})` : ''} {sub.isUnresolved ? '(Unresolved)' : ''}
                                </button>
                            ))
                        ) : (
                            <>
                                <button
                                    onClick={() => setPyqSubject('')}
                                    className={cn(
                                        "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0",
                                        !pyqSubject ? "bg-[#0073E6] text-white shadow-xs" : "bg-[#F2F7FC] border border-[#E2E2E2] text-[#383838] hover:bg-[#DEEDFC]/40 hover:border-[#0073E6]/40"
                                    )}
                                >
                                    All Subjects
                                </button>
                                {allKnownSubjects.map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => setPyqSubject(sub.id === pyqSubject ? '' : sub.id)}
                                        className={cn(
                                            "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0",
                                            pyqSubject === sub.id ? "bg-[#0073E6] text-white shadow-xs" : "bg-[#F2F7FC] border border-[#E2E2E2] text-[#383838] hover:bg-[#DEEDFC]/40 hover:border-[#0073E6]/40"
                                        )}
                                    >
                                        {sub.name} {sub.code ? `(${sub.code})` : ''}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>
                </section>

                {activeTab === 'pyqs' ? (
                    <PYQsDatabase 
                        embedded={true} 
                        searchQuery={pyqSearch}
                        setSearchQuery={setPyqSearch}
                        filterSubject={pyqSubject}
                        setFilterSubject={setPyqSubject}
                        filterExam={pyqExam}
                        setFilterExam={setPyqExam}
                    />
                ) : (
                    <>
                        {/* Direct Notes List Grid */}
                        {displayNotes.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-16">
                                {displayNotes.map((note) => {
                                    const rId = resolveSubjectId(note);
                                    const sub = allKnownSubjects.find(s => s.id === rId);
                                                                        const badgeLabel = getNoteBadge(note);
                                    const displayTitle = getCleanTitle(note.title);
                                    const categoryLabel = note.category || 'Notes';

                                    return (
                                        <div
                                            key={note.id}
                                            onClick={() => handleOpenNote(note)}
                                            className="bg-[linear-gradient(180deg,#FFFFFF_0px,#F2F7FC_120px)] border border-[#E2E2E2] hover:border-[#0073E6]/40 rounded-xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-xs"
                                        >
                                            <div className="space-y-3">
                                                {/* Top Row: Icon, File Type, Category, Unit */}
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-[#DEEDFC] text-[#0073E6] group-hover:bg-[#0073E6] group-hover:text-white shrink-0">
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#DEEDFC] text-[#174073] border border-[#D9ECFF] uppercase tracking-wider">
                                                            {badgeLabel}
                                                        </span>
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-[#727272] border border-[#E2E2E2]">
                                                            {categoryLabel}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#D9ECFF]/50 text-[#0073E6] border border-[#0073E6]/20">
                                                            {note.unit || "Unit 1"}
                                                        </span>
                                                        <ArrowUpRight className="w-3.5 h-3.5 text-[#727272] group-hover:text-[#0073E6] transition-colors" />
                                                    </div>
                                                </div>

                                                {/* Title & Metadata */}
                                                <div>
                                                    <h3 className="font-semibold text-xs text-[#383838] line-clamp-2 leading-snug group-hover:text-[#0073E6] transition-colors">
                                                        {displayTitle}
                                                    </h3>
                                                    <p className="text-[11px] text-[#727272] mt-0.5 truncate">
                                                        {sub?.name || 'Study Material'}
                                                    </p>
                                                    
                                                </div>
                                            </div>

                                            {/* Bottom Row: Date & Status */}
                                            <div className="pt-3 mt-3 border-t border-[#E2E2E2] flex items-center justify-between text-[10px] text-[#727272]">
                                                <span>
                                                    {note.createdAt
                                                        ? new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                                        : 'Recent'}
                                                </span>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => handleDownloadNote(e, note)}
                                                        className="p-1 rounded text-[#727272] hover:text-[#0073E6] hover:bg-[#DEEDFC] transition-colors cursor-pointer"
                                                        title="Download Note Document"
                                                        type="button"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        Ready
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-24 bg-white border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-6 shadow-xs">
                                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-4 text-slate-400">
                                    <Inbox className="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800">
                                    {activeSubjectObj
                                        ? `No notes found for ${activeSubjectObj.name}`
                                        : 'No study notes found'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 max-w-sm mb-6">
                                    No study notes match your filters. Upload new notes to expand your repository.
                                </p>
                                <div className="flex items-center gap-3">
                                    {isTeacher && (
                                        <button
                                            onClick={() => setShowLmsSync(true)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] transition cursor-pointer"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5 text-[#0071E3]" />
                                            <span>Sync Moodle</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowUpload(true)}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xs cursor-pointer"
                                    >
                                        <Upload className="w-3.5 h-3.5" />
                                        <span>Upload Notes</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* LMS Synchronization Modal */}
                <LmsSyncModal
                    isOpen={showLmsSync}
                    onClose={() => setShowLmsSync(false)}
                    onSyncComplete={refreshData}
                />
            </main>
        </div>
    );
};

export default NotesLibrary;

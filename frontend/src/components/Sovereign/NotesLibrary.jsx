import React, { useState, useMemo, useCallback } from 'react';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Search01Icon,
    Upload01Icon,
    Book02Icon,
    File02Icon,
    ArrowUpRight01Icon,
    RefreshIcon,
    InboxIcon,
    ArrowDown01Icon,
    Mortarboard01Icon,
    Download01Icon
} from 'hugeicons-react';
import { cn } from '../../lib/utils';
import DocumentLoadingBar from '../DocumentLoadingBar';
import LmsSyncModal from './LmsSyncModal';
import PYQsDatabase from './PYQsDatabase';
import { FluidTabs } from '../fluid-tabs';
import { DropdownDisclosure } from '../dropdown-disclosure';
import { isLinkNote, getNoteBadge, isSubjectNameMatch, getCleanTitle } from '../../lib/noteUtils';

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
    const [selectedCategory] = useState('All');
    const [selectedUnit, setSelectedUnit] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [pyqSearch, setPyqSearch] = useState('');
    const [pyqSubject, setPyqSubject] = useState('');
    const [pyqExam, setPyqExam] = useState('');
    const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);
    const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
    const [isPyqExamDropdownOpen, setIsPyqExamDropdownOpen] = useState(false);
    const [isPyqSubjectDropdownOpen, setIsPyqSubjectDropdownOpen] = useState(false);

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
                (s.code && s.code.length > 2 && s.code.toLowerCase() === note.subjectId.toLowerCase()) ||
                (s.name && s.name.toLowerCase() === note.subjectId.toLowerCase())
            );
            if (matchedSub) return matchedSub.id;
        }
        if (note.b2ObjectKey) {
            const folder = note.b2ObjectKey.split('/')[0];
            const matchedFolder = allKnownSubjects.find(s => {
                if (s.code && s.code.length > 2 && folder.toUpperCase().includes(s.code.toUpperCase())) return true;
                if (s.canonicalCode && s.canonicalCode.length > 2 && folder.toUpperCase().includes(s.canonicalCode.toUpperCase())) return true;
                return s.name && isSubjectNameMatch(folder, s.name);
            });
            if (matchedFolder) return matchedFolder.id;
        }
        if (note.subjectName) {
            const matchedName = allKnownSubjects.find(s => s.name && isSubjectNameMatch(note.subjectName, s.name));
            if (matchedName) return matchedName.id;
        }
        return null;
    }, [allKnownSubjects]);

    // Check if a subject has notes available (has at least 1 note in loaded notes array)
    const subjectHasNotes = useCallback((s) => {
        if (!s || !notes || notes.length === 0) return false;
        return notes.some(note => {
            const resolvedId = resolveSubjectId(note);
            if (resolvedId && resolvedId === s.id) return true;
            if (note.subjectId && (note.subjectId === s.id || (s.code && s.code.length > 2 && note.subjectId.toLowerCase() === s.code.toLowerCase()))) return true;
            if (note.subjectName && s.name && isSubjectNameMatch(note.subjectName, s.name)) return true;
            if (note.b2ObjectKey) {
                const folder = note.b2ObjectKey.split('/')[0];
                if (s.code && s.code.length > 2 && folder.toUpperCase().includes(s.code.toUpperCase())) return true;
                if (s.canonicalCode && s.canonicalCode.length > 2 && folder.toUpperCase().includes(s.canonicalCode.toUpperCase())) return true;
                if (s.name && isSubjectNameMatch(folder, s.name)) return true;
            }
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

        const candidateList = (!isTeacher && subjects && subjects.length > 0) ? subjects : baseList;
        return candidateList.filter(s => subjectHasNotes(s));
    }, [isTeacher, subjects, allKnownSubjects, studentDept, studentSem, subjectHasNotes]);

    // Animated dummy loading states for opening and downloading notes
    const [openingNote, setOpeningNote] = useState(null);
    const [openProgress, setOpenProgress] = useState(0);
    const [downloadingNote, setDownloadingNote] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState(0);

    const handleOpenNote = (note) => {
        navigate(`/notes/${note.id}`);
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

    const subjectDropdownItems = useMemo(() => {
        return (availableSubjects || []).map(s => ({
            id: s.id,
            name: s.name,
            description: s.code ? `Course Code: ${s.code}` : undefined,
        }));
    }, [availableSubjects]);

    const unitDropdownItems = useMemo(() => [
        { id: 'all', name: 'All Units' },
        { id: 'UNIT 01', name: 'Unit 1' },
        { id: 'UNIT 02', name: 'Unit 2' },
        { id: 'UNIT 03', name: 'Unit 3' },
        { id: 'UNIT 04', name: 'Unit 4' },
        { id: 'UNIT 05', name: 'Unit 5' },
        { id: 'UNIT 06', name: 'Unit 6' },
        { id: 'cat:Lab Manual', name: 'Lab Manual' },
        { id: 'cat:Other', name: 'Other Files' },
    ], []);

    const pyqExamDropdownItems = useMemo(() => [
        { id: '', name: 'All Exams' },
        { id: 'ESE', name: 'End Semester (ESE)' },
        { id: 'MSE', name: 'Mid Semester (MSE)' },
        { id: 'ISE', name: 'In-Sem (ISE)' },
        { id: 'UT-1', name: 'Unit Test 1 (UT-1)' },
        { id: 'UT-2', name: 'Unit Test 2 (UT-2)' },
        { id: 'Backlog', name: 'Backlog Exam' },
    ], []);

    const pyqSubjectDropdownItems = useMemo(() => {
        let list = [];
        if (isTeacher) {
            list = allKnownSubjects || subjects || [];
        } else {
            list = (subjects && subjects.length > 0) ? subjects : (availableSubjects || []);
            if (!list || list.length === 0) {
                try {
                    const saved = localStorage.getItem('eduvault_subjects');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
                    }
                } catch {
                    /* ignore */
                }
            }
        }
        const seen = new Set();
        const unique = [];
        (list || []).forEach(s => {
            if (s && s.id && !seen.has(s.id)) {
                seen.add(s.id);
                unique.push(s);
            }
        });
        return [
            { id: '', name: isTeacher ? 'All Subjects' : 'All My Subjects' },
            ...unique.map(s => ({
                id: s.id,
                name: s.name,
                description: s.code ? `Code: ${s.code}` : undefined,
            }))
        ];
    }, [isTeacher, allKnownSubjects, subjects, availableSubjects]);

    // Filter notes: ONLY display notes that match the selected subject. Other notes should not be visible.
    const displayNotes = useMemo(() => {
        if (!activeSubjectId) return [];
        return (notes || []).filter(note => {
            const resolvedId = resolveSubjectId(note);

            // 1. Strict match to selected subject
            const isMatch = resolvedId === activeSubjectId || note.subjectId === activeSubjectId ||
                (activeSubjectObj && (
                    (activeSubjectObj.code && activeSubjectObj.code.length > 2 && note.b2ObjectKey && (
                        note.b2ObjectKey.toUpperCase().includes(activeSubjectObj.code.toUpperCase())
                    )) ||
                    (activeSubjectObj.canonicalCode && activeSubjectObj.canonicalCode.length > 2 && note.b2ObjectKey && (
                        note.b2ObjectKey.toUpperCase().includes(activeSubjectObj.canonicalCode.toUpperCase())
                    )) ||
                    (activeSubjectObj.name && (
                        (note.subjectName && isSubjectNameMatch(note.subjectName, activeSubjectObj.name)) ||
                        (note.b2ObjectKey && isSubjectNameMatch(note.b2ObjectKey.split('/')[0], activeSubjectObj.name))
                    ))
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
    }, [notes, activeSubjectId, activeSubjectObj, selectedUnit, selectedCategory, searchQuery, resolveSubjectId]);



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
                                <RefreshIcon size={14} className="text-[#0071E3]" />
                                <span>Sync Moodle</span>
                            </button>
                        )}
                        <button
                            onClick={() => setShowUpload(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-[#0073E6] hover:bg-[#174073] transition-all cursor-pointer shadow-2xs"
                        >
                            <Upload01Icon size={14} />
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
                                    icon: <Book02Icon size={14} />
                                },
                                {
                                    id: 'pyqs',
                                    label: 'Previous Year Questions',
                                    icon: <Mortarboard01Icon size={14} />
                                }
                            ]}
                        />

                        {/* Search & Filters */}
                        {activeTab === 'notes' ? (
                            <div className="flex items-center gap-2 flex-1 lg:max-w-md w-full">
                                <div className="relative flex-1">
                                    <Search01Icon size={14} className="text-[#8E8E93] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search notes, chapters, topics..."
                                        className="w-full pl-8 pr-3 py-1.5 text-xs text-[#383838] placeholder-[#727272] bg-[#F2F7FC] border border-[#E2E2E2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0073E6] focus:bg-white transition-all"
                                    />
                                </div>
                                <div className="shrink-0">
                                    <DropdownDisclosure
                                        items={unitDropdownItems}
                                        selectedId={selectedUnit}
                                        onChange={(item) => setSelectedUnit(item.id)}
                                        isOpen={isUnitDropdownOpen}
                                        onOpenChange={setIsUnitDropdownOpen}
                                        title="Filter by Unit"
                                        compact
                                        placement="bottom"
                                        align="right"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 flex-1 lg:max-w-lg w-full">
                                <div className="relative flex-1">
                                    <Search01Icon size={14} className="text-[#8E8E93] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={pyqSearch}
                                        onChange={(e) => setPyqSearch(e.target.value)}
                                        placeholder="Search past question papers, subjects, years..."
                                        className="w-full pl-8 pr-3 py-1.5 text-xs text-[#383838] placeholder-[#727272] bg-[#F2F7FC] border border-[#E2E2E2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0073E6] focus:bg-white transition-all"
                                    />
                                </div>
                                <div className="shrink-0">
                                    <DropdownDisclosure
                                        items={pyqExamDropdownItems}
                                        selectedId={pyqExam}
                                        onChange={(item) => setPyqExam(item.id)}
                                        isOpen={isPyqExamDropdownOpen}
                                        onOpenChange={setIsPyqExamDropdownOpen}
                                        title="Filter by Exam"
                                        compact
                                        placement="bottom"
                                        align="right"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Integrated Subject Disclosure Row */}
                    <div className="pt-2.5 border-t border-[#E2E2E2] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-[#727272] uppercase tracking-wider shrink-0">
                                Subject:
                            </span>
                            {activeTab === 'notes' ? (
                                <DropdownDisclosure
                                    items={subjectDropdownItems}
                                    selectedId={activeSubjectId}
                                    onChange={(item) => setSelectedSubject(item.id)}
                                    isOpen={isSubjectDropdownOpen}
                                    onOpenChange={setIsSubjectDropdownOpen}
                                    title="Choose Subject"
                                    compact={false}
                                    placement="bottom"
                                />
                            ) : (
                                <DropdownDisclosure
                                    items={pyqSubjectDropdownItems}
                                    selectedId={pyqSubject}
                                    onChange={(item) => setPyqSubject(item.id)}
                                    isOpen={isPyqSubjectDropdownOpen}
                                    onOpenChange={setIsPyqSubjectDropdownOpen}
                                    title="Choose Subject"
                                    compact={false}
                                    placement="bottom"
                                />
                            )}
                        </div>
                        {activeSubjectObj?.code && (
                            <span className="text-xs text-[#8E8E93] font-mono hidden sm:inline">
                                {activeSubjectObj.code}
                            </span>
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
                        {/* Subject Vault Header (Clean, minimal, content-first) */}
                        {activeSubjectObj && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl shadow-xs">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] flex items-center justify-center text-[#1D1D1F] dark:text-white shrink-0">
                                        <Book02Icon size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-sm font-semibold text-[#1D1D1F] dark:text-white">{activeSubjectObj.name}</h2>
                                            {activeSubjectObj.code && (
                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#AEAEB2] border border-[#E5E5EA] dark:border-[#2C2C2E]">
                                                    {activeSubjectObj.code}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-[#6E6E73] dark:text-[#AEAEB2] mt-0.5">
                                            {displayNotes.length} materials in this vault
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Direct Notes List Grid - Sleek, Compact & Responsive */}
                        {displayNotes.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-16">
                                {displayNotes.map((note) => {
                                    const rId = resolveSubjectId(note);
                                    const sub = allKnownSubjects.find(s => s.id === rId);
                                    const badgeLabel = getNoteBadge(note);
                                    const displayTitle = getCleanTitle(note.title);

                                    return (
                                        <div
                                            key={note.id}
                                            onClick={() => handleOpenNote(note)}
                                            className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] hover:border-[#0071E3]/50 dark:hover:border-[#0071E3]/60 rounded-xl p-3.5 transition-all duration-150 cursor-pointer flex flex-col justify-between group shadow-2xs hover:shadow-xs active:scale-[0.99]"
                                        >
                                            <div>
                                                {/* Header: Icon, Unit Pill, Format */}
                                                <div className="flex items-center justify-between gap-1.5 mb-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#0071E3] flex items-center justify-center shrink-0">
                                                        <File02Icon size={15} />
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className="text-[10px] font-semibold text-[#0071E3] dark:text-[#5AC8FA] bg-[#DEEDFC]/70 dark:bg-blue-950/40 px-2 py-0.5 rounded-md">
                                                            {note.unit || "Unit 1"}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-[#8E8E93] uppercase tracking-wider">
                                                            {badgeLabel}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Title & Subject */}
                                                <div>
                                                    <h3 className="font-semibold text-xs text-[#1D1D1F] dark:text-white line-clamp-2 leading-snug group-hover:text-[#0071E3] transition-colors">
                                                        {displayTitle}
                                                    </h3>
                                                    <p className="text-[11px] text-[#8E8E93] mt-1 truncate">
                                                        {sub?.name || 'Study Material'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Bottom Footer: Date & Download */}
                                            <div className="pt-2.5 mt-2.5 border-t border-[#F2F2F7] dark:border-[#2C2C2E] flex items-center justify-between text-[10px] text-[#8E8E93]">
                                                <span>
                                                    {note.createdAt
                                                        ? new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                                                        : 'Recent'}
                                                </span>

                                                <button
                                                    onClick={(e) => handleDownloadNote(e, note)}
                                                    className="p-1 rounded-md text-[#8E8E93] hover:text-[#0071E3] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                                    title="Download Document"
                                                    type="button"
                                                >
                                                    <Download01Icon size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-24 bg-white border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-6 shadow-xs">
                                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-4 text-slate-400">
                                    <InboxIcon size={24} className="text-[#8E8E93]" />
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
                    availableSubjects={allKnownSubjects || subjects || []}
                />
            </main>
        </div>
    );
};

export default NotesLibrary;

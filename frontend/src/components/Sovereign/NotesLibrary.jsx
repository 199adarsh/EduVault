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
    if (!dept) return 'AIDS';
    const upper = dept.toUpperCase();
    if (upper.includes('UAD') || upper.includes('AIDS') || upper.includes('AI&DS') || upper.includes('AI & DS') || upper.includes('ARTIFICIAL')) return 'AIDS';
    if (upper.includes('CSE') || upper.includes('COMPUTER')) return 'CSE';
    if (upper.includes('ECE') || upper.includes('ELECTRONIC')) return 'ECE';
    if (upper.includes('MECH')) return 'MECH';
    if (upper.includes('CIVIL')) return 'CIVIL';
    return upper.replace(/[^A-Z0-9]/g, '');
};

const normalizeSem = (sem) => {
    if (!sem) return 'S05';
    const m = sem.toString().match(/(?:sem|semester|s)?\s*0?([1-8])/i);
    return m ? `S0${m[1]}` : sem.toString().toUpperCase().trim();
};

const normalizeUnit = (u) => (u || '').toString().toLowerCase().replace(/[^0-9]/g, '');

// Core 4-5 categories for filtering
const CORE_CATEGORIES = [
    { id: 'All', label: 'All' },
    { id: 'Notes', label: 'Notes' },
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
            if (note.title && s.name && note.title.toLowerCase().includes(s.name.toLowerCase())) return true;
            if (note.title && s.code && note.title.toLowerCase().includes(s.code.toLowerCase())) return true;
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
            const enrolled = (subjects || []).filter(s => {
                const d = normalizeDept(s.department || profile?.department);
                const sem = normalizeSem(s.semester || profile?.semester);
                return d === studentDept && sem === studentSem;
            });

            if (enrolled.length > 0) {
                baseList = enrolled;
            } else {
                const catalogMatch = allKnownSubjects.filter(s =>
                    normalizeDept(s.department) === studentDept &&
                    normalizeSem(s.semester) === studentSem
                );
                baseList = catalogMatch.length > 0 ? catalogMatch : (subjects || []);
            }
        }

        // Strictly include subjects that actually have notes. Do not display subjects with 0 notes.
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

            // 1. Strictly match the selected subject. Other notes are NOT visible!
            const isMatch = resolvedId === activeSubjectId || note.subjectId === activeSubjectId;
            if (!isMatch) return false;

            // 2. Unit match
            if (selectedUnit !== 'all') {
                if (normalizeUnit(note.unit) !== normalizeUnit(selectedUnit)) {
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
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 tracking-wide mb-1">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <span className="uppercase tracking-wider text-[11px]">Subject Notes • Backblaze B2</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Study Notes &amp; Resources</h1>
                        <p className="text-xs font-normal text-slate-500 mt-0.5">
                            Browse notes categorized by subject, study units, and material type
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {isTeacher && (
                            <button
                                onClick={() => setShowLmsSync(true)}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-xs cursor-pointer"
                                title="Teacher access: Sync latest materials from Moodle LMS"
                            >
                                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                                <span>Sync Moodle / LMS</span>
                            </button>
                        )}
                        <button
                            onClick={() => setShowUpload(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all shadow-xs cursor-pointer"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Notes</span>
                        </button>
                    </div>
                </header>

                {/* Sub-navigation tabs: Notes & PYQs */}
                <div className="border-b border-slate-200/80 pb-3 overflow-x-auto no-scrollbar">
                    <FluidTabs
                        value={activeTab}
                        onChange={handleTabChange}
                        size="sm"
                        layoutId="notes-library-tabs"
                        tabs={[
                            {
                                id: 'notes',
                                label: `Subject Notes (${notes?.length || 0})`,
                                icon: <BookOpen className="w-3.5 h-3.5 mr-1" />
                            },
                            {
                                id: 'pyqs',
                                label: 'Previous Year Questions (PYQs)',
                                icon: <GraduationCap className="w-3.5 h-3.5 mr-1" />
                            }
                        ]}
                    />
                </div>

                {activeTab === 'pyqs' ? (
                    <PYQsDatabase embedded={true} />
                ) : (
                    <>
                        {/* Search & Filters Bar */}
                        <section className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs flex flex-col md:flex-row items-center gap-3">
                            <div className="relative flex-1 w-full">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <Search className="w-4 h-4 text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search notes, chapters, topics, or subjects..."
                                    className="w-full pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                {/* Subject Dropdown */}
                                <div className="relative flex-1 md:w-56">
                                    <select
                                        value={activeSubjectId}
                                        onChange={(e) => setSelectedSubject(e.target.value)}
                                        className="w-full bg-slate-50/50 border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                    >
                                        {availableSubjects.length === 0 ? (
                                            <option value="" disabled>No subjects with notes available</option>
                                        ) : (
                                            availableSubjects.map(sub => (
                                                <option key={sub.id} value={sub.id}>
                                                    {sub.name} {sub.code ? `(${sub.code})` : ''}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-3.5 h-3.5" />
                                </div>

                                {/* Unit Dropdown */}
                                <div className="relative flex-1 md:w-36">
                                    <select
                                        value={selectedUnit}
                                        onChange={(e) => setSelectedUnit(e.target.value)}
                                        className="w-full bg-slate-50/50 border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="all">All Units</option>
                                        {units.map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-3.5 h-3.5" />
                                </div>
                            </div>
                        </section>

                        {/* Subject Selection Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                                Subject:
                            </span>
                            {availableSubjects.length === 0 ? (
                                <span className="text-xs text-slate-400 italic px-2">No subjects with notes available</span>
                            ) : (
                                availableSubjects.map(sub => {
                                    const isSelected = activeSubjectId === sub.id;
                                    return (
                                        <button
                                            key={sub.id}
                                            onClick={() => setSelectedSubject(sub.id)}
                                            className={cn(
                                                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0",
                                                isSelected
                                                    ? "bg-blue-600 text-white shadow-xs"
                                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                            )}
                                        >
                                            {sub.name} {sub.code ? `(${sub.code})` : ''}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Category Filter Pills (Core 5 Categories) */}


                        {/* Active Filter State Header */}


                        {/* Direct Notes List Grid */}
                        {displayNotes.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-16">
                                {displayNotes.map((note) => {
                                    const rId = resolveSubjectId(note);
                                    const sub = allKnownSubjects.find(s => s.id === rId);
                                    const fileExt = (note.fileUrl?.split('.').pop() || 'PDF').toUpperCase();
                                    const categoryLabel = note.category || 'Notes';

                                    return (
                                        <div
                                            key={note.id}
                                            onClick={() => handleOpenNote(note)}
                                            className="bg-white border rounded-xl p-4.5 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-xs hover:shadow-md border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/10"
                                        >
                                            <div className="space-y-3">
                                                {/* Top Row: Icon, File Type, Category, Unit */}
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white shrink-0">
                                                            <FileText className="w-4 h-4" />
                                                        </div>
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-tight">
                                                            {fileExt}
                                                        </span>
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-tight">
                                                            {categoryLabel}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                                            {note.unit || "Unit 1"}
                                                        </span>
                                                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                                                    </div>
                                                </div>

                                                {/* Title & Metadata */}
                                                <div>
                                                    <h3 className="font-semibold text-xs text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                                                        {note.title}
                                                    </h3>
                                                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                                                        {sub?.name || 'Study Material'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Bottom Row: Date & Status */}
                                            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                                                <span>
                                                    {note.createdAt
                                                        ? new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                                        : 'Recent'}
                                                </span>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => handleDownloadNote(e, note)}
                                                        className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
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
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all shadow-xs cursor-pointer"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            <span>Sync Moodle / LMS</span>
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

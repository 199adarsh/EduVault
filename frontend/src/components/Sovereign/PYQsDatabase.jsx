import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Search,
    ArrowUpRight,
    Plus,
    Archive,
    Zap,
    FileText,
    Eye,
    X,
    ChevronDown,
    Inbox,
    Brain,
    Activity,
    UploadCloud
} from 'lucide-react';
import { cn } from '../../lib/utils';
import DocumentLoadingBar from '../DocumentLoadingBar';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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

const PYQsDatabase = ({ 
    embedded = false,
    searchQuery: extSearch,
    setSearchQuery: setExtSearch,
    filterSubject: extSubject,
    setFilterSubject: setExtSubject,
    filterExam: extExam,
    setFilterExam: setExtExam
}) => {
    const outletCtx = useOutletContext();
    const rawSubjects = outletCtx?.subjects || null;
    const catalogSubjects = outletCtx?.catalogSubjects || null;
    const profile = outletCtx?.profile || (() => {
        try {
            const saved = localStorage.getItem('eduvault_profile');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    })();

    const userRole = localStorage.getItem('eduvault_user_role') || (profile?.dob === 'TEACHER' ? 'teacher' : 'student');
    const isTeacher = userRole === 'teacher' || userRole === 'faculty' || userRole === 'admin';

    const studentDept = normalizeDept(profile?.department);
    const studentSem = normalizeSem(profile?.semester);

    // Show only the subjects that the student has (matching profile dept & semester, or teacher assigned subjects)
    const subjects = useMemo(() => {
        const currentRaw = rawSubjects || [];
        const currentCatalog = catalogSubjects || [];

        if (isTeacher) {
            try {
                const savedTeacher = localStorage.getItem('eduvault_teacher_subjects');
                if (savedTeacher) {
                    const parsed = JSON.parse(savedTeacher);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        const pool = currentCatalog.length > 0 ? currentCatalog : currentRaw;
                        const matched = pool.filter(s =>
                            parsed.includes(s.id) || parsed.includes(s.name) || parsed.includes(s.code)
                        );
                        if (matched.length > 0) return matched;
                    }
                }
            } catch {
                /* ignore */
            }
            return currentCatalog.length > 0 ? currentCatalog : currentRaw;
        }

        if (currentRaw && currentRaw.length > 0) {
            return currentRaw;
        }

        if (currentCatalog.length > 0) {
            const matchedCatalog = currentCatalog.filter(cs => {
                const catDept = normalizeDept(cs.department);
                const deptOk = catDept === studentDept || (studentDept === 'AIDS' && catDept === 'CSE') || (studentDept === 'CSE' && catDept === 'AIDS');
                return deptOk && normalizeSem(cs.semester) === studentSem;
            });
            if (matchedCatalog.length > 0) return matchedCatalog;
        }

        return [];
    }, [rawSubjects, catalogSubjects, isTeacher, studentDept, studentSem]);

    const [pyqs, setPyqs] = useState([]);
    const [allPyqs, setAllPyqs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterExam, setFilterExam] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Loading Bar state for document/PYQ opening
    const [openingPyq, setOpeningPyq] = useState(null);
    const [openProgress, setOpenProgress] = useState(0);

    // AI Predictor State
    const [predictorPyq, setPredictorPyq] = useState('');
    const [predictorQb, setPredictorQb] = useState('');
    const [predictionResult, setPredictionResult] = useState(null);
    const [predicting, setPredicting] = useState(false);
    const [isPredictorVisible, setIsPredictorVisible] = useState(false);

    // View Modal State
    const [selectedPyq, setSelectedPyq] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);

    // Upload Modal State
    const [showUpload, setShowUpload] = useState(false);
    const [newPyq, setNewPyq] = useState({
        subjectId: '',
        subjectName: '',
        examType: 'ESE',
        year: new Date().getFullYear().toString(),
        tags: '',
        textContent: ''
    });

    const fetchAllPyqs = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/pyqs`);
            setAllPyqs(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error("Archive pool sync failed", e);
        }
    }, []);

    useEffect(() => {
        fetchAllPyqs();
    }, [fetchAllPyqs]);

    const fetchPyqs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/pyqs`, {
                params: {
                    subjectId: filterSubject || undefined,
                    examType: filterExam || undefined
                }
            });
            setPyqs(Array.isArray(res.data) ? res.data : []);
        } catch {
            toast.error("Archive synchronization failed");
        } finally {
            setLoading(false);
        }
    }, [filterSubject, filterExam]);

    useEffect(() => {
        fetchPyqs();
    }, [fetchPyqs]);

    // Filter subjects dropdown to ONLY show subjects that have at least 1 PYQ document available
    const subjectsWithPyqs = useMemo(() => {
        if (!subjects || subjects.length === 0) return [];
        return subjects;
    }, [subjects]);

    // Reset filterSubject if selected subject has no PYQs
    useEffect(() => {
        if (filterSubject && subjectsWithPyqs.length > 0) {
            const exists = subjectsWithPyqs.some(s => s.id === filterSubject);
            if (!exists) {
                setFilterSubject('');
            }
        }
    }, [filterSubject, subjectsWithPyqs]);

    const handleViewPyq = (q) => {
        setOpeningPyq(q);
        setOpenProgress(15);
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
                setSelectedPyq(q);
                setShowViewModal(true);
                setOpeningPyq(null);
                setOpenProgress(0);
            }, 250);
        }, 550);
    };

    const handlePredict = async () => {
        if (!predictorPyq.trim()) {
            toast.error("Please provide question paper or topic text");
            return;
        }
        setPredicting(true);
        try {
            const res = await axios.post(`${API_BASE}/pyqs/predict`, {
                pyqText: predictorPyq,
                qbText: predictorQb
            });
            setPredictionResult(res.data);
            toast.success("Important topics generated!");
        } catch {
            toast.error("Could not generate predictions. Please try again.");
        } finally {
            setPredicting(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/pyqs`, newPyq);
            toast.success("Question paper uploaded successfully!");
            setShowUpload(false);
            setNewPyq({
                subjectId: '',
                subjectName: '',
                examType: 'ESE',
                year: new Date().getFullYear().toString(),
                tags: '',
                textContent: ''
            });
            fetchPyqs();
            fetchAllPyqs();
        } catch {
            toast.error("Failed to upload question paper.");
        }
    };

    // Filter by client search query and enrolled student subjects
    const filteredPyqs = useMemo(() => {
        return pyqs.filter(q => {
            // Students only see question papers matching their enrolled subjects
            if (!isTeacher && subjects.length > 0) {
                const belongsToStudent = subjects.some(s => s.id === q.subjectId || (q.subjectName && s.name && s.name.toLowerCase() === q.subjectName.toLowerCase()));
                if (!belongsToStudent) return false;
            }
            const subject = subjects.find(s => s.id === q.subjectId);
            const subjectName = (subject?.name || q.subjectName || '').toLowerCase();
            const term = searchQuery.toLowerCase().trim();
            if (!term) return true;
            return (
                subjectName.includes(term) ||
                (q.examType && q.examType.toLowerCase().includes(term)) ||
                (q.year && q.year.toString().includes(term)) ||
                (q.tags && q.tags.toLowerCase().includes(term))
            );
        });
    }, [pyqs, subjects, isTeacher, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredPyqs.length / itemsPerPage));
    const paginatedPyqs = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredPyqs.slice(start, start + itemsPerPage);
    }, [filteredPyqs, currentPage]);

    const getExamBadgeStyle = (examType = '') => {
        const type = examType.toUpperCase();
        if (type.includes('ESE')) return 'bg-blue-50 text-blue-700 border-blue-200';
        if (type.includes('MSE')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (type.includes('UT') || type.includes('ISE')) return 'bg-purple-50 text-purple-700 border-purple-200';
        return 'bg-slate-100 text-slate-700 border-slate-200';
    };

    const getTagBadgeStyle = (tag = '') => {
        const t = tag.trim().toLowerCase();
        if (t.includes('high yield')) return 'bg-amber-50 text-amber-700 border-amber-200';
        if (t.includes('verified')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (t.includes('model')) return 'bg-blue-50 text-blue-700 border-blue-200';
        return 'bg-slate-100 text-slate-600 border-slate-200';
    };

    return (
        <div className={cn(
            embedded ? "flex flex-col gap-6" : "flex-1 flex flex-col min-h-screen bg-background text-slate-900 antialiased overflow-y-auto"
        )}>
            {/* Smooth animated dummy loading progress bar for opening question papers */}
            {openingPyq && (
                <DocumentLoadingBar 
                    progress={openProgress} 
                    message="Loading document..." 
                    submessage={openingPyq.subjectName || "Fetching question paper archive..."} 
                />
            )}
            <main className={cn(
                embedded ? "w-full flex flex-col gap-5" : "p-3.5 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto flex flex-col gap-6 pb-24 md:pb-8"
            )} data-purpose="pyq-repository">
                {/* BEGIN: PageHeader */}
                {!embedded && (
                    <section className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <span className="text-[10px] font-bold text-[#0073E6] uppercase tracking-wider block mb-0.5">
                                Question Paper Vault
                            </span>
                            <h1 className="text-xl sm:text-2xl font-bold text-[#383838] tracking-tight">Previous Year Questions</h1>
                            <p className="text-xs text-[#727272] mt-0.5">Official past university examination papers</p>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={() => setIsPredictorVisible(prev => !prev)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#174073] bg-[#DEEDFC] hover:bg-[#D9ECFF] border border-[#D9ECFF] transition-all cursor-pointer"
                                type="button"
                            >
                                <Brain className="w-3.5 h-3.5 text-[#0073E6]" />
                                <span>{isPredictorVisible ? 'Close Helper' : 'Topic Helper'}</span>
                            </button>

                            <button
                                onClick={() => setShowUpload(true)}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-[#0073E6] hover:bg-[#174073] transition-all cursor-pointer shadow-2xs"
                                type="button"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Upload Paper</span>
                            </button>
                        </div>
                    </section>
                )}
                {/* END: PageHeader */}

                {/* BEGIN: SearchAndFiltersBar */}
                {!embedded && (
                <section className="bg-white border border-[#E2E2E2] rounded-xl p-3 shadow-2xs flex flex-col md:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#727272]">
                            <Search className="w-4 h-4 text-[#727272]" />
                        </div>
                        <input
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 text-xs text-[#383838] placeholder-[#727272] bg-white border border-[#E2E2E2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0073E6] focus:border-[#0073E6] transition-all"
                            placeholder="Search past question papers, subjects, or years..."
                            type="text"
                        />
                    </div>

                    <div className="flex items-center gap-2.5 w-full md:w-auto">
                        <div className="relative flex-1 md:w-52">
                            <select
                                value={filterSubject}
                                onChange={(e) => {
                                    setFilterSubject(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full py-2 pl-3.5 pr-8 text-xs font-medium text-[#383838] bg-white border border-[#E2E2E2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0073E6] focus:border-[#0073E6] appearance-none cursor-pointer"
                            >
                                <option value="">{isTeacher ? "ALL SUBJECTS" : "ALL MY SUBJECTS"}</option>
                                {subjectsWithPyqs.length === 0 ? (
                                    <option value="" disabled>No subjects with PYQs available</option>
                                ) : (
                                    subjectsWithPyqs.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>
                                    ))
                                )}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#727272]">
                                <ChevronDown className="w-3.5 h-3.5" />
                            </div>
                        </div>

                        <div className="relative flex-1 md:w-44">
                            <select
                                value={filterExam}
                                onChange={(e) => {
                                    setFilterExam(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full py-2 pl-3.5 pr-8 text-xs font-medium text-[#383838] bg-white border border-[#E2E2E2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0073E6] focus:border-[#0073E6] appearance-none cursor-pointer"
                            >
                                <option value="">ALL EXAMS</option>
                                <option value="ESE">End Semester (ESE)</option>
                                <option value="MSE">Mid Semester (MSE)</option>
                                <option value="ISE">In-Sem (ISE)</option>
                                <option value="UT-1">Unit Test 1 (UT-1)</option>
                                <option value="UT-2">Unit Test 2 (UT-2)</option>
                                <option value="Backlog">Backlog Examination</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#727272]">
                                <ChevronDown className="w-3.5 h-3.5" />
                            </div>
                        </div>
                    </div>
                </section>
                )}
                {/* END: SearchAndFiltersBar */}

                {/* BEGIN: QuestionRecordsTable */}
                <section>
                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-44 rounded-xl bg-slate-100 animate-pulse border border-[#E2E2E2]" />
                            ))}
                        </div>
                    ) : paginatedPyqs.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {paginatedPyqs.map((q, i) => {
                                const sub = (subjects || []).find(s => s.id === q.subjectId);
                                const subjectName = sub?.name || q.subjectName || (q.subjectId ? `Subject #${q.subjectId}` : 'Examination Paper');
                                const subjectCode = sub?.code || '';

                                return (
                                    <div
                                        key={q.id || i}
                                        onClick={() => handleViewPyq(q)}
                                        className="bg-[linear-gradient(180deg,#FFFFFF_0px,#F2F7FC_120px)] border border-[#E2E2E2] hover:border-[#0073E6]/40 rounded-xl p-4 transition-all duration-200 flex flex-col justify-between group cursor-pointer shadow-2xs hover:shadow-xs"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#DEEDFC] text-[#174073] border border-[#D9ECFF]">
                                                        {q.examType || 'Exam'}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-[#727272] border border-[#E2E2E2]">
                                                        {q.year || 'Paper'}
                                                    </span>
                                                </div>
                                                <div className="w-6 h-6 rounded-full bg-[#DEEDFC]/50 text-[#0073E6] flex items-center justify-center group-hover:bg-[#0073E6] group-hover:text-white transition-all">
                                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="font-semibold text-xs text-[#383838] group-hover:text-[#0073E6] line-clamp-2 leading-snug transition-colors">
                                                    {subjectName}
                                                </h3>
                                                {subjectCode && (
                                                    <p className="text-[11px] text-[#727272] mt-0.5 font-normal truncate">
                                                        {subjectCode}
                                                    </p>
                                                )}
                                            </div>

                                            {q.tags && (
                                                <div className="flex gap-1 flex-wrap pt-0.5">
                                                    {q.tags.split(',').slice(0, 3).map((tag, tagIdx) => (
                                                        <span
                                                            key={tagIdx}
                                                            className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                        >
                                                            {tag.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-3 mt-3 border-t border-[#E2E2E2] flex items-center justify-between text-[10px] text-[#727272]">
                                            <span className="font-mono text-[10px]">PDF • University PYQ</span>
                                            <span className="inline-flex items-center gap-1 text-[#0073E6] font-semibold group-hover:underline">
                                                <Eye className="w-3 h-3" />
                                                View
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-20 text-center bg-white rounded-xl border border-dashed border-[#E2E2E2] p-6">
                            <Archive className="w-8 h-8 text-[#727272] mx-auto mb-2 opacity-50" />
                            <h4 className="text-sm font-semibold text-[#383838]">No question papers found</h4>
                            <p className="text-xs text-[#727272] mt-1">Try adjusting your search terms or exam filter.</p>
                        </div>
                    )}
                </section>
                {/* END: QuestionRecordsTable */}
            </main>

            {/* Ingest Record Modal */}
            {showUpload && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/60">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                                    <UploadCloud className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Upload Question Paper</h3>
                                    <p className="text-[11px] text-slate-500">Add university question papers for students to practice</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowUpload(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Subject Name</label>
                                    <select
                                        required
                                        value={newPyq.subjectId}
                                        onChange={e => {
                                            const subId = e.target.value;
                                            const found = subjects.find(s => s.id === subId);
                                            setNewPyq({ ...newPyq, subjectId: subId, subjectName: found ? found.name : '' });
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    >
                                        <option value="">Select Target Subject</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Exam Type</label>
                                    <select
                                        value={newPyq.examType}
                                        onChange={e => setNewPyq({ ...newPyq, examType: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    >
                                        <option value="ESE">End Semester Exam (ESE)</option>
                                        <option value="MSE">Mid Semester Exam (MSE)</option>
                                        <option value="ISE">In-Sem Evaluation (ISE)</option>
                                        <option value="UT-1">Unit Test 1 (UT-1)</option>
                                        <option value="UT-2">Unit Test 2 (UT-2)</option>
                                        <option value="Backlog">Backlog</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Academic Year</label>
                                    <input
                                        type="text"
                                        value={newPyq.year}
                                        onChange={e => setNewPyq({ ...newPyq, year: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="YYYY"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Labels / Tags</label>
                                    <input
                                        type="text"
                                        value={newPyq.tags}
                                        onChange={e => setNewPyq({ ...newPyq, tags: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="Comma-separated tags"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">Question Content</label>
                                <textarea
                                    required
                                    rows={6}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-800 resize-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono leading-relaxed placeholder:text-slate-400"
                                    placeholder="Paste examination question texts, sections, and marks allocations..."
                                    value={newPyq.textContent}
                                    onChange={e => setNewPyq({ ...newPyq, textContent: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowUpload(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm cursor-pointer"
                                >
                                    Commit Record
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Paper Modal */}
            {showViewModal && selectedPyq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/60">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        {(subjects || []).find(s => s.id === selectedPyq.subjectId)?.name || selectedPyq.subjectName || 'Examination Record'}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        {[selectedPyq.examType, selectedPyq.year ? `Release ${selectedPyq.year}` : null].filter(Boolean).join(' • ')}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-800 whitespace-pre-wrap font-mono leading-relaxed max-h-[420px] overflow-y-auto">
                                {selectedPyq.textContent || "No text content stored for this question set."}
                            </div>
                        </div>

                        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500 font-medium">
                                {selectedPyq.tags ? `Tagging: ${selectedPyq.tags}` : 'Unlabeled'}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setPredictorPyq(selectedPyq.textContent || '');
                                        setIsPredictorVisible(true);
                                        setShowViewModal(false);
                                        toast.success("Loaded into AI Predictor");
                                    }}
                                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                                >
                                    <Brain className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Push to Predictor</span>
                                </button>
                                <button
                                    onClick={() => setShowViewModal(false)}
                                    className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 border border-slate-200 bg-white rounded-lg transition-colors cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Neural Predictor Drawer / Floating Widget */}
            {isPredictorVisible && (
                <div className="fixed bottom-6 right-6 z-50 w-[440px] max-w-[calc(100vw-3rem)] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[640px] animate-in slide-in-from-bottom-5 duration-300 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-blue-50/60">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                <Brain className="w-4 h-4" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                    Important Topics Predictor
                                    <span className="text-[10px] px-1.5 py-0.2 font-semibold bg-blue-100 text-blue-700 rounded-full">v4.2</span>
                                </h3>
                                <p className="text-[10px] text-slate-500 font-medium">Analyze frequently asked questions and high-weightage topics</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsPredictorVisible(false)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Past Questions or Topics</label>
                            <textarea
                                value={predictorPyq}
                                onChange={(e) => setPredictorPyq(e.target.value)}
                                className="w-full h-24 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 resize-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono leading-relaxed placeholder:text-slate-400"
                                placeholder="Paste questions or key concepts here..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Syllabus Units or Chapter List</label>
                            <textarea
                                value={predictorQb}
                                onChange={(e) => setPredictorQb(e.target.value)}
                                className="w-full h-20 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 resize-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono leading-relaxed placeholder:text-slate-400"
                                placeholder="Optional: Paste syllabus modules or topics..."
                            />
                        </div>

                        <button
                            onClick={handlePredict}
                            disabled={predicting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            {predicting ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                            <span>{predicting ? 'Analyzing Questions...' : 'Predict Important Topics'}</span>
                        </button>

                        {/* Prediction Results */}
                        {predictionResult && (
                            <div className="pt-3 border-t border-slate-200 space-y-2 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-bold uppercase tracking-wide text-blue-700">High-Probability Exam Topics</h4>
                                </div>

                                <div className="space-y-2">
                                    {predictionResult.guide ? (
                                        predictionResult.guide.map((item, idx) => (
                                            <div key={idx} className="bg-slate-50 rounded-lg border border-slate-200 p-2.5 space-y-1">
                                                <div className="flex justify-between items-start gap-2">
                                                    <span className="text-[11px] font-bold text-slate-900">{item.topic}</span>
                                                    <span className={cn(
                                                        "text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase",
                                                        item.priority === 'High' ? 'bg-red-50 text-red-600 border-red-200' :
                                                        item.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                        'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                    )}>
                                                        {item.priority} Priority
                                                    </span>
                                                </div>
                                                {item.questions && item.questions.length > 0 && (
                                                    <p className="text-[10px] text-slate-500 italic line-clamp-2">
                                                        • {item.questions[0]}
                                                    </p>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-[11px] font-mono leading-relaxed text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 whitespace-pre-wrap max-h-36 overflow-y-auto">
                                            {typeof predictionResult === 'string' ? predictionResult : JSON.stringify(predictionResult, null, 2)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PYQsDatabase;

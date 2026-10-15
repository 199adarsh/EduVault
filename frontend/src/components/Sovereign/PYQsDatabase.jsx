import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Search,
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

const API_BASE = 'http://localhost:8081/api';

const PYQsDatabase = () => {
    const { subjects = [] } = useOutletContext();
    const [pyqs, setPyqs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterExam, setFilterExam] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

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

    useEffect(() => {
        fetchPyqs();
    }, [filterSubject, filterExam]);

    const fetchPyqs = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/pyqs`, {
                params: {
                    subjectId: filterSubject || undefined,
                    examType: filterExam || undefined
                }
            });
            setPyqs(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            toast.error("Archive synchronization failed");
        } finally {
            setLoading(false);
        }
    };

    const handlePredict = async () => {
        if (!predictorPyq.trim()) {
            toast.error("Context required for neural analysis");
            return;
        }
        setPredicting(true);
        try {
            const res = await axios.post(`${API_BASE}/pyqs/predict`, {
                pyqText: predictorPyq,
                qbText: predictorQb
            });
            setPredictionResult(res.data);
            toast.success("Priority Matrix Synthesized");
        } catch (err) {
            toast.error("AI Logic Engine offline");
        } finally {
            setPredicting(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/pyqs`, newPyq);
            toast.success("Archival Record Ingested");
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
        } catch (err) {
            toast.error("Ingestion protocol failure");
        }
    };

    // Filter by client search query
    const filteredPyqs = useMemo(() => {
        return pyqs.filter(q => {
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
    }, [pyqs, subjects, searchQuery]);

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
        <div className="flex-1 flex flex-col min-h-screen bg-[#f8fafc] text-slate-900 antialiased overflow-y-auto">
            <main className="p-8 max-w-[1600px] w-full mx-auto flex flex-col gap-6" data-purpose="pyq-repository">
                {/* BEGIN: PageHeader */}
                <section className="flex items-center justify-between flex-wrap gap-4" data-purpose="header-section">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 tracking-wide mb-1">
                            <Archive className="w-4 h-4 text-blue-600" />
                            <span className="uppercase tracking-wider text-[11px]">INSTITUTIONAL REPOSITORY</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Previous Year Questions</h1>
                        <p className="text-xs font-normal text-slate-500 mt-1">Official past examination papers &amp; examination sequence mapping</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Launch AI Predictor Button */}
                        <button
                            onClick={() => setIsPredictorVisible(prev => !prev)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm active:scale-95 cursor-pointer"
                            data-purpose="ai-predictor-trigger"
                            type="button"
                        >
                            <Brain className="w-4 h-4 text-blue-600" />
                            <span>{isPredictorVisible ? 'CLOSE AI PREDICTOR' : 'LAUNCH AI PREDICTOR'}</span>
                        </button>

                        {/* Ingest Record Primary Button */}
                        <button
                            onClick={() => setShowUpload(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm active:scale-95 cursor-pointer"
                            data-purpose="ingest-record-action"
                            type="button"
                        >
                            <Plus className="w-4 h-4" />
                            <span>INGEST RECORD</span>
                        </button>
                    </div>
                </section>
                {/* END: PageHeader */}

                {/* BEGIN: SearchAndFiltersBar */}
                <section className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-center gap-3" data-purpose="search-filters">
                    {/* Historical Sequence Search Input */}
                    <div className="relative flex-1 w-full">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            placeholder="Search historical sequences..."
                            type="text"
                        />
                    </div>

                    {/* Filter Dropdown 1: Global Archive (Subject) */}
                    <div className="relative w-full md:w-56">
                        <select
                            value={filterSubject}
                            onChange={(e) => {
                                setFilterSubject(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full py-2 pl-3.5 pr-8 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                        >
                            <option value="">GLOBAL ARCHIVE</option>
                            {(subjects || []).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                            <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                    </div>

                    {/* Filter Dropdown 2: All Exams */}
                    <div className="relative w-full md:w-48">
                        <select
                            value={filterExam}
                            onChange={(e) => {
                                setFilterExam(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full py-2 pl-3.5 pr-8 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                        >
                            <option value="">ALL EXAMS</option>
                            <option value="ESE">End Semester Exam (ESE)</option>
                            <option value="MSE">Mid Semester Exam (MSE)</option>
                            <option value="ISE">In-Sem Evaluation (ISE)</option>
                            <option value="UT-1">Unit Test 1 (UT-1)</option>
                            <option value="UT-2">Unit Test 2 (UT-2)</option>
                            <option value="Backlog">Backlog Examination</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                            <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                    </div>
                </section>
                {/* END: SearchAndFiltersBar */}

                {/* BEGIN: QuestionRecordsTable */}
                <section className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm" data-purpose="records-table-container">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse" id="vault-records-table">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 tracking-wider">
                                    <th className="py-3 px-6 uppercase w-5/12" scope="col">Subject Name</th>
                                    <th className="py-3 px-6 uppercase w-2/12" scope="col">Exam</th>
                                    <th className="py-3 px-6 uppercase w-2/12" scope="col">Release</th>
                                    <th className="py-3 px-6 uppercase w-2/12" scope="col">Labels</th>
                                    <th className="py-3 px-6 uppercase w-1/12 text-center" scope="col">Vault</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {loading ? (
                                    [1, 2, 3, 4, 5].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="py-4 px-6 h-14 bg-slate-50/40"></td>
                                        </tr>
                                    ))
                                ) : paginatedPyqs.length > 0 ? (
                                    paginatedPyqs.map((q, i) => {
                                        const sub = (subjects || []).find(s => s.id === q.subjectId);
                                        const subjectName = sub?.name || q.subjectName || (q.subjectId ? `Subject #${q.subjectId}` : 'Examination Paper');
                                        const subjectCode = sub?.code || (sub?.totalModules ? `${sub.totalModules} Modules` : '');

                                        return (
                                            <tr key={q.id || i} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="py-3.5 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-1.5 h-5 bg-blue-600 rounded-full shrink-0"></span>
                                                        <div>
                                                            <span className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors block">
                                                                {subjectName}
                                                            </span>
                                                            {subjectCode && (
                                                                <span className="block text-[11px] text-slate-400 font-normal">
                                                                    {subjectCode}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-6">
                                                    <span className={cn(
                                                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
                                                        getExamBadgeStyle(q.examType)
                                                    )}>
                                                        {q.examType || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-6 font-medium text-slate-600">
                                                    {q.year || '—'}
                                                </td>
                                                <td className="py-3.5 px-6">
                                                    <div className="flex gap-1.5 flex-wrap">
                                                        {q.tags ? (
                                                            q.tags.split(',').map((tag, tagIdx) => (
                                                                <span
                                                                    key={tagIdx}
                                                                    className={cn(
                                                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border",
                                                                        getTagBadgeStyle(tag)
                                                                    )}
                                                                >
                                                                    {tag.trim()}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-slate-400 italic font-normal text-[11px]">Unlabeled</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-6 text-center">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPyq(q);
                                                            setShowViewModal(true);
                                                        }}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                                        title="View Question Paper"
                                                        type="button"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="py-20 px-6 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                                                <Inbox className="w-10 h-10 stroke-[1.5] text-slate-300" />
                                                <p className="text-xs font-semibold text-slate-600">No question papers found</p>
                                                <p className="text-[11px] text-slate-400">Ingest a paper into the vault to populate records.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer / Pagination */}
                    <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
                        <span>
                            Showing <strong className="font-semibold text-slate-700">{paginatedPyqs.length}</strong> of{' '}
                            <strong className="font-semibold text-slate-700">{filteredPyqs.length}</strong> archived papers
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 font-medium cursor-pointer transition-all"
                            >
                                Previous
                            </button>
                            <span className="text-[11px] font-medium text-slate-500 px-1">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-medium cursor-pointer transition-all"
                            >
                                Next
                            </button>
                        </div>
                    </div>
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
                                    <h3 className="text-sm font-bold text-slate-900">Ingest Archive Record</h3>
                                    <p className="text-[11px] text-slate-500">Add official examination question sets to repository</p>
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
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                                    AI Question Predictor
                                    <span className="text-[10px] px-1.5 py-0.2 font-semibold bg-blue-100 text-blue-700 rounded-full">v4.2</span>
                                </h3>
                                <p className="text-[10px] text-slate-500 font-medium">Topic frequency synthesis &amp; priority matrix</p>
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
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Archival PYQ Content</label>
                            <textarea
                                value={predictorPyq}
                                onChange={(e) => setPredictorPyq(e.target.value)}
                                className="w-full h-24 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 resize-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono leading-relaxed placeholder:text-slate-400"
                                placeholder="Paste or push examination question text..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Question Bank / Syllabus Context</label>
                            <textarea
                                value={predictorQb}
                                onChange={(e) => setPredictorQb(e.target.value)}
                                className="w-full h-20 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 resize-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono leading-relaxed placeholder:text-slate-400"
                                placeholder="Optional: Paste syllabus modules or question bank..."
                            />
                        </div>

                        <button
                            onClick={handlePredict}
                            disabled={predicting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            {predicting ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                            <span>{predicting ? 'Synthesizing Matrix...' : 'Run Neural Prediction'}</span>
                        </button>

                        {/* Prediction Results */}
                        {predictionResult && (
                            <div className="pt-3 border-t border-slate-200 space-y-2 animate-in fade-in duration-300">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Predicted Yield Priority</h4>
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
                                                        {item.priority} Yield
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

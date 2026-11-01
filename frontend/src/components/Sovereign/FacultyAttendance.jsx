import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Eye,
    Download,
    X,
    FileCheck,
    RefreshCw,
    Filter,
    FileText,
    UserCheck,
    AlertCircle,
    ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const QUICK_COMMENTS = [
    'Verified with medical certificate',
    'Approved for university / academic event',
    'Approved as per department attendance policy',
    'Proof document missing or unclear'
];

const FacultyAttendance = ({ profile, subjects = [], onRefresh }) => {
    const [allRequests, setAllRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [subjectFilter, setSubjectFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Review Modal States
    const [reviewingReq, setReviewingReq] = useState(null);
    const [reviewDecision, setReviewDecision] = useState('APPROVED');
    const [reviewComment, setReviewComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    // Document Preview Modal States
    const [docPreviewUrl, setDocPreviewUrl] = useState(null);
    const [docPreviewName, setDocPreviewName] = useState('');

    const teacherName = localStorage.getItem('eduvault_teacher_name') || profile?.name || 'Faculty Member';

    // Get teacher's selected subjects from localStorage if available
    const teacherSubjects = useMemo(() => {
        try {
            const saved = localStorage.getItem('eduvault_teacher_subjects');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error('Failed to parse teacher subjects', e);
        }
        return subjects.map(s => s.name || s);
    }, [subjects]);

    const fetchFacultyRequests = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/nc/requests`, {
                headers: { 'X-User-Role': 'teacher' }
            });
            setAllRequests(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to load faculty NC requests', err);
            toast.error('Failed to load leave requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFacultyRequests();
    }, []);

    const getProofUrl = (req) => {
        if (!req) return '';
        if (req.proofFileKey) {
            return `${API_BASE}/nc/proofs/${encodeURIComponent(req.proofFileKey)}`;
        }
        return req.proofPresignedUrl || '';
    };

    const handleTeacherReview = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!reviewingReq) return;

        setIsSubmittingReview(true);
        const toastId = toast.loading(`Submitting ${reviewDecision.toLowerCase()} decision...`);
        try {
            await axios.put(
                `${API_BASE}/nc/requests/${reviewingReq.id}/review`,
                {
                    status: reviewDecision,
                    comment: reviewComment.trim(),
                    reviewerName: teacherName
                },
                {
                    headers: { 'X-User-Role': 'teacher' }
                }
            );
            toast.success(`Request marked as ${reviewDecision}!`, { id: toastId });
            setReviewingReq(null);
            setReviewComment('');
            fetchFacultyRequests();
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Failed to submit review', err);
            toast.error(err.response?.data?.error || 'Failed to submit review', { id: toastId });
        } finally {
            setIsSubmittingReview(false);
        }
    };

    // Quick direct approve/reject handler
    const handleQuickAction = async (req, decision) => {
        const toastId = toast.loading(`Marking request as ${decision}...`);
        try {
            await axios.put(
                `${API_BASE}/nc/requests/${req.id}/review`,
                {
                    status: decision,
                    comment: decision === 'APPROVED' ? 'Approved by faculty' : 'Rejected by faculty',
                    reviewerName: teacherName
                },
                {
                    headers: { 'X-User-Role': 'teacher' }
                }
            );
            toast.success(`Request ${decision.toLowerCase()}!`, { id: toastId });
            fetchFacultyRequests();
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Quick action failed', err);
            toast.error('Failed to update request', { id: toastId });
        }
    };

    // Scoped requests for this faculty member
    const teacherBaseRequests = useMemo(() => {
        if (!teacherSubjects || teacherSubjects.length === 0) return allRequests;
        const normalized = teacherSubjects.map(s => (typeof s === 'string' ? s : s?.name || '').toLowerCase());
        return allRequests.filter(req =>
            (req.missedSubjects || []).some(ms => ms.subjectName && normalized.includes(ms.subjectName.toLowerCase()))
        );
    }, [allRequests, teacherSubjects]);

    // Available subjects list for filter (strictly teacher's selected subjects if assigned)
    const availableSubjects = useMemo(() => {
        const set = new Set();
        (teacherSubjects || []).forEach(s => {
            const name = typeof s === 'string' ? s : s?.name;
            if (name) set.add(name);
        });
        // If teacher has no assigned subjects, fall back to subjects present in actual requests
        if (set.size === 0) {
            allRequests.forEach(req => {
                (req.missedSubjects || []).forEach(ms => {
                    if (ms.subjectName) set.add(ms.subjectName);
                });
            });
        }
        return Array.from(set).sort();
    }, [teacherSubjects, allRequests]);

    // Statistics based on teacher's course requests (or all if department view selected)
    const stats = useMemo(() => {
        const pool = (subjectFilter === 'ALL_DEPT' || (!teacherSubjects || teacherSubjects.length === 0))
            ? allRequests
            : teacherBaseRequests;
        const total = pool.length;
        const pending = pool.filter(r => r.status === 'PENDING').length;
        const approved = pool.filter(r => r.status === 'APPROVED').length;
        const rejected = pool.filter(r => r.status === 'REJECTED').length;
        return { total, pending, approved, rejected };
    }, [allRequests, teacherBaseRequests, subjectFilter, teacherSubjects]);

    // Filtered requests list
    const filteredRequests = useMemo(() => {
        const basePool = (subjectFilter === 'ALL_DEPT' || (!teacherSubjects || teacherSubjects.length === 0))
            ? allRequests
            : teacherBaseRequests;

        return basePool.filter(req => {
            // Status filter
            if (statusFilter !== 'ALL' && req.status !== statusFilter) {
                return false;
            }
            // Subject filter
            if (subjectFilter !== 'ALL' && subjectFilter !== 'ALL_DEPT') {
                const hasSubject = (req.missedSubjects || []).some(ms =>
                    ms.subjectName?.toLowerCase() === subjectFilter.toLowerCase()
                );
                if (!hasSubject) return false;
            }
            // Search query filter (name, PRN, reason, description)
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const nameMatch = req.studentName?.toLowerCase().includes(q);
                const prnMatch = req.studentPrn?.toLowerCase().includes(q);
                const reasonMatch = req.reason?.toLowerCase().includes(q);
                const descMatch = req.description?.toLowerCase().includes(q);
                if (!nameMatch && !prnMatch && !reasonMatch && !descMatch) {
                    return false;
                }
            }
            return true;
        });
    }, [allRequests, teacherBaseRequests, statusFilter, subjectFilter, searchQuery, teacherSubjects]);

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-200">
            {/* Header Section */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Faculty Portal</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {profile?.department || 'AI & Data Science'}
                        </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        Attendance &amp; Leave Approvals (NC)
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Review medical, academic event, and official leave submissions from students.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right hidden md:block">
                        <div className="text-xs font-bold text-slate-800">{teacherName}</div>
                        <div className="text-[10px] text-slate-400">Authorized Faculty Reviewer</div>
                    </div>
                    <button
                        type="button"
                        onClick={fetchFacultyRequests}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition shadow-xs cursor-pointer disabled:opacity-50"
                        title="Refresh requests"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5 text-slate-600", loading && "animate-spin")} />
                        <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                </div>
            </div>

            {/* KPI Stat Cards (Light Shadcn Style) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white border border-amber-200/80 rounded-xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Pending Review</span>
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-amber-600 tracking-tight">{stats.pending}</span>
                        <span className="text-[11px] text-slate-400 font-medium">awaiting review</span>
                    </div>
                    <p className="text-[10px] text-amber-700/80 font-medium mt-1">Requires faculty decision</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Approved Leaves</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">{stats.approved}</span>
                        <span className="text-[11px] text-slate-400 font-medium">granted</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Attendance credited</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Rejected Requests</span>
                        <XCircle className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-rose-600 tracking-tight">{stats.rejected}</span>
                        <span className="text-[11px] text-slate-400 font-medium">declined</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">Invalid / insufficient proof</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Total Requests</span>
                        <FileCheck className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.total}</span>
                        <span className="text-[11px] text-slate-400 font-medium">recorded</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">All student submissions</p>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Status Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'ALL', label: 'All', count: stats.total },
                        { id: 'PENDING', label: 'Pending', count: stats.pending, highlight: 'text-amber-700 bg-amber-50' },
                        { id: 'APPROVED', label: 'Approved', count: stats.approved, highlight: 'text-emerald-700 bg-emerald-50' },
                        { id: 'REJECTED', label: 'Rejected', count: stats.rejected, highlight: 'text-rose-700 bg-rose-50' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setStatusFilter(tab.id)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                                statusFilter === tab.id
                                    ? "bg-slate-900 text-white shadow-xs"
                                    : "text-slate-600 hover:bg-slate-100"
                            )}
                        >
                            <span>{tab.label}</span>
                            <span className={cn(
                                "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                                statusFilter === tab.id
                                    ? "bg-white/20 text-white"
                                    : tab.highlight || "bg-slate-100 text-slate-600"
                            )}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Secondary Filters: Subject & Search */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* Subject Filter */}
                    <div className="relative min-w-[160px] flex-1 sm:flex-none">
                        <select
                            value={subjectFilter}
                            onChange={(e) => setSubjectFilter(e.target.value)}
                            className="w-full text-xs bg-slate-50 hover:bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 transition cursor-pointer"
                        >
                            <option value="ALL">
                                {teacherSubjects?.length > 0 ? `My Courses (${availableSubjects.length})` : `All Subjects (${availableSubjects.length})`}
                            </option>
                            {availableSubjects.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                            {teacherSubjects?.length > 0 && (
                                <option value="ALL_DEPT">All Department Requests ({allRequests.length})</option>
                            )}
                        </select>
                    </div>

                    {/* Search Field */}
                    <div className="relative min-w-[200px] flex-1 sm:flex-none">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search student or PRN..."
                            className="w-full text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 transition"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main NC Approval List (Shadcn Light UI) */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                            Student Leave Requests ({filteredRequests.length})
                        </h2>
                        <span className="text-[11px] text-slate-500">
                            Showing student absence records filtered by selected status and course
                        </span>
                    </div>
                    {filteredRequests.length > 0 && (
                        <span className="text-[11px] font-medium text-slate-400">
                            Click 'Review' to approve or reject
                        </span>
                    )}
                </div>

                <div className="divide-y divide-slate-100">
                    {loading ? (
                        <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2.5">
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <span>Loading leave requests...</span>
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="py-16 text-center px-4 space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                                <FileCheck className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-sm text-slate-800">No Leave Requests Found</h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                No student leave requests match the selected status or search filter.
                            </p>
                            {(statusFilter !== 'ALL' || subjectFilter !== 'ALL' || searchQuery) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter('ALL');
                                        setSubjectFilter('ALL');
                                        setSearchQuery('');
                                    }}
                                    className="mt-2 px-3 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredRequests.map(req => {
                            const initials = (req.studentName || 'ST')
                                .split(' ')
                                .filter(Boolean)
                                .slice(0, 2)
                                .map(p => p[0])
                                .join('')
                                .toUpperCase();

                            const isPending = req.status === 'PENDING';
                            const isApproved = req.status === 'APPROVED';
                            const isRejected = req.status === 'REJECTED';

                            return (
                                <div
                                    key={req.id}
                                    className={cn(
                                        "p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4",
                                        isPending && "bg-amber-50/15"
                                    )}
                                >
                                    {/* Left: Student identity & absence details */}
                                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs">
                                            {initials}
                                        </div>

                                        <div className="space-y-1.5 min-w-0 flex-1">
                                            {/* Name, PRN, and Subject Badges */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-sm text-slate-900 leading-tight">
                                                    {req.studentName}
                                                </span>
                                                <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/80">
                                                    {req.studentPrn}
                                                </span>
                                                {req.missedSubjects && req.missedSubjects.length > 0 && (
                                                    <span className="text-[11px] font-medium bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200/60">
                                                        {req.missedSubjects.map(m => m.subjectName).filter(Boolean).join(', ')}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Absent Dates & Reason */}
                                            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                                                <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-50 border border-slate-200/70 px-2 py-0.5 rounded-md text-slate-700">
                                                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                                    <span>{(req.absentDates || []).join(', ')}</span>
                                                </span>
                                                <span className="text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/70 px-2 py-0.5 rounded-md">
                                                    {req.reason}
                                                </span>
                                                {req.description && (
                                                    <span className="text-slate-500 italic max-w-md truncate" title={req.description}>
                                                        "{req.description}"
                                                    </span>
                                                )}
                                            </div>

                                            {/* Existing Reviewer Comment */}
                                            {req.reviewComment && (
                                                <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200/60 p-2 rounded-lg mt-1 flex items-start gap-1.5">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                                    <span>
                                                        <strong className="text-slate-700">Faculty Note ({req.reviewedBy || 'Reviewer'}):</strong> "{req.reviewComment}"
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Status badge & Action buttons */}
                                    <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center flex-wrap sm:flex-nowrap">
                                        {/* Status Badge */}
                                        <span className={cn(
                                            "px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border",
                                            isApproved && "bg-emerald-50 text-emerald-700 border-emerald-200",
                                            isRejected && "bg-rose-50 text-rose-700 border-rose-200",
                                            isPending && "bg-amber-50 text-amber-700 border-amber-200"
                                        )}>
                                            {isPending && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                                            {isApproved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                                            {isRejected && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                                            <span>{req.status}</span>
                                        </span>

                                        {/* Proof Document Link */}
                                        {req.proofFileName ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDocPreviewUrl(getProofUrl(req));
                                                    setDocPreviewName(req.proofFileName);
                                                }}
                                                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                                                title={`View ${req.proofFileName}`}
                                            >
                                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                                                <span>Proof</span>
                                            </button>
                                        ) : (
                                            <span className="text-[11px] text-slate-400 italic px-2">No Doc</span>
                                        )}

                                        {/* Review Button */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setReviewingReq(req);
                                                setReviewDecision(req.status === 'REJECTED' ? 'REJECTED' : 'APPROVED');
                                                setReviewComment(req.reviewComment || '');
                                            }}
                                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <FileCheck className="w-3.5 h-3.5" />
                                            <span>Review</span>
                                        </button>

                                        {/* Quick Action Pills if Pending */}
                                        {isPending && (
                                            <div className="hidden sm:flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickAction(req, 'APPROVED')}
                                                    title="Quick Approve"
                                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200/60 transition cursor-pointer"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleQuickAction(req, 'REJECTED')}
                                                    title="Quick Reject"
                                                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200/60 transition cursor-pointer"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Review Decision Dialog (Shadcn Light Style) */}
            {reviewingReq && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
                    onClick={() => setReviewingReq(null)}
                >
                    <div
                        className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-sm text-slate-900">Review Student Leave Request</h3>
                                <p className="text-[11px] text-slate-500">
                                    Student: <strong className="text-slate-800">{reviewingReq.studentName}</strong> ({reviewingReq.studentPrn})
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReviewingReq(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4 text-xs">
                            {/* Request Info Summary */}
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">Dates of Absence:</span>
                                    <span className="font-bold font-mono text-slate-800">
                                        {(reviewingReq.absentDates || []).join(', ')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium">Reason Category:</span>
                                    <span className="font-semibold text-slate-800">{reviewingReq.reason}</span>
                                </div>
                                {reviewingReq.description && (
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="text-slate-500 font-medium shrink-0">Student Explanation:</span>
                                        <span className="italic text-slate-700 text-right">{reviewingReq.description}</span>
                                    </div>
                                )}
                                {reviewingReq.missedSubjects && reviewingReq.missedSubjects.length > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 font-medium">Affected Subject:</span>
                                        <span className="font-semibold text-blue-700">
                                            {reviewingReq.missedSubjects.map(m => m.subjectName).filter(Boolean).join(', ')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Proof Document preview button inside modal */}
                            {reviewingReq.proofFileName && (
                                <div className="flex items-center justify-between p-2.5 rounded-xl border border-blue-100 bg-blue-50/60">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                        <span className="font-semibold text-slate-800 truncate text-[11px]">
                                            {reviewingReq.proofFileName}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDocPreviewUrl(getProofUrl(reviewingReq));
                                            setDocPreviewName(reviewingReq.proofFileName);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Preview</span>
                                    </button>
                                </div>
                            )}

                            {/* Decision Select Buttons */}
                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-700">Decision</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setReviewDecision('APPROVED')}
                                        className={cn(
                                            "p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border",
                                            reviewDecision === 'APPROVED'
                                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                        )}
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Approve Leave</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReviewDecision('REJECTED')}
                                        className={cn(
                                            "p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border",
                                            reviewDecision === 'REJECTED'
                                                ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                        )}
                                    >
                                        <XCircle className="w-4 h-4" />
                                        <span>Reject Request</span>
                                    </button>
                                </div>
                            </div>

                            {/* Presets and Custom Comment */}
                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-700">Faculty Remarks / Feedback</label>
                                <div className="flex flex-wrap gap-1.5 pb-1">
                                    {QUICK_COMMENTS.map((preset, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setReviewComment(preset)}
                                            className="text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/60 transition cursor-pointer"
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    placeholder="Add approval justification, condition, or rejection reason..."
                                    rows={2}
                                    className="w-full text-xs bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-blue-500 transition"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setReviewingReq(null)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleTeacherReview}
                                    disabled={isSubmittingReview}
                                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer transition disabled:opacity-50"
                                >
                                    {isSubmittingReview ? 'Submitting...' : 'Confirm Decision'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Preview Modal */}
            {docPreviewUrl && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
                    onClick={() => setDocPreviewUrl(null)}
                >
                    <div
                        className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span className="font-bold text-xs sm:text-sm text-slate-900">{docPreviewName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={docPreviewUrl}
                                    download={docPreviewName}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200/60 transition cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setDocPreviewUrl(null)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 flex-1 overflow-auto bg-slate-50 flex items-center justify-center min-h-[300px]">
                            {docPreviewUrl.endsWith('.pdf') ? (
                                <iframe
                                    src={docPreviewUrl}
                                    title="PDF Document Preview"
                                    className="w-full h-[500px] border border-slate-200 rounded-lg bg-white"
                                />
                            ) : (
                                <img
                                    src={docPreviewUrl}
                                    alt="Student absence proof document"
                                    className="max-h-[500px] max-w-full rounded-lg object-contain shadow-xs border border-slate-200"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentNode.innerHTML += `
                                            <div class="p-6 text-center text-xs text-slate-500">
                                                <p class="font-bold text-slate-700 mb-1">Preview not directly displayable in browser</p>
                                                <p>Click Download above to view the file locally.</p>
                                            </div>
                                        `;
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyAttendance;

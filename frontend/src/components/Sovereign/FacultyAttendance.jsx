import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Calendar,
    CheckCircle2,
    XCircle,
    Search,
    Download,
    X,
    FileCheck,
    RefreshCw,
    FileText,
    AlertCircle,
    ChevronDown,
    ChevronRight,
    User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FluidTabs } from '../fluid-tabs';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const QUICK_COMMENTS = [
    'Verified with medical certificate',
    'Approved for institutional / academic duty',
    'Approved as per department attendance policy',
    'Proof document missing or unclear'
];

const formatStudentName = (name) => {
    if (!name) return 'Student';
    return name.trim().split(/\s+/).map(w => {
        if (w.length <= 2 && w.toUpperCase() === w) return w;
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ');
};

const formatDateRange = (dates) => {
    if (!Array.isArray(dates) || dates.length === 0) return 'No dates specified';
    return dates.map(d => {
        if (!d) return '';
        const parts = d.split('-');
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                const date = new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                }
            } else if (parts[2].length === 4) {
                const date = new Date(parts[2], parseInt(parts[1], 10) - 1, parts[0]);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                }
            }
        }
        return d;
    }).filter(Boolean).join(', ');
};

const getCourseDisplay = (missedSubjects) => {
    if (!Array.isArray(missedSubjects) || missedSubjects.length === 0) return 'Course Absence';
    const unique = Array.from(new Set(missedSubjects.map(m => m?.subjectName || m?.name || m).filter(Boolean)));
    return unique.length > 0 ? unique.join(' · ') : 'Course Absence';
};

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
    const [docPreviewError, setDocPreviewError] = useState(false);

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
            const subjectHeader = (teacherSubjects || []).map(s => typeof s === 'string' ? s : s?.name || s?.id || '').join(',');
            const res = await axios.get(`${API_BASE}/nc/requests`, {
                headers: {
                    'X-User-Role': 'teacher',
                    'X-Teacher-Subjects': subjectHeader
                }
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
    }, [teacherSubjects]);

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
            toast.success(`Request marked as ${reviewDecision.toLowerCase()}`, { id: toastId });
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

    // Scoped requests strictly for this faculty member's assigned subjects
    const teacherBaseRequests = useMemo(() => {
        if (!teacherSubjects || teacherSubjects.length === 0) return [];
        const normalized = teacherSubjects.map(s => (typeof s === 'string' ? s : s?.name || s?.id || '').toLowerCase().trim());
        return allRequests.filter(req =>
            (req.missedSubjects || []).some(ms => {
                const subName = (ms.subjectName || '').toLowerCase().trim();
                const subId = (ms.subjectId || '').toLowerCase().trim();
                const subCode = (ms.subjectCode || '').toLowerCase().trim();
                return normalized.some(s => s && (s === subName || s === subId || s === subCode || (subName.length > 3 && (subName.includes(s) || s.includes(subName)))));
            })
        );
    }, [allRequests, teacherSubjects]);

    // Available subjects list for filter
    const availableSubjects = useMemo(() => {
        const set = new Set();
        (teacherSubjects || []).forEach(s => {
            const name = typeof s === 'string' ? s : s?.name;
            if (name) set.add(name);
        });
        return Array.from(set).sort();
    }, [teacherSubjects]);

    // Statistics based on current view
    const stats = useMemo(() => {
        const pool = teacherBaseRequests;
        const total = pool.length;
        const pending = pool.filter(r => r.status === 'PENDING').length;
        const approved = pool.filter(r => r.status === 'APPROVED').length;
        const rejected = pool.filter(r => r.status === 'REJECTED').length;
        return { total, pending, approved, rejected };
    }, [teacherBaseRequests]);

    // Filtered requests list
    const filteredRequests = useMemo(() => {
        const basePool = teacherBaseRequests;

        return basePool.filter(req => {
            if (statusFilter !== 'ALL' && req.status !== statusFilter) {
                return false;
            }
            if (subjectFilter !== 'ALL' && subjectFilter !== 'ALL_DEPT') {
                const hasSubject = (req.missedSubjects || []).some(ms =>
                    ms.subjectName?.toLowerCase() === subjectFilter.toLowerCase()
                );
                if (!hasSubject) return false;
            }
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

    // Group requests by Student (PRN or normalized name) so multiple requests from the same student stay clustered
    const groupedStudents = useMemo(() => {
        const map = new Map();
        filteredRequests.forEach(req => {
            const key = (req.studentPrn || req.studentName || 'UNKNOWN').trim().toLowerCase();
            if (!map.has(key)) {
                map.set(key, {
                    key,
                    studentName: req.studentName,
                    studentPrn: req.studentPrn,
                    department: req.department,
                    requests: []
                });
            }
            map.get(key).requests.push(req);
        });

        return Array.from(map.values()).map(group => {
            const pendingCount = group.requests.filter(r => r.status === 'PENDING').length;
            const approvedCount = group.requests.filter(r => r.status === 'APPROVED').length;
            const rejectedCount = group.requests.filter(r => r.status === 'REJECTED').length;
            return {
                ...group,
                pendingCount,
                approvedCount,
                rejectedCount
            };
        });
    }, [filteredRequests]);

    const [collapsedStudents, setCollapsedStudents] = useState({});
    const toggleStudentGroup = (key) => {
        setCollapsedStudents(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const expandAll = () => setCollapsedStudents({});
    const collapseAll = () => {
        const nextState = {};
        groupedStudents.forEach(g => {
            nextState[g.key] = true;
        });
        setCollapsedStudents(nextState);
    };

    const allAreCollapsed = useMemo(() => {
        if (groupedStudents.length === 0) return false;
        return groupedStudents.every(g => !!collapsedStudents[g.key]);
    }, [groupedStudents, collapsedStudents]);

    return (
        <div className="w-full space-y-5">
            {/* Header Section */}
            <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-[#0071E3] bg-[#0071E3]/8 px-2.5 py-0.5 rounded-full">
                            Faculty Portal
                        </span>
                        <span className="text-[#E5E5EA]">•</span>
                        <span className="text-xs font-medium text-[#6E6E73]">
                            {profile?.department || 'Department of Engineering'}
                        </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] tracking-tight">
                        Attendance &amp; Leave Approvals
                    </h1>
                    <p className="text-xs text-[#6E6E73] max-w-2xl">
                        Review Non-Credit (NC) medical, academic competition, and official duty absence submissions.
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                    <div className="text-right hidden sm:block">
                        <div className="text-xs font-semibold text-[#1D1D1F]">{teacherName}</div>
                        <div className="text-[11px] text-[#8E8E93]">Faculty Reviewer</div>
                    </div>
                    <button
                        type="button"
                        onClick={fetchFacultyRequests}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] transition cursor-pointer disabled:opacity-50"
                        title="Refresh submissions"
                    >
                        <RefreshCw className={cn("w-3.5 h-3.5 text-[#6E6E73]", loading && "animate-spin")} />
                        <span>{loading ? 'Refreshing' : 'Refresh'}</span>
                    </button>
                </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white border border-[#E5E5EA] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#6E6E73]">Pending Action</span>
                        {stats.pending > 0 && (
                            <span className="w-2 h-2 rounded-full bg-[#FF9F0A]" />
                        )}
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className={cn(
                            "text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight",
                            stats.pending > 0 ? "text-[#FF9F0A]" : "text-[#1D1D1F]"
                        )}>
                            {stats.pending}
                        </span>
                        <span className="text-[11px] text-[#8E8E93]">requests</span>
                    </div>
                    <p className="text-[11px] text-[#8E8E93] mt-1">Awaiting decision</p>
                </div>

                <div className="bg-white border border-[#E5E5EA] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#6E6E73]">Approved</span>
                        <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-semibold tabular-nums text-[#1D1D1F] tracking-tight">
                            {stats.approved}
                        </span>
                        <span className="text-[11px] text-[#8E8E93]">credited</span>
                    </div>
                    <p className="text-[11px] text-[#8E8E93] mt-1">Attendance accounted</p>
                </div>

                <div className="bg-white border border-[#E5E5EA] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#6E6E73]">Declined</span>
                        <XCircle className="w-4 h-4 text-[#FF3B30]" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-semibold tabular-nums text-[#1D1D1F] tracking-tight">
                            {stats.rejected}
                        </span>
                        <span className="text-[11px] text-[#8E8E93]">rejected</span>
                    </div>
                    <p className="text-[11px] text-[#8E8E93] mt-1">Inadequate proof</p>
                </div>

                <div className="bg-white border border-[#E5E5EA] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#6E6E73]">Total Submissions</span>
                        <FileCheck className="w-4 h-4 text-[#0071E3]" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-semibold tabular-nums text-[#1D1D1F] tracking-tight">
                            {stats.total}
                        </span>
                        <span className="text-[11px] text-[#8E8E93]">all-time</span>
                    </div>
                    <p className="text-[11px] text-[#8E8E93] mt-1">Course submissions</p>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white border border-[#E5E5EA] rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Fluid Status Tabs */}
                <FluidTabs
                    value={statusFilter}
                    onChange={(id) => setStatusFilter(id)}
                    size="sm"
                    className="bg-[#F5F5F7] border-[#E5E5EA] p-0.5"
                    tabClassName="px-3 py-1"
                    activeClassName="font-semibold text-[#1D1D1F]"
                    inactiveClassName="text-[#6E6E73] hover:text-[#1D1D1F]"
                    indicatorClassName="absolute inset-0 rounded-full bg-white shadow-2xs border border-[#E5E5EA]"
                    tabs={[
                        { id: 'ALL', label: 'All', badge: stats.total },
                        { id: 'PENDING', label: 'Pending', badge: stats.pending },
                        { id: 'APPROVED', label: 'Approved', badge: stats.approved },
                        { id: 'REJECTED', label: 'Rejected', badge: stats.rejected }
                    ]}
                />

                {/* Secondary Filters: Subject & Search */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* Subject Filter */}
                    <div className="relative min-w-[170px] flex-1 sm:flex-none">
                        <select
                            value={subjectFilter}
                            onChange={(e) => setSubjectFilter(e.target.value)}
                            className="w-full text-xs bg-white border border-[#E5E5EA] rounded-lg px-2.5 py-1.5 font-medium text-[#1D1D1F] outline-none focus:border-[#0071E3] transition cursor-pointer pr-7 appearance-none"
                        >
                            <option value="ALL">
                                {teacherSubjects?.length > 0 ? `My Courses (${availableSubjects.length})` : `All Subjects (${availableSubjects.length})`}
                            </option>
                            {availableSubjects.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                            {teacherSubjects?.length > 0 && (
                                <option value="ALL_DEPT">Department-Wide ({allRequests.length})</option>
                            )}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-[#8E8E93] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Search Field */}
                    <div className="relative min-w-[210px] flex-1 sm:flex-none">
                        <Search className="w-3.5 h-3.5 text-[#8E8E93] absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search student or PRN..."
                            className="w-full text-xs bg-white border border-[#E5E5EA] rounded-lg pl-8 pr-7 py-1.5 text-[#1D1D1F] placeholder:text-[#8E8E93] outline-none focus:border-[#0071E3] transition"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-[#1D1D1F] p-0.5 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Requests Ledger Table / List */}
            <div className="bg-white border border-[#E5E5EA] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E5E5EA] flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-sm sm:text-base font-semibold text-[#1D1D1F] leading-tight">
                            Leave Requests ({filteredRequests.length} across {groupedStudents.length} students)
                        </h2>
                        <span className="text-xs text-[#6E6E73]">
                            Grouped by student • Expand or collapse to review all absence applications
                        </span>
                    </div>
                    {groupedStudents.length > 0 && (
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={allAreCollapsed ? expandAll : collapseAll}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] transition cursor-pointer"
                            >
                                <span>{allAreCollapsed ? 'Expand All' : 'Collapse All'}</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="divide-y divide-[#E5E5EA]">
                    {loading ? (
                        <div className="py-16 text-center text-xs text-[#6E6E73] flex flex-col items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-[#0071E3] border-t-transparent rounded-full animate-spin" />
                            <span>Loading leave requests...</span>
                        </div>
                    ) : groupedStudents.length === 0 ? (
                        <div className="py-16 text-center px-4 space-y-2">
                            <div className="w-10 h-10 rounded-full bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-center mx-auto text-[#6E6E73]">
                                <FileCheck className="w-5 h-5" />
                            </div>
                            <h4 className="font-semibold text-sm text-[#1D1D1F]">No Requests Found</h4>
                            <p className="text-xs text-[#6E6E73] max-w-sm mx-auto">
                                No leave requests match the selected status or search filter.
                            </p>
                            {(statusFilter !== 'ALL' || subjectFilter !== 'ALL' || searchQuery) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter('ALL');
                                        setSubjectFilter('ALL');
                                        setSearchQuery('');
                                    }}
                                    className="mt-2 px-3 py-1 rounded-lg text-xs font-medium text-[#0071E3] hover:bg-[#F5F5F7] border border-[#E5E5EA] transition cursor-pointer"
                                >
                                    Reset Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        groupedStudents.map(group => {
                            const initials = (group.studentName || 'ST')
                                .split(' ')
                                .filter(Boolean)
                                .slice(0, 2)
                                .map(p => p[0])
                                .join('')
                                .toUpperCase();

                            const isCollapsed = collapsedStudents[group.key] || false;

                            return (
                                <div key={group.key} className="border-b border-[#E5E5EA] last:border-b-0">
                                    {/* Student Group Header Banner */}
                                    <button
                                        type="button"
                                        onClick={() => toggleStudentGroup(group.key)}
                                        className="w-full text-left px-5 py-3.5 bg-[#F9F9FB] hover:bg-[#F2F2F7] transition flex items-center justify-between gap-3 border-b border-[#E5E5EA]/80 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-white border border-[#E5E5EA] text-[#1D1D1F] font-semibold text-xs flex items-center justify-center shrink-0">
                                                {initials}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold text-sm text-[#1D1D1F] tracking-tight truncate">
                                                        {formatStudentName(group.studentName)}
                                                    </span>
                                                    <span className="font-mono text-[11px] text-[#6E6E73] bg-white px-1.5 py-0.5 rounded border border-[#E5E5EA]">
                                                        {group.studentPrn}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="flex items-center gap-1.5 text-[11px]">
                                                {group.pendingCount > 0 && (
                                                    <span className="px-2 py-0.5 rounded-full bg-[#FFF8E6] text-[#B25E00] border border-[#FFE29A] font-medium">
                                                        {group.pendingCount} pending
                                                    </span>
                                                )}
                                                {group.approvedCount > 0 && (
                                                    <span className="px-2 py-0.5 rounded-full bg-[#EAF9EE] text-[#1B7F37] border border-[#C6EFD2] font-medium">
                                                        {group.approvedCount} approved
                                                    </span>
                                                )}
                                                {group.rejectedCount > 0 && (
                                                    <span className="px-2 py-0.5 rounded-full bg-[#FDF2F2] text-[#D32F2F] border-[#F8C8C8] font-medium">
                                                        {group.rejectedCount} declined
                                                    </span>
                                                )}
                                                <span className="text-[#8E8E93] text-[11px] hidden sm:inline">
                                                    ({group.requests.length} {group.requests.length === 1 ? 'request' : 'requests'})
                                                </span>
                                            </div>
                                            <div className="w-6 h-6 rounded-md hover:bg-black/5 flex items-center justify-center text-[#6E6E73]">
                                                {isCollapsed ? (
                                                    <ChevronRight className="w-4 h-4" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4" />
                                                )}
                                            </div>
                                        </div>
                                    </button>

                                    {/* Requests List under this student */}
                                    {!isCollapsed && (
                                        <div className="divide-y divide-[#E5E5EA]">
                                            {group.requests.map(req => {
                                                const isPending = req.status === 'PENDING';
                                                const isApproved = req.status === 'APPROVED';
                                                const isRejected = req.status === 'REJECTED';
                                                const courseName = getCourseDisplay(req.missedSubjects);

                                                return (
                                                    <div
                                                        key={req.id}
                                                        className="px-5 py-3.5 transition-colors bg-white hover:bg-[#FBFBFD] flex flex-col md:flex-row md:items-center justify-between gap-3"
                                                    >
                                                        {/* Left / Middle: Reason, Course & Dates */}
                                                        <div className="space-y-1 min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-semibold text-xs text-[#1D1D1F]">
                                                                    {req.reason}
                                                                </span>
                                                                <span className="text-[#D2D2D7]">•</span>
                                                                <span className="text-xs text-[#0071E3] font-medium">
                                                                    {courseName}
                                                                </span>
                                                                <span className="text-[#D2D2D7]">•</span>
                                                                <span className="text-[#6E6E73] font-mono text-[11px]">
                                                                    {formatDateRange(req.absentDates)}
                                                                </span>
                                                            </div>

                                                            {req.description && (
                                                                <p className="text-xs text-[#6E6E73] leading-relaxed line-clamp-2">
                                                                    "{req.description}"
                                                                </p>
                                                            )}

                                                            {req.reviewComment && (
                                                                <div className="inline-flex items-center gap-1.5 text-[11px] text-[#6E6E73] bg-[#F5F5F7] px-2 py-0.5 rounded border border-[#E5E5EA]">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#1B7F37] shrink-0" />
                                                                    <span>
                                                                        <strong className="font-medium text-[#1D1D1F]">{req.reviewedBy || 'Faculty'}:</strong> "{req.reviewComment}"
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Right Side: Status Badge, Proof & Action */}
                                                        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                                                            <span className={cn(
                                                                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
                                                                isApproved && "bg-[#EAF9EE] text-[#1B7F37] border-[#C6EFD2]",
                                                                isRejected && "bg-[#FDF2F2] text-[#D32F2F] border-[#F8C8C8]",
                                                                isPending && "bg-[#FFF8E6] text-[#B25E00] border-[#FFE29A]"
                                                            )}>
                                                                {isApproved && <CheckCircle2 className="w-3 h-3 text-[#1B7F37]" />}
                                                                {isRejected && <XCircle className="w-3 h-3 text-[#D32F2F]" />}
                                                                {isPending && <span className="w-1.5 h-1.5 rounded-full bg-[#FF9F0A]" />}
                                                                <span>{isApproved ? 'Approved' : isRejected ? 'Declined' : 'Pending'}</span>
                                                            </span>

                                                            {req.proofFileName && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setDocPreviewUrl(getProofUrl(req));
                                                                        setDocPreviewName(req.proofFileName);
                                                                        setDocPreviewError(false);
                                                                    }}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E5E5EA] bg-white hover:bg-[#F5F5F7] text-xs font-medium text-[#1D1D1F] transition cursor-pointer"
                                                                    title={`View ${req.proofFileName}`}
                                                                >
                                                                    <FileText className="w-3 h-3 text-[#6E6E73]" />
                                                                    <span>Proof</span>
                                                                </button>
                                                            )}

                                                            {isPending ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setReviewingReq(req);
                                                                        setReviewDecision('APPROVED');
                                                                        setReviewComment('');
                                                                    }}
                                                                    className="px-2.5 py-1 rounded-md bg-[#0071E3] hover:bg-[#005BB5] text-white text-xs font-medium shadow-xs transition cursor-pointer"
                                                                >
                                                                    Review
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setReviewingReq(req);
                                                                        setReviewDecision(req.status === 'REJECTED' ? 'REJECTED' : 'APPROVED');
                                                                        setReviewComment(req.reviewComment || '');
                                                                    }}
                                                                    className="px-2 py-1 rounded-md bg-white hover:bg-[#F5F5F7] border border-[#E5E5EA] text-xs font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition cursor-pointer"
                                                                >
                                                                    Update
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Review Decision Modal */}
            {reviewingReq && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
                    onClick={() => setReviewingReq(null)}
                >
                    <div
                        className="bg-white rounded-2xl border border-[#E5E5EA] max-w-lg w-full shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="px-5 py-4 border-b border-[#E5E5EA] bg-[#FBFBFD] flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-sm text-[#1D1D1F]">Review Leave Request</h3>
                                <p className="text-[11px] text-[#6E6E73] mt-0.5">
                                    Student: <strong className="text-[#1D1D1F]">{formatStudentName(reviewingReq.studentName)}</strong> ({reviewingReq.studentPrn})
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReviewingReq(null)}
                                className="p-1 rounded-lg text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 space-y-4 text-xs">
                            {/* Summary Box */}
                            <div className="bg-[#F5F5F7] p-3 rounded-xl border border-[#E5E5EA] space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[#6E6E73]">Dates of Absence:</span>
                                    <span className="font-semibold font-mono text-[#1D1D1F]">
                                        {formatDateRange(reviewingReq.absentDates)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#6E6E73]">Reason:</span>
                                    <span className="font-medium text-[#1D1D1F]">{reviewingReq.reason}</span>
                                </div>
                                {reviewingReq.description && (
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="text-[#6E6E73] shrink-0">Explanation:</span>
                                        <span className="italic text-[#1D1D1F] text-right">{reviewingReq.description}</span>
                                    </div>
                                )}
                                {reviewingReq.missedSubjects && reviewingReq.missedSubjects.length > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#6E6E73]">Affected Course:</span>
                                        <span className="font-medium text-[#0071E3]">
                                            {getCourseDisplay(reviewingReq.missedSubjects)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Proof Document Link */}
                            {reviewingReq.proofFileName && (
                                <div className="flex items-center justify-between p-2.5 rounded-xl border border-[#E5E5EA] bg-white">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-4 h-4 text-[#0071E3] shrink-0" />
                                        <span className="font-medium text-[#1D1D1F] truncate text-[11px]">
                                            {reviewingReq.proofFileName}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDocPreviewUrl(getProofUrl(reviewingReq));
                                            setDocPreviewName(reviewingReq.proofFileName);
                                            setDocPreviewError(false);
                                        }}
                                        className="px-2.5 py-1 rounded-md bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] border border-[#E5E5EA] font-medium text-[11px] flex items-center gap-1 cursor-pointer transition"
                                    >
                                        <span>Preview</span>
                                    </button>
                                </div>
                            )}

                            {/* Decision Select Buttons */}
                            <div className="space-y-1.5">
                                <label className="font-semibold text-[#1D1D1F]">Decision</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setReviewDecision('APPROVED')}
                                        className={cn(
                                            "py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer border",
                                            reviewDecision === 'APPROVED'
                                                ? "bg-[#1B7F37] text-white border-[#1B7F37] shadow-xs"
                                                : "bg-white border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F5F5F7]"
                                        )}
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Approve Leave</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReviewDecision('REJECTED')}
                                        className={cn(
                                            "py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer border",
                                            reviewDecision === 'REJECTED'
                                                ? "bg-[#D32F2F] text-white border-[#D32F2F] shadow-xs"
                                                : "bg-white border-[#E5E5EA] text-[#1D1D1F] hover:bg-[#F5F5F7]"
                                        )}
                                    >
                                        <XCircle className="w-4 h-4" />
                                        <span>Reject Request</span>
                                    </button>
                                </div>
                            </div>

                            {/* Presets and Custom Comment */}
                            <div className="space-y-1.5">
                                <label className="font-semibold text-[#1D1D1F]">Remarks / Feedback for Student</label>
                                <div className="flex flex-wrap gap-1.5 pb-1">
                                    {QUICK_COMMENTS.map((preset, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setReviewComment(preset)}
                                            className="text-[10px] font-medium bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#6E6E73] hover:text-[#1D1D1F] px-2 py-0.5 rounded-md border border-[#E5E5EA] transition cursor-pointer"
                                        >
                                            {preset}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    placeholder="Add feedback, conditions, or reason..."
                                    rows={2}
                                    className="w-full text-xs bg-white border border-[#E5E5EA] rounded-lg p-2.5 text-[#1D1D1F] placeholder:text-[#8E8E93] outline-none focus:border-[#0071E3] transition"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E5EA]">
                                <button
                                    type="button"
                                    onClick={() => setReviewingReq(null)}
                                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleTeacherReview}
                                    disabled={isSubmittingReview}
                                    className="px-4 py-1.5 rounded-lg bg-[#0071E3] hover:bg-[#005BB5] text-white text-xs font-medium shadow-xs cursor-pointer transition disabled:opacity-50"
                                >
                                    {isSubmittingReview ? 'Saving...' : 'Confirm Decision'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Preview Modal */}
            {docPreviewUrl && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
                    onClick={() => setDocPreviewUrl(null)}
                >
                    <div
                        className="bg-white rounded-2xl border border-[#E5E5EA] max-w-3xl w-full shadow-xl relative overflow-hidden flex flex-col max-h-[85vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E5EA] bg-[#FBFBFD]">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#0071E3]" />
                                <span className="font-semibold text-xs sm:text-sm text-[#1D1D1F]">{docPreviewName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={docPreviewUrl}
                                    download={docPreviewName}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-medium border border-[#E5E5EA] transition cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setDocPreviewUrl(null)}
                                    className="p-1 rounded-lg text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 flex-1 overflow-auto bg-[#F5F5F7] flex items-center justify-center min-h-[320px]">
                            {docPreviewUrl.toLowerCase().endsWith('.pdf') ? (
                                <iframe
                                    src={docPreviewUrl}
                                    title="PDF Document Preview"
                                    className="w-full h-[520px] border border-[#E5E5EA] rounded-xl bg-white"
                                />
                            ) : docPreviewError ? (
                                <div className="p-6 text-center text-xs text-[#6E6E73] space-y-2">
                                    <AlertCircle className="w-6 h-6 text-[#8E8E93] mx-auto" />
                                    <p className="font-semibold text-[#1D1D1F]">Preview not available inline</p>
                                    <p>Please download the document to inspect it locally.</p>
                                </div>
                            ) : (
                                <img
                                    src={docPreviewUrl}
                                    alt="Student absence proof document"
                                    className="max-h-[520px] max-w-full rounded-xl object-contain border border-[#E5E5EA] bg-white shadow-xs"
                                    onError={() => setDocPreviewError(true)}
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

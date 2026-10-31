import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import SharedAttendanceHeatmap from './SharedAttendanceHeatmap';
import { computeEngine, calculateLPW } from '../../lib/optimizationEngine';
import {
    Calendar,
    Clock,
    FileText,
    UploadCloud,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Filter,
    Search,
    Eye,
    Download,
    Shield,
    Check,
    X,
    FileCheck,
    RefreshCw
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const NC_REASONS = [
    'Medical Illness',
    'Institutional Activity / Hackathon',
    'Family Emergency',
    'Sports & Cultural Competition',
    'Technical Conference / Seminar',
    'Placement / Internship Drive',
    'Other Authorized Reason'
];

const AttendanceAnalytics = () => {
    const { profile, subjects: globalSubjects, refreshData, loading } = useOutletContext();
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [filterTab, setFilterTab] = useState('all'); // 'all', 'attention', 'safe'
    const [showDetailModal, setShowDetailModal] = useState(false);

    // NC Management Inside Subject Modal States
    const userRole = localStorage.getItem('eduvault_user_role') || (profile?.dob === 'TEACHER' ? 'teacher' : 'student');
    const isTeacher = userRole === 'teacher' || userRole === 'faculty' || userRole === 'admin' || profile?.dob === 'TEACHER';
    const teacherName = localStorage.getItem('eduvault_teacher_name') || profile?.name || 'Faculty Member';

    const [modalTab, setModalTab] = useState('presence'); // 'presence' | 'nc'
    const [subjectNcRequests, setSubjectNcRequests] = useState([]);
    const [ncLoading, setNcLoading] = useState(false);

    // Student NC Application Form State
    const [selectedNcDates, setSelectedNcDates] = useState([]);
    const [ncReason, setNcReason] = useState(NC_REASONS[0]);
    const [ncDescription, setNcDescription] = useState('');
    const [ncProofFile, setNcProofFile] = useState(null);
    const [isSubmittingNc, setIsSubmittingNc] = useState(false);

    // Teacher Review State inside Modal
    const [reviewingReq, setReviewingReq] = useState(null);
    const [reviewDecision, setReviewDecision] = useState('APPROVED');
    const [reviewComment, setReviewComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    // Teacher Filters inside Modal
    const [teacherNcFilterStatus, setTeacherNcFilterStatus] = useState('ALL');
    const [teacherNcSearchStudent, setTeacherNcSearchStudent] = useState('');

    // Document Preview inside Modal
    const [docPreviewUrl, setDocPreviewUrl] = useState(null);
    const [docPreviewName, setDocPreviewName] = useState('');

    const getNcProofUrl = (req) => {
        if (!req) return '';
        if (req.proofFileKey) {
            return `${API_BASE}/nc/proofs/${encodeURIComponent(req.proofFileKey)}`;
        }
        return req.proofPresignedUrl || '';
    };

    const [allFacultyNc, setAllFacultyNc] = useState([]);
    const [allFacultyNcLoading, setAllFacultyNcLoading] = useState(false);
    const [globalNcFilterStatus, setGlobalNcFilterStatus] = useState('ALL');
    const [globalNcFilterSubject, setGlobalNcFilterSubject] = useState('ALL');
    const [globalNcSearch, setGlobalNcSearch] = useState('');
    const [teacherActiveTab, setTeacherActiveTab] = useState('nc'); // 'nc' | 'courses'

    const fetchAllFacultyNc = async () => {
        if (!isTeacher) return;
        setAllFacultyNcLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/nc/requests`, {
                headers: { 'X-User-Role': 'teacher' }
            });
            setAllFacultyNc(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error('Failed to load faculty NC list', e);
        } finally {
            setAllFacultyNcLoading(false);
        }
    };

    useEffect(() => {
        if (isTeacher) {
            fetchAllFacultyNc();
        }
    }, [isTeacher]);

    const [excludedIds, setExcludedIds] = useState(() => {
        const saved = localStorage.getItem('eduvault_excluded_subjects');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('eduvault_excluded_subjects', JSON.stringify(excludedIds));
    }, [excludedIds]);

    const fetchSubjectNcRequests = async (subject) => {
        if (!subject) return;
        setNcLoading(true);
        try {
            if (isTeacher) {
                const res = await axios.get(`${API_BASE}/nc/requests`, {
                    headers: { 'X-User-Role': 'teacher' },
                    params: {
                        subject: subject.name,
                        status: teacherNcFilterStatus !== 'ALL' ? teacherNcFilterStatus : undefined,
                        student: teacherNcSearchStudent || undefined
                    }
                });
                setSubjectNcRequests(res.data || []);
            } else {
                const res = await axios.get(`${API_BASE}/nc/my-requests`, {
                    params: { prn: profile?.prn }
                });
                const allMine = res.data || [];
                const forThisSub = allMine.filter(r => 
                    r.missedSubjects?.some(ms => ms.subjectId === subject.id || (ms.subjectName && ms.subjectName.toLowerCase() === subject.name.toLowerCase())) ||
                    subject.detailedAttendance?.some(rec => rec.status === 'Absent' && r.absentDates?.includes(rec.date))
                );
                setSubjectNcRequests(forThisSub);
            }
        } catch (err) {
            console.error('Failed to fetch NC requests for subject', err);
        } finally {
            setNcLoading(false);
        }
    };

    const handleSubmitSubjectNc = async (e) => {
        e.preventDefault();
        if (selectedNcDates.length === 0) {
            toast.error('Please select at least one absent date.');
            return;
        }
        if (!ncProofFile) {
            toast.error('Please upload a supporting proof document (PDF, PNG, JPG).');
            return;
        }

        setIsSubmittingNc(true);
        const toastId = toast.loading('Uploading proof to dedicated Backblaze B2 bucket...');

        try {
            const missedSubs = selectedNcDates.map(date => {
                const rec = selectedSubject?.detailedAttendance?.find(r => r.date === date && r.status === 'Absent');
                return {
                    subjectId: selectedSubject?.id,
                    subjectName: selectedSubject?.name,
                    subjectCode: selectedSubject?.code,
                    date: date,
                    slot: rec?.slot || rec?.time || ''
                };
            });

            const formData = new FormData();
            formData.append('proofFile', ncProofFile);
            formData.append('absentDates', JSON.stringify(selectedNcDates));
            formData.append('reason', ncReason);
            formData.append('description', ncDescription || '');
            formData.append('missedSubjects', JSON.stringify(missedSubs));
            if (profile?.prn) {
                formData.append('studentPrn', profile.prn);
            }

            await axios.post(`${API_BASE}/nc/requests`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success('NC Request Submitted! Stored in dedicated Backblaze B2 bucket.', { id: toastId });
            setSelectedNcDates([]);
            setNcDescription('');
            setNcProofFile(null);
            fetchSubjectNcRequests(selectedSubject);
            if (refreshData) refreshData();
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to submit NC request.';
            toast.error(msg, { id: toastId });
        } finally {
            setIsSubmittingNc(false);
        }
    };

    const handleTeacherReviewNc = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!reviewingReq) return;

        setIsSubmittingReview(true);
        const toastId = toast.loading(`Submitting ${reviewDecision} decision...`);
        try {
            await axios.put(
                `${API_BASE}/nc/requests/${reviewingReq.id}/review`,
                {
                    status: reviewDecision,
                    comment: reviewComment,
                    reviewerName: teacherName
                },
                {
                    headers: { 'X-User-Role': 'teacher' }
                }
            );
            toast.success(`Request marked as ${reviewDecision}!`, { id: toastId });
            setReviewingReq(null);
            setReviewComment('');
            if (selectedSubject) {
                fetchSubjectNcRequests(selectedSubject);
            }
            fetchAllFacultyNc();
            if (refreshData) refreshData();
        } catch (err) {
            console.error('Failed to submit review', err);
            toast.error('Failed to submit review', { id: toastId });
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleBackgroundSync = async () => {
        if (!profile?.prn || !profile?.dob) {
            toast.error("Profile credentials missing in settings");
            return;
        }

        const lastSync = localStorage.getItem('eduvault_last_synced');
        if (lastSync && Date.now() - parseInt(lastSync, 10) < 2 * 60 * 1000) {
            toast.info("Recently synchronized (< 2 min ago). Serving cached records.");
            return;
        }

        setIsSyncing(true);
        const toastId = toast.loading("Syncing with institutional portal...");
        try {
            const response = await fetch(`${API_BASE}/portal/dashboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prn: profile.prn, dob: profile.dob })
            });

            if (response.ok) {
                const data = await response.json();
                const updatedProfile = {
                    ...(data.profile || {}),
                    prn: profile.prn,
                    dob: profile.dob
                };
                const updatedSubjects = data.subjects || [];
                localStorage.setItem('eduvault_profile', JSON.stringify(updatedProfile));
                localStorage.setItem('eduvault_subjects', JSON.stringify(updatedSubjects));
                localStorage.setItem('eduvault_last_synced', Date.now().toString());

                if (refreshData) {
                    await refreshData(updatedProfile, updatedSubjects);
                }
                toast.success("Synchronized with academic portal", { id: toastId });
            } else {
                toast.error("Cloud synchronization failed", { id: toastId });
            }
        } catch (err) {
            toast.error("Network error during sync", { id: toastId });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleExportData = () => {
        if (!activeSubjects.length) {
            toast.error("No active records to export");
            return;
        }
        const rows = [
            ["Subject Code", "Subject Name", "Conducted", "Attended", "Attendance %", "Status"],
            ...activeSubjects.map(s => {
                const conducted = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);
                const attended = s.totalAttended > 0 ? s.totalAttended : (s.detailedAttendance?.filter(r => r.status === 'Present').length || 0);
                const pct = getPrecisePct(s);
                return [s.code || '', `"${s.name}"`, conducted, attended, `${pct}%`, pct >= 75 ? "Safe" : "Needs Attention"];
            })
        ];
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `EduVault_Attendance_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Attendance report downloaded");
    };

    const subjects = globalSubjects || [];
    const activeSubjects = subjects.filter(s => !excludedIds.includes(s.id));

    const getPrecisePct = (s) => {
        const direct = parseFloat(s.attendance);
        if (!isNaN(direct) && direct > 0) return direct;
        const conducted = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);
        const present = s.totalAttended > 0 ? s.totalAttended : (s.detailedAttendance?.filter(r => r.status === 'Present').length || 0);
        if (conducted === 0) return !isNaN(direct) ? direct : 0;
        return parseFloat(((present / conducted) * 100).toFixed(2));
    };

    const getCategory = (sub) => {
        const code = (sub.code || "").toUpperCase();
        const alphabets = code.replace(/[^A-Z]/g, '');
        const lastChar = alphabets.slice(-1);
        return lastChar === 'L' ? 'THEORY' : 'LAB';
    };

    const theorySubs = activeSubjects.filter(s => getCategory(s) === 'THEORY');
    const labSubs = activeSubjects.filter(s => getCategory(s) === 'LAB');

    const hasAttendance = (s) => {
        if (s.totalConducted > 0) return true;
        if (s.detailedAttendance && s.detailedAttendance.length > 0) return true;
        const direct = parseFloat(s.attendance);
        return !isNaN(direct) && direct > 0;
    };

    const getAverage = (subs) => {
        let totalAttended = 0;
        let totalConducted = 0;
        (subs || []).forEach(s => {
            const cond = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);
            const att = s.totalAttended > 0 ? s.totalAttended : (s.detailedAttendance?.filter(r => r.status === 'Present').length || 0);
            totalConducted += cond;
            totalAttended += att;
        });
        if (totalConducted > 0) {
            return ((totalAttended / totalConducted) * 100).toFixed(2);
        }
        const valid = (subs || []).filter(hasAttendance);
        if (valid.length === 0) return "0.00";
        const sum = valid.reduce((acc, s) => acc + getPrecisePct(s), 0);
        return (sum / valid.length).toFixed(2);
    };

    const getSimpleAvg = (subs) => {
        const valid = (subs || []).filter(hasAttendance);
        if (valid.length === 0) return "0.0";
        const sum = valid.reduce((acc, s) => acc + getPrecisePct(s), 0);
        return (sum / valid.length).toFixed(1);
    };

    const theoryPercentage = getSimpleAvg(theorySubs);
    const labPercentage = getSimpleAvg(labSubs);
    const overallPercentage = getAverage(activeSubjects);

    const validSubjects = activeSubjects.filter(hasAttendance);
    const riskSubjects = validSubjects.filter(r => getPrecisePct(r) < 75);
    const safeSubjects = validSubjects.filter(r => getPrecisePct(r) >= 75);

    const displayedSubjects = useMemo(() => {
        if (filterTab === 'attention') return riskSubjects;
        if (filterTab === 'safe') return safeSubjects;
        return activeSubjects;
    }, [filterTab, activeSubjects, riskSubjects, safeSubjects]);

    // Optimization planner state (minimizable)
    const [isOptMinimized, setIsOptMinimized] = useState(() => {
        try {
            const val = localStorage.getItem('eduvault_opt_minimized');
            return val !== null ? JSON.parse(val) : false;
        } catch { return false; }
    });
    const [optTarget, setOptTarget] = useState(() => {
        try {
            const val = localStorage.getItem('eduvault_opt_target');
            return val ? JSON.parse(val) : 75;
        } catch { return 75; }
    });
    const [semesterLockDate, setSemesterLockDate] = useState(() => {
        const saved = localStorage.getItem('eduvault_opt_semdate');
        if (saved) return saved;
        const d = new Date(); d.setMonth(d.getMonth() + 2); return d.toISOString().split('T')[0];
    });
    const [manualLPWs, setManualLPWs] = useState(() => {
        try {
            const val = localStorage.getItem('eduvault_opt_lpws');
            return val ? JSON.parse(val) : {};
        } catch { return {}; }
    });
    const [showOptSettings, setShowOptSettings] = useState(false);
    const [optFilter, setOptFilter] = useState('all');

    useEffect(() => {
        localStorage.setItem('eduvault_opt_minimized', JSON.stringify(isOptMinimized));
        localStorage.setItem('eduvault_opt_target', JSON.stringify(optTarget));
        localStorage.setItem('eduvault_opt_semdate', semesterLockDate);
        localStorage.setItem('eduvault_opt_lpws', JSON.stringify(manualLPWs));
    }, [isOptMinimized, optTarget, semesterLockDate, manualLPWs]);

    const optEngine = useMemo(() => computeEngine(subjects, optTarget, excludedIds, semesterLockDate, manualLPWs),
        [subjects, optTarget, excludedIds, semesterLockDate, manualLPWs]);

    const optPriorityIds = useMemo(() => {
        if (!optEngine || !optEngine.plan) return new Set();
        const needingAttend = optEngine.plan.filter(r => r.attend > 0);
        const sorted = [...needingAttend].sort((a, b) => {
            const weightA = (a.credit || 1) * (a.lpw || 1);
            const weightB = (b.credit || 1) * (b.lpw || 1);
            return weightB - weightA;
        });
        return new Set(sorted.slice(0, 3).map(r => r.id));
    }, [optEngine]);

    const filteredOptPlan = useMemo(() => {
        if (!optEngine?.plan) return [];
        return optEngine.plan.filter(s => {
            if (optFilter === 'theory') return !s.isLab;
            if (optFilter === 'lab') return s.isLab;
            if (optFilter === 'risk') return s.currentPct < optTarget;
            if (optFilter === 'priority') return optPriorityIds.has(s.id);
            return true;
        });
    }, [optEngine, optFilter, optTarget, optPriorityIds]);

    // Chronological Session Audit Logs from all subjects
    const sessionLogs = useMemo(() => {
        const logs = [];
        activeSubjects.forEach(sub => {
            (sub.detailedAttendance || []).forEach(rec => {
                logs.push({
                    subjectName: sub.name,
                    date: rec.date,
                    time: rec.time || rec.slot || '',
                    status: rec.status,
                    faculty: rec.faculty || sub.faculty || ''
                });
            });
        });

        // Sort descending by date (format DD-MM-YYYY or YYYY-MM-DD)
        return logs.sort((a, b) => {
            const parseDate = (dStr) => {
                if (!dStr) return 0;
                const p = dStr.split('-');
                if (p.length === 3) {
                    if (p[0].length === 4) return new Date(`${p[0]}-${p[1]}-${p[2]}`).getTime();
                    return new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime();
                }
                return new Date(dStr).getTime();
            };
            return parseDate(b.date) - parseDate(a.date);
        }).slice(0, 15);
    }, [activeSubjects]);

    // Heatmap data matrix
    const activityMap = useMemo(() => {
        const map = {};
        activeSubjects.forEach(sub => {
            (sub.detailedAttendance || []).forEach(rec => {
                const parts = rec.date.split('-');
                if (parts.length === 3) {
                    const isoDate = parts[0].length === 4 ? `${parts[0]}-${parts[1]}-${parts[2]}` : `${parts[2]}-${parts[1]}-${parts[0]}`;
                    if (!map[isoDate]) {
                        map[isoDate] = { present: 0, total: 0 };
                    }
                    map[isoDate].total += 1;
                    if (rec.status === 'Present') map[isoDate].present += 1;
                }
            });
        });
        return map;
    }, [activeSubjects]);

    const formatLocalDate = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const heatmapWeeks = useMemo(() => {
        const today = new Date();
        const getMonday = (d) => {
            const date = new Date(d);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            date.setDate(diff);
            return date;
        };

        const dates = Object.keys(activityMap).sort();
        let currentMon = getMonday(today);
        let startMon = new Date(currentMon);
        if (dates.length > 0) {
            const earliest = new Date(dates[0].replace(/-/g, '/'));
            startMon = getMonday(earliest);
        } else {
            startMon.setDate(currentMon.getDate() - (15 * 7));
        }

        const weeks = [];
        let cursor = new Date(startMon);
        for (let w = 0; w < 16; w++) {
            const week = [];
            for (let day = 0; day < 6; day++) {
                const dayDate = new Date(cursor);
                dayDate.setDate(cursor.getDate() + day);
                const iso = formatLocalDate(dayDate);
                week.push({
                    iso,
                    entry: activityMap[iso],
                    isFuture: dayDate > today
                });
            }
            weeks.push(week);
            cursor.setDate(cursor.getDate() + 7);
        }
        return weeks;
    }, [activityMap]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-3 animate-pulse">
                <span className="material-symbols-outlined text-3xl animate-spin text-blue-600">sync</span>
                <p className="text-xs font-semibold tracking-wider uppercase">Loading Attendance Records...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50/60 p-3.5 sm:p-8 pb-24 md:pb-8 antialiased text-slate-800 font-sans min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Title & Action Bar */}
                {/* Title & Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                            <span className="material-symbols-outlined text-[16px]">{isTeacher ? 'verified_user' : 'trending_up'}</span>
                            <span>{isTeacher ? 'Faculty Authority' : 'Academic Standing'}</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            {isTeacher ? 'Faculty Attendance & NC Console' : 'My Attendance'}
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {isTeacher
                                ? 'Supervise class absence claims (NC), review uploaded B2 certificates, and audit course registers.'
                                : 'Quantitative presence tracking & risk analysis across registered coursework'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={isTeacher ? fetchAllFacultyNc : handleBackgroundSync}
                            disabled={isSyncing || allFacultyNcLoading}
                            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition cursor-pointer disabled:opacity-50"
                        >
                            <span className={`material-symbols-outlined text-[15px] text-slate-500 ${isSyncing || allFacultyNcLoading ? 'animate-spin' : ''}`}>
                                refresh
                            </span>
                            <span>{isSyncing || allFacultyNcLoading ? 'Syncing...' : 'Refresh Data'}</span>
                        </button>
                        {!isTeacher && (
                            <button
                                onClick={handleExportData}
                                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[15px]">download</span>
                                <span>Export Data</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* TopSummaryRibbon */}
                {isTeacher ? (
                    <section className="grid grid-cols-1 md:grid-cols-12 gap-4" data-purpose="faculty-summary-ribbon">
                        <div className="md:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Faculty Role</span>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    Active Faculty
                                </span>
                            </div>
                            <div className="my-3">
                                <h3 className="text-xl font-extrabold text-slate-900">{teacherName}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{profile?.department || 'AI & Data Science'} Department</p>
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                                <span>Assigned Courses: <strong>{subjects?.length || 0}</strong></span>
                            </div>
                        </div>

                        <div className="md:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">NC Requests Queue</span>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    {allFacultyNc.filter(r => r.status === 'PENDING').length} Pending
                                </span>
                            </div>
                            <div className="my-3 flex items-baseline gap-2">
                                <span className="text-4xl font-extrabold text-amber-600 tracking-tight">
                                    {allFacultyNc.filter(r => r.status === 'PENDING').length}
                                </span>
                                <span className="text-xs text-slate-400 font-medium">pending student claims</span>
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                                <span>Approved: <strong className="text-emerald-600">{allFacultyNc.filter(r => r.status === 'APPROVED').length}</strong></span>
                                <span>Rejected: <strong className="text-rose-600">{allFacultyNc.filter(r => r.status === 'REJECTED').length}</strong></span>
                                <span>Total: <strong>{allFacultyNc.length}</strong></span>
                            </div>
                        </div>

                        <div className="md:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Isolated Proof Storage</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700">Backblaze B2</span>
                            </div>
                            <div className="my-2 space-y-1 text-xs">
                                <div className="text-slate-700 font-semibold">Bucket: <span className="font-mono text-blue-600">eduvault-nc-proofs</span></div>
                                <p className="text-[11px] text-slate-500">Student medical &amp; hackathon proof certificates are securely isolated.</p>
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                <button
                                    onClick={fetchAllFacultyNc}
                                    className="text-blue-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Sync All NC Requests</span>
                                </button>
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="grid grid-cols-1 md:grid-cols-12 gap-4" data-purpose="summary-ribbon">
                        {/* Master Attendance Card */}
                        <div className="md:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Master Attendance
                                </span>
                                <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${parseFloat(overallPercentage) >= 75
                                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                        : 'text-rose-700 bg-rose-50 border-rose-200'
                                    }`}>
                                    {parseFloat(overallPercentage) >= 75 ? 'Above (75%)' : 'Below (75%)'}
                                </span>
                            </div>
                            <div className="my-3 flex items-baseline gap-2">
                                <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                                    {overallPercentage}%
                                </span>
                                <span className="text-xs text-slate-400 font-medium">overall</span>
                            </div>

                            {/* Breakdown Theory / Labs */}
                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                                <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                                    <div className="flex items-center justify-between text-slate-500 mb-1">
                                        <span className="font-medium">Lectures</span>
                                        <span className="font-bold text-slate-800">{theoryPercentage}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className={`h-1.5 rounded-full ${parseFloat(theoryPercentage) >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                            style={{ width: `${Math.min(100, parseFloat(theoryPercentage))}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-100">
                                    <div className="flex items-center justify-between text-slate-500 mb-1">
                                        <span className="font-medium">Labs</span>
                                        <span className="font-bold text-slate-800">{labPercentage}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className={`h-1.5 rounded-full ${parseFloat(labPercentage) >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                            style={{ width: `${Math.min(100, parseFloat(labPercentage))}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Activity Overview Heatmap */}
                        <div className="md:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Activity Overview
                                </span>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                    <span>Less</span>
                                    <span className="w-2.5 h-2.5 rounded-xs bg-slate-100 border border-slate-200 inline-block" />
                                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-300 inline-block" />
                                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                                    <span>More</span>
                                </div>
                            </div>

                            {/* Weekly Matrix Representation with Abbreviation Hover */}
                            <div className="my-auto py-2">
                                <SharedAttendanceHeatmap subjects={activeSubjects} weeksCount={16} />
                            </div>
                        </div>

                        {/* Risk Nodes Summary */}
                        <div className="md:col-span-3 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                                    {riskSubjects.length} Risk Nodes
                                </span>
                                <span className="text-[11px] font-medium text-slate-400">&lt; 75% Cutoff</span>
                            </div>

                            <div className="my-2 space-y-1.5 text-xs max-h-[110px] overflow-y-auto no-scrollbar">
                                {riskSubjects.length > 0 ? (
                                    riskSubjects.slice(0, 4).map(sub => (
                                        <div key={sub.id} className="flex items-center justify-between py-1 border-b border-slate-50">
                                            <span className="text-slate-700 truncate pr-2 font-medium" title={sub.name}>
                                                {sub.name}
                                            </span>
                                            <span className="font-semibold text-rose-600 font-mono">
                                                {getPrecisePct(sub)}%
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-4 text-center text-emerald-600 font-medium">
                                        All subjects safely above 75% cutoff
                                    </div>
                                )}
                            </div>
                            <div className="text-[11px] text-slate-400">
                                {riskSubjects.length > 0 ? 'Immediate recovery action advised' : 'Academic threshold maintained'}
                            </div>
                        </div>
                    </section>
                )}

                {isTeacher ? (
                    <div className="space-y-6">
                        {/* Navigation Tabs for Faculty */}
                        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                            <button
                                type="button"
                                onClick={() => setTeacherActiveTab('nc')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                                    teacherActiveTab === 'nc'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[16px]">fact_check</span>
                                <span>Absence Consideration (NC) Queue ({allFacultyNc.length})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTeacherActiveTab('courses')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                                    teacherActiveTab === 'courses'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                            >
                                <span className="material-symbols-outlined text-[16px]">list_alt</span>
                                <span>Course Registers ({subjects?.length || 0})</span>
                            </button>
                        </div>

                        {teacherActiveTab === 'nc' ? (
                            <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-5 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-base font-bold text-slate-900">Student NC Consideration Claims</h2>
                                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                                                B2 Vault
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">Evaluate non-attendance certificates and legitimate absence claims submitted by students.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={fetchAllFacultyNc}
                                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer transition"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                                            <span>Refresh</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/70">
                                    <div className="flex items-center gap-1">
                                        {[
                                            { id: 'ALL', label: 'All', count: allFacultyNc.length },
                                            { id: 'PENDING', label: 'Pending', count: allFacultyNc.filter(r => r.status === 'PENDING').length },
                                            { id: 'APPROVED', label: 'Approved', count: allFacultyNc.filter(r => r.status === 'APPROVED').length },
                                            { id: 'REJECTED', label: 'Rejected', count: allFacultyNc.filter(r => r.status === 'REJECTED').length }
                                        ].map(st => (
                                            <button
                                                key={st.id}
                                                type="button"
                                                onClick={() => setGlobalNcFilterStatus(st.id)}
                                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                                                    globalNcFilterStatus === st.id
                                                        ? 'bg-blue-600 text-white shadow-xs'
                                                        : 'text-slate-600 hover:bg-slate-200/60'
                                                }`}
                                            >
                                                <span>{st.label}</span>
                                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                                    globalNcFilterStatus === st.id ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'
                                                }`}>
                                                    {st.count}
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <select
                                            value={globalNcFilterSubject}
                                            onChange={e => setGlobalNcFilterSubject(e.target.value)}
                                            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="ALL">All Assigned Courses</option>
                                            {subjects?.map(s => (
                                                <option key={s.id} value={s.name}>{s.name}</option>
                                            ))}
                                        </select>
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                            <input
                                                type="text"
                                                value={globalNcSearch}
                                                onChange={e => setGlobalNcSearch(e.target.value)}
                                                placeholder="Search PRN or name..."
                                                className="text-xs bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 outline-none w-44 focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-1">
                                    {allFacultyNcLoading ? (
                                        <div className="py-14 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span>Loading student absence requests...</span>
                                        </div>
                                    ) : allFacultyNc.filter(r => {
                                        if (globalNcFilterStatus !== 'ALL' && r.status !== globalNcFilterStatus) return false;
                                        if (globalNcFilterSubject !== 'ALL' && !r.missedSubjects?.some(ms => ms.subjectName === globalNcFilterSubject)) return false;
                                        if (globalNcSearch.trim()) {
                                            const q = globalNcSearch.toLowerCase();
                                            return r.studentName?.toLowerCase().includes(q) || r.studentPrn?.toLowerCase().includes(q);
                                        }
                                        return true;
                                    }).length === 0 ? (
                                        <div className="py-14 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 p-6 space-y-2">
                                            <FileCheck className="w-8 h-8 text-slate-400 mx-auto" />
                                            <h4 className="font-bold text-sm text-slate-800">No Applications Found</h4>
                                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                                There are no student absence consideration claims matching the selected filter.
                                            </p>
                                        </div>
                                    ) : (
                                        allFacultyNc.filter(r => {
                                            if (globalNcFilterStatus !== 'ALL' && r.status !== globalNcFilterStatus) return false;
                                            if (globalNcFilterSubject !== 'ALL' && !r.missedSubjects?.some(ms => ms.subjectName === globalNcFilterSubject)) return false;
                                            if (globalNcSearch.trim()) {
                                                const q = globalNcSearch.toLowerCase();
                                                return r.studentName?.toLowerCase().includes(q) || r.studentPrn?.toLowerCase().includes(q);
                                            }
                                            return true;
                                        }).map(req => {
                                            const initials = (req.studentName || 'ST')
                                                .split(' ')
                                                .filter(Boolean)
                                                .slice(0, 2)
                                                .map(p => p[0])
                                                .join('')
                                                .toUpperCase();

                                            return (
                                                <div
                                                    key={req.id}
                                                    className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                                                >
                                                    <div className="flex items-start gap-3.5 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/60">
                                                            {initials}
                                                        </div>
                                                        <div className="space-y-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-sm text-slate-900">{req.studentName}</span>
                                                                <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/60">
                                                                    {req.studentPrn}
                                                                </span>
                                                                {req.missedSubjects && req.missedSubjects.length > 0 && (
                                                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100/60">
                                                                        {req.missedSubjects[0].subjectName}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="text-xs text-slate-600 flex items-center gap-2 flex-wrap pt-0.5">
                                                                <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md text-slate-700">
                                                                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                                                    <span>{(req.absentDates || []).join(', ')}</span>
                                                                </span>
                                                                <span className="text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60 px-2 py-0.5 rounded-md">
                                                                    {req.reason}
                                                                </span>
                                                                {req.description && (
                                                                    <span className="text-slate-500 italic max-w-sm truncate" title={req.description}>
                                                                        "{req.description}"
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {req.reviewComment && (
                                                                <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200/60 p-2 rounded-xl mt-1.5 flex items-start gap-1.5">
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                                                    <span><strong>Faculty Note ({req.reviewedBy}):</strong> "{req.reviewComment}"</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                                                            req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' :
                                                            req.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200/80' :
                                                            'bg-amber-50 text-amber-700 border border-amber-200/80'
                                                        }`}>
                                                            {req.status === 'PENDING' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>}
                                                            {req.status === 'APPROVED' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                                                            {req.status === 'REJECTED' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                                                            <span>{req.status}</span>
                                                        </span>

                                                        {req.proofFileName && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setDocPreviewUrl(getNcProofUrl(req));
                                                                    setDocPreviewName(req.proofFileName);
                                                                }}
                                                                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                                                            >
                                                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                                                                <span>Proof</span>
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setReviewingReq(req);
                                                                setReviewDecision(req.status === 'REJECTED' ? 'REJECTED' : 'APPROVED');
                                                                setReviewComment(req.reviewComment || '');
                                                            }}
                                                            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer"
                                                        >
                                                            <FileCheck className="w-3.5 h-3.5" />
                                                            <span>Review</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </section>
                        ) : (
                            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {subjects?.map(sub => {
                                    const conducted = sub.totalConducted > 0 ? sub.totalConducted : (sub.detailedAttendance?.length || 0);
                                    return (
                                        <div
                                            key={sub.id}
                                            onClick={() => {
                                                setSelectedSubject(sub);
                                                setShowDetailModal(true);
                                                setModalTab('presence');
                                                fetchSubjectNcRequests(sub);
                                            }}
                                            className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition cursor-pointer space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                                    {sub.code || 'COURSE'}
                                                </span>
                                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                    {conducted} Lectures Logged
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-sm text-slate-900 leading-tight">{sub.name}</h3>
                                            <p className="text-[11px] text-slate-500">{sub.department} • {sub.semester}</p>
                                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-bold">
                                                <span>Open Course Presence &amp; NC</span>
                                                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </section>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Minimizable Attendance Optimization & Strategy Panel */}
                        <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition-all">
                    {/* Header with Minimize / Expand toggle */}
                    <div 
                        onClick={() => setIsOptMinimized(!isOptMinimized)}
                        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[18px]">tune</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">Attendance Optimization &amp; Strategy</h2>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                        Pacing Simulator
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    Target simulation, safe skip allowances, and required lecture pacing
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {isOptMinimized && optEngine && (
                                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full">
                                    <span>Target: <strong className="text-blue-600">{optTarget}%</strong></span>
                                    <span className="text-slate-300">•</span>
                                    <span>Safe Skips: <strong className="text-emerald-600">{optEngine.SkipableOverall}</strong></span>
                                    <span className="text-slate-300">•</span>
                                    <span>Must Attend: <strong className="text-amber-600">{optEngine.mustAttendOverall}</strong></span>
                                </div>
                            )}
                            <button 
                                type="button" 
                                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
                                title={isOptMinimized ? "Expand Optimization Planner" : "Minimize Optimization Planner"}
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    {isOptMinimized ? 'expand_more' : 'expand_less'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Expanded Content */}
                    {!isOptMinimized && optEngine && (
                        <div className="border-t border-slate-100 p-5 space-y-5 animate-in slide-in-from-top-1 duration-200">
                            {/* Top Controls Row */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Horizon:
                                    </span>
                                    <span className="text-xs font-medium text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                                        {optEngine.weeksRemaining} Weeks Left
                                    </span>

                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                                        Target:
                                    </span>
                                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setOptTarget(prev => Math.max(50, prev - 1)); }}
                                            className="w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold text-xs"
                                            type="button"
                                        >
                                            -
                                        </button>
                                        <span className="text-xs font-bold text-blue-600 min-w-[32px] text-center">
                                            {optTarget}%
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setOptTarget(prev => Math.min(100, prev + 1)); }}
                                            className="w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold text-xs"
                                            type="button"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowOptSettings(!showOptSettings); }}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${showOptSettings
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-[15px]">settings</span>
                                        <span>{showOptSettings ? 'Hide Parameters' : 'Adjust Parameters'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Parameter Settings (Date & LPW) */}
                            {showOptSettings && (
                                <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800">Semester &amp; Frequency Tuning</h4>
                                            <p className="text-[11px] text-slate-500">Customize the semester end date and weekly lectures per subject</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                                                Semester Lock Date
                                            </label>
                                            <input
                                                type="date"
                                                value={semesterLockDate}
                                                onChange={e => setSemesterLockDate(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 mb-3">
                                            <div>
                                                <h5 className="text-xs font-bold text-slate-800 tracking-tight">Weekly Lecture Frequency &amp; Inclusions</h5>
                                                <p className="text-[11px] text-slate-400">Include subjects in simulation and adjust lectures per week (LPW)</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setExcludedIds([])}
                                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                                                >
                                                    Select All
                                                </button>
                                                <span className="text-slate-300">•</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setExcludedIds((subjects || []).map(s => s.id || s.code))}
                                                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer"
                                                >
                                                    Deselect All
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                            {subjects?.map(s => {
                                                const id = s.id || s.code;
                                                const isIncluded = !excludedIds.includes(s.id) && !excludedIds.includes(s.code);
                                                return (
                                                    <div
                                                        key={id}
                                                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                                                            isIncluded
                                                                ? 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                                                                : 'bg-slate-50/70 border-slate-200/60 opacity-50'
                                                        }`}
                                                    >
                                                        <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer pr-2 select-none">
                                                            <input
                                                                type="checkbox"
                                                                checked={isIncluded}
                                                                onChange={() => {
                                                                    setExcludedIds(prev =>
                                                                        isIncluded
                                                                            ? [...prev, id]
                                                                            : prev.filter(x => x !== s.id && x !== s.code)
                                                                    );
                                                                }}
                                                                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
                                                            />
                                                            <span className={`text-xs font-medium truncate ${isIncluded ? 'text-slate-800' : 'text-slate-400 line-through'}`} title={s.name}>
                                                                {s.name}
                                                            </span>
                                                        </label>
                                                        <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-slate-100">
                                                            <span className="text-[10px] font-semibold text-slate-400 uppercase">LPW</span>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max="10"
                                                                disabled={!isIncluded}
                                                                value={manualLPWs[id] ?? calculateLPW(s)}
                                                                onChange={e => setManualLPWs(prev => ({
                                                                    ...prev,
                                                                    [id]: Math.max(1, Number(e.target.value))
                                                                }))}
                                                                className={`w-8 h-6 border rounded-md text-center text-xs font-bold outline-none transition ${
                                                                    isIncluded ? 'text-blue-600 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500' : 'text-slate-400 bg-slate-100 border-slate-200'
                                                                }`}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 4-Stat Metric Strip */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 flex flex-col justify-between">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Current Attendance</span>
                                    <div className="my-1 flex items-baseline gap-1.5">
                                        <span className="text-xl font-extrabold text-slate-900">{optEngine.currentOverall.toFixed(1)}%</span>
                                        <span className="text-[11px] text-slate-400 font-medium">({optEngine.totalAttended}/{optEngine.totalConducted})</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">Institutional baseline</span>
                                </div>

                                <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 flex flex-col justify-between">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Projected Attendance</span>
                                    <div className="my-1 flex items-baseline gap-1.5">
                                        <span className="text-xl font-extrabold text-blue-600">{optEngine.projectedFinal.toFixed(1)}%</span>
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full border ${!optEngine.isImpossible ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
                                            {!optEngine.isImpossible ? 'Achievable' : `Deficit: ${optEngine.deficit}`}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">Target goal: {optTarget}%</span>
                                </div>

                                <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 flex flex-col justify-between">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Must Attend</span>
                                    <div className="my-1 flex items-baseline gap-1">
                                        <span className="text-xl font-extrabold text-amber-600">{optEngine.mustAttendOverall}</span>
                                        <span className="text-xs text-slate-500 font-normal">lectures</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">Required future sessions</span>
                                </div>

                                <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 flex flex-col justify-between">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Safe Skips</span>
                                    <div className="my-1 flex items-baseline gap-1">
                                        <span className="text-xl font-extrabold text-emerald-600">{optEngine.SkipableOverall}</span>
                                        <span className="text-xs text-slate-500 font-normal">sessions</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">Allowed without penalty</span>
                                </div>
                            </div>

                            {/* Subject Strategy Table */}
                            <div>
                                {/* Filter Pills */}
                                <div className="flex items-center gap-1.5 mb-3 overflow-x-auto no-scrollbar">
                                    {[
                                        { id: 'all', label: 'All Subjects', count: optEngine.plan.length },
                                        { id: 'theory', label: 'Theory', count: optEngine.plan.filter(s => !s.isLab).length },
                                        { id: 'lab', label: 'Labs', count: optEngine.plan.filter(s => s.isLab).length },
                                        { id: 'risk', label: 'Risk (< Target)', count: optEngine.plan.filter(s => s.currentPct < optTarget).length },
                                        { id: 'priority', label: 'Priority Impact', count: optPriorityIds.size },
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => setOptFilter(f.id)}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${optFilter === f.id
                                                    ? 'bg-blue-600 text-white shadow-2xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                                                }`}
                                        >
                                            <span>{f.label}</span>
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${optFilter === f.id ? 'bg-blue-700 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                                                {f.count}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Plan Rows */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                                    {filteredOptPlan.map(sub => {
                                        const isSafe = sub.currentPct >= optTarget;
                                        const isLab = sub.isLab;
                                        return (
                                            <div key={sub.id} className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`p-1.5 rounded-lg shrink-0 ${isSafe ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                                        <span className="material-symbols-outlined text-[16px]">
                                                            {isLab ? 'science' : 'menu_book'}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-xs font-semibold text-slate-800 truncate" title={sub.name}>
                                                                {sub.name}
                                                            </h4>
                                                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                                                                {sub.code || 'COURSE'}
                                                            </span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 mt-0.5">
                                                            Current: <strong className={isSafe ? 'text-slate-700' : 'text-amber-600'}>{sub.currentPct}%</strong> • Remaining: {sub.rem} lectures
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                                    {sub.attend > 0 ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                                            Attend {sub.attend} more
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                                            {sub.skip} {sub.skip === 1 ? 'Skip' : 'Skips'} Safe
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* Main Two-Column Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Primary Subject Attendance Table */}
                    <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                        {/* Filter Bar */}
                        <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                                <button
                                    onClick={() => setFilterTab('all')}
                                    className={`px-3 py-1.5 rounded-md transition cursor-pointer ${filterTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    All Subjects ({activeSubjects.length})
                                </button>
                                <button
                                    onClick={() => setFilterTab('attention')}
                                    className={`px-3 py-1.5 rounded-md transition cursor-pointer ${filterTab === 'attention' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    Needs Attention ({riskSubjects.length})
                                </button>
                                <button
                                    onClick={() => setFilterTab('safe')}
                                    className={`px-3 py-1.5 rounded-md transition cursor-pointer ${filterTab === 'safe' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                >
                                    Safe ({safeSubjects.length})
                                </button>
                            </div>
                            <span className="text-xs text-slate-400 font-medium">Minimum Threshold: 75.0%</span>
                        </div>

                        {/* Subject Rows List */}
                        <div className="divide-y divide-slate-100">
                            {displayedSubjects.map(sub => {
                                const conducted = sub.totalConducted > 0 ? sub.totalConducted : (sub.detailedAttendance?.length || 0);
                                const attended = sub.totalAttended > 0 ? sub.totalAttended : (sub.detailedAttendance?.filter(r => r.status === 'Present').length || 0);
                                const pct = getPrecisePct(sub);
                                const isSafe = pct >= 75;
                                const isLab = getCategory(sub) === 'LAB';

                                // Skips vs Recovery
                                const SkipsAvailable = Math.max(0, Math.floor((attended - 0.75 * conducted) / 0.75));
                                const sessionsNeeded = Math.max(0, Math.ceil((0.75 * conducted - attended) / 0.25));

                                return (
                                    <div
                                        key={sub.id}
                                        onClick={() => {
                                            setSelectedSubject(sub);
                                            setShowDetailModal(true);
                                            setModalTab('presence');
                                            fetchSubjectNcRequests(sub);
                                            setSelectedNcDates([]);
                                            setReviewingReq(null);
                                        }}
                                        className={`p-4 sm:px-6 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer ${!isSafe ? 'bg-amber-50/20' : ''
                                            }`}
                                    >
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className={`p-2 rounded-lg mt-0.5 ${isSafe ? 'bg-blue-50 text-blue-600' : 'bg-amber-100/60 text-amber-700'
                                                }`}>
                                                <span className="material-symbols-outlined text-[18px]">
                                                    {isLab ? 'science' : 'menu_book'}
                                                </span>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-semibold text-slate-900 truncate">
                                                    {sub.name}
                                                </h3>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                                                    <span>{attended} / {conducted} sessions</span>
                                                    <span className="text-slate-300">•</span>
                                                    <span>Target: 75%</span>
                                                    {sub.faculty && (
                                                        <>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="text-slate-400 truncate">{sub.faculty}</span>
                                                        </>
                                                    )}
                                                </div>
                                                {/* Minimal Progress Bar */}
                                                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                                                    <div
                                                        className={`h-1.5 rounded-full ${isSafe ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                        style={{ width: `${Math.min(100, pct)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 gap-1.5">
                                            <div className="text-right">
                                                <span className={`text-base font-bold ${isSafe ? 'text-slate-900' : 'text-amber-600'}`}>
                                                    {pct}%
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {isSafe ? (
                                                    <span className="inline-flex items-center text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                        {SkipsAvailable} {SkipsAvailable === 1 ? 'Skip' : 'Skips'} Available
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                                        Attend {sessionsNeeded} More
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Right Column: Session Audit Rail */}
                    <section className="lg:col-span-4 space-y-4">
                        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">Session Audit</h2>
                                    <p className="text-[11px] text-slate-400">Recent chronological logs</p>
                                </div>
                                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                    Latest Logs
                                </span>
                            </div>

                            {/* Log timeline list */}
                            <div className="py-2 space-y-2.5 max-h-[500px] overflow-y-auto no-scrollbar">
                                {sessionLogs.length > 0 ? (
                                    sessionLogs.map((log, idx) => {
                                        const isPresent = log.status === 'Present';
                                        return (
                                            <div
                                                key={idx}
                                                className={`p-3 rounded-lg border transition ${isPresent
                                                        ? 'border-slate-100 bg-slate-50/50 hover:bg-slate-50'
                                                        : 'border-rose-100 bg-rose-50/30 hover:bg-rose-50/50'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[11px] font-mono text-slate-400">
                                                        {log.date} {log.time ? `• ${log.time}` : ''}
                                                    </span>
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${isPresent
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-rose-100 text-rose-800'
                                                        }`}>
                                                        {log.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-semibold text-slate-800 truncate">
                                                    {log.subjectName}
                                                </p>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="py-8 text-center text-xs text-slate-400">
                                        No recent logs found
                                    </div>
                                )}
                            </div>

                            {/* Regulatory Policy Notice Footer */}
                            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed bg-slate-50/80 p-3 rounded-lg">
                                <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1">
                                    <span className="material-symbols-outlined text-[15px] text-blue-600">info</span>
                                    <span>Academic Attendance Policy</span>
                                </div>
                                75% minimum physical presence is mandatory for End-Semester Examination eligibility. Medical condonation forms must be submitted within 7 calendar days of recovery.
                            </div>
                        </div>
                    </section>
                </div>
                    </>
                )}
            </div>

            {/* Subject Detail & NC Management Modal */}
            {showDetailModal && selectedSubject && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
                    onClick={() => {
                        setShowDetailModal(false);
                        setReviewingReq(null);
                        setDocPreviewUrl(null);
                    }}
                >
                    <div
                        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                                        {selectedSubject.name}
                                    </h3>
                                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold font-mono">
                                        {selectedSubject.code || 'Course'}
                                    </span>
                                    <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                        Attendance: {getPrecisePct(selectedSubject)}%
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60 font-medium">
                                        <Shield className="w-3 h-3 text-blue-600" />
                                        Dedicated B2 Vault: <span className="font-mono">eduvault-nc-proofs</span>
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span>{isTeacher ? `Faculty: ${teacherName}` : `PRN: ${profile?.prn || 'Student'}`}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setShowDetailModal(false);
                                    setReviewingReq(null);
                                    setDocPreviewUrl(null);
                                }}
                                className="self-end sm:self-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Modal Navigation Tabs */}
                        <div className="px-4 sm:px-5 pt-3 border-b border-slate-200 bg-white flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setModalTab('presence')}
                                    className={`px-3.5 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                                        modalTab === 'presence'
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-[16px]">list_alt</span>
                                    <span>Presence Log (P / Absent)</span>
                                </button>
                                <button
                                    onClick={() => setModalTab('nc')}
                                    className={`px-3.5 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                                        modalTab === 'nc'
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Absence Consideration (NC)</span>
                                    {subjectNcRequests.length > 0 && (
                                        <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                                            {subjectNcRequests.length}
                                        </span>
                                    )}
                                </button>
                            </div>

                            <button
                                onClick={() => fetchSubjectNcRequests(selectedSubject)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                                title="Refresh NC data"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                            {/* TAB 1: PRESENCE LOG */}
                            {modalTab === 'presence' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Date-Wise Lecture Sessions & Absence Status
                                        </span>
                                        {!isTeacher && (
                                            <button
                                                onClick={() => setModalTab('nc')}
                                                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                                            >
                                                <UploadCloud className="w-3.5 h-3.5" />
                                                <span>Apply NC for Absences</span>
                                            </button>
                                        )}
                                    </div>

                                    {selectedSubject.detailedAttendance && selectedSubject.detailedAttendance.length > 0 ? (
                                        <div className="space-y-2">
                                            {selectedSubject.detailedAttendance.map((rec, i) => {
                                                const isAbsent = rec.status === 'Absent';
                                                const existingNc = subjectNcRequests.find(r => 
                                                    r.absentDates && r.absentDates.includes(rec.date)
                                                );

                                                return (
                                                    <div
                                                        key={i}
                                                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border text-xs gap-2 transition ${
                                                            isAbsent ? 'bg-rose-50/40 border-rose-100' : 'bg-slate-50/70 border-slate-100'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <Calendar className={`w-4 h-4 ${isAbsent ? 'text-rose-500' : 'text-slate-400'}`} />
                                                            <div>
                                                                <span className="font-mono font-semibold text-slate-700">{rec.date}</span>
                                                                {(rec.slot || rec.time) && (
                                                                    <span className="text-[11px] text-slate-500 ml-2 font-mono">
                                                                        ({rec.slot || rec.time})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                                                            {/* Standard Presence Status */}
                                                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                                                !isAbsent
                                                                    ? 'bg-emerald-100 text-emerald-800'
                                                                    : 'bg-rose-100 text-rose-800'
                                                            }`}>
                                                                {rec.status}
                                                            </span>

                                                            {/* NC Status / Apply Action */}
                                                            {isAbsent && (
                                                                <>
                                                                    {existingNc ? (
                                                                        existingNc.status === 'APPROVED' ? (
                                                                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                                                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> NC Approved
                                                                            </span>
                                                                        ) : existingNc.status === 'PENDING' ? (
                                                                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                                                                                <Clock className="w-3 h-3 text-amber-600" /> NC Pending
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1">
                                                                                <XCircle className="w-3 h-3 text-rose-600" /> NC Rejected
                                                                            </span>
                                                                        )
                                                                    ) : (
                                                                        !isTeacher && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedNcDates([rec.date]);
                                                                                    setModalTab('nc');
                                                                                }}
                                                                                className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                                                                            >
                                                                                <UploadCloud className="w-3 h-3" /> Apply NC
                                                                            </button>
                                                                        )
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 py-8 text-center">No detailed logs stored for this subject.</p>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: NC MANAGEMENT */}
                            {modalTab === 'nc' && (
                                <div className="space-y-5">
                                    {/* STUDENT VIEW */}
                                    {!isTeacher ? (
                                        <div className="space-y-6">
                                            {/* Submit NC Form */}
                                            <form onSubmit={handleSubmitSubjectNc} className="bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                                                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Shield className="w-4 h-4 text-blue-600" />
                                                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                                                            Submit Absence Consideration Request
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] text-slate-500 font-mono">
                                                        Course: {selectedSubject.code || selectedSubject.name}
                                                    </span>
                                                </div>

                                                {/* 1. Pick Absent Date(s) */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                                        <span>1. Select Absent Date(s) to Regularize</span>
                                                        <span className="text-[11px] font-normal text-slate-500 font-mono">
                                                            {selectedNcDates.length} selected
                                                        </span>
                                                    </label>

                                                    {(() => {
                                                        const absentRecords = (selectedSubject.detailedAttendance || []).filter(r => r.status === 'Absent');
                                                        const activeDateSet = new Set(
                                                            (subjectNcRequests || [])
                                                                .filter(r => r.status !== 'REJECTED')
                                                                .flatMap(r => r.absentDates || [])
                                                        );

                                                        if (absentRecords.length === 0) {
                                                            return (
                                                                <p className="text-xs text-slate-400 italic py-2">
                                                                    No absence records registered for this subject.
                                                                </p>
                                                            );
                                                        }

                                                        return (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                                                                {absentRecords.map((rec, idx) => {
                                                                    const isAlreadyFiled = activeDateSet.has(rec.date);
                                                                    const isSelected = selectedNcDates.includes(rec.date);

                                                                    return (
                                                                        <div
                                                                            key={idx}
                                                                            onClick={() => {
                                                                                if (isAlreadyFiled) {
                                                                                    toast.warning(`NC already requested for ${rec.date}`);
                                                                                    return;
                                                                                }
                                                                                setSelectedNcDates(prev =>
                                                                                    prev.includes(rec.date)
                                                                                        ? prev.filter(d => d !== rec.date)
                                                                                        : [...prev, rec.date]
                                                                                );
                                                                            }}
                                                                            className={`p-2 rounded-xl border text-xs cursor-pointer transition ${
                                                                                isAlreadyFiled
                                                                                    ? 'opacity-50 bg-slate-100 border-slate-200 cursor-not-allowed'
                                                                                    : isSelected
                                                                                    ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                                                                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                                                            }`}
                                                                        >
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="font-bold flex items-center gap-1.5 font-mono">
                                                                                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                                                                    {rec.date}
                                                                                </span>
                                                                                {isAlreadyFiled ? (
                                                                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                                                                        Already Filed
                                                                                    </span>
                                                                                ) : (
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={isSelected}
                                                                                        onChange={() => {}}
                                                                                        className="rounded text-blue-600"
                                                                                    />
                                                                                )}
                                                                            </div>
                                                                            {(rec.slot || rec.time) && (
                                                                                <span className="text-[10px] text-slate-500 font-mono block mt-1">
                                                                                    Slot: {rec.slot || rec.time}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                {/* 2. Select Reason */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-700">2. Reason for Absence</label>
                                                    <select
                                                        value={ncReason}
                                                        onChange={(e) => setNcReason(e.target.value)}
                                                        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                                                    >
                                                        {NC_REASONS.map(r => (
                                                            <option key={r} value={r}>{r}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* 3. Description */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-700">3. Description / Explanation (Optional)</label>
                                                    <textarea
                                                        value={ncDescription}
                                                        onChange={(e) => setNcDescription(e.target.value)}
                                                        placeholder="Provide brief context or doctor / hospital / event reference..."
                                                        rows={2}
                                                        className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </div>

                                                {/* 4. Upload Proof File to Backblaze B2 */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-700">
                                                        4. Supporting Proof Document (PDF, PNG, JPG, WEBP)
                                                    </label>
                                                    <div className="border border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-3 text-center bg-white transition cursor-pointer relative">
                                                        <input
                                                            type="file"
                                                            accept=".pdf,.png,.jpg,.jpeg,.webp"
                                                            onChange={(e) => {
                                                                if (e.target.files && e.target.files[0]) {
                                                                    setNcProofFile(e.target.files[0]);
                                                                }
                                                            }}
                                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                        />
                                                        <div className="space-y-0.5">
                                                            <UploadCloud className="w-5 h-5 text-blue-600 mx-auto" />
                                                            <p className="text-xs font-semibold text-slate-800">
                                                                {ncProofFile ? ncProofFile.name : 'Upload Certificate / Document'}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">
                                                                Saved to isolated Backblaze B2 bucket: <span className="font-mono">eduvault-nc-proofs</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Submit Button */}
                                                <div className="flex justify-end pt-1">
                                                    <button
                                                        type="submit"
                                                        disabled={isSubmittingNc || selectedNcDates.length === 0 || !ncProofFile}
                                                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer"
                                                    >
                                                        {isSubmittingNc ? (
                                                            <>
                                                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                                <span>Uploading to Backblaze B2...</span>
                                                            </>
                                                        ) : (
                                                            <span>Submit NC Request</span>
                                                        )}
                                                    </button>
                                                </div>
                                            </form>

                                            {/* Student's Existing NC Requests for this Subject */}
                                            <div className="space-y-2">
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                                    Your NC Requests for this Course ({subjectNcRequests.length})
                                                </span>
                                                {subjectNcRequests.length === 0 ? (
                                                    <p className="text-xs text-slate-400 py-3 text-center">No NC requests filed yet for this course.</p>
                                                ) : (
                                                    subjectNcRequests.map((req) => (
                                                        <div key={req.id} className="p-3 rounded-xl border border-slate-200 bg-white text-xs space-y-1.5 shadow-xs">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-bold text-slate-900 font-mono">
                                                                    Dates: {(req.absentDates || []).join(', ')}
                                                                </span>
                                                                {req.status === 'APPROVED' ? (
                                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] flex items-center gap-1">
                                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                                                                    </span>
                                                                ) : req.status === 'PENDING' ? (
                                                                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px] flex items-center gap-1">
                                                                        <Clock className="w-3 h-3 text-amber-600" /> Pending Review
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] flex items-center gap-1">
                                                                        <XCircle className="w-3 h-3 text-rose-600" /> Rejected
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-slate-600 flex items-center justify-between">
                                                                <span>Reason: <strong>{req.reason}</strong></span>
                                                                {req.proofFileName && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setDocPreviewUrl(getNcProofUrl(req));
                                                                            setDocPreviewName(req.proofFileName);
                                                                        }}
                                                                        className="text-blue-600 hover:underline font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5" /> View Proof
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {req.reviewComment && (
                                                                <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                                                                    Faculty Comment ({req.reviewedBy}): "{req.reviewComment}"
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        /* TEACHER VIEW INSIDE MODAL */
                                        <div className="space-y-4">
                                            {/* Teacher Filter Controls */}
                                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                                                <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                                                    <Search className="w-3.5 h-3.5 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search student PRN or name..."
                                                        value={teacherNcSearchStudent}
                                                        onChange={(e) => setTeacherNcSearchStudent(e.target.value)}
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-500 font-semibold text-[11px]">Status:</span>
                                                    <select
                                                        value={teacherNcFilterStatus}
                                                        onChange={(e) => setTeacherNcFilterStatus(e.target.value)}
                                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                                    >
                                                        <option value="ALL">All Statuses</option>
                                                        <option value="PENDING">Pending Only</option>
                                                        <option value="APPROVED">Approved Only</option>
                                                        <option value="REJECTED">Rejected Only</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Requests List for Teacher */}
                                            <div className="space-y-2">
                                                {subjectNcRequests.length === 0 ? (
                                                    <p className="text-xs text-slate-400 py-6 text-center">
                                                        No NC absence requests found for this course.
                                                    </p>
                                                ) : (
                                                    subjectNcRequests.map((req) => (
                                                        <div key={req.id} className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs space-y-2 shadow-xs">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <span className="font-bold text-slate-900 text-sm">
                                                                        {req.studentName}
                                                                    </span>
                                                                    <span className="text-slate-500 text-[11px] ml-2 font-mono">
                                                                        PRN: {req.studentPrn} {req.rollNo ? `(Roll: ${req.rollNo})` : ''}
                                                                    </span>
                                                                </div>
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                    req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                                    req.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                                                    'bg-amber-50 text-amber-700 border border-amber-200'
                                                                }`}>
                                                                    {req.status}
                                                                </span>
                                                            </div>

                                                            <div className="text-slate-600 text-[11px] space-y-1">
                                                                <div>
                                                                    Absent Dates: <strong className="font-mono">{(req.absentDates || []).join(', ')}</strong>
                                                                </div>
                                                                <div>
                                                                    Reason: <strong>{req.reason}</strong>
                                                                    {req.description && <span className="italic text-slate-500 ml-1">("{req.description}")</span>}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                                                {req.proofFileName ? (
                                                                    <button
                                                                        onClick={() => {
                                                                            setDocPreviewUrl(getNcProofUrl(req));
                                                                            setDocPreviewName(req.proofFileName);
                                                                        }}
                                                                        className="text-blue-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer text-[11px]"
                                                                    >
                                                                        <Eye className="w-3.5 h-3.5" />
                                                                        <span>View Proof ({req.proofFileName})</span>
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-slate-400 italic">No proof file attached</span>
                                                                )}

                                                                <button
                                                                    onClick={() => {
                                                                        setReviewingReq(req);
                                                                        setReviewDecision(req.status === 'REJECTED' ? 'REJECTED' : 'APPROVED');
                                                                        setReviewComment(req.reviewComment || '');
                                                                    }}
                                                                    className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                                                                >
                                                                    Review Request
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>

                                            {/* Teacher Review Form Sub-section */}
                                            {reviewingReq && (
                                                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3 animate-in fade-in duration-150">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-xs text-blue-900">
                                                            Reviewing Student: {reviewingReq.studentName} ({reviewingReq.studentPrn})
                                                        </span>
                                                        <button
                                                            onClick={() => setReviewingReq(null)}
                                                            className="text-slate-400 hover:text-slate-600"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setReviewDecision('APPROVED')}
                                                            className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                                                reviewDecision === 'APPROVED'
                                                                    ? 'bg-emerald-600 text-white shadow-xs'
                                                                    : 'bg-white border border-slate-200 text-slate-700'
                                                            }`}
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve NC
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setReviewDecision('REJECTED')}
                                                            className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                                                reviewDecision === 'REJECTED'
                                                                    ? 'bg-rose-600 text-white shadow-xs'
                                                                    : 'bg-white border border-slate-200 text-slate-700'
                                                            }`}
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" /> Reject Request
                                                        </button>
                                                    </div>

                                                    <textarea
                                                        value={reviewComment}
                                                        onChange={(e) => setReviewComment(e.target.value)}
                                                        placeholder="Enter faculty review remarks or justification..."
                                                        rows={2}
                                                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none focus:ring-1 focus:ring-blue-500"
                                                    />

                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setReviewingReq(null)}
                                                            className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={handleTeacherReviewNc}
                                                            disabled={isSubmittingReview}
                                                            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                                                        >
                                                            {isSubmittingReview ? 'Saving...' : 'Save Decision'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Document Preview Modal */}
            {docPreviewUrl && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span className="font-bold text-xs sm:text-sm text-slate-900">{docPreviewName}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold font-mono">
                                    B2 Vault
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={docPreviewUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={docPreviewName}
                                    className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                                    title="Download Document"
                                >
                                    <Download className="w-4 h-4" />
                                </a>
                                <button
                                    onClick={() => setDocPreviewUrl(null)}
                                    className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 p-3 overflow-auto flex items-center justify-center bg-slate-100 min-h-[350px]">
                            {docPreviewUrl.toLowerCase().endsWith('.pdf') ? (
                                <iframe
                                    src={docPreviewUrl}
                                    title="NC Proof Preview"
                                    className="w-full h-[60vh] rounded-xl border border-slate-200 bg-white"
                                />
                            ) : (
                                <img
                                    src={docPreviewUrl}
                                    alt={docPreviewName}
                                    className="max-h-[60vh] object-contain rounded-xl border border-slate-200 shadow-xs"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                            )}
                            <div className="hidden text-center p-6 text-slate-500">
                                <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                                <p className="text-xs font-semibold">Document cannot be previewed directly in frame.</p>
                                <a
                                    href={docPreviewUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-2 inline-block px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                                >
                                    Download & View File
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Standalone Faculty Review Decision Modal */}
            {reviewingReq && (
                <div
                    className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
                    onClick={() => setReviewingReq(null)}
                >
                    <div
                        className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-sm text-slate-900">Review Absence Consideration (NC)</h3>
                                <p className="text-[11px] text-slate-500">
                                    Student: <strong className="text-slate-800">{reviewingReq.studentName}</strong> (PRN: {reviewingReq.studentPrn})
                                </p>
                            </div>
                            <button
                                onClick={() => setReviewingReq(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4 text-xs">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Dates of Absence:</span>
                                    <span className="font-bold font-mono text-slate-800">{(reviewingReq.absentDates || []).join(', ')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Reason Category:</span>
                                    <span className="font-semibold text-slate-800">{reviewingReq.reason}</span>
                                </div>
                                {reviewingReq.description && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Student Explanation:</span>
                                        <span className="italic text-slate-700 max-w-[240px] text-right truncate" title={reviewingReq.description}>"{reviewingReq.description}"</span>
                                    </div>
                                )}
                                {reviewingReq.missedSubjects && reviewingReq.missedSubjects.length > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Affected Course:</span>
                                        <span className="font-semibold text-blue-700">{reviewingReq.missedSubjects.map(m => m.subjectName).filter(Boolean).join(', ') || 'General'}</span>
                                    </div>
                                )}
                            </div>

                            {reviewingReq.proofFileName && (
                                <div className="flex items-center justify-between p-2.5 rounded-xl border border-blue-100 bg-blue-50/60">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                        <span className="font-semibold text-slate-800 truncate max-w-[200px]">{reviewingReq.proofFileName}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDocPreviewUrl(getNcProofUrl(reviewingReq));
                                            setDocPreviewName(reviewingReq.proofFileName);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Preview Proof</span>
                                    </button>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="font-bold text-slate-700">Review Decision</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setReviewDecision('APPROVED')}
                                        className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                            reviewDecision === 'APPROVED'
                                                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Approve Consideration
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setReviewDecision('REJECTED')}
                                        className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                                            reviewDecision === 'REJECTED'
                                                ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30'
                                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <XCircle className="w-4 h-4" /> Reject Claim
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="font-bold text-slate-700">Faculty Remarks / Justification</label>
                                    <span className="text-[10px] text-slate-400">Optional notes</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pb-1">
                                    {[
                                        'Verified with medical proof',
                                        'Approved for university event',
                                        'Granted as per department guideline',
                                        'Proof document is unclear / invalid'
                                    ].map((preset, idx) => (
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
                                    placeholder="Add approval note, conditional remarks, or rejection reason..."
                                    rows={2}
                                    className="w-full text-xs bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-blue-500 transition"
                                />
                            </div>

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
                                    onClick={handleTeacherReviewNc}
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
        </div>
    );
};

export default AttendanceAnalytics;

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import SharedAttendanceHeatmap from './SharedAttendanceHeatmap';
import FacultyAttendance from './FacultyAttendance';
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
    RefreshCw,
    TrendingUp
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
    const [showNcModal, setShowNcModal] = useState(false);
    const [ncModalTab, setNcModalTab] = useState('requests'); // 'requests' | 'apply'
    const [ncModalSubject, setNcModalSubject] = useState(null);
    const [myNcRequests, setMyNcRequests] = useState([]);
    const [myNcLoading, setMyNcLoading] = useState(false);

    // Subject Notion-style list filters
    const [subjectFilterTab, setSubjectFilterTab] = useState('all'); // 'all', 'Present', 'Absent', 'Excused'
    const [subjectSearchQuery, setSubjectSearchQuery] = useState('');

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

    const fetchMyNcRequests = async () => {
        if (isTeacher) return;
        setMyNcLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/nc/my-requests`, {
                params: { prn: profile?.prn }
            });
            const data = Array.isArray(res.data) ? res.data : [];
            setMyNcRequests(data);
        } catch (e) {
            console.error('Failed to load student NC requests', e);
        } finally {
            setMyNcLoading(false);
        }
    };

    useEffect(() => {
        if (isTeacher) {
            fetchAllFacultyNc();
        } else {
            fetchMyNcRequests();
        }
    }, [isTeacher, profile?.prn]);

    const openNcModal = (tab = 'requests', subject = null, preselectedDate = null) => {
        setNcModalTab(tab);
        const targetSub = subject || selectedSubject || (globalSubjects && globalSubjects.length > 0 ? globalSubjects[0] : null);
        setNcModalSubject(targetSub);
        if (preselectedDate) {
            setSelectedNcDates([preselectedDate]);
        } else {
            setSelectedNcDates([]);
        }
        setShowNcModal(true);
        if (isTeacher) {
            fetchAllFacultyNc();
        } else {
            fetchMyNcRequests();
        }
    };

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
        if (e && e.preventDefault) e.preventDefault();
        const targetSub = ncModalSubject || selectedSubject;
        if (!targetSub) {
            toast.error('Please select a course for this request.');
            return;
        }
        if (selectedNcDates.length === 0) {
            toast.error('Please select at least one absent date.');
            return;
        }
        if (!ncProofFile) {
            toast.error('Please upload a supporting proof document (PDF, PNG, JPG).');
            return;
        }

        setIsSubmittingNc(true);
        const toastId = toast.loading('Uploading document...');

        try {
            const missedSubs = selectedNcDates.map(date => {
                const rec = targetSub?.detailedAttendance?.find(r => r.date === date && r.status === 'Absent');
                return {
                    subjectId: targetSub?.id,
                    subjectName: targetSub?.name,
                    subjectCode: targetSub?.code,
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

            toast.success('Leave request submitted successfully!', { id: toastId });
            setSelectedNcDates([]);
            setNcDescription('');
            setNcProofFile(null);
            setNcModalTab('requests');
            fetchMyNcRequests();
            if (targetSub) {
                fetchSubjectNcRequests(targetSub);
            }
            if (refreshData) refreshData();
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to submit leave request.';
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

    // Notion-Style Single Subject Attendance Sorting & Helpers
    const parseDateObj = (dateStr) => {
        if (!dateStr) return null;
        const str = String(dateStr).trim();
        const sep = str.includes('-') ? '-' : str.includes('/') ? '/' : null;
        if (!sep) {
            const d = new Date(str);
            return isNaN(d.getTime()) ? null : d;
        }
        const parts = str.split(sep);
        if (parts.length === 3) {
            let y, m, d;
            if (parts[0].length === 4) {
                y = parseInt(parts[0], 10);
                m = parseInt(parts[1], 10) - 1;
                d = parseInt(parts[2], 10);
            } else {
                d = parseInt(parts[0], 10);
                m = parseInt(parts[1], 10) - 1;
                y = parseInt(parts[2], 10);
            }
            const date = new Date(y, m, d);
            return isNaN(date.getTime()) ? null : date;
        }
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
    };

    const getSortTimestamp = (dateStr, timeStr = '') => {
        const d = parseDateObj(dateStr);
        if (!d) return 0;
        let ms = d.getTime();
        if (timeStr) {
            const match = String(timeStr).match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
            if (match) {
                let hours = parseInt(match[1], 10);
                const mins = parseInt(match[2], 10);
                const ampm = (match[3] || '').toLowerCase();
                if (ampm === 'pm' && hours < 12) hours += 12;
                if (ampm === 'am' && hours === 12) hours = 0;
                ms += (hours * 3600 + mins * 60) * 1000;
            }
        }
        return ms;
    };

    const sortedSubjectRecords = useMemo(() => {
        if (!selectedSubject?.detailedAttendance) return [];
        const records = [...selectedSubject.detailedAttendance].map((rec, origIdx) => {
            const dObj = parseDateObj(rec.date);
            const dayName = dObj ? dObj.toLocaleDateString('en-US', { weekday: 'short' }) : '';
            const matchingNc = (subjectNcRequests || myNcRequests || []).find(r =>
                r.absentDates && r.absentDates.includes(rec.date)
            );
            let effectiveStatus = rec.status;
            if (rec.status === 'Absent' && matchingNc?.status === 'APPROVED') {
                effectiveStatus = 'Excused';
            }
            const timestamp = getSortTimestamp(rec.date, rec.slot || rec.time || '');
            return {
                ...rec,
                origIdx,
                dayName,
                matchingNc,
                effectiveStatus,
                timestamp
            };
        });

        // Sorted by date/time descending (most recent first)
        return records.sort((a, b) => b.timestamp - a.timestamp);
    }, [selectedSubject, subjectNcRequests, myNcRequests]);

    const filteredSubjectRecords = useMemo(() => {
        return sortedSubjectRecords.filter(rec => {
            if (subjectFilterTab !== 'all' && rec.effectiveStatus !== subjectFilterTab) {
                return false;
            }
            if (subjectSearchQuery.trim()) {
                const q = subjectSearchQuery.toLowerCase().trim();
                const matchDate = (rec.date || '').toLowerCase().includes(q);
                const matchDay = (rec.dayName || '').toLowerCase().includes(q);
                const matchSlot = (rec.slot || rec.time || '').toLowerCase().includes(q);
                const matchStatus = (rec.effectiveStatus || '').toLowerCase().includes(q);
                return matchDate || matchDay || matchSlot || matchStatus;
            }
            return true;
        });
    }, [sortedSubjectRecords, subjectFilterTab, subjectSearchQuery]);

    const subjectPresentCount = useMemo(() => 
        sortedSubjectRecords.filter(r => r.effectiveStatus === 'Present').length,
        [sortedSubjectRecords]
    );
    const subjectAbsentCount = useMemo(() => 
        sortedSubjectRecords.filter(r => r.effectiveStatus === 'Absent').length,
        [sortedSubjectRecords]
    );
    const subjectExcusedCount = useMemo(() => 
        sortedSubjectRecords.filter(r => r.effectiveStatus === 'Excused').length,
        [sortedSubjectRecords]
    );

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

    const optEngine = useMemo(() => computeEngine(subjects, optTarget, excludedIds, semesterLockDate, manualLPWs),
        [subjects, optTarget, excludedIds, semesterLockDate, manualLPWs]);

    const weeksRemaining = useMemo(() => {
        if (optEngine?.weeksRemaining) return optEngine.weeksRemaining;
        const diffMs = new Date(semesterLockDate).getTime() - new Date().getTime();
        return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7)));
    }, [optEngine, semesterLockDate]);

    const setWeeksRemaining = (w) => {
        const d = new Date();
        d.setDate(d.getDate() + Math.max(1, w) * 7);
        setSemesterLockDate(d.toISOString().split('T')[0]);
    };

    const targetAttendance = optTarget;
    const setTargetAttendance = setOptTarget;

    const handleRecalculate = () => {
        toast.success("Attendance plan updated");
    };

    useEffect(() => {
        localStorage.setItem('eduvault_opt_minimized', JSON.stringify(isOptMinimized));
        localStorage.setItem('eduvault_opt_target', JSON.stringify(optTarget));
        localStorage.setItem('eduvault_opt_semdate', semesterLockDate);
        localStorage.setItem('eduvault_opt_lpws', JSON.stringify(manualLPWs));
    }, [isOptMinimized, optTarget, semesterLockDate, manualLPWs]);

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

    const renderOptimizationPanel = () => (
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
                                    <h2 className="text-sm font-bold text-slate-900 tracking-tight">Attendance Calculator &amp; Planner</h2>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                        Attendance Calculator
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    Calculate required classes, safe leaves, and target attendance
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
                                title={isOptMinimized ? "Expand Attendance Calculator" : "Minimize Attendance Calculator"}
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
                                        Timeline:
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
                                        <span>{showOptSettings ? 'Hide Settings' : 'Adjust Class Schedule'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Parameter Settings (Date & LPW) */}
                            {showOptSettings && (
                                <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-800">Semester End Date &amp; Classes Per Week</h4>
                                            <p className="text-[11px] text-slate-500">Set your semester end date and weekly class frequency per subject</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1 uppercase tracking-wider">
                                                Semester End Date
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
                                                <h5 className="text-xs font-bold text-slate-800 tracking-tight">Weekly Classes &amp; Tracked Subjects</h5>
                                                <p className="text-[11px] text-slate-400">Select subjects and set how many classes happen per week</p>
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
                                                            <span className="text-[10px] font-semibold text-slate-400 uppercase">Per Wk</span>
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
                                    <span className="text-[10px] text-slate-400">Overall college baseline</span>
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
                                        { id: 'risk', label: 'Below Target', count: optEngine.plan.filter(s => s.currentPct < optTarget).length },
                                        { id: 'priority', label: 'High Priority', count: optPriorityIds.size },
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

    );

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

    // Total counts across all active subjects
    const { totalAttended, totalConducted } = useMemo(() => {
        let att = 0;
        let cond = 0;
        activeSubjects.forEach(s => {
            const c = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);
            const a = s.totalAttended > 0 ? s.totalAttended : (s.detailedAttendance?.filter(r => r.status === 'Present').length || 0);
            cond += c;
            att += a;
        });
        return { totalAttended: att, totalConducted: cond };
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

    if (isTeacher) {
        return (
            <div className="flex-1 overflow-y-auto bg-[#F7F9FC] p-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-6 pb-24 md:pb-10 antialiased text-slate-800 font-sans min-h-screen w-full min-w-0 max-w-full overflow-x-hidden">
                <div className="max-w-7xl mx-auto w-full min-w-0">
                    <FacultyAttendance profile={profile} subjects={globalSubjects || subjects} onRefresh={refreshData} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto bg-[#F7F9FC] p-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-6 pb-24 md:pb-10 antialiased text-slate-800 font-sans min-h-screen w-full min-w-0 max-w-full overflow-x-hidden">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 w-full min-w-0">

                {/* Top Academic Standing Header */}
                <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full min-w-0">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                            <span className="material-symbols-outlined text-[16px]">{isTeacher ? 'verified_user' : 'trending_up'}</span>
                            <span>{isTeacher ? 'Faculty Portal' : 'Attendance Overview'}</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                            {isTeacher ? 'Faculty Attendance & Leave Requests' : 'My Attendance'}
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {isTeacher
                                ? 'Review student leave and absence requests, check submitted documents, and manage class records.'
                                : 'Track your daily attendance, calculate safe leaves, and view subject-wise records.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        <button
                            onClick={() => openNcModal('requests')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-full shadow-xs transition cursor-pointer"
                            title="View NC & Leave Requests"
                        >
                            <Shield className="w-3.5 h-3.5 text-blue-600" />
                            <span>NC Requests</span>
                            {(isTeacher ? allFacultyNc.filter(r => r.status === 'PENDING').length : myNcRequests.length) > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold font-mono">
                                    {isTeacher ? allFacultyNc.filter(r => r.status === 'PENDING').length : myNcRequests.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={isTeacher ? fetchAllFacultyNc : handleBackgroundSync}
                            disabled={isSyncing || allFacultyNcLoading}
                            title="Refresh Data"
                            className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer disabled:opacity-50"
                        >
                            <span className={`material-symbols-outlined text-[18px] text-slate-600 ${isSyncing || allFacultyNcLoading ? 'animate-spin' : ''}`}>
                                sync
                            </span>
                        </button>
                        {!isTeacher && (
                            <button
                                onClick={handleExportData}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-full shadow-xs transition cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                <span>Export</span>
                            </button>
                        )}
                    </div>
                </section>

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
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Leave Requests Queue</span>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    {allFacultyNc.filter(r => r.status === 'PENDING').length} Pending
                                </span>
                            </div>
                            <div className="my-3 flex items-baseline gap-2">
                                <span className="text-4xl font-extrabold text-amber-600 tracking-tight">
                                    {allFacultyNc.filter(r => r.status === 'PENDING').length}
                                </span>
                                <span className="text-xs text-slate-400 font-medium">pending student requests</span>
                            </div>
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                                <span>Approved: <strong className="text-emerald-600">{allFacultyNc.filter(r => r.status === 'APPROVED').length}</strong></span>
                                <span>Rejected: <strong className="text-rose-600">{allFacultyNc.filter(r => r.status === 'REJECTED').length}</strong></span>
                                <span>Total: <strong>{allFacultyNc.length}</strong></span>
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="hidden lg:grid grid-cols-1 md:grid-cols-12 gap-4" data-purpose="summary-ribbon">
                        {/* Master Attendance Card (Compact Size) */}
                        <div className="md:col-span-3 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Attendance
                                </span>
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                    parseFloat(overallPercentage) >= 75
                                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200/80'
                                        : 'text-rose-700 bg-rose-50 border-rose-200/80'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${parseFloat(overallPercentage) >= 75 ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                                    {parseFloat(overallPercentage) >= 75 ? 'Safe' : 'Critical'}
                                </span>
                            </div>

                            <div className="my-2.5 flex items-baseline gap-1.5">
                                <span className="text-3xl font-black text-slate-900 tracking-tight">
                                    {overallPercentage}%
                                </span>
                                <span className="text-[11px] text-slate-400 font-semibold">aggregate</span>
                            </div>

                            {/* Refined Breakdown: Theory & Labs */}
                            <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 text-xs">
                                <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-200/60">
                                    <div className="flex items-center justify-between text-slate-600 mb-1">
                                        <span className="font-semibold text-[10px]">Lectures</span>
                                        <span className="font-extrabold text-slate-900 font-mono text-[11px]">{theoryPercentage}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${parseFloat(theoryPercentage) >= 75 ? 'bg-emerald-500 shadow-2xs' : 'bg-amber-500 shadow-2xs'}`}
                                            style={{ width: `${Math.min(100, Math.max(4, parseFloat(theoryPercentage)))}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-200/60">
                                    <div className="flex items-center justify-between text-slate-600 mb-1">
                                        <span className="font-semibold text-[10px]">Labs</span>
                                        <span className="font-extrabold text-slate-900 font-mono text-[11px]">{labPercentage}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${parseFloat(labPercentage) >= 75 ? 'bg-emerald-500 shadow-2xs' : 'bg-amber-500 shadow-2xs'}`}
                                            style={{ width: `${Math.min(100, Math.max(4, parseFloat(labPercentage)))}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Activity Overview Heatmap (Wider Layout: 6 Cols) */}
                        <div className="md:col-span-6 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
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
                                <SharedAttendanceHeatmap subjects={activeSubjects} weeksCount={18} />
                            </div>
                        </div>

                        {/* Risk Nodes Summary */}
                        <div className="md:col-span-3 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                                    {riskSubjects.length} Low Attendance Subjects
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
                                        All subjects are above 75%
                                    </div>
                                )}
                            </div>
                            <div className="text-[11px] text-slate-400">
                                {riskSubjects.length > 0 ? 'Needs attention to reach 75%' : 'Good attendance maintained'}
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
                                <span>Leave Requests Queue ({allFacultyNc.length})</span>
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
                                <span>Class Attendance Registers ({subjects?.length || 0})</span>
                            </button>
                        </div>

                        {teacherActiveTab === 'nc' ? (
                            <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-5 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-base font-bold text-slate-900">Student Leave &amp; Absence Requests</h2>
                                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                                                Verified Documents
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">Review medical certificates and absence reasons submitted by students.</p>
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
                                            <span>Loading student leave requests...</span>
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
                                            <h4 className="font-bold text-sm text-slate-800">No Leave Requests Found</h4>
                                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                                There are no student leave requests matching the selected filter.
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
                                                                <span>Document</span>
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
                                                <span>View Attendance &amp; Leave Requests</span>
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
                        {/* Desktop View (Traditional Full Sovereign Layout) */}
                        <div className="hidden lg:block space-y-6 w-full min-w-0">
                            {renderOptimizationPanel()}

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
                                    <h2 className="text-sm font-bold text-slate-900">Recent Classes</h2>
                                    <p className="text-[11px] text-slate-400">Recent attendance records</p>
                                </div>
                                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                    Recent
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
                                        No recent attendance records found
                                    </div>
                                )}
                            </div>

                            {/* Regulatory Policy Notice Footer */}
                            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed bg-slate-50/80 p-3 rounded-lg">
                                <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1">
                                    <span className="material-symbols-outlined text-[15px] text-blue-600">info</span>
                                    <span>College Attendance Policy</span>
                                </div>
                                75% minimum physical presence is mandatory for End-Semester Examination eligibility. Medical condonation forms must be submitted within 7 calendar days of recovery.
                            </div>
                        </div>
                    </section>
                </div>
                        </div>

                        {/* Mobile View (Clean Stitch Mobile-First Layout) */}
                        <div className="lg:hidden flex flex-col gap-4 w-full min-w-0">
                            {/* 1. Master Attendance Hero Card */}
                            <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-col gap-3.5 w-full min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            Overall Attendance
                                        </span>
                                        <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                                            <span className="text-3xl font-extrabold text-blue-600 tracking-tight">
                                                {overallPercentage}%
                                            </span>
                                            <span className="text-xs font-semibold text-slate-400 font-mono">
                                                ({totalAttended}/{totalConducted})
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 border ${
                                        parseFloat(overallPercentage) >= 75
                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                        <span className="material-symbols-outlined text-[15px]">
                                            {parseFloat(overallPercentage) >= 75 ? 'verified' : 'warning'}
                                        </span>
                                        <span>{parseFloat(overallPercentage) >= 75 ? 'Above 75%' : 'Below 75%'}</span>
                                    </div>
                                </div>

                                {/* Ratio Breakdown Pills */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="material-symbols-outlined text-[17px] text-blue-600 shrink-0">school</span>
                                            <span className="text-xs font-semibold text-slate-700 truncate">Lectures</span>
                                        </div>
                                        <span className="text-xs font-bold text-blue-600 shrink-0">{theoryPercentage}%</span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="material-symbols-outlined text-[17px] text-slate-600 shrink-0">science</span>
                                            <span className="text-xs font-semibold text-slate-700 truncate">Labs</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 shrink-0">{labPercentage}%</span>
                                    </div>
                                </div>

                                {/* Risk Nodes Alert if any */}
                                {riskSubjects.length > 0 && (
                                    <div className="rounded-xl bg-rose-50/80 border border-rose-200/80 p-3 flex flex-col gap-1.5 text-rose-900">
                                        <div className="flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[17px] text-rose-600">warning</span>
                                            <span className="text-xs font-bold tracking-wide text-rose-700">
                                                {riskSubjects.length} {riskSubjects.length === 1 ? 'Subject' : 'Subjects'} below 75% Cutoff
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {riskSubjects.map(sub => (
                                                <span 
                                                    key={sub.id}
                                                    className="px-2 py-0.5 rounded-md bg-white border border-rose-200 text-rose-700 text-[10px] font-semibold"
                                                >
                                                    {sub.name}: {getPrecisePct(sub)}%
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* 2. Minimizable Attendance Optimization & Strategy Panel on Mobile */}
                            {renderOptimizationPanel()}

                            {/* 3. Mobile Attendance Heatmap */}
                            <section className="rounded-2xl bg-white border border-slate-200 p-3.5 shadow-xs flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Attendance Heatmap
                                    </span>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-[2px] bg-[#30a14e]" />
                                            <span>Present</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-[2px] bg-[#f85149]" />
                                            <span>Absent</span>
                                        </div>
                                    </div>
                                </div>
                                <SharedAttendanceHeatmap subjects={activeSubjects} weeksCount={14} />
                            </section>

                            {/* 3. Mobile Subject Ledger */}
                            <section className="rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-3 p-3.5 w-full min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-xs font-bold text-slate-900 tracking-tight">Subject Attendance</h3>
                                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                        {activeSubjects.length} Courses
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 bg-slate-100/80 p-0.5 rounded-lg text-xs font-semibold overflow-x-auto no-scrollbar">
                                    <button
                                        onClick={() => setFilterTab('all')}
                                        className={`px-2.5 py-1 rounded-md transition whitespace-nowrap cursor-pointer text-xs ${
                                            filterTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        All ({activeSubjects.length})
                                    </button>
                                    <button
                                        onClick={() => setFilterTab('attention')}
                                        className={`px-2.5 py-1 rounded-md transition whitespace-nowrap cursor-pointer text-xs ${
                                            filterTab === 'attention' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Attention ({riskSubjects.length})
                                    </button>
                                    <button
                                        onClick={() => setFilterTab('safe')}
                                        className={`px-2.5 py-1 rounded-md transition whitespace-nowrap cursor-pointer text-xs ${
                                            filterTab === 'safe' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Safe ({safeSubjects.length})
                                    </button>
                                </div>

                                <div className="flex flex-col gap-2">
                                    {displayedSubjects.map(sub => {
                                        const conducted = sub.totalConducted > 0 ? sub.totalConducted : (sub.detailedAttendance?.length || 0);
                                        const attended = sub.totalAttended > 0 ? sub.totalAttended : (sub.detailedAttendance?.filter(r => r.status === 'Present').length || 0);
                                        const pct = getPrecisePct(sub);
                                        const isSafe = pct >= 75;
                                        const isLab = getCategory(sub) === 'LAB';
                                        const skipsAvailable = Math.max(0, Math.floor((attended - 0.75 * conducted) / 0.75));
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
                                                className="p-3 rounded-xl border border-slate-200/90 hover:border-blue-300 transition-all flex flex-col gap-2 cursor-pointer bg-white"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-2 min-w-0">
                                                        <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${isSafe ? 'bg-blue-600' : 'bg-rose-500'}`} />
                                                        <div className="flex flex-col min-w-0">
                                                            <h4 className="text-xs font-bold text-slate-900 truncate" title={sub.name}>
                                                                {sub.name}
                                                            </h4>
                                                            <span className="text-[10px] text-slate-400 mt-0.5">
                                                                {isLab ? 'Lab' : 'Theory'} • {attended}/{conducted} sessions
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className={`text-sm font-extrabold shrink-0 ${isSafe ? 'text-slate-900' : 'text-rose-600'}`}>
                                                        {pct}%
                                                    </span>
                                                </div>

                                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                    <div 
                                                        className={`h-1.5 rounded-full ${isSafe ? 'bg-blue-600' : 'bg-rose-500'}`}
                                                        style={{ width: `${Math.min(100, pct)}%` }}
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between text-[10px] pt-0.5">
                                                    <span className="text-slate-400">Target: 75%</span>
                                                    {isSafe ? (
                                                        <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                                                            {skipsAvailable} {skipsAvailable === 1 ? 'Skip' : 'Skips'} Safe
                                                        </span>
                                                    ) : (
                                                        <span className="text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded">
                                                            Attend {sessionsNeeded} More
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* 4. Minimal & Clean Present/Absent Log on Mobile */}
                            <section className="rounded-2xl bg-white border border-slate-200 p-3.5 shadow-xs flex flex-col gap-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-blue-600 text-[17px]">history</span>
                                        <h3 className="text-xs font-bold text-slate-900">Recent Classes</h3>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium">{sessionLogs.length} records</span>
                                </div>

                                <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto no-scrollbar">
                                    {sessionLogs.slice(0, 8).map((log, idx) => {
                                        const isPresent = log.status === 'Present';
                                        return (
                                            <div 
                                                key={idx}
                                                className="p-2 rounded-xl bg-slate-50/70 border border-slate-100 flex items-center justify-between gap-2 text-xs"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${isPresent ? 'bg-blue-600' : 'bg-rose-500'}`} />
                                                    <span className="text-xs font-semibold text-slate-800 truncate" title={log.subjectName}>
                                                        {log.subjectName}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[10px] text-slate-400">{log.date}</span>
                                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                                        isPresent
                                                            ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                                            : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                                    }`}>
                                                        {log.status.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {sessionLogs.length === 0 && (
                                        <div className="p-3 text-center text-xs text-slate-400">
                                            No recent attendance records
                                        </div>
                                    )}
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
                                        Secure Document Storage
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
                                                <span>Apply for Leave (NC)</span>
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
                                                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Leave Approved
                                                                            </span>
                                                                        ) : existingNc.status === 'PENDING' ? (
                                                                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold flex items-center gap-1">
                                                                                <Clock className="w-3 h-3 text-amber-600" /> Leave Pending
                                                                            </span>
                                                                        ) : (
                                                                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1">
                                                                                <XCircle className="w-3 h-3 text-rose-600" /> Leave Rejected
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
                                                                                <UploadCloud className="w-3 h-3" /> Request Leave
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
                                                            Submit Leave / Absence Request
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] text-slate-500 font-mono">
                                                        Course: {selectedSubject.code || selectedSubject.name}
                                                    </span>
                                                </div>

                                                {/* 1. Pick Absent Date(s) */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                                        <span>1. Select Absent Date(s)</span>
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
                                                        4. Supporting Document (PDF, PNG, JPG)
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
                                                                {ncProofFile ? ncProofFile.name : 'Upload Medical / Event Certificate'}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400">
                                                                Files are securely stored and viewable by your faculty
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
                                                                <span>Uploading document...</span>
                                                            </>
                                                        ) : (
                                                            <span>Submit Leave Request</span>
                                                        )}
                                                    </button>
                                                </div>
                                            </form>

                                            {/* Student's Existing NC Requests for this Subject */}
                                            <div className="space-y-2">
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                                    Your Leave Requests for this Course ({subjectNcRequests.length})
                                                </span>
                                                {subjectNcRequests.length === 0 ? (
                                                    <p className="text-xs text-slate-400 py-3 text-center">No leave requests submitted yet for this course.</p>
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
                                                                        <Eye className="w-3.5 h-3.5" /> View Document
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
                                                        No leave requests found for this course.
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
                                                                        <span>View Document ({req.proofFileName})</span>
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-slate-400 italic">No document attached</span>
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
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve Leave
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
                                                        placeholder="Enter teacher remarks or feedback..."
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
            {/* Global NC & Leave Requests Modal Popup */}
            {showNcModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
                    onClick={() => setShowNcModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                                    <Shield className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                                        Attendance Excuse Requests (NC)
                                    </h3>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        {isTeacher
                                            ? 'Review and decide on student leave and duty submissions'
                                            : 'Medical, duty leave & event excuse requests'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowNcModal(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 cursor-pointer transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Student View */}
                        {!isTeacher ? (
                            <>
                                {/* Tab Navigation */}
                                <div className="px-5 pt-3 border-b border-slate-200 bg-white flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setNcModalTab('requests')}
                                            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                                                ncModalTab === 'requests'
                                                    ? 'border-blue-600 text-blue-600'
                                                    : 'border-transparent text-slate-500 hover:text-slate-900'
                                            }`}
                                        >
                                            <FileText className="w-3.5 h-3.5" />
                                            <span>My Requests ({myNcRequests.length})</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNcModalTab('apply')}
                                            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                                                ncModalTab === 'apply'
                                                    ? 'border-blue-600 text-blue-600'
                                                    : 'border-transparent text-slate-500 hover:text-slate-900'
                                            }`}
                                        >
                                            <UploadCloud className="w-3.5 h-3.5" />
                                            <span>+ Apply for Leave</span>
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={fetchMyNcRequests}
                                        disabled={myNcLoading}
                                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                        title="Refresh requests"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${myNcLoading ? 'animate-spin text-blue-600' : ''}`} />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="p-5 overflow-y-auto flex-1 space-y-4">
                                    {ncModalTab === 'requests' ? (
                                        myNcLoading ? (
                                            <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                                                <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                                                <span>Loading your leave requests...</span>
                                            </div>
                                        ) : myNcRequests.length === 0 ? (
                                            <div className="py-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-6 space-y-2">
                                                <Shield className="w-10 h-10 text-slate-300 mx-auto" />
                                                <h4 className="text-xs font-bold text-slate-800">No Leave Requests Found</h4>
                                                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                                                    You haven't submitted any absence excuse or medical leave requests yet.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setNcModalTab('apply')}
                                                    className="mt-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer inline-flex items-center gap-1"
                                                >
                                                    <UploadCloud className="w-3.5 h-3.5" />
                                                    <span>Apply for Leave Now</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {myNcRequests.map((req) => (
                                                    <div key={req.id} className="p-4 rounded-xl border border-slate-200 bg-white text-xs space-y-2.5 shadow-2xs hover:border-slate-300 transition">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-slate-900">{req.reason}</span>
                                                                {req.missedSubjects && req.missedSubjects.length > 0 && (
                                                                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">
                                                                        {req.missedSubjects[0].subjectName}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                                req.status === 'APPROVED'
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                    : req.status === 'REJECTED'
                                                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                                            }`}>
                                                                {req.status}
                                                            </span>
                                                        </div>

                                                        <div className="text-[11px] text-slate-600 space-y-1">
                                                            <div className="flex items-center gap-1.5 font-mono">
                                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                                <span>Absent: <strong className="text-slate-800">{(req.absentDates || []).join(', ')}</strong></span>
                                                            </div>
                                                            {req.description && (
                                                                <p className="text-slate-600 italic">"{req.description}"</p>
                                                            )}
                                                            {req.reviewComment && (
                                                                <div className="mt-1 p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                                                                    <strong className="text-slate-900 font-semibold">Faculty Remarks:</strong> {req.reviewComment}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {req.proofFileName && (
                                                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setDocPreviewUrl(getNcProofUrl(req));
                                                                        setDocPreviewName(req.proofFileName);
                                                                    }}
                                                                    className="text-blue-600 hover:underline font-semibold flex items-center gap-1.5 text-[11px] cursor-pointer"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                    <span>View Proof ({req.proofFileName})</span>
                                                                </button>
                                                                <span className="text-[10px] text-slate-400">
                                                                    {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ''}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    ) : (
                                        /* Student Apply Form */
                                        <form onSubmit={handleSubmitSubjectNc} className="space-y-4">
                                            {/* Course Selector */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700">Select Subject</label>
                                                <select
                                                    value={ncModalSubject?.id || ''}
                                                    onChange={(e) => {
                                                        const match = (subjects || []).find(s => s.id === e.target.value);
                                                        setNcModalSubject(match || null);
                                                        setSelectedNcDates([]);
                                                    }}
                                                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                                                >
                                                    <option value="" disabled>-- Choose Enrolled Course --</option>
                                                    {(subjects || []).map(s => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.name} ({s.code || 'Course'})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Absent Dates */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                                    <span>Absent Date(s)</span>
                                                    <span className="text-[11px] font-normal text-slate-500 font-mono">
                                                        {selectedNcDates.length} selected
                                                    </span>
                                                </label>

                                                {/* Absent records from detailedAttendance if available */}
                                                {ncModalSubject?.detailedAttendance && ncModalSubject.detailedAttendance.filter(r => r.status === 'Absent').length > 0 && (
                                                    <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto p-1 border border-slate-100 rounded-lg bg-slate-50/50">
                                                        {ncModalSubject.detailedAttendance.filter(r => r.status === 'Absent').map((rec, idx) => {
                                                            const isSel = selectedNcDates.includes(rec.date);
                                                            return (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedNcDates(prev =>
                                                                            prev.includes(rec.date) ? prev.filter(d => d !== rec.date) : [...prev, rec.date]
                                                                        );
                                                                    }}
                                                                    className={`p-1.5 rounded-lg border text-[11px] font-mono text-left transition cursor-pointer ${
                                                                        isSel ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                                                    }`}
                                                                >
                                                                    {rec.date}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {/* Manual date input to add custom dates */}
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="date"
                                                        id="manual-nc-date"
                                                        onChange={(e) => {
                                                            if (e.target.value && !selectedNcDates.includes(e.target.value)) {
                                                                setSelectedNcDates(prev => [...prev, e.target.value]);
                                                                e.target.value = '';
                                                            }
                                                        }}
                                                        className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                    <span className="text-[11px] text-slate-400">Pick date to add to list</span>
                                                </div>

                                                {selectedNcDates.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                                        {selectedNcDates.map(d => (
                                                            <span key={d} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-mono font-semibold">
                                                                {d}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedNcDates(prev => prev.filter(x => x !== d))}
                                                                    className="hover:text-rose-600 cursor-pointer"
                                                                >
                                                                    ×
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Reason dropdown */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700">Reason for Absence</label>
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

                                            {/* Explanation textarea */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700">Detailed Explanation (Optional)</label>
                                                <textarea
                                                    value={ncDescription}
                                                    onChange={(e) => setNcDescription(e.target.value)}
                                                    placeholder="Specify medical hospital, competition event details, etc."
                                                    rows={2}
                                                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </div>

                                            {/* Supporting Document Proof */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                                    <span>Supporting Proof Document</span>
                                                    <span className="text-[10px] text-slate-400 font-normal">PDF, JPG, PNG (Max 15MB)</span>
                                                </label>
                                                <input
                                                    type="file"
                                                    accept=".pdf,image/png,image/jpeg,image/jpg"
                                                    onChange={(e) => {
                                                        if (e.target.files && e.target.files[0]) {
                                                            setNcProofFile(e.target.files[0]);
                                                        }
                                                    }}
                                                    className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-xl p-1.5 bg-slate-50/50"
                                                />
                                            </div>

                                            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                                                <button
                                                    type="button"
                                                    onClick={() => setNcModalTab('requests')}
                                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isSubmittingNc}
                                                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer transition disabled:opacity-50"
                                                >
                                                    {isSubmittingNc ? 'Submitting...' : 'Submit Request'}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </>
                        ) : (
                            /* Teacher View */
                            <div className="p-5 overflow-y-auto flex-1 space-y-4">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-1">
                                        {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                                            <button
                                                key={st}
                                                type="button"
                                                onClick={() => setTeacherNcFilterStatus(st)}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                                                    teacherNcFilterStatus === st
                                                        ? 'bg-blue-600 text-white shadow-xs'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                                                }`}
                                            >
                                                {st === 'ALL'
                                                    ? `All (${allFacultyNc.length})`
                                                    : st === 'PENDING'
                                                    ? `Pending (${allFacultyNc.filter(r => r.status === 'PENDING').length})`
                                                    : st === 'APPROVED'
                                                    ? `Approved (${allFacultyNc.filter(r => r.status === 'APPROVED').length})`
                                                    : `Rejected (${allFacultyNc.filter(r => r.status === 'REJECTED').length})`}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={fetchAllFacultyNc}
                                        disabled={allFacultyNcLoading}
                                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                        title="Refresh requests"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${allFacultyNcLoading ? 'animate-spin text-blue-600' : ''}`} />
                                    </button>
                                </div>

                                {allFacultyNcLoading ? (
                                    <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                                        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                                        <span>Loading student leave requests...</span>
                                    </div>
                                ) : (
                                    (() => {
                                        const list = allFacultyNc.filter(r => teacherNcFilterStatus === 'ALL' || r.status === teacherNcFilterStatus);
                                        if (list.length === 0) {
                                            return (
                                                <div className="py-12 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-6">
                                                    <Shield className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                                    <h4 className="text-xs font-bold text-slate-800">No Leave Requests Found</h4>
                                                    <p className="text-[11px] text-slate-500">No student submissions match this filter.</p>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="space-y-2.5">
                                                {list.map(req => (
                                                    <div key={req.id} className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs space-y-2 shadow-2xs hover:border-blue-200 transition">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-slate-900">{req.studentName}</span>
                                                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                                                                    {req.studentPrn}
                                                                </span>
                                                                {req.missedSubjects && req.missedSubjects.length > 0 && (
                                                                    <span className="px-2 py-0.2 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">
                                                                        {req.missedSubjects[0].subjectName}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                                                req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                req.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                                'bg-amber-50 text-amber-700 border-amber-200'
                                                            }`}>
                                                                {req.status}
                                                            </span>
                                                        </div>

                                                        <div className="text-[11px] text-slate-600 space-y-0.5">
                                                            <div>Absent: <strong className="font-mono text-slate-800">{(req.absentDates || []).join(', ')}</strong></div>
                                                            <div>Reason: <strong className="text-slate-800">{req.reason}</strong>{req.description ? ` - "${req.description}"` : ''}</div>
                                                        </div>

                                                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                                            {req.proofFileName ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setDocPreviewUrl(getNcProofUrl(req));
                                                                        setDocPreviewName(req.proofFileName);
                                                                    }}
                                                                    className="text-blue-600 hover:underline font-semibold flex items-center gap-1 text-[11px] cursor-pointer"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                    <span>View Document</span>
                                                                </button>
                                                            ) : (
                                                                <span className="text-slate-400 italic text-[11px]">No file attached</span>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setReviewingReq(req);
                                                                    setReviewDecision(req.status === 'REJECTED' ? 'REJECTED' : 'APPROVED');
                                                                    setReviewComment(req.reviewComment || '');
                                                                }}
                                                                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] cursor-pointer shadow-2xs"
                                                            >
                                                                Review
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()
                                )}
                            </div>
                        )}
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
                                    Document Cloud
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
                                <h3 className="font-bold text-sm text-slate-900">Review Student Leave Request</h3>
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
                                        <span>Preview Document</span>
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
                                        <CheckCircle2 className="w-4 h-4" /> Approve Leave
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
                                        <XCircle className="w-4 h-4" /> Reject Request
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

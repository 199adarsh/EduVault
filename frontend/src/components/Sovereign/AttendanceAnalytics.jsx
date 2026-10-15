import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import SharedAttendanceHeatmap from './SharedAttendanceHeatmap';

const API_BASE = 'http://localhost:8081/api';

const AttendanceAnalytics = () => {
    const { profile, subjects: globalSubjects, refreshData, loading } = useOutletContext();
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [filterTab, setFilterTab] = useState('all'); // 'all', 'attention', 'safe'
    const [showDetailModal, setShowDetailModal] = useState(false);

    const [excludedIds, setExcludedIds] = useState(() => {
        const saved = localStorage.getItem('eduvault_excluded_subjects');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('eduvault_excluded_subjects', JSON.stringify(excludedIds));
    }, [excludedIds]);

    const handleBackgroundSync = async () => {
        if (!profile?.prn || !profile?.dob) {
            toast.error("Profile credentials missing in settings");
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

            if (response.ok && refreshData) {
                await refreshData();
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
        const conducted = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);
        const present = s.totalAttended > 0 ? s.totalAttended : (s.detailedAttendance?.filter(r => r.status === 'Present').length || 0);
        if (conducted === 0) return parseFloat(s.attendance) || 0;
        return parseFloat(((present / conducted) * 100).toFixed(1));
    };

    const getCategory = (sub) => {
        const code = sub.code || "";
        const alphabets = code.replace(/[^a-zA-Z]/g, '');
        const lastChar = alphabets.slice(-1).toUpperCase();
        if (lastChar === 'P') return 'LAB';
        if (lastChar === 'L' || lastChar === 'T') return 'THEORY';
        const n = sub.name.toLowerCase();
        if (n.includes('lab') || n.includes('practical') || n.includes('(p)')) return 'LAB';
        return 'THEORY';
    };

    const theorySubs = activeSubjects.filter(s => getCategory(s) === 'THEORY');
    const labSubs = activeSubjects.filter(s => getCategory(s) === 'LAB');

    const getWeightedAvg = (subs) => {
        if (subs.length === 0) return "0.0";
        const totalCredits = subs.reduce((acc, s) => acc + (s.credit || 1), 0);
        const weightedSum = subs.reduce((acc, s) => acc + (getPrecisePct(s) * (s.credit || 1)), 0);
        return (weightedSum / totalCredits).toFixed(1);
    };

    const theoryPercentage = getWeightedAvg(theorySubs);
    const labPercentage = getWeightedAvg(labSubs);
    const overallPercentage = getWeightedAvg(activeSubjects);

    const riskSubjects = activeSubjects.filter(r => getPrecisePct(r) < 75);
    const safeSubjects = activeSubjects.filter(r => getPrecisePct(r) >= 75);

    const displayedSubjects = useMemo(() => {
        if (filterTab === 'attention') return riskSubjects;
        if (filterTab === 'safe') return safeSubjects;
        return activeSubjects;
    }, [filterTab, activeSubjects, riskSubjects, safeSubjects]);

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
        <div className="flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-8 antialiased text-slate-800 font-sans min-h-screen">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Title & Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                            <span className="material-symbols-outlined text-[16px]">trending_up</span>
                            <span>Academic Standing</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Attendance</h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Quantitative presence tracking &amp; risk analysis across registered coursework
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={handleBackgroundSync}
                            disabled={isSyncing}
                            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition cursor-pointer disabled:opacity-50"
                        >
                            <span className={`material-symbols-outlined text-[15px] text-slate-500 ${isSyncing ? 'animate-spin' : ''}`}>
                                refresh
                            </span>
                            <span>{isSyncing ? 'Syncing...' : 'Refresh Data'}</span>
                        </button>
                        <button
                            onClick={handleExportData}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[15px]">download</span>
                            <span>Export Data</span>
                        </button>
                    </div>
                </div>

                {/* TopSummaryRibbon */}
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
            </div>

            {/* Subject Detail Modal */}
            {showDetailModal && selectedSubject && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
                    onClick={() => setShowDetailModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">{selectedSubject.name}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {selectedSubject.code || 'Course'} • Attendance: {getPrecisePct(selectedSubject)}%
                                </p>
                            </div>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition"
                            >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto flex-1 space-y-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                Date-Wise Presence Log
                            </span>
                            {selectedSubject.detailedAttendance && selectedSubject.detailedAttendance.length > 0 ? (
                                selectedSubject.detailedAttendance.map((rec, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${rec.status === 'Present'
                                                ? 'bg-slate-50/60 border-slate-100'
                                                : 'bg-rose-50/30 border-rose-100'
                                            }`}
                                    >
                                        <span className="font-mono text-slate-600">{rec.date} {rec.slot || rec.time || ''}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${rec.status === 'Present'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-rose-100 text-rose-800'
                                            }`}>
                                            {rec.status}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-400 py-6 text-center">No detailed logs stored for this subject</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceAnalytics;

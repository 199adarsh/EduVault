import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';

const API_BASE = 'http://localhost:8081/api';

const AttendanceAnalytics = () => {
    const { profile, subjects: globalSubjects, refreshData, loading } = useOutletContext();
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [hoveredCell, setHoveredCell] = useState(null);
    const [isSessionAuditMinimized, setIsSessionAuditMinimized] = useState(false);
    const [excludedIds, setExcludedIds] = useState(() => {
        const saved = localStorage.getItem('eduvault_excluded_subjects');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('eduvault_excluded_subjects', JSON.stringify(excludedIds));
    }, [excludedIds]);

    if (loading || !profile) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] w-full text-on-surface-variant font-mono uppercase tracking-widest gap-4 animate-pulse">
                <span className="material-symbols-outlined text-4xl">sync</span>
                Initializing Academic Core...
            </div>
        );
    }

    const handleBackgroundSync = async () => {
        if (!profile?.prn || !profile?.dob) {
            toast.error("Profile credentials missing. Update them in Dashboard.");
            return;
        }
        setIsSyncing(true);
        try {
            const response = await fetch(`${API_BASE}/portal/dashboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prn: profile.prn, dob: profile.dob })
            });

            if (response.ok && refreshData) {
                await refreshData();
                toast.success("Synchronized with academic portal");
            } else {
                toast.error("Cloud synchronization failed");
            }
        } catch (err) {
            toast.error("Network error during sync");
        } finally {
            setIsSyncing(false);
        }
    };

    const toggleConsider = (id, e) => {
        e.stopPropagation();
        setExcludedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        toast.info(!excludedIds.includes(id) ? "Excluded from analytics" : "Included in analytics");
    };

    const subjects = globalSubjects || [];
    const attendanceRecords = subjects; // Restore alias to fix ReferenceError
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

    const actionRequiredCount = activeSubjects.filter(r => getPrecisePct(r) < 75).length;

    // -- Heatmap Logic --
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const activityMap = {};
    const sourceData = selectedSubject ? [selectedSubject] : activeSubjects;
    sourceData.forEach(sub => {
        (sub.detailedAttendance || []).forEach(rec => {
            const parts = rec.date.split('-');
            if (parts.length === 3) {
                const isoDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                if (!activityMap[isoDate]) {
                    activityMap[isoDate] = { present: 0, total: 0, absentSessions: [] };
                }
                activityMap[isoDate].total += 1;
                if (rec.status === 'Present') {
                    activityMap[isoDate].present += 1;
                } else if (rec.status === 'Absent' || rec.status?.toLowerCase() === 'absent') {
                    activityMap[isoDate].absentSessions.push(sub.name);
                }
            }
        });
    });

    const formatLocalDate = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const today = new Date();
    let startDate = new Date();
    let WEEKS_TO_SHOW = 17;

    const activeDates = Object.keys(activityMap);
    if (activeDates.length > 0) {
        const earliestStr = activeDates.sort()[0];
        const earliest = new Date(earliestStr.replace(/-/g, '/'));
        const startSunday = new Date(earliest);
        startSunday.setDate(earliest.getDate() - earliest.getDay());
        
        WEEKS_TO_SHOW = 19;
        startDate = startSunday;
    } else {
        const endSaturday = new Date(today);
        endSaturday.setDate(today.getDate() + (6 - today.getDay()));
        startDate = new Date(endSaturday);
        startDate.setDate(endSaturday.getDate() - (17 * 7) + 1);
    }

    const heatmapGrid = [];
    const monthLabels = [];
    let currentHtmlMonth = -1;
    let d = new Date(startDate);
    for (let w = 0; w < WEEKS_TO_SHOW; w++) {
        const week = [];
        for (let day = 0; day < 7; day++) {
            const iso = formatLocalDate(d);
            const m = d.getMonth();
            if (day === 0 && m !== currentHtmlMonth) {
                monthLabels.push({ label: d.toLocaleString('default', { month: 'short' }), weekIndex: w });
                currentHtmlMonth = m;
            }
            week.push({ key: iso, date: new Date(d), dateStr: d.toLocaleDateString(), entry: activityMap[iso], isFuture: d > today });
            d.setDate(d.getDate() + 1);
        }
        heatmapGrid.push(week);
    }

    const heatColor = (entry, isFuture) => {
        if (isFuture) return 'bg-zinc-950/20 border border-zinc-900/30';
        if (!entry || entry.total === 0) return 'bg-zinc-900/30 border border-zinc-800/20';
        const pct = entry.present / entry.total;
        if (pct < 0.5) return 'bg-red-500/10 border border-red-500/20 text-red-400';
        if (pct < 0.75) return 'bg-amber-500/10 border border-amber-500/20 text-amber-400';
        if (pct < 1) return 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400';
        return 'bg-emerald-500 border border-emerald-400/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]';
    };

    const heatmapStats = {
        activeDays: Object.keys(activityMap).length,
        totalSessions: Object.values(activityMap).reduce((a, c) => a + c.total, 0),
        presentSessions: Object.values(activityMap).reduce((a, c) => a + c.present, 0)
    };

    const [showConsiderDropdown, setShowConsiderDropdown] = useState(false);

    return (
        <div className="p-4 lg:p-10 space-y-8 max-w-[1440px] mx-auto w-full overflow-x-hidden bg-black min-h-screen antialiased" onClick={() => setShowConsiderDropdown(false)}>
            {/* Header Area */}
            <div className="flex flex-col gap-4 mb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-400 mb-1">
                        <span className="material-symbols-outlined text-[16px]">query_stats</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Academic Standing</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white uppercase">Attendance Dashboard</h1>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] opacity-60">Quantitative presence tracking & risk analysis</p>
                </div>
                <div className="flex items-center gap-4 w-full justify-between sm:justify-start">
                    <button className="bg-zinc-900/50 border border-zinc-800/50 px-4 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-all">Export Data</button>
                    <div className="flex items-center gap-3 ml-4">
                        <span className="material-symbols-outlined text-on-surface-variant/40">notifications</span>
                        <span className="material-symbols-outlined text-on-surface-variant/40">help</span>
                        <div className="w-8 h-8 rounded-sm bg-surface-container-highest border border-outline-variant/10 overflow-hidden">
                            <img src={profile?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucky"} alt="Avatar" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Overview Bar */}
            <div className="bg-zinc-900/30 border border-zinc-800/50 ring-1 ring-white/[0.02] rounded-xl p-6 flex flex-col lg:flex-row gap-12 shadow-2xl relative backdrop-blur-md">
                <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                </div>
                {/* Overall Attendance */}
                <div className="flex flex-col justify-center w-full lg:w-auto lg:min-w-[240px] relative z-0">
                    <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-primary/20 rounded-full blur-sm"></div>
                    <div className="flex items-center gap-2 mb-2 relative">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">Master Attendance</span>
                    </div>
                    <div className="flex items-baseline gap-2 group cursor-default">
                        <span className="text-5xl font-bold text-white tracking-tighter drop-shadow-[0_0_15px_rgba(59,130,246,0.1)] group-hover:drop-shadow-[0_0_25px_rgba(59,130,246,0.2)] transition-all duration-500">{overallPercentage}</span>
                        <span className="text-2xl font-bold text-blue-500/40">%</span>
                    </div>

                    <div className="mt-6 flex gap-8 border-t border-[#1f1f23] pt-6">
                        <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[10px] text-white/10">menu_book</span>
                                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/50">Theory Lec</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-zinc-400">{theoryPercentage}%</span>
                                <div className="h-1 flex-1 bg-zinc-800/30 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.1)]" style={{ width: `${theoryPercentage}%` }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[10px] text-white/10">biotech</span>
                                <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/50">Labs</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-zinc-400">{labPercentage}%</span>
                                <div className="h-1 flex-1 bg-zinc-800/30 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500/20" style={{ width: `${labPercentage}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Activity Heatmap */}
                <div className="flex-1 min-w-0 mt-6 lg:mt-0 border-t border-[#1f1f23] lg:border-t-0 pt-6 lg:pt-0 relative z-10">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Activity Overview</span>
                        <div className="flex items-center gap-3 text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                            <span>Less</span>
                            <div className="flex gap-1">
                                <div className="w-2.5 h-2.5 rounded-[2px] bg-zinc-900/30 border border-zinc-800/20"></div>
                                <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/20 border border-emerald-500/30"></div>
                                <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500 border border-emerald-400/50"></div>
                            </div>
                            <span>More</span>
                        </div>
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide w-full">
                        <div className="grid grid-rows-3 gap-1.5 text-[8px] text-zinc-500 font-black uppercase pt-1 shrink-0 sticky left-0 z-10 pr-1">
                            <span>Mon</span>
                            <span>Wed</span>
                            <span>Fri</span>
                        </div>
                        <div className="flex-1 grid auto-cols-min gap-1.5 shrink-0" style={{ gridAutoFlow: 'column' }}>
                            {heatmapGrid.slice(-24).map((week, wi) => (
                                <div key={wi} className="grid grid-rows-7 gap-1.5 shrink-0">
                                    {week.map((cell, cellIdx) => (
                                        <div
                                            key={cell.key}
                                            className={`w-[14px] h-[14px] rounded-[3px] ${heatColor(cell.entry, cell.isFuture)} hover:scale-110 transition-all duration-200 cursor-help relative`}
                                            onMouseEnter={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setHoveredCell({ cell, rect });
                                            }}
                                            onMouseLeave={() => setHoveredCell(null)}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Risk Nodes */}
                <div className="w-full lg:w-auto lg:min-w-[280px] lg:border-l border-outline-variant/5 lg:pl-12 flex flex-col mt-6 lg:mt-0 border-t border-[#1f1f23] lg:border-t-0 pt-6 lg:pt-0">
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></div>
                            {actionRequiredCount} Risk Nodes
                        </span>
                        <span className="material-symbols-outlined text-on-surface-variant/20 text-sm">remove</span>
                    </div>
                    <div className="space-y-4">
                        {subjects.filter(r => getPrecisePct(r) < 75 && getPrecisePct(r) > 0).slice(0, 3).map((sub, i) => (
                            <div key={i} className="flex justify-between items-center group cursor-pointer">
                                <span className="text-xs font-bold text-on-surface/80 group-hover:text-primary transition-colors">{sub.name}</span>
                                <span className={`text-xs font-black ${getPrecisePct(sub) < 40 ? 'text-error' : 'text-tertiary'}`}>{getPrecisePct(sub)}%</span>
                            </div>
                        ))}
                        {actionRequiredCount === 0 && (
                            <div className="h-full flex items-center justify-center opacity-20">
                                <span className="text-[10px] font-black uppercase tracking-widest italic">All Nodes Secure</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Main Dual Grid */}
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-10 items-stretch w-full min-w-0">
                {/* Column 1: Session Log */}
                <div className="lg:col-span-4 bg-zinc-900/30 border border-zinc-800/50 ring-1 ring-white/[0.02] rounded-xl p-6 flex flex-col w-full min-w-0 lg:h-fit lg:sticky lg:top-8 shadow-xl backdrop-blur-md">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-sm font-bold text-white/10 uppercase tracking-[0.2em]">Session Audit</h2>
                        <button onClick={() => setIsSessionAuditMinimized(!isSessionAuditMinimized)} className="text-zinc-500 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-sm">{isSessionAuditMinimized ? 'expand_more' : 'expand_less'}</span>
                        </button>
                    </div>
                    {!isSessionAuditMinimized && (
                        <div className="space-y-8 overflow-y-auto max-h-[calc(100vh-320px)] pr-2 no-scrollbar border-l-[1px] border-[#1f1f23] pl-8 ml-2">
                            {(() => {
                                let records = [];
                                subjects.forEach(sub => {
                                    if (sub.detailedAttendance) {
                                        records.push(...sub.detailedAttendance.map(r => ({ ...r, subjectName: sub.name })));
                                    }
                                });
                                records.sort((a, b) => {
                                    const pa = a.date.split('-'); const pb = b.date.split('-');
                                    return new Date(pb[2], pb[1] - 1, pb[0]) - new Date(pa[2], pa[1] - 1, pa[0]);
                                });

                                return records.length > 0 ? records.slice(0, 15).map((rec, idx) => (
                                    <div key={idx} className="relative group/log py-1">
                                        <div className={`absolute -left-[41px] top-2 w-2.5 h-2.5 rounded-full ring-4 ring-[#15121b] border-[1px] transition-all group-hover/log:scale-125 ${rec.status === 'Present' ? 'bg-[#00c853] border-white/20' : 'bg-error border-white/20'}`}></div>
                                        <div className="flex flex-col gap-1 min-w-0">
                                            <span className="text-[9px] font-mono font-bold text-on-surface-variant/30 flex items-center gap-2 uppercase tracking-widest break-all">
                                                {rec.date} · {rec.slot}
                                            </span>
                                            <h4 className="text-[13px] font-bold text-on-surface/80 group-hover/log:text-primary transition-colors leading-tight break-words">{rec.subjectName}</h4>
                                            <div className="mt-2.5">
                                                <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-[2px] border ${rec.status === 'Present' ? 'bg-[#00c853]/5 text-[#00c853]/70 border-[#00c853]/20' : 'bg-error/5 text-error/70 border-error/20'}`}>
                                                    {rec.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="h-40 flex flex-col items-center justify-center opacity-30 italic">
                                        <span className="text-xs">No synchronization found</span>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {/* Column 2: Subject Cards */}
                <div className="lg:col-span-8 space-y-6 w-full min-w-0">
                    {subjects.map((sub, i) => {
                        const isExcluded = excludedIds.includes(sub.id);
                        const conducted = sub.totalConducted > 0 ? sub.totalConducted : (sub.detailedAttendance?.length || 0);
                        const att = getPrecisePct(sub);
                        const isRisk = conducted > 0 && att < 75;
                        const isDanger = conducted > 0 && att < 40;
                        const status = conducted === 0 ? 'NEUTRAL' : isDanger ? 'DANGER' : isRisk ? 'RISK' : 'SAFE';

                        return (
                            <div
                                key={i}
                                onClick={() => setSelectedSubject(sub)}
                                className={`group bg-zinc-900/30 border ${selectedSubject?.id === sub.id ? 'border-blue-500/30 shadow-lg shadow-blue-500/5' : 'border-zinc-800/50'} ${isExcluded ? 'opacity-40 grayscale-[0.8]' : ''} rounded-xl p-4 block w-full transition-all hover:bg-zinc-900/50 cursor-pointer relative overflow-hidden backdrop-blur-md`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 w-full">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-center group-hover:scale-105 transition-all duration-300 shadow-inner shrink-0 relative">
                                            <span className="material-symbols-outlined text-zinc-500 group-hover:text-blue-400 transition-colors text-xl">
                                                {getCategory(sub) === 'LAB' ? 'biotech' : 'menu_book'}
                                            </span>
                                        </div>
                                        <div className="min-w-0 flex-1 max-w-[240px]">
                                            <h3 className="text-sm font-bold text-zinc-200 truncate group-hover:text-primary transition-colors tracking-tight">{sub.name}</h3>
                                            <p className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-tighter mt-1">{sub.code}</p>
                                        </div>
                                    </div>

                                    {/* Progress Sector */}
                                    <div className="flex-1 flex flex-col gap-3 w-full md:px-8">
                                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                                            <span className="text-zinc-300">{att}%</span>
                                            <span className="text-zinc-600 italic">Target: 75%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${isDanger ? 'bg-red-500/80' : isRisk ? 'bg-amber-500/80' : 'bg-emerald-500/80'}`}
                                                style={{ width: `${att}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Status Sector */}
                                    <div className="md:text-right w-full md:w-auto lg:min-w-[150px] flex flex-row md:flex-col justify-between md:justify-end items-center md:items-end gap-2 mt-2 md:mt-0">
                                        <div className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] flex flex-col items-start md:items-end gap-1">
                                            {(() => {
                                                const details = sub.detailedAttendance || [];
                                                const p = sub.totalAttended > 0 ? sub.totalAttended : details.filter(r => r.status === 'Present').length;
                                                const conducted = sub.totalConducted > 0 ? sub.totalConducted : details.length;
                                                const s = sub.stillToGo || 0;
                                                const totalAfter = conducted + s;

                                                // Sync math with Optimization Engine: Use rounded percentage
                                                const currentPct = conducted > 0 ? Math.round((p / conducted) * 100) : 0;

                                                const needed = Math.ceil((75 / 100) * totalAfter - p);
                                                const mustAttend = Math.max(0, Math.min(needed, s));

                                                const theoreticalMaxBunks = conducted > 0 ? Math.floor(p / 0.75 - conducted) : 0;
                                                const bunksAvail = Math.max(0, Math.min(s, theoreticalMaxBunks));

                                                return (
                                                    <>
                                                        <span className="text-[11px] font-bold text-zinc-300">
                                                            {`${p} / ${totalAfter}`}
                                                        </span>
                                                        {conducted === 0 ? (
                                                            <span className="text-zinc-500">Attend {mustAttend} More</span>
                                                        ) : currentPct >= 75 ? (
                                                            <span className="text-emerald-400">{bunksAvail} Bunks Available</span>
                                                        ) : (
                                                            <span className="text-amber-400">Attend {mustAttend} More</span>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${status === 'DANGER' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                            status === 'RISK' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                status === 'NEUTRAL' ? 'bg-zinc-800/50 text-zinc-400 border-zinc-700/30' :
                                                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            }`}>
                                            {status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {hoveredCell && !hoveredCell.cell.isFuture && (() => {
                let tooltipLeft = hoveredCell.rect.left + hoveredCell.rect.width / 2;
                let tooltipTransform = 'translate(-50%, -100%)';
                if (hoveredCell.rect.left < 80) {
                    tooltipLeft = hoveredCell.rect.left;
                    tooltipTransform = 'translate(0, -100%)';
                } else if (window.innerWidth - hoveredCell.rect.right < 80) {
                    tooltipLeft = hoveredCell.rect.right;
                    tooltipTransform = 'translate(-100%, -100%)';
                }

                return createPortal(
                    <div 
                        style={{
                            position: 'fixed',
                            left: `${tooltipLeft}px`,
                            top: `${hoveredCell.rect.top - 8}px`,
                            transform: tooltipTransform,
                            zIndex: 99999,
                            pointerEvents: 'none'
                        }}
                    >
                        <div className="bg-zinc-950/95 border border-zinc-800/80 rounded-xl p-3 shadow-2xl min-w-[140px] backdrop-blur-md text-left">
                            <div className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1.5">{hoveredCell.cell.dateStr}</div>
                            {hoveredCell.cell.entry ? (
                                <div className="flex flex-col gap-1.5">
                                    <div className="text-xs font-bold text-zinc-200 flex items-baseline gap-2">
                                        <span className="text-emerald-400">{hoveredCell.cell.entry.present}/{hoveredCell.cell.entry.total}</span>
                                        <span className="text-[8px] text-zinc-500 font-black uppercase tracking-wider">Sessions</span>
                                    </div>
                                    {hoveredCell.cell.entry.absentSessions && hoveredCell.cell.entry.absentSessions.length > 0 && (
                                        <div className="pt-1.5 border-t border-zinc-800/80 flex flex-col gap-0.5">
                                            <span className="text-[8px] text-red-400 font-black uppercase tracking-wider mb-0.5">Absent</span>
                                            {hoveredCell.cell.entry.absentSessions.map((sub, i) => (
                                                <span key={i} className="text-[9px] text-zinc-400 leading-tight truncate">{sub}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-xs font-bold text-zinc-600 italic">No activity</div>
                            )}
                        </div>
                    </div>,
                    document.body
                );
            })()}
        </div>
    );
};

export default AttendanceAnalytics;

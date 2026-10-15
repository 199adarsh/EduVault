import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Settings2, AlertTriangle, CheckCircle2, Calendar, SlidersHorizontal, ShieldCheck } from 'lucide-react';

function calculateLPW(subject) {
    const records = subject.detailedAttendance || [];
    if (!records.length) {
        return (subject.isLab || (subject.name || '').toLowerCase().includes('lab')) ? 1 : 3;
    }

    const weekCounts = {};
    records.forEach(r => {
        if (!r.date) return;
        const parts = r.date.split('-');
        let d;
        if (parts.length === 3) {
            const y = parts[0].length === 4 ? parts[0] : parts[2];
            const m = parts[1];
            const day = parts[0].length === 4 ? parts[2] : parts[0];
            d = new Date(`${y}-${m}-${day}`);
        } else {
            d = new Date(r.date);
        }
        if (isNaN(d.getTime())) return;

        const dayOfWeek = d.getDay();
        const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const mon = new Date(d.setDate(diff)).toISOString().split('T')[0];
        weekCounts[mon] = (weekCounts[mon] || 0) + 1;
    });

    const counts = Object.values(weekCounts).filter(c => c > 0);
    if (!counts.length) {
        return (subject.isLab || (subject.name || '').toLowerCase().includes('lab')) ? 1 : 3;
    }

    const freqMap = {};
    let modeVal = counts[0];
    let maxFreq = 0;
    counts.forEach(c => {
        freqMap[c] = (freqMap[c] || 0) + 1;
        if (freqMap[c] > maxFreq) {
            maxFreq = freqMap[c];
            modeVal = c;
        }
    });

    return Math.max(1, modeVal);
}

function computeEngine(subjects, targetPct, excludedIds, semesterLockDate, manualLPWs = {}) {
    if (!subjects || subjects.length === 0) return null;
    const active = subjects.filter(s => !excludedIds.includes(s.id || s.code));
    if (active.length === 0) return null;

    const dTarget = new Date(semesterLockDate);
    const dToday = new Date();
    const diffMs = dTarget - dToday;
    const weeksLeft = Math.max(1, diffMs / (1000 * 60 * 60 * 24 * 7));

    let totalCredits = 0;
    const hasStarted = active.some(s => {
        const cond = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);
        return cond > 0;
    });

    const subjectPool = active.map(s => {
        const id = s.id || s.code;
        const cond = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);
        const att = s.totalAttended > 0 ? s.totalAttended : (s.detailedAttendance?.filter(r => r.status === 'Present').length || 0);
        const isLab = s.isLab || (s.name || '').toLowerCase().includes('lab');
        const calculatedLpw = calculateLPW(s);
        const lpw = Math.max(1, manualLPWs[id] ?? calculatedLpw);
        const rem = cond === 0 ? 0 : Math.ceil(lpw * weeksLeft);
        const credit = s.credit || (isLab ? 2 : (s.name.includes('Mini Project') ? 2 : 3));
        if (!hasStarted || cond > 0) {
            totalCredits += credit;
        }
        const initialPct = cond === 0 ? (parseFloat(s.attendance) || 0) : parseFloat(((att / cond) * 100).toFixed(1));

        return { id, code: s.code || '', name: s.name, isLab, lpw, att, cond, rem, futureTotal: cond + rem, credit, initialPct };
    });

    const getPrecisePct = (att, cond, initialPct) => {
        if (cond === 0) return initialPct;
        return parseFloat(((att / cond) * 100).toFixed(1));
    };

    const currentWeightedSum = subjectPool.reduce((acc, s) => {
        if (hasStarted && s.cond === 0) return acc;
        return acc + (s.initialPct * s.credit);
    }, 0);
    const currentPctOverall = totalCredits > 0 ? (currentWeightedSum / totalCredits) : 0;

    const subjectsWithEfficiency = subjectPool.map(s => ({
        ...s,
        currentPct: s.initialPct,
        efficiency: (s.cond > 0 && s.futureTotal > 0) ? ((100 / s.futureTotal) * s.credit / totalCredits) : 0
    })).sort((a, b) => b.efficiency - a.efficiency);

    const plan = subjectsWithEfficiency.map(s => ({ ...s, attend: 0, skip: s.rem }));

    let mustAttendTotal = 0;
    let isImpossible = false;
    let deficitStr = "";

    const getProjectedFinal = (currentPlan) => {
        const sum = currentPlan.reduce((acc, s) => {
            if (hasStarted && s.cond === 0) return acc;
            return acc + (getPrecisePct(s.att + s.attend, s.futureTotal, s.initialPct) * s.credit);
        }, 0);
        return totalCredits > 0 ? (sum / totalCredits) : 0;
    };

    let projectedFinal = getProjectedFinal(plan);

    if (projectedFinal < targetPct) {
        for (let i = 0; i < plan.length; i++) {
            const s = plan[i];
            if (s.efficiency <= 0 || s.rem === 0) continue;

            for (let add = 1; add <= s.rem; add++) {
                s.attend = add;
                s.skip = s.rem - add;
                mustAttendTotal++;
                projectedFinal = getProjectedFinal(plan);
                if (projectedFinal >= targetPct) break;
            }
            if (projectedFinal >= targetPct) break;
        }
    }

    if (projectedFinal < targetPct) {
        isImpossible = true;
        deficitStr = (targetPct - projectedFinal).toFixed(1) + "%";
    }

    const totalRemOverall = subjectPool.reduce((acc, s) => acc + s.rem, 0);
    const SkipableTotal = Math.max(0, totalRemOverall - mustAttendTotal);

    plan.forEach(s => {
        const pctWith0 = getPrecisePct(s.att, s.futureTotal, s.initialPct);
        const pctWith1 = getPrecisePct(s.att + 1, s.futureTotal, s.initialPct);
        s.efficiencyDisplay = s.futureTotal > 0 ? (pctWith1 - pctWith0) : 0;
    });

    const totalConducted = active.reduce((acc, s) => acc + (s.totalConducted || s.detailedAttendance?.length || 0), 0);
    const totalAttended = active.reduce((acc, s) => acc + (s.totalAttended || s.detailedAttendance?.filter(r => r.status === 'Present').length || 0), 0);

    return {
        plan,
        weeksRemaining: Math.ceil(weeksLeft),
        currentOverall: parseFloat(currentPctOverall.toFixed(1)),
        projectedFinal: parseFloat(projectedFinal.toFixed(1)),
        mustAttendOverall: mustAttendTotal,
        SkipableOverall: SkipableTotal,
        isImpossible,
        deficit: deficitStr,
        targetUsed: targetPct,
        totalConducted,
        totalAttended
    };
}

const OptimizationPage = () => {
    const { subjects, loading } = useOutletContext();

    const getSaved = (key, def) => {
        try {
            const val = localStorage.getItem(`eduvault_opt_${key}`);
            return val ? JSON.parse(val) : def;
        } catch { return def; }
    };

    const [target, setTarget] = useState(() => getSaved('target', 75));
    const [localExcluded, setLocalExcluded] = useState(() => getSaved('excluded', []));
    const [semesterLockDate, setSemesterLockDate] = useState(() => {
        const saved = localStorage.getItem('eduvault_opt_semdate');
        if (saved) return saved;
        const d = new Date(); d.setMonth(d.getMonth() + 2); return d.toISOString().split('T')[0];
    });
    const [manualLPWs, setManualLPWs] = useState(() => getSaved('lpws', {}));
    const [showSettings, setShowSettings] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        localStorage.setItem('eduvault_opt_target', JSON.stringify(target));
        localStorage.setItem('eduvault_opt_excluded', JSON.stringify(localExcluded));
        localStorage.setItem('eduvault_opt_semdate', semesterLockDate);
        localStorage.setItem('eduvault_opt_lpws', JSON.stringify(manualLPWs));
    }, [target, localExcluded, semesterLockDate, manualLPWs]);

    const engine = useMemo(() => computeEngine(subjects, target, localExcluded, semesterLockDate, manualLPWs),
        [subjects, target, localExcluded, semesterLockDate, manualLPWs]);

    const priorityIds = useMemo(() => {
        if (!engine || !engine.plan) return new Set();
        const needingAttend = engine.plan.filter(r => r.attend > 0);
        const sorted = [...needingAttend].sort((a, b) => {
            const weightA = (a.credit || 1) * (a.lpw || 1);
            const weightB = (b.credit || 1) * (b.lpw || 1);
            return weightB - weightA;
        });
        return new Set(sorted.slice(0, 3).map(r => r.id));
    }, [engine]);

    const filteredPlan = useMemo(() => {
        if (!engine?.plan) return [];
        return engine.plan.filter(s => {
            if (activeFilter === 'theory') return !s.isLab;
            if (activeFilter === 'lab') return s.isLab;
            if (activeFilter === 'risk') return s.currentPct < target;
            if (activeFilter === 'priority') return priorityIds.has(s.id);
            return true;
        });
    }, [engine, activeFilter, target, priorityIds]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] w-full text-slate-400 gap-3">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium uppercase tracking-wider">Syncing Optimizer...</span>
            </div>
        );
    }

    if (!engine) {
        return (
            <div className="p-8 text-center text-slate-500">
                No active subjects found for optimization.
            </div>
        );
    }

    return (
        <main className="w-full px-6 lg:px-10 py-8 bg-[#F7F9FC] min-h-screen">
            <div className="flex flex-col w-full max-w-[1400px] mx-auto pb-16">
                {/* Ultra-Clean Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pt-1">
                    <div>
                        <h1 className="text-[24px] font-bold text-slate-900 tracking-tight">
                            Attendance Optimization
                        </h1>
                        <p className="text-[13px] text-slate-500 mt-0.5">
                            Predictive planning &amp; session risk mitigation
                        </p>
                    </div>
                    <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
                        <span className="text-[12px] text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200/60 font-medium">
                            {engine.weeksRemaining} Weeks Horizon
                        </span>

                        {/* Target Stepper */}
                        <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-xs">
                            <span className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                                Target
                            </span>
                            <div className="flex items-center gap-1.5 pl-1">
                                <button
                                    onClick={() => setTarget(prev => Math.max(50, prev - 1))}
                                    className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-blue-600 hover:text-white transition-colors text-xs font-bold"
                                    type="button"
                                    title="Decrease target"
                                >
                                    -
                                </button>
                                <span className="text-[14px] font-bold text-blue-600 min-w-[36px] text-center">
                                    {target}%
                                </span>
                                <button
                                    onClick={() => setTarget(prev => Math.min(100, prev + 1))}
                                    className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-blue-600 hover:text-white transition-colors text-xs font-bold"
                                    type="button"
                                    title="Increase target"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Settings Button */}
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`p-2 rounded-full border transition-all ${showSettings
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            title="Configure Planning Horizon & Weights"
                        >
                            <Settings2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Collapsible Settings Panel */}
                {showSettings && (
                    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-xs animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Optimization Parameters</h3>
                                <p className="text-xs text-slate-500">Fine-tune semester lock date, subject inclusions, and weekly frequency</p>
                            </div>
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                                Auto-saved
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                                    Semester Lock Date
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={semesterLockDate}
                                        onChange={e => setSemesterLockDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
                                Subject Inclusions &amp; Weekly Frequency (LPW)
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {subjects?.map(s => {
                                    const id = s.id || s.code;
                                    const isIncluded = !localExcluded.includes(id);
                                    return (
                                        <div
                                            key={id}
                                            className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${isIncluded ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-100/40 border-dashed border-slate-200 opacity-60'
                                                }`}
                                        >
                                            <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isIncluded}
                                                    onChange={() => setLocalExcluded(prev =>
                                                        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                                                    )}
                                                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                                                />
                                                <span className="text-xs font-medium text-slate-800 truncate" title={s.name}>
                                                    {s.name}
                                                </span>
                                            </label>
                                            <div className="flex items-center gap-1 shrink-0 pl-2">
                                                <span className="text-[10px] text-slate-400 font-medium">LPW</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    value={manualLPWs[id] ?? calculateLPW(s)}
                                                    onChange={e => setManualLPWs(prev => ({
                                                        ...prev,
                                                        [id]: Math.max(1, Number(e.target.value))
                                                    }))}
                                                    className="w-9 bg-white border border-slate-200 rounded text-center text-xs font-bold text-blue-600 py-0.5 outline-none focus:border-blue-500"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Metrics Ribbon */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs mb-6 grid grid-cols-2 md:grid-cols-4 overflow-hidden">
                    {/* Metric 1 */}
                    <div className="p-4 flex flex-col justify-center border-b md:border-b-0 border-r border-slate-100">
                        <span className="text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                            Current Attendance
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-[22px] font-bold text-slate-900">
                                {engine.currentOverall.toFixed(1)}%
                            </span>
                            <span className="text-[12px] text-slate-400 font-medium">
                                ({engine.totalAttended} / {engine.totalConducted})
                            </span>
                        </div>
                    </div>

                    {/* Metric 2 */}
                    <div className="p-4 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-100">
                        <span className="text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                            Projected Attendance
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-[22px] font-bold text-blue-600">
                                {engine.projectedFinal.toFixed(1)}%
                            </span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${!engine.isImpossible
                                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/50'
                                    : 'text-rose-700 bg-rose-50 border border-rose-200/50'
                                }`}>
                                {!engine.isImpossible ? 'Meets Goal' : `Deficit: ${engine.deficit}`}
                            </span>
                        </div>
                    </div>

                    {/* Metric 3 */}
                    <div className="p-4 flex flex-col justify-center border-r border-slate-100">
                        <span className="text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                            Must Attend
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-[22px] font-bold text-amber-600">
                                {engine.mustAttendOverall}
                            </span>
                            <span className="text-[13px] text-slate-500 font-normal">
                                lectures
                            </span>
                        </div>
                    </div>

                    {/* Metric 4 */}
                    <div className="p-4 flex flex-col justify-center">
                        <span className="text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                            Skipable
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-[22px] font-bold text-emerald-600">
                                {engine.SkipableOverall}
                            </span>
                            <span className="text-[13px] text-slate-500 font-normal">
                                available sessions
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filter Pills Bar */}
                <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'all', label: 'All Subjects', count: engine.plan.length },
                        { id: 'theory', label: 'Theory', count: engine.plan.filter(s => !s.isLab).length },
                        { id: 'lab', label: 'Labs', count: engine.plan.filter(s => s.isLab).length },
                        { id: 'risk', label: 'Risk (< Target)', count: engine.plan.filter(s => s.currentPct < target).length },
                        { id: 'priority', label: 'Priority Impact', count: priorityIds.size },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setActiveFilter(f.id)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${activeFilter === f.id
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <span>{f.label}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeFilter === f.id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                {f.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Clean Minimal Subjects Table */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 px-5 py-3 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider items-center border-b border-slate-200">
                        <div className="col-span-1 text-center">#</div>
                        <div className="col-span-4">SUBJECT</div>
                        <div className="col-span-2">ATTENDANCE</div>
                        <div className="col-span-1 text-center">SESSIONS</div>
                        <div className="col-span-1 text-center">GAIN / LEC</div>
                        <div className="col-span-1 text-center">REMAINING</div>
                        <div className="col-span-2 text-right pr-2">ACTION</div>
                    </div>

                    {/* Rows List */}
                    <div className="divide-y divide-slate-100">
                        {filteredPlan.map((sub, idx) => {
                            const isBelow = sub.initialPct < target;
                            const isFlawless = sub.initialPct >= 99.9;
                            const isPriority = priorityIds.has(sub.id);

                            let statusText = 'Min 75%';
                            if (isFlawless) statusText = 'Flawless';
                            else if (sub.initialPct >= 80) statusText = 'Safe Margin';
                            else if (sub.initialPct >= 75) statusText = 'Edge Threshold';
                            else if (sub.initialPct >= 70) statusText = 'Coverable';
                            else statusText = 'High Buffer';

                            let pctColor = 'text-blue-600';
                            let barColor = 'bg-blue-600';
                            if (isFlawless || sub.initialPct >= 80) {
                                pctColor = 'text-emerald-600';
                                barColor = 'bg-emerald-600';
                            } else if (isBelow) {
                                pctColor = 'text-amber-600';
                                barColor = 'bg-amber-500';
                            }

                            return (
                                <div
                                    key={sub.id}
                                    className="grid grid-cols-12 items-center px-5 py-3.5 hover:bg-slate-50/80 transition-colors"
                                >
                                    <div className="col-span-1 text-center text-[13px] font-semibold text-slate-400">
                                        {idx + 1}
                                    </div>
                                    <div className="col-span-4 flex items-center gap-2 min-w-0 pr-3">
                                        {isPriority ? (
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-none" title="Priority High Impact" />
                                        ) : isBelow ? (
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-none" title="Below Target" />
                                        ) : (
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-none" />
                                        )}
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-[13px] font-semibold text-slate-900 truncate">
                                                    {sub.name}
                                                </span>
                                                {isPriority && (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200/60 px-1.5 py-0.2 rounded-xs shrink-0">
                                                        Priority
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-2 pr-4 flex flex-col gap-1">
                                        <div className="flex justify-between items-center text-[12px]">
                                            <span className={`font-bold ${pctColor}`}>
                                                {sub.initialPct.toFixed(1)}%
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {statusText}
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${barColor}`}
                                                style={{ width: `${Math.min(100, Math.max(0, sub.initialPct))}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-1 text-center text-[13px] font-medium text-slate-700">
                                        {sub.att} / {sub.cond}
                                    </div>
                                    <div className="col-span-1 text-center">
                                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded-full">
                                            +{sub.efficiencyDisplay.toFixed(2)}%
                                        </span>
                                    </div>
                                    <div className="col-span-1 text-center text-[13px] text-slate-500">
                                        {sub.rem}
                                    </div>
                                    <div className="col-span-2 text-right pr-2">
                                        {sub.attend > 0 ? (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-600 text-white text-[12px] font-semibold shadow-xs">
                                                Attend {sub.attend}
                                            </span>
                                        ) : sub.rem === 0 && sub.currentPct < target ? (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-50 border border-rose-200/60 text-rose-700 text-[12px] font-semibold">
                                                Deficit
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[12px] font-semibold">
                                                Safe
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default OptimizationPage;

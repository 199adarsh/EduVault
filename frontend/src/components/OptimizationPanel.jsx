import React, { useState, useMemo } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Settings2,
    Calendar,
    TrendingUp,
    Gauge,
    Zap,
    Info
} from 'lucide-react';

function computeEngine(subjects, targetPct, excludedIds, semesterLockDate, manualLPWs = {}) {
    if (!subjects || subjects.length === 0) return null;
    const active = subjects.filter(s => !excludedIds.includes(s.id || s.code));
    if (active.length === 0) return null;

    const dTarget = new Date(semesterLockDate);
    const dToday = new Date();
    const diffMs = dTarget - dToday;
    const weeksLeft = Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 7));

    let totalCredits = 0;
    const hasStarted = active.some(s => {
        const cond = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);
        return cond > 0;
    });

    const subjectPool = active.map(s => {
        const id = s.id || s.code;
        const cond = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);
        const att = s.totalAttended > 0 ? s.totalAttended : (s.detailedAttendance?.filter(r => r.status === 'Present').length || 0);
        const lpw = Math.max(1, manualLPWs[id] ?? s.lecturesPerWeek ?? 1);
        const rem = cond === 0 ? 0 : Math.ceil(lpw * weeksLeft);
        const credit = s.credit || 1;
        if (!hasStarted || cond > 0) {
            totalCredits += credit;
        }
        const initialPct = cond === 0 ? (parseFloat(s.attendance) || 0) : parseFloat(((att / cond) * 100).toFixed(1));

        return { id, code: s.code || '', name: s.name, att, cond, rem, futureTotal: cond + rem, credit, initialPct };
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
    const bunkableTotal = Math.max(0, totalRemOverall - mustAttendTotal);

    plan.forEach(s => {
        const pctWith0 = getPrecisePct(s.att, s.futureTotal, s.initialPct);
        const pctWith1 = getPrecisePct(s.att + 1, s.futureTotal, s.initialPct);
        s.efficiencyDisplay = s.futureTotal > 0 ? (pctWith1 - pctWith0) : 0;
    });

    return {
        plan,
        weeksRemaining: Math.ceil(weeksLeft),
        currentOverall: parseFloat(currentPctOverall.toFixed(1)),
        projectedFinal: parseFloat(projectedFinal.toFixed(1)),
        mustAttendOverall: mustAttendTotal,
        bunkableOverall: bunkableTotal,
        isImpossible,
        deficit: deficitStr,
        targetUsed: targetPct
    };
}

const PctRing = ({ pct, size = 38 }) => {
    const r = (size - 6) / 2;
    const circ = 2 * Math.PI * r;
    const filled = Math.min(1, pct / 100) * circ;
    const color = pct >= 75 ? '#10b981' : pct >= 60 ? '#fbbf24' : '#ef4444';
    return (
        <svg width={size} height={size} className="shrink-0 -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={2.5} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={2.5}
                strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" />
        </svg>
    );
};

const Badge = ({ children, variant }) => {
    const cls = {
        CRITICAL: 'bg-red-500/10 text-red-500 border-red-500/20',
        WARNING: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        SAFE: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        PLAN: 'bg-blue-500/10 text-blue-400 border-blue-400/20',
    }[variant] || 'bg-white/5 text-white/40 border-white/10';
    return <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${cls}`}>{children}</span>;
};

const OptimizationPanel = ({ subjects }) => {
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

    React.useEffect(() => {
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

    if (!engine) return null;

    return (
        <section className="bg-zinc-900/30 backdrop-blur-md border border-zinc-800/50 rounded-md overflow-hidden relative text-white">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-48 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="px-4 py-4 border-b border-zinc-800/50 flex items-center justify-between relative bg-black/20">
                <div className="flex items-center gap-4">
                    <div className="p-1.5 bg-blue-500/5 rounded-sm">
                        <Gauge className="w-4 h-4 text-blue-400/80" />
                    </div>
                    <div>
                        <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-0.5">Layer-5 Engine</h2>
                        <div className="flex items-center gap-3">
                            <div className="text-lg font-bold text-white tracking-tight">{engine.weeksRemaining} <span className="text-zinc-500 text-xs font-normal">Weeks</span></div>
                            <div className="h-4 w-px bg-zinc-800" />
                            <div className="text-xs font-semibold text-zinc-400">Target <span className="text-blue-400">{engine.targetUsed}%</span></div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-zinc-950/60 border border-zinc-850 rounded-sm px-2.5 py-1 gap-2 transition-all focus-within:border-blue-500/30 shadow-inner">
                        <input type="number" min="50" max="100" value={target} onChange={e => setTarget(Number(e.target.value))} className="w-7 bg-transparent text-blue-400 font-bold text-sm outline-none text-right" />
                        <span className="text-zinc-600 font-bold text-xs">%</span>
                    </div>
                    <button onClick={() => setShowSettings(!showSettings)} className={`w-8 h-8 rounded-sm border flex items-center justify-center transition-all ${showSettings ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-zinc-900/30 border-zinc-800/50 text-zinc-500 hover:text-white hover:bg-zinc-800/50'}`}>
                        <Settings2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800/30">
                {[
                    { label: 'Current', value: `${engine.currentOverall}%`, color: 'text-zinc-100' },
                    { label: 'Projected', value: `${engine.projectedFinal}%`, color: 'text-blue-400/80' },
                    { label: 'Must Attend', value: engine.mustAttendOverall, color: 'text-amber-400/80' },
                    { label: 'Bunkable', value: engine.bunkableOverall, color: 'text-emerald-400/80' },
                ].map(s => (
                    <div key={s.label} className="bg-zinc-900/20 px-4 py-3 flex flex-col gap-1 transition-colors hover:bg-zinc-900/40">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-500">{s.label}</span>
                        <span className={`text-lg font-bold ${s.color} tracking-tight`}>{s.value}</span>
                    </div>
                ))}
            </div>

            {engine.isImpossible && (
                <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <p className="text-[10px] font-bold text-red-400 leading-relaxed truncate">Deficit: {engine.deficit}. Threshold unattainable.</p>
                </div>
            )}

            <div className="p-4 space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <Info className="w-3.5 h-3.5 text-blue-400/40" />
                    <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">Resource Priority</h3>
                </div>

                {showSettings && (
                    <div className="p-4 bg-zinc-950/20 border border-zinc-800/40 rounded-md mb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Deadline</span>
                                <input type="date" value={semesterLockDate} onChange={e => setSemesterLockDate(e.target.value)} className="w-full bg-zinc-950/40 border border-zinc-850 rounded-sm px-3 py-1.5 text-[10px] font-bold text-blue-400 outline-none focus:border-blue-400/30 transition-all" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {subjects.map(s => (
                                <div key={s.id || s.code} className="flex items-center justify-between p-2 rounded-sm border border-zinc-850 bg-zinc-900/10 hover:border-zinc-800/80 transition-all group">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <input type="checkbox" checked={!localExcluded.includes(s.id || s.code)} onChange={() => setLocalExcluded(prev => prev.includes(s.id || s.code) ? prev.filter(x => x !== (s.id || s.code)) : [...prev, s.id || s.code])} className="w-3.5 h-3.5 rounded bg-transparent border-zinc-800 focus:ring-0 cursor-pointer text-blue-500" />
                                        <span className="text-[9px] font-bold text-zinc-400 truncate group-hover:text-white transition-colors">{s.name}</span>
                                    </div>
                                    <input type="number" min="1" max="10" value={manualLPWs[s.id || s.code] ?? s.lecturesPerWeek ?? 1} onChange={e => setManualLPWs(prev => ({ ...prev, [s.id || s.code]: Math.max(1, Number(e.target.value)) }))} className="w-7 bg-transparent text-[10px] font-bold text-blue-400 text-right outline-none" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-2.5">
                    {engine.plan.map((r, idx) => (
                        <div key={r.id} className={`group relative flex flex-col md:flex-row md:items-center gap-3 bg-zinc-900/30 border ring-1 ring-white/[0.02] rounded-lg px-4 py-3 transition-all hover:bg-zinc-900/50 backdrop-blur-md ${r.attend > 0 ? 'border-blue-500/30 shadow-md shadow-blue-500/5' : 'border-zinc-800/50'}`}>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="w-8 h-8 rounded-md bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-center shrink-0 shadow-inner group-hover:bg-zinc-900 transition-colors">
                                    <span className="text-zinc-500 font-black text-xs">{idx + 1}</span>
                                </div>
                                <div className="min-w-0 flex-1 md:w-[220px]">
                                    {/* Mobile View */}
                                    <div className="flex md:hidden items-center justify-between gap-2 min-w-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <h3 className="text-xs font-bold text-zinc-200 tracking-tight group-hover:text-blue-400 transition-colors truncate">
                                                {r.name.length > 16 ? r.name.substring(0, 16) + '..' : r.name}
                                            </h3>
                                            {priorityIds.has(r.id) && <div className="shrink-0"><Badge variant="PLAN">Priority</Badge></div>}
                                        </div>
                                        <span className="text-zinc-500 font-normal text-[10px] whitespace-nowrap tracking-widest font-bold shrink-0">({r.att}/{r.cond})</span>
                                    </div>
                                    
                                    {/* Desktop View */}
                                    <div className="hidden md:flex items-center gap-2 min-w-0">
                                        <h3 className="text-xs font-bold text-zinc-200 tracking-tight truncate group-hover:text-blue-400 transition-colors">
                                            {r.name}
                                        </h3>
                                        {priorityIds.has(r.id) && <Badge variant="PLAN">Priority</Badge>}
                                    </div>

                                    {r.code && <p className="text-[8px] text-zinc-500 font-mono font-bold uppercase tracking-widest mt-0.5">{r.code}</p>}
                                </div>
                            </div>

                            <div className="flex-1 flex flex-row items-center gap-4 md:px-4 w-full">
                                <div className="flex flex-col gap-1.5 w-full md:max-w-[120px]">
                                    <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
                                        <span className="text-zinc-300">{r.currentPct.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-1 w-full bg-zinc-950 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-1000 ${r.currentPct < 40 ? 'bg-red-500/80' : r.currentPct < engine.targetUsed ? 'bg-amber-500/80' : 'bg-emerald-500/80'}`} style={{ width: `${Math.min(100, r.currentPct)}%` }}></div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-start gap-4 md:gap-6 text-[8px] font-black text-zinc-500 uppercase tracking-[0.2em] w-full md:w-auto">
                                    <div className="flex flex-col gap-0.5 hidden sm:flex">
                                        <span className="text-zinc-600">Status</span>
                                        <span className="text-[10px] font-bold text-zinc-300">{r.att} / {r.cond}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-zinc-600">Gain/Lec</span>
                                        <span className="text-[10px] font-bold text-emerald-400">+{r.efficiencyDisplay.toFixed(2)}%</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-zinc-600">Remaining</span>
                                        <span className="text-[10px] font-bold text-zinc-300">{r.rem}</span>
                                    </div>
                                </div>
                            </div>

                            <div className={`md:text-right w-full md:w-auto lg:min-w-[100px] justify-end items-center ${r.attend > 0 ? 'flex mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800/50' : 'hidden md:flex'}`}>
                                {r.attend > 0 ? (
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-md px-2.5 py-1.5 flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                                        <span className="text-[9px] font-black text-amber-400 tracking-widest uppercase">Attend {r.attend}</span>
                                    </div>
                                ) : r.rem === 0 && r.currentPct < engine.targetUsed ? (
                                    <div className="inline-flex items-center gap-1.5 text-red-400 px-2.5 py-1.5 bg-red-500/10 rounded-md border border-red-500/20">
                                        <AlertTriangle className="w-3 h-3 text-red-400" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Deficit</span>
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-1.5 text-emerald-400 px-2.5 py-1.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Safe</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default OptimizationPanel;

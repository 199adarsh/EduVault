export const isTheoryCode = (subject) => {
    const code = (subject?.code || '').trim().toUpperCase();
    const alphabets = code.replace(/[^A-Z]/g, '');
    return alphabets.slice(-1) === 'L';
};

export function calculateLPW(subject) {
    const records = subject.detailedAttendance || [];
    if (!records.length) {
        return !isTheoryCode(subject) ? 1 : 3;
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
        return !isTheoryCode(subject) ? 1 : 3;
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

export function computeEngine(subjects, targetPct, excludedIds, semesterLockDate, manualLPWs = {}) {
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
        const isLab = !isTheoryCode(s);
        const calculatedLpw = calculateLPW(s);
        const lpw = Math.max(1, manualLPWs[id] ?? calculatedLpw);
        const rem = cond === 0 ? 0 : Math.ceil(lpw * weeksLeft);
        const credit = s.credit || (isLab ? 2 : 3);
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
        currentOverall: totalConducted > 0 ? parseFloat(((totalAttended / totalConducted) * 100).toFixed(1)) : parseFloat(currentPctOverall.toFixed(1)),
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

import React, { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { getSubjectAbbreviation, normalizeDateKey } from '../../lib/attendanceUtils';

export function buildSharedHeatmapData(subjects, weeksCount = 18) {
  const dayMap = new Map();
  const dates = [];

  (subjects || []).forEach(sub => {
    (sub.detailedAttendance || []).forEach(rec => {
      if (!rec || !rec.date) return;
      const { ddmmyyyy, yyyymmdd } = normalizeDateKey(rec.date);
      const key = ddmmyyyy;

      if (!dayMap.has(key)) {
        dayMap.set(key, {
          present: 0,
          absent: 0,
          total: 0,
          date: key,
          isoDate: yyyymmdd,
          lectures: []
        });
      }

      const entry = dayMap.get(key);
      entry.total++;
      if (rec.status === 'Present') entry.present++;
      else entry.absent++;

      entry.lectures.push({
        name: sub.subjectName || sub.name || 'Subject',
        status: rec.status,
        slot: rec.slot || ''
      });

      if (yyyymmdd) dates.push(yyyymmdd);
    });
  });

  const today = new Date();
  const endSaturday = new Date(today);
  endSaturday.setDate(today.getDate() + (6 - today.getDay()));

  let startOfGrid = new Date(endSaturday);
  startOfGrid.setDate(endSaturday.getDate() - (weeksCount * 7) + 1);
  let weeksToShow = weeksCount;

  if (dates.length > 0) {
    const sortedDates = [...dates].sort();
    const earliestStr = sortedDates[0];
    const latestStr = sortedDates[sortedDates.length - 1];

    const earliest = new Date(earliestStr.replace(/-/g, '/'));
    const latest = new Date(latestStr.replace(/-/g, '/'));
    const effectiveEnd = latest > today ? latest : today;

    const startSunday = new Date(earliest);
    startSunday.setDate(earliest.getDate() - earliest.getDay());

    const totalDays = Math.max(1, Math.ceil((effectiveEnd.getTime() - startSunday.getTime()) / (24 * 60 * 60 * 1000)));
    weeksToShow = Math.max(weeksCount, Math.ceil(totalDays / 7) + 1);
    startOfGrid = startSunday;
  }

  const grid = [];
  let cursor = new Date(startOfGrid);
  for (let w = 0; w < weeksToShow; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dd = String(cursor.getDate()).padStart(2, '0');
      const mm = String(cursor.getMonth() + 1).padStart(2, '0');
      const yyyy = cursor.getFullYear();
      const key = `${dd}-${mm}-${yyyy}`;
      const entry = dayMap.get(key) || null;
      const isFuture = cursor > today;
      week.push({ key, entry, isFuture, dateObj: new Date(cursor) });
      cursor.setDate(cursor.getDate() + 1);
    }
    grid.push(week);
  }

  return { grid, dayMap };
}

const SharedAttendanceHeatmap = ({
  subjects = [],
  weeksCount = 18,
  compact = false,
  className = ''
}) => {
  const [hoveredDay, setHoveredDay] = useState(null);

  const { grid } = useMemo(
    () => buildSharedHeatmapData(subjects, weeksCount),
    [subjects, weeksCount]
  );

  const visibleWeeks = useMemo(() => grid, [grid]);

  const { presentAbbrs, absentAbbrs } = useMemo(() => {
    if (!hoveredDay?.entry?.lectures) return { presentAbbrs: [], absentAbbrs: [] };
    const p = [];
    const a = [];
    const seenP = new Set();
    const seenA = new Set();
    hoveredDay.entry.lectures.forEach(l => {
      const abbr = getSubjectAbbreviation(l.name);
      if (l.status === 'Present') {
        if (!seenP.has(abbr)) {
          seenP.add(abbr);
          p.push(abbr);
        }
      } else {
        if (!seenA.has(abbr)) {
          seenA.add(abbr);
          a.push(abbr);
        }
      }
    });
    return { presentAbbrs: p, absentAbbrs: a };
  }, [hoveredDay]);

  return (
    <div className={cn("w-full flex flex-col md:flex-row items-center md:items-stretch gap-2.5 justify-between min-w-0 overflow-hidden", className)}>
      {/* Scrollable Heatmap Grid */}
      <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar touch-pan-x py-0.5">
        <div className="flex gap-1 min-w-max">
          {visibleWeeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1 shrink-0">
              {week.map((cell) => {
                const isAllAbsent = cell.entry && cell.entry.total > 0 && cell.entry.present === 0 && cell.entry.absent > 0;
                const presentCount = cell.entry ? cell.entry.present : 0;

                let bgClass = "bg-slate-200/70";
                if (isAllAbsent) {
                  bgClass = "bg-[#f85149]";
                } else if (presentCount >= 4) {
                  bgClass = "bg-[#15803d]";
                } else if (presentCount === 3) {
                  bgClass = "bg-[#16a34a]";
                } else if (presentCount === 2) {
                  bgClass = "bg-[#22c55e]";
                } else if (presentCount >= 1) {
                  bgClass = "bg-[#86efac]";
                }

                return (
                  <div
                    key={cell.key}
                    onMouseEnter={() => setHoveredDay(cell)}
                    onClick={() => setHoveredDay(cell)}
                    onTouchStart={() => setHoveredDay(cell)}
                    className={cn(
                      "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] transition-transform cursor-pointer hover:scale-125 border border-slate-300/40",
                      bgClass
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Date & Lecture status panel - Clean & minimal info */}
      <div className="w-full md:w-36 lg:w-40 xl:w-44 shrink-0 flex flex-col justify-center rounded-lg p-2 bg-slate-50 border border-slate-200/80 min-w-0">
        {hoveredDay && hoveredDay.entry ? (
          <div className="flex flex-col gap-1 animate-in fade-in duration-100 min-w-0 text-[10px]">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-slate-900 text-[11px] truncate">{hoveredDay.key}</span>
              <span className="text-[9px] text-slate-400 font-medium shrink-0">
                {hoveredDay.entry.total} {hoveredDay.entry.total === 1 ? 'class' : 'classes'}
              </span>
            </div>

            <div className="flex flex-col gap-1 pt-0.5">
              {presentAbbrs.length > 0 && (
                <div className="flex items-center gap-1 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded">
                  <span className="font-bold shrink-0">✓ Present:</span>
                  <span className="font-semibold truncate">
                    {presentAbbrs.join(', ')}
                  </span>
                </div>
              )}

              {absentAbbrs.length > 0 && (
                <div className="flex items-center gap-1 text-[9px] text-rose-700 bg-rose-50 border border-rose-200/80 px-1.5 py-0.5 rounded">
                  <span className="font-bold shrink-0">✗ Absent:</span>
                  <span className="font-semibold truncate">
                    {absentAbbrs.join(', ')}
                  </span>
                </div>
              )}

              {presentAbbrs.length === 0 && absentAbbrs.length === 0 && (
                <span className="text-[9px] text-slate-400">No sessions recorded</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center text-[10px] text-slate-400 py-0.5">
            <span className="font-medium text-slate-600 truncate">{hoveredDay ? hoveredDay.key : 'Select Date'}</span>
            <span className="text-[9px] text-slate-400">
              {hoveredDay
                ? (hoveredDay.isFuture ? 'Upcoming date' : 'No sessions recorded')
                : 'Hover square to inspect'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedAttendanceHeatmap;

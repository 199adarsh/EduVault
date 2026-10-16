import React, { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { formatAttendanceDaySubjects, getSubjectAbbreviation, normalizeDateKey } from '../../lib/attendanceUtils';

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
    const earliestStr = dates.sort()[0];
    const earliest = new Date(earliestStr.replace(/-/g, '/'));
    const startSunday = new Date(earliest);
    startSunday.setDate(earliest.getDate() - earliest.getDay());
    weeksToShow = Math.max(weeksCount, 18);
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

  const visibleWeeks = useMemo(() => grid.slice(-weeksCount), [grid, weeksCount]);

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
    <div className={cn("w-full flex flex-col md:flex-row items-center md:items-stretch gap-2.5 justify-between overflow-hidden", className)}>
      {/* Left: Scrollable Heatmap Grid */}
      <div className="flex gap-1 shrink-0 overflow-x-auto max-w-full pb-1 md:pb-0">
        {visibleWeeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell) => {
              const isAllAbsent = cell.entry && cell.entry.total > 0 && cell.entry.present === 0 && cell.entry.absent > 0;
              const presentCount = cell.entry ? cell.entry.present : 0;

              let bgClass = "bg-slate-200/70 dark:bg-slate-800/40";
              if (isAllAbsent) {
                bgClass = "bg-[#ef4444] dark:bg-[#da3633]";
              } else if (presentCount >= 4) {
                bgClass = "bg-[#15803d] dark:bg-[#39d353]";
              } else if (presentCount === 3) {
                bgClass = "bg-[#16a34a] dark:bg-[#26a641]";
              } else if (presentCount === 2) {
                bgClass = "bg-[#22c55e] dark:bg-[#006d32]";
              } else if (presentCount >= 1) {
                bgClass = "bg-[#86efac] dark:bg-[#2ea043]";
              }

              return (
                <div
                  key={cell.key}
                  onMouseEnter={() => setHoveredDay(cell)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={cn(
                    "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs transition-transform cursor-pointer hover:scale-125 border border-black/5",
                    bgClass
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Right Side: 3 items - Date, Present in Green, Absent in Red */}
      <div className="flex-1 min-w-[150px] w-full flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-200 dark:border-border-subtle pt-2 md:pt-0 md:pl-3 overflow-hidden bg-slate-100/90 dark:bg-slate-900/40 border border-slate-200/80 rounded-lg p-2.5">
        {hoveredDay && hoveredDay.entry ? (
          <div className="flex flex-col gap-1.5 animate-in fade-in duration-100 min-w-0 text-[10px]">
            {/* 1. Date */}
            <div className="font-extrabold text-slate-950 dark:text-slate-100 text-[12px] truncate">
              {hoveredDay.key}
            </div>

            {/* 2. Present in Green */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-emerald-900 dark:text-emerald-300 bg-emerald-200/80 dark:bg-emerald-950/80 border border-emerald-400 dark:border-emerald-700 px-1.5 py-0.5 rounded text-[9px]">
                Present
              </span>
              <span className="text-emerald-950 dark:text-emerald-200 font-bold truncate">
                {presentAbbrs.length > 0 ? presentAbbrs.join(', ') : 'None'}
              </span>
            </div>

            {/* 3. Absent in Red */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-rose-900 dark:text-rose-300 bg-rose-200/80 dark:bg-rose-950/80 border border-rose-400 dark:border-rose-700 px-1.5 py-0.5 rounded text-[9px]">
                Absent
              </span>
              <span className="text-rose-950 dark:text-rose-200 font-bold truncate">
                {absentAbbrs.length > 0 ? absentAbbrs.join(', ') : 'None'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center gap-0.5 text-[9px] py-1 min-w-0">
            <span className="font-bold text-slate-900 dark:text-slate-200 text-[11px] truncate">
              {hoveredDay ? hoveredDay.key : 'Hover over a date'}
            </span>
            <span className="text-[9px] text-slate-700 dark:text-slate-400 font-medium leading-tight">
              {hoveredDay
                ? (hoveredDay.isFuture ? 'Upcoming date.' : 'Recess or holiday.')
                : 'Hover over attendance squares to inspect date-wise status.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedAttendanceHeatmap;

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
    <div className={cn("w-full flex flex-col lg:flex-row items-stretch gap-3 min-w-0 overflow-hidden", className)}>
      {/* Scrollable Heatmap Grid */}
      <div className="w-full lg:flex-1 overflow-x-auto no-scrollbar touch-pan-x -mx-1 px-1 py-1">
        <div className="flex gap-1 sm:gap-1.5 min-w-max">
          {visibleWeeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1 sm:gap-1.5">
              {week.map((cell) => {
                const isAllAbsent = cell.entry && cell.entry.total > 0 && cell.entry.present === 0 && cell.entry.absent > 0;
                const presentCount = cell.entry ? cell.entry.present : 0;

                let bgClass = "bg-slate-200/70";
                if (isAllAbsent) {
                  bgClass = "bg-rose-500";
                } else if (presentCount >= 4) {
                  bgClass = "bg-emerald-700";
                } else if (presentCount === 3) {
                  bgClass = "bg-emerald-600";
                } else if (presentCount === 2) {
                  bgClass = "bg-emerald-500";
                } else if (presentCount >= 1) {
                  bgClass = "bg-emerald-300";
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

      {/* Date & Lecture status panel */}
      <div className="w-full lg:w-48 shrink-0 flex flex-col justify-center rounded-xl p-3 bg-slate-50 border border-border-subtle min-w-0">
        {hoveredDay && hoveredDay.entry ? (
          <div className="flex flex-col gap-1.5 animate-in fade-in duration-100 min-w-0 text-[10px]">
            <div className="font-extrabold text-text-primary text-xs truncate">
              {hoveredDay.key}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded text-[9px]">
                Present
              </span>
              <span className="text-text-primary font-bold truncate">
                {presentAbbrs.length > 0 ? presentAbbrs.join(', ') : 'None'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded text-[9px]">
                Absent
              </span>
              <span className="text-text-primary font-bold truncate">
                {absentAbbrs.length > 0 ? absentAbbrs.join(', ') : 'None'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center gap-0.5 text-[9px] min-w-0">
            <span className="font-bold text-text-primary text-[11px] truncate">
              {hoveredDay ? hoveredDay.key : 'Tap / hover square'}
            </span>
            <span className="text-[10px] text-text-secondary leading-snug">
              {hoveredDay
                ? (hoveredDay.isFuture ? 'Upcoming date.' : 'No sessions recorded.')
                : 'Select any cell to inspect date-wise lecture presence.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedAttendanceHeatmap;

import React, { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { getSubjectAbbreviation, normalizeDateKey } from '../../lib/attendanceUtils';
import { PresentBadgeIcon, AbsentBadgeIcon } from './AttendanceAnalytics';

export function buildSharedHeatmapData(subjects) {
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
  let startOfGrid;
  let weeksToShow;

  if (dates.length > 0) {
    const sortedDates = [...dates].sort();
    const earliest = new Date(sortedDates[0].replace(/-/g, '/'));
    const latest = new Date(sortedDates[sortedDates.length - 1].replace(/-/g, '/'));

    // Start on Sunday of the earliest recorded heat
    const startSunday = new Date(earliest);
    startSunday.setDate(earliest.getDate() - earliest.getDay());

    // End on Saturday of the latest recorded heat
    const endSaturday = new Date(latest);
    endSaturday.setDate(latest.getDate() + (6 - latest.getDay()));

    const totalDays = Math.max(7, Math.ceil((endSaturday.getTime() - startSunday.getTime()) / (24 * 60 * 60 * 1000)) + 1);
    weeksToShow = Math.max(1, Math.ceil(totalDays / 7));
    startOfGrid = startSunday;
  } else {
    const endSaturday = new Date(today);
    endSaturday.setDate(today.getDate() + (6 - today.getDay()));
    const startSunday = new Date(endSaturday);
    startSunday.setDate(endSaturday.getDate() - 27);
    startOfGrid = startSunday;
    weeksToShow = 4;
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

  return { grid, dayMap, weeksToShow };
}

const DAY_LABELS = ['', 'M', '', 'W', '', 'F', ''];

const SharedAttendanceHeatmap = ({
  subjects = [],
  className = ''
}) => {
  const [hoveredDay, setHoveredDay] = useState(null);

  const { grid } = useMemo(
    () => buildSharedHeatmapData(subjects),
    [subjects]
  );

  const visibleWeeks = useMemo(() => grid, [grid]);

  // Compute month headers
  const monthHeaders = useMemo(() => {
    const headers = [];
    let lastMonth = -1;
    visibleWeeks.forEach((week, index) => {
      const month = week[0]?.dateObj?.getMonth();
      if (month !== undefined && month !== lastMonth) {
        lastMonth = month;
        headers.push({
          index,
          label: week[0].dateObj.toLocaleString('default', { month: 'short' })
        });
      }
    });
    return headers;
  }, [visibleWeeks]);

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

  const overallStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    (subjects || []).forEach(sub => {
      (sub.detailedAttendance || []).forEach(rec => {
        if (rec?.status === 'Present') present++;
        else if (rec?.status === 'Absent') absent++;
      });
    });
    const total = present + absent;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, total, pct };
  }, [subjects]);

  const formattedDate = useMemo(() => {
    if (!hoveredDay?.dateObj) return null;
    return hoveredDay.dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  }, [hoveredDay]);

  const dayType = useMemo(() => {
    if (!hoveredDay) return null;
    if (hoveredDay.isFuture) return 'Upcoming';
    if (!hoveredDay.entry || hoveredDay.entry.total === 0) {
      const isWeekend = hoveredDay.dateObj.getDay() === 0 || hoveredDay.dateObj.getDay() === 6;
      return isWeekend ? 'Weekend' : 'Off Day';
    }
    if (hoveredDay.entry.absent === 0) return '100% Present';
    if (hoveredDay.entry.present === 0) return 'All Absent';
    return `${hoveredDay.entry.present}/${hoveredDay.entry.total} Present`;
  }, [hoveredDay]);

  const getCellColor = (cell) => {
    if (!cell.entry || cell.entry.total === 0) {
      return cell.isFuture ? 'bg-[#DEEDFC]/30' : 'bg-[#DEEDFC]/50';
    }
    const { present, absent, total } = cell.entry;
    if (total > 0 && present === 0 && absent > 0) {
      return 'bg-rose-500/85 text-white shadow-2xs';
    }
    if (present >= 4) return 'bg-emerald-600 text-white';
    if (present === 3) return 'bg-emerald-500';
    if (present === 2) return 'bg-emerald-400/80';
    return 'bg-emerald-300/70';
  };

  return (
    <div className={cn("w-full flex flex-col md:flex-row items-stretch gap-6 min-w-0", className)}>
      {/* Edge-to-Edge Fitted Heatmap Grid */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        {/* Month labels */}
        <div className="relative h-3.5 pl-4 text-[9px] font-semibold text-[#727272] w-full">
          {monthHeaders.map(mh => (
            <span
              key={mh.index}
              style={{ left: `${(mh.index / (visibleWeeks.length || 1)) * 100}%` }}
              className="absolute"
            >
              {mh.label}
            </span>
          ))}
        </div>

        {/* Grid with Day of week labels */}
        <div className="flex items-start w-full gap-1.5 mt-1">
          {/* Day labels column */}
          <div className="flex flex-col gap-1 pr-1 text-[8px] font-bold text-[#727272] leading-none select-none shrink-0">
            {DAY_LABELS.map((lbl, idx) => (
              <div
                key={idx}
                className="h-3 sm:h-3.5 flex items-center justify-center w-2.5"
              >
                {lbl}
              </div>
            ))}
          </div>

          {/* Week columns spanning full available space */}
          <div className="flex-1 flex justify-between gap-1 items-stretch min-w-0">
            {visibleWeeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1 flex-1 min-w-0">
                {week.map((cell) => {
                  const isHovered = hoveredDay?.key === cell.key;
                  return (
                    <div
                      key={cell.key}
                      onMouseEnter={() => setHoveredDay(cell)}
                      onClick={() => setHoveredDay(cell)}
                      onTouchStart={() => setHoveredDay(cell)}
                      className={cn(
                        "w-full aspect-square rounded-[3px] transition-all cursor-pointer",
                        getCellColor(cell),
                        isHovered && "ring-2 ring-[#0073E6] ring-offset-1 scale-125 z-10"
                      )}
                      title={`${cell.key}: ${cell.entry ? `${cell.entry.present}/${cell.entry.total} present` : 'No classes'}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seamless Integrated Inspector */}
      <div className="w-full md:w-48 lg:w-52 shrink-0 flex flex-col justify-between pt-2 md:pt-0 md:border-l md:border-[#E2E2E2] md:pl-5 min-w-0">
        {hoveredDay ? (
          <div className="flex flex-col justify-between h-full gap-2 animate-in fade-in duration-100 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-xs text-[#383838] leading-tight truncate">
                  {formattedDate || hoveredDay.key}
                </h4>
                <p className="text-[10px] text-[#727272] mt-0.5">
                  {hoveredDay.entry?.total
                    ? `${hoveredDay.entry.total} ${hoveredDay.entry.total === 1 ? 'session' : 'sessions'}`
                    : (hoveredDay.isFuture ? 'Future schedule' : 'No recorded sessions')}
                </p>
              </div>
              <span className={cn(
                "text-[9px] font-semibold px-2 py-0.5 rounded-full shrink-0 border",
                dayType === '100% Present' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                dayType === 'All Absent' && "bg-rose-50 text-rose-700 border-rose-200",
                dayType?.includes('Present') && dayType !== '100% Present' && "bg-amber-50 text-amber-700 border-amber-200",
                (dayType === 'Weekend' || dayType === 'Off Day') && "bg-slate-100 text-[#727272] border-slate-200",
                dayType === 'Upcoming' && "bg-[#D9ECFF] text-[#0073E6] border-[#0073E6]/20"
              )}>
                {dayType}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 py-1">
              {presentAbbrs.map(sub => (
                <span key={sub} className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-1.5 py-0.5 rounded">
                  <PresentBadgeIcon size={12} className="text-emerald-600" />
                  {sub}
                </span>
              ))}
              {absentAbbrs.map(sub => (
                <span key={sub} className="inline-flex items-center gap-1 text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200/60 px-1.5 py-0.5 rounded">
                  <AbsentBadgeIcon size={12} className="text-rose-600" />
                  {sub}
                </span>
              ))}
            </div>

            <div className="text-[9px] text-[#727272]">
              {hoveredDay.entry?.total > 0
                ? `${hoveredDay.entry.present} of ${hoveredDay.entry.total} attended`
                : 'Hover squares to inspect'}
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-between h-full gap-2 min-w-0">
            <div>
              <span className="text-[10px] font-medium text-[#727272] uppercase tracking-wider block">
                Term Standing
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-xl font-bold tracking-tight text-[#0073E6] tabular-nums">
                  {overallStats.pct}%
                </span>
                <span className="text-[10px] text-[#727272]">attendance</span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div>
                <span className="text-[9px] text-[#727272] block">Attended</span>
                <span className="font-semibold text-[11px] text-emerald-600 tabular-nums">{overallStats.present}</span>
              </div>
              <div className="w-px h-5 bg-[#E2E2E2]" />
              <div>
                <span className="text-[9px] text-[#727272] block">Missed</span>
                <span className="font-semibold text-[11px] text-rose-600 tabular-nums">{overallStats.absent}</span>
              </div>
            </div>

            <span className="text-[9px] text-[#727272]">
              Hover square for daily log
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedAttendanceHeatmap;

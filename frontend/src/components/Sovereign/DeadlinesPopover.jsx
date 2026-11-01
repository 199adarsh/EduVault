import React, { useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Clock, X, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { parseDeadlineDate, getDaysRemainingInfo, formatDeadlineDate } from './deadlineUtils';

const DeadlinesPopover = ({
  deadlines = [],
  isOpen,
  onClose,
  anchorRef,
  className = '',
  title = 'Academic Deadlines'
}) => {
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (popoverRef.current && popoverRef.current.contains(e.target)) {
        return;
      }
      if (anchorRef && anchorRef.current && anchorRef.current.contains(e.target)) {
        return;
      }
      if (onClose) onClose();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (onClose) onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  // Filter and sort active deadlines
  const sortedDeadlines = [...deadlines]
    .map(item => {
      const rawDate = item.deadline || item.dueDate || item.date || item.meta?.deadline;
      const parsed = parseDeadlineDate(rawDate);
      return {
        ...item,
        _rawDate: rawDate,
        _parsedDate: parsed
      };
    })
    .filter(item => item._parsedDate !== null)
    .sort((a, b) => a._parsedDate.getTime() - b._parsedDate.getTime());

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs z-[200] sm:hidden animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating Card Popover */}
      <div
        ref={popoverRef}
        role="dialog"
        aria-label="Upcoming Deadlines Popover"
        className={cn(
          "fixed inset-x-3 top-20 max-w-sm mx-auto z-[210]",
          "sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[370px] sm:z-50",
          "bg-white rounded-2xl shadow-xl border border-slate-200/90 text-slate-900 overflow-hidden",
          "animate-in fade-in zoom-in-95 duration-150 origin-top-right",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center shadow-2xs">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-tight">{title}</h3>
              <p className="text-[10px] text-slate-500 font-medium">Currently active schedule dates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs">
              {sortedDeadlines.length} {sortedDeadlines.length === 1 ? 'due' : 'due'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Close"
              aria-label="Close deadlines popup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5 focus:outline-none">
          {sortedDeadlines.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2.5 border border-emerald-200/60 shadow-2xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">All Caught Up</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[220px] mx-auto leading-relaxed">
                No upcoming deadlines scheduled in announcements right now.
              </p>
            </div>
          ) : (
            sortedDeadlines.map((item, idx) => {
              const d = item._parsedDate;
              const month = d.toLocaleDateString(undefined, { month: 'short' });
              const day = d.getDate();
              const daysInfo = getDaysRemainingInfo(item._rawDate);
              const category = item.type || item.tag || item.category || 'Official Notice';

              return (
                <div
                  key={item.id || idx}
                  className="p-2.5 rounded-xl bg-white hover:bg-slate-50/90 border border-slate-100 hover:border-slate-200 transition-all flex items-start gap-3 group"
                >
                  {/* Calendar Date Block */}
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 flex flex-col items-center justify-center shrink-0 group-hover:border-blue-300 transition-colors shadow-2xs">
                    <span className="text-[8px] font-bold uppercase text-rose-600 leading-none">
                      {month}
                    </span>
                    <span className="text-xs font-extrabold text-slate-800 leading-tight mt-0.5">
                      {day}
                    </span>
                  </div>

                  {/* Body Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5 mb-0.5">
                      <span className="text-[10px] font-semibold text-blue-600 truncate uppercase tracking-wider">
                        {category}
                      </span>
                      {daysInfo && (
                        <span className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] border whitespace-nowrap shrink-0 shadow-2xs",
                          daysInfo.badgeClass
                        )}>
                          {daysInfo.label}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug">
                      {item.title}
                    </h4>

                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{formatDeadlineDate(item._rawDate)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {sortedDeadlines.length > 0 && (
          <div className="px-3.5 py-2.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Synced with Academic Announcements
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default DeadlinesPopover;

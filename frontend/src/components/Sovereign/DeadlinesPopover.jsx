import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar03Icon as CalendarIcon, Clock01Icon as Clock, Cancel01Icon as X, CheckmarkCircle01Icon as CheckCircle2 } from 'hugeicons-react';
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
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (anchorRef?.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        const width = 370;
        let left = rect.right - width;
        if (left < 16) left = 16;
        if (left + width > window.innerWidth - 16) {
          left = window.innerWidth - width - 16;
        }
        setCoords({
          top: rect.bottom + 8,
          left: Math.max(16, left),
          width: Math.min(width, window.innerWidth - 32)
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, anchorRef]);

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

  const popoverContent = (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs z-[9990] sm:hidden animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating Card Popover */}
      <div
        ref={popoverRef}
        role="dialog"
        aria-label="Upcoming Deadlines Popover"
        style={
          coords && typeof window !== 'undefined' && window.innerWidth >= 640
            ? {
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: `${coords.width}px`,
                zIndex: 9999
              }
            : {
                zIndex: 9999
              }
        }
        className={cn(
          "fixed inset-x-3 top-20 max-w-sm mx-auto",
          "sm:max-w-none sm:mx-0",
          "bg-white rounded-2xl shadow-2xl border border-[#E2E2E2] text-[#383838] overflow-hidden",
          "animate-in fade-in zoom-in-95 duration-150 origin-top-right",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#DEEDFC]/40 border-b border-[#E2E2E2]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#D9ECFF] text-[#0073E6] flex items-center justify-center shadow-2xs">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#383838] leading-tight">{title}</h3>
              <p className="text-[10px] text-[#727272] font-medium">Currently active schedule dates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DEEDFC] text-[#0073E6] border border-[#D9ECFF] shadow-2xs">
              {sortedDeadlines.length} {sortedDeadlines.length === 1 ? 'due' : 'due'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#727272] hover:text-[#383838] hover:bg-slate-200/60 transition-colors cursor-pointer"
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
              <p className="text-xs font-bold text-[#383838]">All Caught Up</p>
              <p className="text-[11px] text-[#727272] mt-1 max-w-[220px] mx-auto leading-relaxed">
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
                  className="p-2.5 rounded-xl bg-white hover:bg-slate-50/90 border border-[#E2E2E2] hover:border-[#E2E2E2] transition-all flex items-start gap-3 group"
                >
                  {/* Calendar Date Block */}
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-[#E2E2E2] text-[#383838] flex flex-col items-center justify-center shrink-0 group-hover:border-blue-300 transition-colors shadow-2xs">
                    <span className="text-[8px] font-bold uppercase text-rose-600 leading-none">
                      {month}
                    </span>
                    <span className="text-xs font-extrabold text-[#383838] leading-tight mt-0.5">
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

                    <h4 className="text-xs font-bold text-[#383838] group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug">
                      {item.title}
                    </h4>

                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#727272]">
                      <Clock className="w-3 h-3 text-[#727272] shrink-0" />
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
          <div className="px-3.5 py-2.5 bg-slate-50/90 border-t border-[#E2E2E2] flex items-center justify-between text-[11px] text-[#727272]">
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

  return typeof document !== 'undefined'
    ? createPortal(popoverContent, document.body)
    : popoverContent;
};

export default DeadlinesPopover;

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

/**
 * A responsive and theme-adaptive card for displaying analytics with an animated bar chart.
 * Built with React, Tailwind CSS, and Framer Motion.
 */
export const AnalyticsCard = ({
  title,
  totalAmount,
  subtitle,
  icon,
  data = [],
  className,
}) => {
  const maxValue = Math.max(...data.map((item) => item.value), 0);

  return (
    <div
      className={cn(
        'w-full rounded-2xl border border-slate-200/80 bg-white p-5 text-slate-900 shadow-xs flex flex-col justify-between',
        className
      )}
    >
      {/* --- CARD HEADER --- */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
          {subtitle && <span className="text-[11px] text-slate-400 font-medium">{subtitle}</span>}
        </div>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            {icon}
          </div>
        )}
      </div>

      {/* --- MAIN VALUE --- */}
      <div className="my-3">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">{totalAmount}</h2>
      </div>

      {/* --- ANIMATED BAR CHART --- */}
      <div
        className={cn(
          "grid gap-3 pt-2 border-t border-slate-100",
          data.length === 2 ? "grid-cols-2" : data.length === 3 ? "grid-cols-3" : data.length === 4 ? "grid-cols-4" : "grid-cols-3"
        )}
        aria-label="Analytics bar chart"
      >
        {data.map((item, index) => {
          const isMax = item.value === maxValue && maxValue > 0;
          return (
            <div key={index} className="flex flex-col items-center gap-1.5">
              {/* Bar container with striped background */}
              <div
                className="relative flex h-24 sm:h-28 w-full items-end overflow-hidden rounded-lg bg-slate-100/80 border border-slate-200/50"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(226, 232, 240, 0.6) 4px, rgba(226, 232, 240, 0.6) 8px)',
                  backgroundSize: '16px 16px',
                }}
                role="presentation"
              >
                {/* Animated bar */}
                <motion.div
                  className={cn(
                    'relative w-full rounded-t-md transition-colors',
                    isMax ? 'bg-primary shadow-xs' : 'bg-primary/50'
                  )}
                  initial={{ height: '0%' }}
                  animate={{ height: `${Math.min(100, Math.max(8, item.value))}%` }}
                  transition={{
                    duration: 0.8,
                    delay: index * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  aria-label={`${item.label}: ${item.value}%`}
                  aria-valuenow={item.value}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  {/* Top handle and percentage text */}
                  <div className="absolute left-1/2 top-1.5 h-1 w-1/3 -translate-x-1/2 rounded-full bg-white/60" />
                  <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] sm:text-xs font-bold text-white tabular-nums drop-shadow-xs">
                    {item.value}%
                  </span>
                </motion.div>
              </div>
              {/* Label below the bar */}
              <span className="text-[11px] font-semibold text-slate-600 truncate max-w-full text-center">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnalyticsCard;


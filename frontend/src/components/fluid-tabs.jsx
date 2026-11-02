'use client';
import { useState, useId } from 'react';
import { motion } from 'motion/react';
import { BiSolidPieChartAlt2 } from 'react-icons/bi';
import { FaInbox, FaLandmark } from 'react-icons/fa';

const DEFAULT_TABS = [
  { id: 'accounts', label: 'Accounts', icon: <FaLandmark size={18} /> },
  { id: 'deposits', label: 'Deposits', icon: <FaInbox size={18} /> },
  { id: 'funds', label: 'Funds', icon: <BiSolidPieChartAlt2 size={18} /> },
];

export const FluidTabs = ({
  tabs = DEFAULT_TABS,
  value,
  defaultActive,
  onChange,
  className = '',
  tabClassName = '',
  activeClassName = 'font-bold text-slate-900 dark:text-white',
  inactiveClassName = 'font-semibold text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-200',
  indicatorClassName = 'absolute inset-0 rounded-full border border-slate-200/80 bg-white shadow-xs dark:border-neutral-700/60 dark:bg-neutral-800',
  layoutId,
  size = 'default',
}) => {
  const autoLayoutId = useId();
  const effectiveLayoutId = layoutId || `fluid-tab-${autoLayoutId}`;
  const initialActive = value !== undefined ? value : (defaultActive || tabs[0]?.id);
  const [internalActive, setInternalActive] = useState(initialActive);
  const active = value !== undefined ? value : internalActive;

  const handleChange = (id) => {
    if (value === undefined) {
      setInternalActive(id);
    }
    onChange?.(id);
  };

  const sizeClasses = {
    xs: 'px-2.5 py-1 text-xs gap-1',
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    default: 'px-3.5 py-2 text-xs sm:text-sm gap-2',
    lg: 'px-4 py-2.5 text-sm sm:text-base gap-2.5',
  }[size] || 'px-3.5 py-2 text-xs sm:text-sm gap-2';

  return (
    <div
      className={`relative inline-flex items-center gap-1 rounded-full border border-slate-200/90 bg-slate-100/90 p-1 transition-colors dark:border-neutral-800 dark:bg-neutral-900/90 ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            disabled={tab.disabled}
            onClick={() => handleChange(tab.id)}
            className={`group relative rounded-full outline-none transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${sizeClasses} ${tabClassName}`}
          >
            {isActive && (
              <motion.div
                layoutId={effectiveLayoutId}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 26,
                  mass: 0.8,
                }}
                className={indicatorClassName}
              />
            )}

            <motion.div
              transition={{
                duration: 0.25,
                ease: 'easeOut',
              }}
              animate={{
                filter: isActive
                  ? ['blur(0px)', 'blur(2px)', 'blur(0px)']
                  : 'blur(0px)',
              }}
              className={`relative z-10 flex items-center transition-colors duration-200 ${
                isActive ? activeClassName : inactiveClassName
              }`}
            >
              {tab.icon && (
                <motion.div
                  animate={{ scale: isActive ? 1.05 : 1 }}
                  transition={{
                    scale: { type: 'spring', stiffness: 320, damping: 16 },
                  }}
                  className="flex shrink-0 items-center justify-center"
                >
                  {tab.icon}
                </motion.div>
              )}

              <span className="tracking-tight whitespace-nowrap">
                {tab.label}
              </span>

              {tab.badge !== undefined && tab.badge !== null && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold leading-none ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </motion.div>
          </button>
        );
      })}
    </div>
  );
};

export default FluidTabs;

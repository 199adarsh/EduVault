'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';

export const DiscreteTabs = ({
  tabs,
  onTabChange,
  activeTab: controlledActiveTab,
  defaultTab,
  className,
  itemClassName,
}) => {
  const isControlled = controlledActiveTab !== undefined;
  const [internalTab, setInternalTab] = useState(defaultTab || tabs[0]?.id);
  const activeTab = isControlled ? controlledActiveTab : internalTab;

  const handleTabClick = (tabId) => {
    if (!isControlled) setInternalTab(tabId);
    if (onTabChange) onTabChange(tabId);
  };

  return (
    <motion.div
      layout
      className={cn(
        "flex w-full items-center justify-between px-2 py-1",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className="relative focus:outline-none cursor-pointer flex items-center justify-center"
            type="button"
          >
            <motion.div
              layout="position"
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25,
                mass: 0.8,
              }}
              className="flex items-center justify-center"
            >
              <div
                className={cn(
                  'flex h-10 items-center justify-center rounded-full transition-colors duration-200 px-3',
                  isActive
                    ? 'bg-[#DEEDFC] border border-[#D9ECFF] text-[#0073E6]'
                    : 'text-[#727272] hover:text-[#383838] hover:bg-[#F2F7FC]',
                  itemClassName
                )}
              >
                <div className="flex items-center justify-center relative">
                  {tab.icon}
                  {tab.badge && !isActive && (
                    <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-[#0073E6]" />
                  )}
                </div>

                <motion.span
                  animate={{
                    width: isActive ? 'auto' : 0,
                    opacity: isActive ? 1 : 0,
                    marginLeft: isActive ? 6 : 0,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 320,
                    damping: 28,
                  }}
                  className="relative overflow-hidden text-xs font-bold whitespace-nowrap text-[#0073E6]"
                >
                  <span className="flex items-center gap-1.5">
                    {tab.label}
                    {tab.badge && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#0073E6] text-white">
                        {tab.badge}
                      </span>
                    )}
                  </span>
                </motion.span>
              </div>
            </motion.div>
          </button>
        );
      })}
    </motion.div>
  );
};

export default DiscreteTabs;

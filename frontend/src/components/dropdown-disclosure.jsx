'use client';
import { useRef, useEffect } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { ChevronDown, X, ArrowUpRight, Check } from 'lucide-react';
import { FaMeta } from 'react-icons/fa6';
import { HugeiconsIcon } from '@hugeicons/react';
import { GoogleGeminiIcon, QwenFreeIcons } from '@hugeicons/core-free-icons';
import { SiClaude } from 'react-icons/si';

const DEFAULT_MODELS = [
  {
    id: 'sonnet',
    name: 'Sonnet 3.5',
    description: 'Advanced reasoning',
    icon: <SiClaude size={18} />,
    hasUpgrade: true,
  },
  {
    id: 'llama',
    name: 'Llama 3.2',
    description: 'Versatile problem-solving',
    icon: <FaMeta size={18} />,
  },
  {
    id: 'qwen',
    name: 'Qwen 2.5',
    description: 'Rapid text generation',
    icon: (
      <HugeiconsIcon
        icon={QwenFreeIcons}
        size={18}
        color="#7c7b82"
        strokeWidth={1.5}
      />
    ),
  },
  {
    id: 'gemma',
    name: 'Gemma 2',
    description: 'Efficient task completion',
    icon: (
      <HugeiconsIcon
        icon={GoogleGeminiIcon}
        size={18}
        color="#7c7b82"
        strokeWidth={1.5}
      />
    ),
  },
];

export const DropdownDisclosure = ({
  models,
  items,
  isOpen,
  onOpenChange,
  selectedModelId,
  selectedId,
  onModelChange,
  onChange,
  title = "Choose Option",
  compact = false,
  placement = "bottom",
  align = "left",
  className = "",
}) => {
  const itemList = items || models || DEFAULT_MODELS;
  const currentId = selectedId || selectedModelId;
  const selected =
    itemList.find((m) => String(m.id) === String(currentId)) || itemList[0] || { id: 'default', name: 'Select option' };

  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        onOpenChange?.(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onOpenChange]);

  const handleSelect = (item) => {
    onChange?.(item);
    onModelChange?.(item);
    onOpenChange?.(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      {/* Trigger Button - Stays fixed in toolbar flow */}
      <button
        type="button"
        onClick={() => onOpenChange?.(!isOpen)}
        className={`flex cursor-pointer items-center transition-all outline-none ${
          compact
            ? 'gap-1.5 px-2.5 py-1 rounded-full border border-[#D9ECFF] dark:border-white/10 bg-[#F2F7FC] dark:bg-[#2C2C2E] hover:bg-[#E5F1FC] dark:hover:bg-[#3A3A3C]'
            : 'gap-2 px-3 py-1.5 rounded-2xl border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900 shadow-xs'
        }`}
      >
        {selected.icon && (
          <div className={`flex shrink-0 items-center justify-center rounded-full text-neutral-600 dark:text-neutral-300 ${compact ? 'w-4 h-4' : 'w-7 h-7 border border-neutral-200 dark:border-neutral-700'}`}>
            {selected.icon}
          </div>
        )}

        <span className={`truncate font-semibold text-[#174073] dark:text-zinc-200 ${compact ? 'text-[11px] max-w-[150px]' : 'text-sm font-bold'}`}>
          {selected.name}
        </span>

        <ChevronDown className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-[#174073] dark:text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Popover Menu - Absolute above toolbar, DOES NOT expand chatbox */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={`absolute z-50 w-64 sm:w-72 max-h-[75vh] flex flex-col rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1C1C1E] p-2.5 shadow-xl backdrop-blur-md ${placement === "top" ? "bottom-full mb-2" : "top-full mt-2"} ${align === "right" ? "right-0" : "left-0"}`}
          >
            <div className="mb-2 flex items-center justify-between px-2 pt-1 shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                {title}
              </span>

              <button
                type="button"
                onClick={() => onOpenChange?.(false)}
                aria-label="Close menu"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors"
              >
                <X className="h-3 w-3 text-neutral-600 dark:text-neutral-300" />
              </button>
            </div>

            <div className="flex flex-col gap-1 max-h-[55vh] sm:max-h-64 overflow-y-auto no-scrollbar">
              {itemList.map((m) => {
                const active = m.id === selected.id;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelect(m)}
                    className={`group flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 transition-colors cursor-pointer text-left ${
                      active
                        ? 'bg-neutral-100 dark:bg-neutral-800/80'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      {m.icon && (
                        <div className="flex shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400 w-7 h-7">
                          {m.icon}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-neutral-800 dark:text-neutral-100">
                          {m.name}
                        </div>
                        {m.description && (
                          <div className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                            {m.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {m.hasUpgrade && (
                        <div className="flex items-center overflow-hidden rounded-md border border-neutral-300 text-[10px] font-semibold text-neutral-800 dark:border-neutral-600 dark:text-neutral-300">
                          <div className="border-r border-neutral-300 px-1.5 py-0.5 dark:border-neutral-600">
                            <ArrowUpRight className="h-3 w-3" />
                          </div>
                          <div className="px-1.5 py-0.5">Upgrade</div>
                        </div>
                      )}

                      {!m.hasUpgrade && (
                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded-full border transition-all ${
                            active
                              ? 'border-neutral-900 bg-neutral-900 dark:border-neutral-100 dark:bg-neutral-100'
                              : 'border-neutral-300 dark:border-neutral-700'
                          }`}
                        >
                          {active && (
                            <Check className="h-2.5 w-2.5 stroke-[3px] text-white dark:text-neutral-900" />
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DropdownDisclosure;

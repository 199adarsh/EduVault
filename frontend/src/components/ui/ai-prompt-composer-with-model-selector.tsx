'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light';
export type ComposerMode = 'Plan' | 'Ask' | 'Build';
export type EffortLevel = 'Low' | 'Medium' | 'High' | 'Max';
type ProviderType = 'kimi' | 'openai' | 'spark';
type ModelFilterTab = 'fav' | 'all';

export interface AIComposerSubmission {
  prompt: string;
  mode: ComposerMode;
  modelId: string;
  modelName: string;
  effort: EffortLevel;
  autoMode: boolean;
  attachedFiles: string[];
  files: File[];
}

export interface AIComposerProps {
  /** Theme applied on mount and whenever the demo/control prop changes. */
  initialTheme?: ThemeMode;
  /** Show the optional upgrade banner below the composer. */
  showUpgradeBanner?: boolean;
  /** Show the interactive walkthrough button. */
  showWalkthroughControl?: boolean;
  /** Receives the prompt and selected browser File objects; connect this to your own AI backend. */
  onSubmit?: (submission: AIComposerSubmission) => void;
  /** Custom placeholder */
  placeholder?: string;
  /** Controlled compact mode for embedded panels */
  compact?: boolean;
}

interface ModelOption {
  id: string;
  name: string;
  effort: EffortLevel;
  provider: ProviderType;
  isFav: boolean;
  efforts: EffortLevel[];
}

interface ContextTagOption {
  tag: string;
  category: string;
}

const INITIAL_MODELS: ModelOption[] = [
  {
    id: 'kimi-k3',
    name: 'Kimi K3',
    effort: 'High',
    provider: 'kimi',
    isFav: false,
    efforts: ['Low', 'Medium', 'High', 'Max'],
  },
  {
    id: 'gpt-56-terra',
    name: 'GPT-5.6 Terra',
    effort: 'Medium',
    provider: 'openai',
    isFav: false,
    efforts: ['Low', 'Medium', 'High', 'Max'],
  },
  {
    id: 'gpt-56-sol',
    name: 'GPT-5.6 Sol',
    effort: 'Medium',
    provider: 'openai',
    isFav: false,
    efforts: ['Low', 'Medium', 'High', 'Max'],
  },
  {
    id: 'sonnet-5',
    name: 'Sonnet 5',
    effort: 'High',
    provider: 'spark',
    isFav: true,
    efforts: ['Low', 'Medium', 'High', 'Max'],
  },
  {
    id: 'opus-48',
    name: 'Opus 4.8',
    effort: 'High',
    provider: 'spark',
    isFav: false,
    efforts: ['Low', 'Medium', 'High', 'Max'],
  },
  {
    id: 'fable-5',
    name: 'Fable 5',
    effort: 'High',
    provider: 'spark',
    isFav: true,
    efforts: ['Medium', 'High', 'Max'],
  },
];

const CONTEXT_OPTIONS: ContextTagOption[] = [
  { tag: '@codebase', category: 'Workspace' },
  { tag: '@docs', category: 'References' },
  { tag: '@terminal', category: 'Last output' },
];

const ALL_MODES: ComposerMode[] = ['Plan', 'Ask', 'Build'];

function ProviderBadgeIcon({ provider }: { provider: ProviderType }) {
  if (provider === 'kimi') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
          d="M4.2 3.2V12.8M4.2 8.2L10.4 3.2M6.8 6.2L11.2 12.8"
          stroke="#F4F4F6"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12.2" cy="4.2" r="1.15" fill="#F4F4F6" />
      </svg>
    );
  }

  if (provider === 'openai') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path
          d="M21.2 10.1c.2-1.5-.2-3.1-1.2-4.3-1.3-1.6-3.4-2.3-5.4-1.8-.9-1.1-2.3-1.8-3.8-1.8-2.1 0-3.9 1.3-4.6 3.2-1.5.3-2.8 1.2-3.6 2.5-1 1.8-.9 4 .2 5.7-.2 1.5.2 3.1 1.2 4.3 1.3 1.6 3.4 2.3 5.4 1.8.9 1.1 2.3 1.8 3.8 1.8 2.1 0 3.9-1.3 4.6-3.2 1.5-.3 2.8-1.2 3.6-2.5 1.1-1.8 1-4-.2-5.7z"
          stroke="#F4F4F6"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.7" stroke="#F4F4F6" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
      <g stroke="#E87B58" strokeWidth="1.35" strokeLinecap="round">
        <line x1="9" y1="2.2" x2="9" y2="15.8" />
        <line x1="2.2" y1="9" x2="15.8" y2="9" />
        <line x1="4.1" y1="4.1" x2="13.9" y2="13.9" />
        <line x1="13.9" y1="4.1" x2="4.1" y2="13.9" />
        <line x1="6.4" y1="2.7" x2="11.6" y2="15.3" />
        <line x1="2.7" y1="6.4" x2="15.3" y2="11.6" />
      </g>
      <circle cx="9" cy="9" r="1.4" fill="#18181c" />
    </svg>
  );
}

function CheckmarkIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      className="flex-shrink-0"
      style={{ color: 'var(--text-primary)' }}
    >
      <path
        d="M3.2 8.5L6.5 11.8L13 4.5"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AIComposer({
  initialTheme,
  showUpgradeBanner = false,
  showWalkthroughControl = false,
  onSubmit,
  placeholder,
  compact = false,
}: AIComposerProps = {}) {
  const [theme, setThemeState] = useState<ThemeMode>(initialTheme ?? 'light');
  const [promptText, setPromptText] = useState<string>('');
  const [mode, setMode] = useState<ComposerMode>('Ask');
  const [modeMenuOpen, setModeMenuOpen] = useState<boolean>(false);

  const [autoMode, setAutoMode] = useState<boolean>(false);
  const [modelMenuOpen, setModelMenuOpen] = useState<boolean>(false);
  const [searchRevealed, setSearchRevealed] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modelFilterTab, setModelFilterTab] = useState<ModelFilterTab>('fav');
  const [models, setModels] = useState<ModelOption[]>(INITIAL_MODELS);
  const [activeModelId, setActiveModelId] = useState<string>('sonnet-5');
  const [hoveredModelId, setHoveredModelId] = useState<string | null>(null);
  const [modelMenuPointerReady, setModelMenuPointerReady] = useState<boolean>(false);

  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);
  const [proModalOpen, setProModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState<boolean>(false);

  // Walkthrough tour state
  const [isPlayingTour, setIsPlayingTour] = useState<boolean>(false);
  const [tourExpandAddFiles, setTourExpandAddFiles] = useState<boolean>(false);
  const [tourExpandRecord, setTourExpandRecord] = useState<boolean>(false);
  const [tourHoverAutoPill, setTourHoverAutoPill] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isHoveringModelRowRef = useRef<boolean>(false);
  const isHoveringEffortMenuRef = useRef<boolean>(false);
  const hideEffortTimerRef = useRef<number | null>(null);
  const tourTimersRef = useRef<number[]>([]);

  // Load saved preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('ai_composer_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
      }
      const savedFavs = localStorage.getItem('ai_composer_fav_models');
      if (savedFavs) {
        const parsed: unknown = JSON.parse(savedFavs);
        if (Array.isArray(parsed)) {
          setModels((prev) =>
            prev.map((m) => ({
              ...m,
              isFav: parsed.includes(m.id),
            }))
          );
        }
      }
    } catch {
      // Ignore storage access errors in sandboxed iframes
    }
  }, []);

  useEffect(() => {
    if (initialTheme) setThemeState(initialTheme);
  }, [initialTheme]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    try {
      localStorage.setItem('ai_composer_theme', nextTheme);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Recording interval
  useEffect(() => {
    if (!isRecording) return;
    const intervalId = window.setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isRecording]);

  // Global click-outside handler to close open popovers
  useEffect(() => {
    const handleGlobalClick = () => {
      setModeMenuOpen(false);
      setModelMenuOpen(false);
      setHoveredModelId(null);
      setContextMenuOpen(false);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const clearHideEffortTimeout = useCallback(() => {
    if (hideEffortTimerRef.current !== null) {
      window.clearTimeout(hideEffortTimerRef.current);
      hideEffortTimerRef.current = null;
    }
  }, []);

  const scheduleHideEffortSubmenu = useCallback(() => {
    clearHideEffortTimeout();
    hideEffortTimerRef.current = window.setTimeout(() => {
      if (!isHoveringEffortMenuRef.current && !isHoveringModelRowRef.current) {
        setHoveredModelId(null);
      }
    }, 60);
  }, [clearHideEffortTimeout]);

  // Ordered modes so the active mode is always anchored at the bottom with a checkmark
  const orderedModes = useMemo(() => {
    const inactive = ALL_MODES.filter((m) => m !== mode);
    return [...inactive, mode];
  }, [mode]);

  const activeModel = useMemo(
    () => models.find((m) => m.id === activeModelId) || models[3] || models[0],
    [models, activeModelId]
  );

  const favCount = useMemo(() => models.filter((m) => m.isFav).length, [models]);

  const visibleModels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return models.filter((m) => {
      const matchesTab = modelFilterTab === 'fav' ? m.isFav : true;
      const matchesSearch =
        m.name.toLowerCase().includes(q) || m.effort.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [models, modelFilterTab, searchQuery]);

  const hoveredModel = useMemo(
    () => (hoveredModelId ? models.find((m) => m.id === hoveredModelId) || null : null),
    [models, hoveredModelId]
  );

  // Calculate vertical bottom offset so the Effort submenu tracks the hovered model row
  const effortBottomOffsetPx = useMemo(() => {
    if (!hoveredModelId) return 0;
    const idx = visibleModels.findIndex((m) => m.id === hoveredModelId);
    if (idx < 0) return 0;
    const rowsFromBottom = visibleModels.length - 1 - idx;
    return rowsFromBottom <= 1 ? 0 : Math.min(96, (rowsFromBottom - 1) * 24);
  }, [visibleModels, hoveredModelId]);

  const isEffortMenuVisible =
    modelMenuOpen && searchQuery.trim().length === 0 && hoveredModel !== null;

  const handleToggleFavStar = (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    setModels((prev) => {
      const updated = prev.map((m) => {
        if (m.id !== targetId) return m;
        return { ...m, isFav: !m.isFav };
      });
      const targetAfter = updated.find((m) => m.id === targetId);
      if (targetAfter?.isFav) {
        setActiveModelId(targetId);
        setAutoMode(false);
      }
      try {
        const favIds = updated.filter((m) => m.isFav).map((m) => m.id);
        localStorage.setItem('ai_composer_fav_models', JSON.stringify(favIds));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  };

  const handleSelectModel = (e: React.MouseEvent, modelId: string) => {
    e.stopPropagation();
    setActiveModelId(modelId);
    setAutoMode(false);
    setModelMenuOpen(false);
    setHoveredModelId(null);
  };

  const handleSelectEffort = (e: React.MouseEvent, effort: EffortLevel) => {
    e.stopPropagation();
    if (!hoveredModelId) return;
    setModels((prev) =>
      prev.map((m) => (m.id === hoveredModelId ? { ...m, effort } : m))
    );
    setActiveModelId(hoveredModelId);
    setAutoMode(false);
  };

  const handleOpenModelMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModeMenuOpen(false);
    setContextMenuOpen(false);

    const nextOpen = !modelMenuOpen;
    setModelMenuOpen(nextOpen);
    if (nextOpen) {
      setModelFilterTab('fav');
      setHoveredModelId(null);
      setModelMenuPointerReady(false);
      setSearchRevealed(false);
      setSearchQuery('');
      window.setTimeout(() => {
        setSearchRevealed(true);
      }, 160);
    }
  };

  const handleToggleAutoInMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextAuto = !autoMode;
    setAutoMode(nextAuto);
    if (nextAuto) {
      window.setTimeout(() => {
        setModelMenuOpen(false);
        setHoveredModelId(null);
      }, 180);
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPromptText(val);
    setContextMenuOpen(val.endsWith('@'));
  };

  const handleInsertContextTag = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    setPromptText((prev) => prev.replace(/@$/, `${tag} `));
    setContextMenuOpen(false);
    promptInputRef.current?.focus();
  };

  const handleRecordClick = () => {
    if (!isRecording) {
      setRecordingSeconds(0);
      setIsRecording(true);
    } else {
      setIsRecording(false);
      if (!promptText.trim()) {
        setPromptText('Summarize key concepts and definitions from this document');
      }
    }
  };

  const handleSubmitPrompt = () => {
    if (isRecording) setIsRecording(false);

    const trimmed = promptText.trim();
    if (!trimmed && attachedFiles.length === 0) {
      setToastMessage('Enter a prompt or question to continue.');
      return;
    }

    const submission: AIComposerSubmission = {
      prompt: trimmed,
      mode,
      modelId: activeModel.id,
      modelName: activeModel.name,
      effort: activeModel.effort,
      autoMode,
      attachedFiles: [...attachedFiles],
      files: [...selectedFiles],
    };

    try {
      onSubmit?.(submission);
    } catch {
      setToastMessage('Prompt submission failed.');
      return;
    }

    setPromptText('');
    setAttachedFiles([]);
    setSelectedFiles([]);
    setContextMenuOpen(false);
  };

  const clearWalkthroughTimers = useCallback(() => {
    tourTimersRef.current.forEach((id) => window.clearTimeout(id));
    tourTimersRef.current = [];
    setIsPlayingTour(false);
    setTourExpandAddFiles(false);
    setTourExpandRecord(false);
    setTourHoverAutoPill(false);
  }, []);

  const runVideoWalkthrough = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlayingTour) {
      clearWalkthroughTimers();
      return;
    }

    clearWalkthroughTimers();
    setIsPlayingTour(true);

    setMode('Build');
    setModeMenuOpen(false);
    setAutoMode(false);
    setModelMenuOpen(false);
    setActiveModelId('fable-5');
    setHoveredModelId(null);
    setSearchQuery('');
    setSearchRevealed(false);

    const schedule = (fn: () => void, delayMs: number) => {
      const timerId = window.setTimeout(fn, delayMs);
      tourTimersRef.current.push(timerId);
    };

    schedule(() => setTourExpandAddFiles(true), 600);
    schedule(() => setTourExpandAddFiles(false), 1900);
    schedule(() => setModeMenuOpen(true), 2400);
    schedule(() => {
      setMode('Plan');
      setModeMenuOpen(false);
    }, 3500);
    schedule(() => setModeMenuOpen(true), 4400);
    schedule(() => {
      setMode('Build');
      setModeMenuOpen(false);
    }, 5400);
    schedule(() => {
      setModelMenuOpen(true);
      setModelFilterTab('all');
      setHoveredModelId('fable-5');
      setSearchRevealed(false);
    }, 6100);
    schedule(() => setSearchRevealed(true), 6350);
    schedule(() => setHoveredModelId('opus-48'), 6900);
    schedule(() => setHoveredModelId('gpt-56-sol'), 7350);
    schedule(() => setHoveredModelId('kimi-k3'), 7800);
    schedule(() => {
      setHoveredModelId(null);
      searchInputRef.current?.focus();
    }, 8350);
    schedule(() => setSearchQuery('so'), 9100);
    schedule(() => {
      setSearchQuery('');
      setHoveredModelId('fable-5');
    }, 10300);
    schedule(() => setAutoMode(true), 11400);
    schedule(() => {
      setModelMenuOpen(false);
      setHoveredModelId(null);
    }, 11900);
    schedule(() => setTourHoverAutoPill(true), 12800);
    schedule(() => {
      setTourHoverAutoPill(false);
      setAutoMode(false);
    }, 14100);
    schedule(() => setTourExpandRecord(true), 15000);
    schedule(() => {
      setTourExpandRecord(false);
      setIsPlayingTour(false);
    }, 16500);
  };

  const formattedRecordingTime = useMemo(() => {
    const mins = Math.floor(recordingSeconds / 60);
    const secs = String(recordingSeconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }, [recordingSeconds]);

  const isSubmitReady = promptText.trim().length > 0 || attachedFiles.length > 0;

  return (
    <div
      data-theme={theme}
      aria-label="AI prompt composer"
      className={`aic-root w-full flex flex-col items-center justify-center select-none ${
        compact ? 'p-0' : 'p-3 sm:p-5'
      }`}
      style={{
        backgroundColor: 'transparent',
        color: 'var(--text-primary)',
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontFeatureSettings: "'cv02', 'cv03', 'cv04', 'cv11'",
        transition: 'background-color 0.28s ease, color 0.22s ease',
      }}
    >
      <style>{`
        .aic-root[data-theme="dark"] {
          --bg-canvas: #18181c;
          --card-bg: #18181c;
          --card-border: rgba(255, 255, 255, 0.085);
          --card-focus-border: rgba(0, 115, 230, 0.4);
          --card-shadow: 0 14px 35px -10px rgba(0, 0, 0, 0.45), 0 1px 0 0 rgba(255, 255, 255, 0.05) inset;

          --pill-bg: #26262c;
          --pill-hover-bg: #2d2d34;
          --pill-border: rgba(255, 255, 255, 0.095);
          --pill-hover-border: rgba(255, 255, 255, 0.15);
          --pill-inset: 0 1px 0 0 rgba(255, 255, 255, 0.05) inset;

          --ghost-hover-bg: rgba(255, 255, 255, 0.045);
          --ghost-hover-border: rgba(255, 255, 255, 0.075);

          --popover-bg-start: #2b2b33;
          --popover-bg-end: #1f1f25;
          --popover-border: rgba(255, 255, 255, 0.12);
          --popover-shadow: 0 22px 48px -10px rgba(0, 0, 0, 0.65), 0 1px 0 0 rgba(255, 255, 255, 0.08) inset;
          --menu-item-hover: rgba(255, 255, 255, 0.065);
          --model-row-hover: rgba(14, 14, 18, 0.68);

          --filter-track-bg: rgba(12, 12, 16, 0.48);
          --filter-track-border: rgba(255, 255, 255, 0.06);
          --filter-active-bg: #2c2c35;
          --filter-active-border: rgba(255, 255, 255, 0.11);
          --filter-active-shadow: 0 2px 6px rgba(0, 0, 0, 0.28);

          --text-primary: #f4f4f6;
          --text-secondary: #8e8d95;
          --text-muted: #6e6d76;
          --placeholder-color: #8c8b93;
          --icon-primary: #e4e4e8;
          --chevron-color: #9e9da6;
          --effort-header: #d4d4d8;

          --submit-bg: #222227;
          --submit-border: rgba(255, 255, 255, 0.08);
          --submit-color: #7c7b84;
          --submit-ready-bg: #0073e6;
          --submit-ready-border: #0073e6;
          --submit-ready-color: #f4f4f6;

          --switch-off-bg: #484852;
          --accent-blue: #0073e6;
          --accent-coral: #e87b58;

          --pro-banner-bg:
            radial-gradient(ellipse 52% 130% at 81% 50%, rgba(58, 126, 86, 0.56) 0%, rgba(34, 78, 52, 0.32) 48%, rgba(24, 24, 28, 0.96) 85%),
            #18181c;
          --pro-banner-border: rgba(255, 255, 255, 0.065);
          --pro-banner-shadow: 0 14px 32px -12px rgba(0, 0, 0, 0.4);
          --pro-banner-mask: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.05) 55%, rgba(126, 204, 155, 0.32) 85%, rgba(126, 204, 155, 0.18) 100%);
          --pro-link-color: #8da8ff;
          --pro-link-underline: rgba(141, 168, 255, 0.45);
          --pro-link-hover: #a8beff;
          --upgrade-btn-bg: rgba(96, 148, 114, 0.48);
          --upgrade-btn-border: rgba(168, 222, 186, 0.36);
          --upgrade-btn-text: #f4f4f6;
          --upgrade-btn-hover-bg: rgba(112, 168, 132, 0.65);
          --upgrade-btn-hover-border: rgba(190, 240, 205, 0.55);
          --dismiss-color: #a5b8ac;

          --toast-bg: rgba(30, 30, 36, 0.95);
          --toast-border: rgba(255, 255, 255, 0.1);
          --chip-bg: #24242b;
          --chip-border: rgba(255, 255, 255, 0.1);
          --floating-bar-bg: rgba(24, 24, 28, 0.82);
          --floating-bar-border: rgba(255, 255, 255, 0.1);
          --modal-bg: #1b1b21;
          --modal-border: rgba(255, 255, 255, 0.15);
        }

        .aic-root[data-theme="light"] {
          --bg-canvas: #ffffff;
          --card-bg: #ffffff;
          --card-border: #e2e8f0;
          --card-focus-border: #0073e6;
          --card-shadow: 0 12px 30px -10px rgba(15, 23, 42, 0.08), 0 1px 0 0 rgba(255, 255, 255, 0.9) inset;

          --pill-bg: #f8fafc;
          --pill-hover-bg: #f1f5f9;
          --pill-border: #e2e8f0;
          --pill-hover-border: #cbd5e1;
          --pill-inset: 0 1px 0 0 rgba(255, 255, 255, 0.8) inset;

          --ghost-hover-bg: rgba(24, 24, 28, 0.045);
          --ghost-hover-border: rgba(24, 24, 28, 0.08);

          --popover-bg-start: #ffffff;
          --popover-bg-end: #f8fafc;
          --popover-border: #e2e8f0;
          --popover-shadow: 0 20px 40px -12px rgba(15, 23, 42, 0.14), 0 1px 0 0 rgba(255, 255, 255, 0.9) inset;
          --menu-item-hover: #f1f5f9;
          --model-row-hover: #f1f5f9;

          --filter-track-bg: #f1f5f9;
          --filter-track-border: #e2e8f0;
          --filter-active-bg: #ffffff;
          --filter-active-border: #cbd5e1;
          --filter-active-shadow: 0 1px 4px rgba(15, 23, 42, 0.08);

          --text-primary: #1e293b;
          --text-secondary: #64748b;
          --text-muted: #94a3b8;
          --placeholder-color: #94a3b8;
          --icon-primary: #334155;
          --chevron-color: #64748b;
          --effort-header: #475569;

          --submit-bg: #f1f5f9;
          --submit-border: #e2e8f0;
          --submit-color: #94a3b8;
          --submit-ready-bg: #0073e6;
          --submit-ready-border: #0073e6;
          --submit-ready-color: #ffffff;

          --switch-off-bg: #cbd5e1;
          --accent-blue: #0073e6;
          --accent-coral: #e87b58;

          --pro-banner-bg:
            radial-gradient(ellipse 52% 130% at 81% 50%, rgba(52, 168, 108, 0.24) 0%, rgba(110, 205, 150, 0.12) 48%, rgba(255, 255, 255, 0.98) 85%),
            #ffffff;
          --pro-banner-border: rgba(24, 24, 28, 0.085);
          --pro-banner-shadow: 0 14px 32px -12px rgba(15, 23, 42, 0.08);
          --pro-banner-mask: linear-gradient(90deg, rgba(24,24,28,0.03) 0%, rgba(24,24,28,0.04) 55%, rgba(45, 160, 100, 0.32) 85%, rgba(45, 160, 100, 0.18) 100%);
          --pro-link-color: #0073e6;
          --pro-link-underline: rgba(0, 115, 230, 0.4);
          --pro-link-hover: #005bb5;
          --upgrade-btn-bg: rgba(36, 138, 84, 0.15);
          --upgrade-btn-border: rgba(36, 138, 84, 0.35);
          --upgrade-btn-text: #145332;
          --upgrade-btn-hover-bg: rgba(36, 138, 84, 0.24);
          --upgrade-btn-hover-border: rgba(36, 138, 84, 0.5);
          --dismiss-color: #5b7667;

          --toast-bg: rgba(255, 255, 255, 0.95);
          --toast-border: #e2e8f0;
          --chip-bg: #f8fafc;
          --chip-border: #e2e8f0;
          --floating-bar-bg: rgba(255, 255, 255, 0.92);
          --floating-bar-border: #e2e8f0;
          --modal-bg: #ffffff;
          --modal-border: #e2e8f0;
        }

        .aic-composer-card {
          position: relative;
          width: 100%;
          background: var(--card-bg);
          border-radius: 20px;
          border: 1px solid var(--card-border);
          box-shadow: var(--card-shadow);
          padding: 16px 14px 12px 14px;
          transition: background-color 0.25s ease, border-color 0.2s ease, box-shadow 0.25s ease;
        }

        .aic-composer-card:focus-within {
          border-color: var(--card-focus-border);
        }

        .aic-prompt-input {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          resize: none;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 14.5px;
          line-height: 1.45;
          font-weight: 400;
          letter-spacing: -0.011em;
          min-height: 24px;
          max-height: 120px;
          padding: 0 2px;
          margin-bottom: 12px;
          user-select: text;
          transition: color 0.2s ease;
        }

        .aic-prompt-input::placeholder {
          color: var(--placeholder-color);
          opacity: 1;
        }

        .aic-pill-control {
          height: 34px;
          border-radius: 9999px;
          background: var(--pill-bg);
          border: 1px solid var(--pill-border);
          box-shadow: var(--pill-inset);
          color: var(--text-primary);
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition:
            width 0.28s cubic-bezier(0.22, 1, 0.36, 1),
            background-color 0.18s ease,
            border-color 0.18s ease,
            color 0.18s ease,
            transform 0.12s ease;
        }

        .aic-pill-control:hover {
          background: var(--pill-hover-bg);
          border-color: var(--pill-hover-border);
        }

        .aic-pill-control:active {
          transform: scale(0.98);
        }

        .aic-add-files-btn {
          width: 34px;
          padding: 0 9px;
          justify-content: flex-start;
        }

        .aic-add-files-btn:hover,
        .aic-add-files-btn.expanded {
          width: 104px;
          padding: 0 11px 0 9px;
        }

        .aic-add-files-label {
          opacity: 0;
          transform: translateX(-6px);
          white-space: nowrap;
          font-size: 13.5px;
          font-weight: 500;
          letter-spacing: -0.011em;
          margin-left: 6px;
          transition:
            opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
          pointer-events: none;
        }

        .aic-add-files-btn:hover .aic-add-files-label,
        .aic-add-files-btn.expanded .aic-add-files-label {
          opacity: 1;
          transform: translateX(0);
        }

        .aic-mode-btn {
          padding: 0 11px 0 13px;
          gap: 6px;
          font-size: 13.5px;
          font-weight: 500;
          letter-spacing: -0.011em;
        }

        .aic-mode-btn.menu-open .mode-btn-text {
          color: var(--text-muted);
        }

        .aic-model-trigger-btn {
          height: 34px;
          border-radius: 9999px;
          padding: 0 9px 0 6px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 500;
          letter-spacing: -0.011em;
          cursor: pointer;
          transition:
            background-color 0.2s ease,
            border-color 0.2s ease,
            color 0.2s ease;
        }

        .aic-model-trigger-btn:hover {
          background: var(--ghost-hover-bg);
          border-color: var(--ghost-hover-border);
        }

        .aic-auto-trigger-btn {
          height: 34px;
          border-radius: 9999px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-primary);
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 500;
          letter-spacing: -0.011em;
          cursor: pointer;
          transition: all 0.24s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .aic-auto-trigger-btn:hover,
        .aic-auto-trigger-btn.hovered-state {
          background: var(--pill-bg);
          border-color: var(--pill-border);
          box-shadow: var(--pill-inset);
          padding: 0 9px 0 12px;
          gap: 10px;
        }

        .aic-auto-trigger-btn .aic-auto-chevron {
          display: inline-flex;
        }

        .aic-auto-trigger-btn .aic-auto-inline-switch {
          display: none;
          align-items: center;
        }

        .aic-auto-trigger-btn:hover .aic-auto-chevron,
        .aic-auto-trigger-btn.hovered-state .aic-auto-chevron {
          display: none;
        }

        .aic-auto-trigger-btn:hover .aic-auto-inline-switch,
        .aic-auto-trigger-btn.hovered-state .aic-auto-inline-switch {
          display: inline-flex;
        }

        .aic-record-btn {
          width: 34px;
          padding: 0 9px;
          justify-content: flex-start;
        }

        .aic-record-btn:hover,
        .aic-record-btn.expanded,
        .aic-record-btn.recording {
          width: 95px;
          padding: 0 12px 0 9px;
        }

        .aic-record-btn.recording {
          background: rgba(239, 68, 68, 0.16);
          border-color: rgba(239, 68, 68, 0.45);
          color: #ef4444;
        }

        .aic-record-label {
          opacity: 0;
          transform: translateX(6px);
          white-space: nowrap;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: -0.011em;
          margin-left: 6px;
          transition:
            opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
          pointer-events: none;
        }

        .aic-record-btn:hover .aic-record-label,
        .aic-record-btn.expanded .aic-record-label,
        .aic-record-btn.recording .aic-record-label {
          opacity: 1;
          transform: translateX(0);
        }

        .aic-submit-btn {
          width: 34px;
          height: 34px;
          border-radius: 9999px;
          background: var(--submit-bg);
          border: 1px solid var(--submit-border);
          color: var(--submit-color);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .aic-submit-btn:hover,
        .aic-submit-btn.ready {
          background: var(--submit-ready-bg);
          border-color: var(--submit-ready-border);
          color: var(--submit-ready-color);
        }

        .aic-submit-btn:active {
          transform: scale(0.95);
        }

        .aic-glass-popover {
          background: linear-gradient(160deg, var(--popover-bg-start) 0%, var(--popover-bg-end) 100%);
          border: 1px solid var(--popover-border);
          box-shadow: var(--popover-shadow);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          transform-origin: bottom left;
          transition:
            opacity 0.18s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
            bottom 0.18s cubic-bezier(0.22, 1, 0.36, 1),
            background 0.22s ease,
            border-color 0.22s ease;
        }

        .aic-popover-hidden {
          opacity: 0;
          transform: translateY(6px) scale(0.97);
          pointer-events: none;
        }

        .aic-popover-visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }

        .aic-effort-submenu-bridge::before {
          content: "";
          position: absolute;
          top: -8px;
          bottom: -8px;
          left: -16px;
          width: 16px;
        }

        .aic-mode-menu-item {
          height: 34px;
          padding: 0 12px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 500;
          letter-spacing: -0.011em;
          color: var(--text-primary);
          cursor: pointer;
          transition: background-color 0.14s ease, color 0.14s ease;
        }

        .aic-mode-menu-item:hover {
          background: var(--menu-item-hover);
        }

        .aic-model-filter-bar {
          display: flex;
          align-items: center;
          padding: 2px;
          margin: 2px 4px 6px 4px;
          border-radius: 9999px;
          background: var(--filter-track-bg);
          border: 1px solid var(--filter-track-border);
        }

        .aic-model-filter-pill {
          flex: 1;
          height: 24px;
          padding: 0 8px;
          border-radius: 9999px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 12.5px;
          font-weight: 500;
          letter-spacing: -0.012em;
          color: var(--text-secondary);
          background: transparent;
          border: 1px solid transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          cursor: pointer;
          transition:
            color 0.16s ease,
            background-color 0.18s cubic-bezier(0.22, 1, 0.36, 1),
            border-color 0.18s ease;
        }

        .aic-model-filter-pill:hover {
          color: var(--text-primary);
        }

        .aic-model-filter-pill.active {
          color: var(--text-primary);
          background: var(--filter-active-bg);
          border-color: var(--filter-active-border);
          box-shadow: var(--filter-active-shadow);
        }

        .aic-fav-star-btn {
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          flex-shrink: 0;
          transition: transform 0.16s cubic-bezier(0.22, 1, 0.36, 1), color 0.16s ease;
        }

        .aic-fav-star-btn:hover {
          color: #facc15;
          transform: scale(1.15);
        }

        .aic-fav-star-btn.starred {
          color: #facc15;
        }

        .aic-model-row {
          height: 34px;
          padding: 0 10px 0 5px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: inherit;
          letter-spacing: -0.011em;
          cursor: pointer;
          transition: background-color 0.14s ease;
        }

        .aic-model-row:hover,
        .aic-model-row.active-hover {
          background: var(--model-row-hover);
        }

        .aic-ios-switch {
          width: 36px;
          height: 20px;
          border-radius: 9999px;
          background: var(--switch-off-bg);
          padding: 2px;
          display: inline-flex;
          align-items: center;
          cursor: pointer;
          transition: background-color 0.2s ease;
          position: relative;
          flex-shrink: 0;
        }

        .aic-ios-switch.on {
          background: var(--accent-blue);
        }

        .aic-ios-switch-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
          transform: translateX(0);
          transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .aic-ios-switch.on .aic-ios-switch-thumb {
          transform: translateX(16px);
        }

        .aic-search-row-wrap {
          overflow: hidden;
          max-height: 0;
          opacity: 0;
          transition:
            max-height 0.24s cubic-bezier(0.22, 1, 0.36, 1),
            opacity 0.2s ease,
            margin-bottom 0.2s ease;
          margin-bottom: 0;
        }

        .aic-search-row-wrap.revealed {
          max-height: 38px;
          opacity: 1;
          margin-bottom: 4px;
        }

        @keyframes aicPulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.85); }
        }

        .aic-recording-dot {
          animation: aicPulseDot 1.2s infinite ease-in-out;
        }
      `}</style>

      {/* Hidden file input for "+ Add files" */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) {
            setAttachedFiles((prev) => [...prev, ...files.map((f) => f.name)]);
            setSelectedFiles((prev) => [...prev, ...files]);
          }
          e.target.value = '';
        }}
      />

      {/* Main Workspace Container */}
      <main className="w-full flex flex-col items-center relative">
        {/* Submitted Prompt / Activity Toast */}
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="w-full mb-2 px-3 py-2 rounded-[14px] shadow-md flex items-center justify-between text-xs transition-all"
            style={{
              background: 'var(--toast-bg)',
              border: '1px solid var(--toast-border)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="truncate">{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-2 text-[10px] px-2 py-0.5 rounded-full transition"
              style={{
                background: 'var(--pill-bg)',
                color: 'var(--text-secondary)',
              }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Attached Context File Chips */}
        {attachedFiles.length > 0 && (
          <div className="w-full mb-2 flex flex-wrap gap-1.5">
            {attachedFiles.map((fileName, idx) => (
              <div
                key={`${fileName}-${idx}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs shadow-2xs"
                style={{
                  background: 'var(--chip-bg)',
                  border: '1px solid var(--chip-border)',
                  color: 'var(--text-primary)',
                }}
              >
                <span className="max-w-[140px] truncate">{fileName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
                    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
                  }}
                  className="opacity-70 hover:opacity-100 ml-0.5"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Primary Composer Card */}
        <section className="aic-composer-card">
          {/* @ Context Mention Popover */}
          <div
            className={`aic-glass-popover ${
              contextMenuOpen ? 'aic-popover-visible' : 'aic-popover-hidden'
            } absolute left-3 bottom-[64px] w-52 rounded-[14px] p-1.5 z-40`}
          >
            <div
              className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-secondary)' }}
            >
              Add Context
            </div>
            {CONTEXT_OPTIONS.map((item) => (
              <button
                key={item.tag}
                type="button"
                onClick={(e) => handleInsertContextTag(e, item.tag)}
                className="aic-mode-menu-item w-full text-left px-2 py-1 rounded-md text-xs flex items-center justify-between"
              >
                <span>{item.tag}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  {item.category}
                </span>
              </button>
            ))}
          </div>

          {/* Prompt Textarea */}
          <textarea
            ref={promptInputRef}
            rows={1}
            value={promptText}
            onChange={handlePromptChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitPrompt();
              }
            }}
            className="aic-prompt-input"
            placeholder={placeholder || "Ask question about notes, summarize, explain..."}
            aria-label="Prompt input"
          />

          {/* Bottom Controls Bar */}
          <div className="flex items-center justify-between gap-1.5 relative flex-wrap sm:flex-nowrap">
            {/* Left Controls Group */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* 1. "+ Add files" Expanding Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`aic-pill-control aic-add-files-btn ${
                  tourExpandAddFiles ? 'expanded' : ''
                }`}
                aria-label="Add files"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="flex-shrink-0"
                  style={{ color: 'var(--icon-primary)' }}
                >
                  <path
                    d="M8 2.5V13.5M2.5 8H13.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="aic-add-files-label">Add files</span>
              </button>

              {/* 2. Mode Selector ("Ask" / "Plan" / "Build") */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModelMenuOpen(false);
                    setHoveredModelId(null);
                    setModeMenuOpen((prev) => !prev);
                  }}
                  className={`aic-pill-control aic-mode-btn ${
                    modeMenuOpen ? 'menu-open' : ''
                  }`}
                  aria-haspopup="true"
                  aria-expanded={modeMenuOpen}
                >
                  <span className="mode-btn-text transition-colors">{mode}</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="mt-0.5"
                    style={{ color: 'var(--chevron-color)' }}
                  >
                    <path
                      d="M4 6L8 10L12 6"
                      stroke="currentColor"
                      strokeWidth="1.65"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {/* Mode Popover Menu */}
                <div
                  className={`aic-glass-popover ${
                    modeMenuOpen ? 'aic-popover-visible' : 'aic-popover-hidden'
                  } absolute left-0 bottom-0 w-[138px] rounded-[16px] p-1.5 z-30`}
                  role="menu"
                >
                  <div className="flex flex-col gap-0.5">
                    {orderedModes.map((modeOption) => {
                      const isSelected = modeOption === mode;
                      return (
                        <div
                          key={modeOption}
                          role="menuitem"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMode(modeOption);
                            setModeMenuOpen(false);
                          }}
                          className="aic-mode-menu-item"
                        >
                          <span>{modeOption}</span>
                          {isSelected && <CheckmarkIcon />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Model & Effort Selector */}
              <div className="relative inline-flex items-center">
                {!autoMode ? (
                  <button
                    type="button"
                    onClick={handleOpenModelMenu}
                    className="aic-model-trigger-btn"
                    aria-haspopup="true"
                    aria-expanded={modelMenuOpen}
                  >
                    <span className="w-[22px] h-[22px] rounded-full bg-[#0d0d10] flex items-center justify-center flex-shrink-0 border border-white/10">
                      <ProviderBadgeIcon provider={activeModel.provider} />
                    </span>
                    <span className="flex items-baseline gap-1 whitespace-nowrap">
                      <span
                        className="font-medium text-xs sm:text-[13px]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {activeModel.name}
                      </span>
                      <span
                        className="font-normal text-[11px]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {activeModel.effort}
                      </span>
                    </span>
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="mt-0.5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <path
                        d="M4 6L8 10L12 6"
                        stroke="currentColor"
                        strokeWidth="1.65"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={handleOpenModelMenu}
                    className={`aic-auto-trigger-btn ${
                      tourHoverAutoPill ? 'hovered-state' : ''
                    }`}
                    aria-label="Auto model routing"
                  >
                    <span
                      className="font-medium select-none text-xs"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Auto
                    </span>
                    <span
                      className="aic-auto-chevron mt-0.5"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M4 6L8 10L12 6"
                          stroke="currentColor"
                          strokeWidth="1.65"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className="aic-auto-inline-switch">
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setAutoMode(false);
                          setTourHoverAutoPill(false);
                        }}
                        className="aic-ios-switch on"
                        title="Turn off Auto routing"
                      >
                        <span className="aic-ios-switch-thumb" />
                      </span>
                    </span>
                  </div>
                )}

                {/* Model Selector Popover Menu */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`aic-glass-popover ${
                    modelMenuOpen ? 'aic-popover-visible' : 'aic-popover-hidden'
                  } absolute left-0 bottom-0 w-[240px] rounded-[18px] p-2 z-30`}
                >
                  {/* Search Models Input */}
                  <div
                    onMouseEnter={() => {
                      isHoveringModelRowRef.current = false;
                      setHoveredModelId(null);
                    }}
                    className={`aic-search-row-wrap ${
                      searchRevealed || searchQuery.length > 0 ? 'revealed' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5 px-2 h-7 rounded-md">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="flex-shrink-0"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <circle
                          cx="7.2"
                          cy="7.2"
                          r="4.8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M10.8 10.8L13.8 13.8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search models"
                        autoComplete="off"
                        className="w-full bg-transparent border-none outline-none text-xs font-normal"
                        style={{ color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  {/* Auto Toggle Row */}
                  <div
                    onMouseEnter={() => {
                      isHoveringModelRowRef.current = false;
                      setHoveredModelId(null);
                    }}
                    className="flex items-center justify-between px-2 h-8"
                  >
                    <span
                      className="text-xs font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Auto
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoMode}
                      onClick={handleToggleAutoInMenu}
                      className={`aic-ios-switch ${autoMode ? 'on' : ''}`}
                    >
                      <span className="aic-ios-switch-thumb" />
                    </button>
                  </div>

                  {/* Filter Tabs */}
                  <div
                    role="tablist"
                    aria-label="Filter models"
                    onMouseEnter={() => {
                      isHoveringModelRowRef.current = false;
                      setHoveredModelId(null);
                    }}
                    className="aic-model-filter-bar"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={modelFilterTab === 'fav'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setModelFilterTab('fav');
                        setHoveredModelId(null);
                      }}
                      className={`aic-model-filter-pill ${
                        modelFilterTab === 'fav' ? 'active' : ''
                      }`}
                    >
                      <span>fav</span>
                      {favCount > 0 && (
                        <span
                          className="text-[10.5px] font-normal opacity-75"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {favCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={modelFilterTab === 'all'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setModelFilterTab('all');
                        setHoveredModelId(null);
                      }}
                      className={`aic-model-filter-pill ${
                        modelFilterTab === 'all' ? 'active' : ''
                      }`}
                    >
                      <span>all</span>
                      <span
                        className="text-[10.5px] font-normal opacity-70"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {models.length}
                      </span>
                    </button>
                  </div>

                  {/* Models List */}
                  <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                    {visibleModels.map((m) => {
                      const isSelected = !autoMode && m.id === activeModelId;
                      const isHovered =
                        m.id === hoveredModelId && searchQuery.trim().length === 0;
                      return (
                        <div
                          key={m.id}
                          onClick={(e) => handleSelectModel(e, m.id)}
                          onMouseEnter={() => {
                            clearHideEffortTimeout();
                            isHoveringModelRowRef.current = true;
                            if (modelMenuPointerReady) {
                              setHoveredModelId(m.id);
                            }
                          }}
                          onMouseMove={() => {
                            clearHideEffortTimeout();
                            isHoveringModelRowRef.current = true;
                            if (!modelMenuPointerReady) {
                              setModelMenuPointerReady(true);
                            }
                            if (hoveredModelId !== m.id) {
                              setHoveredModelId(m.id);
                            }
                          }}
                          onMouseLeave={() => {
                            isHoveringModelRowRef.current = false;
                            scheduleHideEffortSubmenu();
                          }}
                          className={`aic-model-row ${isHovered ? 'active-hover' : ''}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 pr-1">
                            <span className="w-[22px] h-[22px] rounded-full bg-[#0c0c0f] flex items-center justify-center flex-shrink-0 border border-white/10">
                              <ProviderBadgeIcon provider={m.provider} />
                            </span>
                            <span className="text-xs truncate">
                              <span
                                className="font-medium"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {m.name}
                              </span>
                              <span
                                className="font-normal ml-1"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {m.effort}
                              </span>
                            </span>
                          </div>
                          {isSelected && <CheckmarkIcon />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Effort Submenu */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={() => {
                    clearHideEffortTimeout();
                    isHoveringEffortMenuRef.current = true;
                  }}
                  onMouseLeave={() => {
                    isHoveringEffortMenuRef.current = false;
                    scheduleHideEffortSubmenu();
                  }}
                  style={{ bottom: `${effortBottomOffsetPx}px` }}
                  className={`aic-glass-popover aic-effort-submenu-bridge ${
                    isEffortMenuVisible ? 'aic-popover-visible' : 'aic-popover-hidden'
                  } absolute left-[248px] w-[130px] rounded-[16px] p-1.5 z-30`}
                >
                  <div
                    className="px-2 py-1 text-xs font-medium"
                    style={{ color: 'var(--effort-header)' }}
                  >
                    Effort
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {hoveredModel?.efforts.map((level) => {
                      const isCurrentEffort = hoveredModel.effort === level;
                      return (
                        <div
                          key={level}
                          onClick={(e) => handleSelectEffort(e, level)}
                          className="aic-mode-menu-item h-[30px] px-2 text-xs"
                        >
                          <span>{level}</span>
                          {isCurrentEffort && <CheckmarkIcon />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Controls Group */}
            <div className="flex items-center gap-1.5">
              {/* 4. Microphone */}
              <button
                type="button"
                onClick={handleRecordClick}
                className={`aic-pill-control aic-record-btn ${
                  tourExpandRecord ? 'expanded' : ''
                } ${isRecording ? 'recording' : ''}`}
                aria-label="Record voice input"
              >
                <span
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{ color: 'var(--icon-primary)' }}
                >
                  {isRecording ? (
                    <span className="w-2 h-2 rounded-full bg-red-500 aic-recording-dot" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <rect
                        x="5.5"
                        y="1.8"
                        width="5"
                        height="7.6"
                        rx="2.5"
                        stroke="currentColor"
                        strokeWidth="1.45"
                      />
                      <path
                        d="M3.2 7.2C3.2 9.85 5.35 12 8 12C10.65 12 12.8 9.85 12.8 7.2"
                        stroke="currentColor"
                        strokeWidth="1.45"
                        strokeLinecap="round"
                      />
                      <path
                        d="M8 12V14.2M5.8 14.2H10.2"
                        stroke="currentColor"
                        strokeWidth="1.45"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </span>
                <span className="aic-record-label">
                  {isRecording ? formattedRecordingTime : 'Record'}
                </span>
              </button>

              {/* 5. Submit */}
              <button
                type="button"
                onClick={handleSubmitPrompt}
                className={`aic-submit-btn ${isSubmitReady ? 'ready' : ''}`}
                aria-label="Submit prompt"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 12.8V3.2M8 3.2L3.8 7.4M8 3.2L12.2 7.4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}


import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, Handle, Position,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './RoadmapFlow.css';

import {
  Check, Circle, Clock3, ExternalLink,
  FileText, Search, Target,
  X, RotateCcw, ArrowRight, ChevronUp, ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { FluidTabs } from '../fluid-tabs';
import { DropdownDisclosure } from '../dropdown-disclosure';
import { ROADMAP_CATEGORIES, getRoadmap } from '../../lib/roadmapsData';

// Custom Flow Node honoring roadmap.sh geometry with EduVault tokens
function TopicNode({ data }) {
  const { topic, status, selected, onSelect, isContinuoCrucial } = data;

  return (
    <div
      className={`roadmap-node-card ${status} ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(topic.id)}
    >
      <Handle type="target" position={Position.Top} />

      {status === 'completed' && (
        <span className="node-indicator-badge completed" title="Completed">
          <Check size={10} strokeWidth={3} />
        </span>
      )}
      {status === 'in-progress' && (
        <span className="node-indicator-badge in-progress" title="In Progress">
          <Clock3 size={10} strokeWidth={3} />
        </span>
      )}

      <div className="node-title-text">{topic.title}</div>
      {topic.subtitle && <div className="node-desc-text">{topic.subtitle}</div>}

      {isContinuoCrucial && (
        <div className="node-curriculum-pill">
          <span>Curriculum Match</span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = {
  topic: TopicNode
};

// Modal Detail Sheet
function TopicDialog({
  topic,
  status,
  onClose,
  onStatusChange,
  matchedSubject
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop-scrim" onClick={onClose}>
      <div
        className="topic-dialog-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="topic-dialog-header">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium tracking-wide uppercase bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300">
                {topic.level || 'Intermediate'}
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock3 size={11} /> {topic.duration || 'Flexible'}
              </span>
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              {topic.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="topic-dialog-body">
          {topic.description && (
            <p className="text-sm text-slate-600 dark:text-neutral-300 leading-relaxed m-0">
              {topic.description}
            </p>
          )}

          {matchedSubject && (
            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-xs">
              <strong className="block text-blue-900 dark:text-blue-300 font-semibold mb-0.5">
                University Course: {matchedSubject.name || topic.collegeSubjectMatch}
              </strong>
              <span className="text-blue-700/80 dark:text-blue-300/80 text-[11px] leading-relaxed block">
                This topic directly aligns with your enrolled coursework and campus technical interview rounds.
              </span>
            </div>
          )}

          {topic.keySkills && topic.keySkills.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#727272] dark:text-neutral-400 mb-2">
                Core Competencies
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {topic.keySkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-200/60 dark:border-neutral-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scaler Curated Course Lessons & Challenges */}
          {topic.resources && topic.resources.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#727272] dark:text-neutral-400 mb-2 flex items-center gap-1.5">
                <FileText size={12} className="text-[#0073E6]" /> Curated Lessons & Assessments
              </h4>
              <div className="space-y-1.5">
                {topic.resources.map((res, idx) => (
                  <a
                    key={idx}
                    href={res.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-neutral-800 hover:border-[#0073E6] hover:bg-blue-50/30 dark:hover:bg-neutral-800/60 transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 shrink-0">
                        {res.kind}
                      </span>
                      <span className="text-xs font-medium text-slate-800 dark:text-neutral-200 truncate group-hover:text-[#0073E6] transition-colors">
                        {res.title}
                      </span>
                    </div>
                    <ExternalLink size={12} className="text-slate-400 group-hover:text-[#0073E6] shrink-0 ml-2 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="topic-dialog-footer">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStatusChange(topic.id, 'not-started')}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer",
                status === 'not-started'
                  ? "bg-slate-200 dark:bg-neutral-800 text-slate-800 dark:text-white font-semibold"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800"
              )}
            >
              Pending
            </button>
            <button
              onClick={() => onStatusChange(topic.id, 'in-progress')}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer",
                status === 'in-progress'
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200 font-semibold"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800"
              )}
            >
              In Progress
            </button>
            <button
              onClick={() => onStatusChange(topic.id, 'completed')}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer",
                status === 'completed'
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 font-semibold"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-neutral-800"
              )}
            >
              Done
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Flow Canvas Inner Component
function FlowCanvas({
  topics,
  focusedId,
  setFocusedId,
  onOpenDialog,
  getStatus,
  crucialSubjectMap
}) {
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();

  const currentIndex = useMemo(() => {
    const idx = topics.findIndex(t => t.id === focusedId);
    return idx >= 0 ? idx : 0;
  }, [topics, focusedId]);

  const jumpToTopic = useCallback((target) => {
    if (!target) return;
    setCenter(target.position.x + 120, target.position.y + 35, {
      zoom: 1.05,
      duration: 350
    });
  }, [setCenter]);

  const handlePrev = () => {
    if (topics.length === 0) return;
    const prevIdx = currentIndex > 0 ? currentIndex - 1 : topics.length - 1;
    const target = topics[prevIdx];
    setFocusedId(target.id);
    jumpToTopic(target);
  };

  const handleNext = () => {
    if (topics.length === 0) return;
    const nextIdx = currentIndex < topics.length - 1 ? currentIndex + 1 : 0;
    const target = topics[nextIdx];
    setFocusedId(target.id);
    jumpToTopic(target);
  };

  const nodes = useMemo(() => {
    return topics.map(topic => {
      const isCrucial = Boolean(crucialSubjectMap[topic.collegeSubjectMatch?.toLowerCase()]);
      return {
        id: topic.id,
        type: 'topic',
        position: topic.position,
        data: {
          topic,
          status: getStatus(topic.id),
          selected: focusedId === topic.id,
          onSelect: (id) => {
            setFocusedId(id);
            const t = topics.find(item => item.id === id);
            if (t) jumpToTopic(t);
            onOpenDialog(id);
          },
          isContinuoCrucial: isCrucial
        },
        draggable: true
      };
    });
  }, [topics, getStatus, focusedId, setFocusedId, onOpenDialog, crucialSubjectMap, jumpToTopic]);

  const edges = useMemo(() => {
    return topics.flatMap(topic =>
      (topic.prerequisites || []).map(prereq => {
        const isDone = getStatus(prereq) === 'completed';

        return {
          id: `edge-${prereq}-${topic.id}`,
          source: prereq,
          target: topic.id,
          type: 'smoothstep',
          style: {
            stroke: isDone ? '#16a34a' : '#cbd5e1',
            strokeWidth: isDone ? 2 : 1.5
          }
        };
      })
    );
  }, [topics, getStatus]);

  return (
    <div className="w-full h-full relative">
      {/* Floating Navigator Bar: Prev/Next Milestone + Zoom In, Zoom Out, and Fit */}
      <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-[#E2E2E2] dark:border-neutral-800 shadow-2xs text-xs">
        <span className="text-[11px] font-medium text-[#727272] dark:text-neutral-400 px-1 select-none">
          Step <span className="text-[#1D1D1F] dark:text-white font-semibold">{currentIndex + 1}</span>/{topics.length}
        </span>
        <button
          type="button"
          onClick={handlePrev}
          className="w-6 h-6 flex items-center justify-center rounded-full text-[#727272] hover:text-[#1D1D1F] hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Previous milestone"
        >
          <ChevronUp size={13} />
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="w-6 h-6 flex items-center justify-center rounded-full text-[#727272] hover:text-[#1D1D1F] hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Next milestone"
        >
          <ChevronDown size={13} />
        </button>

        <span className="w-px h-3.5 bg-[#E5E5EA] dark:bg-neutral-700 mx-0.5" />

        <button
          type="button"
          onClick={() => zoomIn({ duration: 150 })}
          className="w-6 h-6 flex items-center justify-center rounded-full text-[#727272] hover:text-[#1D1D1F] hover:bg-slate-100 dark:hover:bg-neutral-800 font-medium text-xs transition-colors cursor-pointer"
          title="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomOut({ duration: 150 })}
          className="w-6 h-6 flex items-center justify-center rounded-full text-[#727272] hover:text-[#1D1D1F] hover:bg-slate-100 dark:hover:bg-neutral-800 font-medium text-xs transition-colors cursor-pointer"
          title="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => fitView({ padding: 0.2, minZoom: 0.6, maxZoom: 1.1, duration: 250 })}
          className="px-2.5 h-6 flex items-center justify-center rounded-full text-[11px] font-medium text-[#727272] hover:text-[#1D1D1F] hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Fit view"
        >
          Fit
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, minZoom: 0.6, maxZoom: 1.1 }}
        minZoom={0.3}
        maxZoom={2.0}
        defaultViewport={{ x: 0, y: 0, zoom: 0.95 }}
      >
        <Background color="#cbd5e1" gap={20} size={1} />
        <Controls showInteractive={false} showZoom={false} className="!bottom-4 !left-4" />
        <MiniMap
          nodeColor={n => {
            if (n.data?.status === 'completed') return '#16a34a';
            if (n.data?.status === 'in-progress') return '#d97706';
            return '#cbd5e1';
          }}
          className="!bottom-4 !right-4 !border-slate-200 dark:!border-slate-800 !rounded-xl"
        />
      </ReactFlow>
    </div>
  );
}

// Main Roadmaps Component
const Roadmaps = () => {
  const { loading: globalLoading, subjects = [] } = useOutletContext() || {};

  const [selectedDomain, setSelectedDomain] = useState(() => {
    const saved = localStorage.getItem('eduvault_selected_roadmap_domain');
    return (saved && ROADMAP_CATEGORIES.some(c => c.id === saved)) ? saved : 'javascript';
  });

  const currentRoadmap = useMemo(() => getRoadmap(selectedDomain), [selectedDomain]);

  const storageKey = `eduvault_roadmap_progress_${selectedDomain}`;
  const [statuses, setStatuses] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeDialogId, setActiveDialogId] = useState(null);
  const [focusedNodeId, setFocusedNodeId] = useState(currentRoadmap.topics[0]?.id || null);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('graph');

  useEffect(() => {
    localStorage.setItem('eduvault_selected_roadmap_domain', selectedDomain);
    try {
      const saved = localStorage.getItem(`eduvault_roadmap_progress_${selectedDomain}`);
      setStatuses(saved ? JSON.parse(saved) : {});
    } catch {
      setStatuses({});
    }
    setFocusedNodeId(currentRoadmap.topics[0]?.id || null);
    setActiveDialogId(null);
  }, [selectedDomain, currentRoadmap]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(statuses));
  }, [statuses, storageKey]);

  const getStatus = useCallback((id) => statuses[id] || 'not-started', [statuses]);

  const handleStatusChange = (id, newStatus) => {
    setStatuses(prev => ({ ...prev, [id]: newStatus }));
    toast.success("Progress saved");
  };

  const handleResetProgress = () => {
    if (window.confirm(`Reset progress for ${currentRoadmap.title}?`)) {
      setStatuses({});
      localStorage.removeItem(storageKey);
      toast.info("Progress reset");
    }
  };

  const crucialSubjectMap = useMemo(() => {
    const map = {};
    subjects.forEach(s => {
      if (s.name) map[s.name.toLowerCase()] = s;
    });
    return map;
  }, [subjects]);

  const totalTopics = currentRoadmap.topics.length;
  const completedCount = currentRoadmap.topics.filter(t => getStatus(t.id) === 'completed').length;
  const inProgressCount = currentRoadmap.topics.filter(t => getStatus(t.id) === 'in-progress').length;
  const progressPercent = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

  const activeTopic = activeDialogId ? currentRoadmap.topics.find(t => t.id === activeDialogId) : null;

  const visibleTopics = useMemo(() => {
    return currentRoadmap.topics.filter(t => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.subtitle && t.subtitle.toLowerCase().includes(q)) ||
        (t.keySkills && t.keySkills.some(k => k.toLowerCase().includes(q)))
      );
    });
  }, [currentRoadmap, query]);

  const [isRoadmapDropdownOpen, setIsRoadmapDropdownOpen] = useState(false);

  const roadmapDropdownItems = useMemo(() => {
    return ROADMAP_CATEGORIES.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: `${cat.role} • ${cat.topicsCount} topics`,
      badge: cat.badge,
    }));
  }, []);

  if (globalLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-[#0073E6] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="p-3.5 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto flex flex-col gap-4 pb-24 md:pb-12">
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold text-[#0073E6] uppercase tracking-wider block mb-0.5">
            Career & Curriculum Pathways
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1D1D1F] dark:text-white tracking-tight">
            Roadmap
          </h1>
          <p className="text-xs text-[#727272] dark:text-neutral-400 mt-0.5">
            {currentRoadmap.description || 'Verified developer learning paths with hands-on projects and interview milestones'}
          </p>
        </div>

        {/* Progress pill & Reset */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-900 border border-[#E2E2E2] dark:border-neutral-800 shadow-2xs text-xs">
            <span className="text-[#727272] dark:text-neutral-400 font-medium">Completed</span>
            <span className="font-semibold text-[#1D1D1F] dark:text-white">
              {completedCount}/{totalTopics}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#0073E6]" />
            <span className="text-[11px] font-bold text-[#0073E6]">{progressPercent}%</span>
          </div>

          {completedCount > 0 && (
            <button
              onClick={handleResetProgress}
              className="w-8 h-8 rounded-full border border-[#E2E2E2] dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center justify-center text-[#727272] hover:text-rose-600 transition-colors cursor-pointer shadow-2xs"
              title="Reset progress"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </header>

      {/* Unified Control Console: Roadmap Selector & View Switcher */}
      <section className="bg-white dark:bg-neutral-900 border border-[#E2E2E2] dark:border-neutral-800 rounded-2xl p-2.5 sm:p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Roadmap Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#727272] uppercase tracking-wider hidden sm:inline">
            Roadmap:
          </span>
          <DropdownDisclosure
            items={roadmapDropdownItems}
            selectedId={selectedDomain}
            onChange={(item) => {
              setSelectedDomain(item.id);
              setActiveDialogId(null);
            }}
            isOpen={isRoadmapDropdownOpen}
            onOpenChange={setIsRoadmapDropdownOpen}
            title="Select Career Roadmap"
            compact={false}
            placement="bottom"
          />
        </div>

        {/* Search & Graph/List Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter topics..."
              className="pl-7 pr-3 py-1.5 text-xs rounded-full bg-[#F5F5F7] dark:bg-neutral-800 border border-transparent focus:border-[#D9ECFF] text-[#1D1D1F] dark:text-white placeholder:text-[#8E8E93] outline-none transition-all w-36 sm:w-44"
            />
          </div>

          <div className="flex items-center p-0.5 rounded-full bg-[#F5F5F7] dark:bg-neutral-800 border border-[#E5E5EA] dark:border-neutral-700">
            <button
              onClick={() => setViewMode('graph')}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer",
                viewMode === 'graph'
                  ? "bg-white dark:bg-neutral-900 text-[#1D1D1F] dark:text-white shadow-2xs"
                  : "text-[#727272] dark:text-neutral-400 hover:text-[#1D1D1F]"
              )}
            >
              Graph
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer",
                viewMode === 'list'
                  ? "bg-white dark:bg-neutral-900 text-[#1D1D1F] dark:text-white shadow-2xs"
                  : "text-[#727272] dark:text-neutral-400 hover:text-[#1D1D1F]"
              )}
            >
              List
            </button>
          </div>
        </div>
      </section>

      {/* Main Canvas Frame */}
      <div className="bg-white dark:bg-neutral-900 border border-[#E2E2E2] dark:border-neutral-800 rounded-2xl overflow-hidden shadow-2xs relative w-full h-[calc(100vh-275px)] min-h-[580px]">
        {viewMode === 'graph' ? (
          <ReactFlowProvider>
            <FlowCanvas
              topics={visibleTopics}
              focusedId={focusedNodeId}
              setFocusedId={setFocusedNodeId}
              onOpenDialog={setActiveDialogId}
              getStatus={getStatus}
              crucialSubjectMap={crucialSubjectMap}
            />
          </ReactFlowProvider>
        ) : (
          <div className="h-full overflow-y-auto divide-y divide-[#F0F0F2] dark:divide-neutral-800">
            {visibleTopics.map((topic, idx) => {
              const status = getStatus(topic.id);
              return (
                <div
                  key={topic.id}
                  onClick={() => setActiveDialogId(topic.id)}
                  className="px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="text-xs font-mono text-[#8E8E93] w-6 shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-semibold text-[#1D1D1F] dark:text-white truncate">
                          {topic.title}
                        </strong>
                        {topic.subtitle && (
                          <span className="text-[11px] text-[#727272] dark:text-neutral-400 truncate hidden sm:inline">
                            • {topic.subtitle}
                          </span>
                        )}
                      </div>
                      {topic.description && (
                        <p className="text-[11px] text-[#727272] dark:text-neutral-400 truncate max-w-xl mt-0.5">
                          {topic.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-semibold",
                      status === 'completed'
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60"
                        : status === 'in-progress'
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60"
                          : "bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400"
                    )}>
                      {status === 'completed' ? 'Done' : status === 'in-progress' ? 'In Progress' : 'Pending'}
                    </span>
                    <ArrowRight size={13} className="text-[#8E8E93]" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Topic Detail Modal */}
      {activeTopic && (
        <TopicDialog
          topic={activeTopic}
          status={getStatus(activeTopic.id)}
          onClose={() => setActiveDialogId(null)}
          onStatusChange={handleStatusChange}
          matchedSubject={subjects.find(s =>
            s.name?.toLowerCase().includes(activeTopic.collegeSubjectMatch?.toLowerCase())
          )}
        />
      )}
    </main>
  );
};

export default Roadmaps;

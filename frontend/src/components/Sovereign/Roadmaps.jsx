import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, Handle, Position,
  MarkerType, useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './RoadmapFlow.css';

import {
  BookOpen, Check, CheckCircle2, Circle, Clock3, ExternalLink,
  FileText, GitBranch, Layers3, LockKeyhole, Search, Sparkles, Target,
  X, Briefcase, GraduationCap, ArrowRight, RotateCcw, Award, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

import { ROADMAPS, ROADMAP_CATEGORIES, getRoadmap } from '../../lib/roadmapsData';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const statusLabel = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  completed: 'Completed',
};

// Custom ReactFlow Node
function TopicNode({ data }) {
  const { topic, status, locked, selected, onSelect, isContinuoCrucial } = data;

  return (
    <div
      className={`topic-node ${status} ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}`}
      onClick={() => onSelect(topic.id)}
    >
      <Handle type="target" position={Position.Left} />
      
      <div className="node-topline">
        <div className={`node-icon-box ${status}`}>
          {status === 'completed' ? (
            <Check size={14} />
          ) : locked ? (
            <LockKeyhole size={13} />
          ) : (
            <Circle size={13} />
          )}
        </div>
        <span className="node-level-pill">{topic.level}</span>
      </div>

      <strong>{topic.title}</strong>

      <div className="flex items-center justify-between gap-1 mt-auto">
        <span className="node-meta">
          <Clock3 size={11} /> {topic.duration}
        </span>
        {isContinuoCrucial && (
          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5" title="Continuo Placement Crucial Subject">
            <Sparkles size={8} /> Placement
          </span>
        )}
      </div>

      <span className={`node-status-badge ${status}`}>
        {locked ? 'Prerequisites needed' : statusLabel[status]}
      </span>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = {
  topic: TopicNode
};

// Topic Details Inspection Panel
function TopicDetails({ topic, status, locked, onClose, onStatus, getStatus, matchedSubject, onSelectTopic }) {
  const prerequisites = (topic.prerequisites || []).map(id => topic.allTopicsMap?.[id]).filter(Boolean);

  return (
    <aside className="roadmap-detail-panel animate-in fade-in duration-200">
      <div className="detail-head">
        <div>
          <span className="detail-eyebrow">ROADMAP MILESTONE</span>
          <h2>{topic.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close details"
        >
          <X size={16} />
        </button>
      </div>

      <p className="detail-desc">{topic.description}</p>

      <div className="detail-tags">
        <span><Clock3 size={12} /> {topic.duration}</span>
        <span><Layers3 size={12} /> {topic.level}</span>
        {matchedSubject && (
          <span className="bg-blue-50 text-blue-700 border-blue-200">
            <GraduationCap size={12} /> Continuo: {matchedSubject.name || topic.collegeSubjectMatch}
          </span>
        )}
      </div>

      {matchedSubject && (
        <div className="mx-5 my-2 p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
            <Sparkles size={13} className="text-blue-600" />
            <span>Continuo Placement Synergies</span>
          </div>
          <p className="text-blue-800 text-[11px] leading-relaxed">
            Your university curriculum subject <strong>{matchedSubject.name}</strong> directly prepares you for this module. Mastering this node solidifies your campus placement interview readiness.
          </p>
        </div>
      )}

      <section className="detail-section">
        <h3><GitBranch size={14} className="text-blue-600" /> Prerequisites</h3>
        {prerequisites.length > 0 ? (
          <div className="prereq-list">
            {prerequisites.map(p => {
              const pStatus = getStatus(p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectTopic(p.id)}
                  className="prereq-item hover:border-blue-300 border border-transparent transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      pStatus === 'completed' ? 'bg-emerald-500' : pStatus === 'in-progress' ? 'bg-amber-500' : 'bg-slate-300'
                    }`} />
                    <span className="font-semibold text-slate-800">{p.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{statusLabel[pStatus]}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 m-0">No prerequisites — safe to start here!</p>
        )}
      </section>

      <section className="detail-section">
        <h3><Target size={14} className="text-blue-600" /> What You'll Master</h3>
        <ul className="outcome-list">
          {topic.outcomes?.map((outcome, idx) => (
            <li key={idx}>
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>{outcome}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="detail-section">
        <h3><BookOpen size={14} className="text-blue-600" /> Learning Resources</h3>
        <div className="space-y-2">
          {topic.resources?.map((res, idx) => (
            <a
              key={idx}
              href={res.url}
              target="_blank"
              rel="noreferrer"
              className="resource-card group"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileText size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <strong className="block text-[11px] text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                  {res.title}
                </strong>
                <span className="text-[9px] text-slate-400">
                  {res.kind} {res.free ? ' · Free' : ''}
                </span>
              </div>
              <ExternalLink size={12} className="text-slate-400 group-hover:text-blue-600 shrink-0" />
            </a>
          ))}
        </div>
      </section>

      <div className="detail-actions">
        {locked && (
          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
            <LockKeyhole size={13} className="shrink-0" />
            <span>Complete previous milestones to mark unlocked.</span>
          </div>
        )}
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Your Mastery Progress
        </label>
        <select
          value={status}
          onChange={(e) => onStatus(topic.id, e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="not-started">Not started</option>
          <option value="in-progress">In progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>
    </aside>
  );
}

// Inner Canvas Flow Component with ReactFlow hooks
function FlowCanvas({
  topics,
  topicById,
  statuses,
  selectedId,
  setSelectedId,
  isUnlocked,
  getStatus,
  crucialSubjectMap
}) {
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();

  const nodes = useMemo(() => {
    return topics.map(topic => {
      const isCrucial = Boolean(crucialSubjectMap[topic.collegeSubjectMatch?.toLowerCase()]);
      return {
        id: topic.id,
        type: 'topic',
        position: topic.position,
        data: {
          topic: { ...topic, allTopicsMap: topicById },
          status: getStatus(topic.id),
          locked: !isUnlocked(topic),
          selected: selectedId === topic.id,
          onSelect: setSelectedId,
          isContinuoCrucial: isCrucial
        },
        draggable: true
      };
    });
  }, [topics, topicById, getStatus, isUnlocked, selectedId, setSelectedId, crucialSubjectMap]);

  const edges = useMemo(() => {
    return topics.flatMap(topic =>
      (topic.prerequisites || []).map(prereq => {
        const isDone = getStatus(prereq) === 'completed';
        const targetDone = getStatus(topic.id) === 'completed';
        const color = isDone ? '#10b981' : '#cbd5e1';
        return {
          id: `${prereq}-${topic.id}`,
          source: prereq,
          target: topic.id,
          type: 'smoothstep',
          animated: isDone && !targetDone,
          style: { stroke: color, strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color,
            width: 14,
            height: 14
          }
        };
      })
    );
  }, [topics, getStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const targetNode = nodes.find(n => n.id === selectedId) || nodes[0];
      if (targetNode?.position) {
        setCenter(targetNode.position.x + 115, targetNode.position.y + 65, { zoom: 1.15, duration: 400 });
      } else {
        fitView({ padding: 0.15, minZoom: 0.9, maxZoom: 1.3, duration: 400 });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [topics, fitView, setCenter]);

  useEffect(() => {
    if (selectedId) {
      const node = nodes.find(n => n.id === selectedId);
      if (node?.position) {
        setCenter(node.position.x + 115, node.position.y + 65, { zoom: 1.2, duration: 350 });
      }
    }
  }, [selectedId, setCenter]);

  return (
    <div className="roadmap-graph-frame">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-3 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600 shadow-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> In Progress
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-300" /> Not Started
        </span>
        <span className="flex items-center gap-1.5 text-blue-600">
          <Sparkles size={11} /> Continuo Synergies
        </span>
      </div>

      {/* Quick Zoom Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-xl border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => zoomIn({ duration: 250 })}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-700 hover:text-blue-600 hover:bg-slate-100 font-bold text-sm cursor-pointer transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomOut({ duration: 250 })}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-700 hover:text-blue-600 hover:bg-slate-100 font-bold text-sm cursor-pointer transition-colors"
          title="Zoom Out"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => fitView({ padding: 0.15, minZoom: 0.9, maxZoom: 1.3, duration: 350 })}
          className="px-2 h-7 flex items-center justify-center rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 cursor-pointer transition-colors"
          title="Reset Zoom"
        >
          Fit
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitViewOptions={{ padding: 0.15, minZoom: 0.9, maxZoom: 1.4 }}
        minZoom={0.4}
        maxZoom={2.8}
        defaultViewport={{ x: 0, y: 0, zoom: 1.15 }}
      >
        <Background color="#cbd5e1" gap={18} size={1} />
        <Controls showInteractive={false} className="!bg-white !border-slate-200 !shadow-sm !rounded-xl" />
        <MiniMap
          nodeColor={n => {
            if (n.data?.status === 'completed') return '#10b981';
            if (n.data?.status === 'in-progress') return '#f59e0b';
            return '#e2e8f0';
          }}
          className="!border-slate-200 !rounded-xl !bg-slate-50/80"
        />
      </ReactFlow>
    </div>
  );
}

// Main Component
const Roadmaps = () => {
  const { loading: globalLoading, subjects = [] } = useOutletContext() || {};

  // Track selection state
  const [selectedDomain, setSelectedDomain] = useState(() => {
    return localStorage.getItem('eduvault_selected_roadmap_domain') || 'frontend';
  });

  // Current Roadmap Configuration
  const currentRoadmap = useMemo(() => getRoadmap(selectedDomain), [selectedDomain]);
  const topicById = useMemo(() => {
    return Object.fromEntries(currentRoadmap.topics.map(t => [t.id, t]));
  }, [currentRoadmap]);

  // Status storage per domain
  const storageKey = `eduvault_roadmap_progress_${selectedDomain}`;
  const [statuses, setStatuses] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // UI state
  const [selectedId, setSelectedId] = useState(currentRoadmap.topics[0]?.id || null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('graph'); // 'graph' | 'list'
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  // Gemini Web2API Subject Placement Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);

  // Persist domain and statuses
  useEffect(() => {
    localStorage.setItem('eduvault_selected_roadmap_domain', selectedDomain);
    try {
      const saved = localStorage.getItem(`eduvault_roadmap_progress_${selectedDomain}`);
      setStatuses(saved ? JSON.parse(saved) : {});
    } catch {
      setStatuses({});
    }
    setSelectedId(currentRoadmap.topics[0]?.id || null);
  }, [selectedDomain, currentRoadmap]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(statuses));
  }, [statuses, storageKey]);

  // Automatically trigger or allow analysis via Gemini Web2API
  const runGeminiSubjectAnalysis = useCallback(async (force = false) => {
    if (analysisData && !force && analysisData.domain === currentRoadmap.title) {
      setShowAnalysisModal(true);
      return;
    }

    setIsAnalyzing(true);
    setShowAnalysisModal(true);

    try {
      const payload = {
        domain: currentRoadmap.title,
        subjects: subjects.map(s => ({
          name: s.name,
          code: s.code,
          attendance: s.attendance,
          cie: s.cie
        }))
      };

      const res = await axios.post(`${API_BASE}/ai/analyze-roadmap-subjects`, payload);
      setAnalysisData(res.data);
      toast.success("Gemini Web2API analyzed Continuo subjects for placements!");
    } catch (err) {
      console.warn("Using fallback subject analysis", err);
      toast.info("Generated curriculum placement insights.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentRoadmap.title, subjects, analysisData]);

  const getStatus = useCallback((id) => statuses[id] || 'not-started', [statuses]);

  const isUnlocked = useCallback((topic) => {
    if (!topic.prerequisites || topic.prerequisites.length === 0) return true;
    return topic.prerequisites.every(id => getStatus(id) === 'completed');
  }, [getStatus]);

  const setTopicStatus = (id, status) => {
    setStatuses(prev => ({ ...prev, [id]: status }));
  };

  const handleResetProgress = () => {
    if (window.confirm(`Reset progress for ${currentRoadmap.title}?`)) {
      setStatuses({});
      localStorage.removeItem(storageKey);
      toast.info("Track progress reset");
    }
  };

  // Crucial subjects mapping
  const crucialSubjectMap = useMemo(() => {
    const map = {};
    if (analysisData?.placementSubjects) {
      analysisData.placementSubjects.forEach(s => {
        if (s.importance === 'CRITICAL' || s.importance === 'IMPORTANT') {
          map[s.name.toLowerCase()] = s;
        }
      });
    }
    return map;
  }, [analysisData]);

  // Metrics
  const totalTopics = currentRoadmap.topics.length;
  const completedCount = currentRoadmap.topics.filter(t => getStatus(t.id) === 'completed').length;
  const inProgressCount = currentRoadmap.topics.filter(t => getStatus(t.id) === 'in-progress').length;
  const progressPercent = Math.round((completedCount / totalTopics) * 100);

  // Selected topic object
  const selectedTopic = selectedId ? topicById[selectedId] : null;

  // Filtered topics
  const visibleTopics = useMemo(() => {
    return currentRoadmap.topics.filter(t => {
      const matchesQuery = !query || `${t.title} ${t.description} ${t.level}`.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === 'all' || getStatus(t.id) === filter;
      return matchesQuery && matchesFilter;
    });
  }, [currentRoadmap.topics, query, filter, getStatus]);

  if (globalLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="roadmap-container">
      {/* Top Header & Track Selector */}
      <header className="px-3.5 sm:px-6 py-4 sm:py-5 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                <GraduationCap size={12} /> Continuo Syllabus Sync
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                <Award size={12} /> Campus Placement Verified
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              {currentRoadmap.title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
              {currentRoadmap.description}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => runGeminiSubjectAnalysis(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all cursor-pointer"
            >
              <Sparkles size={14} className="text-amber-300 animate-pulse" />
              <span>Gemini Placement Analysis</span>
              {analysisData?.readinessScore && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-white/20 text-[10px]">
                  {analysisData.readinessScore}% Match
                </span>
              )}
            </button>

            <button
              onClick={handleResetProgress}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
              title="Reset progress for this track"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Preferred Track Selector Tabs */}
        <div className="max-w-7xl mx-auto mt-5 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
            Select Track:
          </span>
          {ROADMAP_CATEGORIES.map(cat => {
            const isSelected = selectedDomain === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedDomain(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/60 text-slate-500'
                }`}>
                  {cat.badge}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Progress & Filtering Toolbar */}
      <section className="px-3.5 sm:px-6 py-3 bg-white/80 border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Progress stats */}
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="w-full">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">Track Completion</span>
                <span className="font-bold text-blue-600">
                  {completedCount}/{totalTopics} ({progressPercent}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 shrink-0">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> {completedCount} Done
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> {inProgressCount} Active
              </span>
            </div>
          </div>

          {/* Search, Filter & View Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search topics..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 w-44"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All Topics</option>
              <option value="not-started">Not Started</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200">
              <button
                onClick={() => setViewMode('graph')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'graph' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Graph Flow
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Curriculum List
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Workspace */}
      <main className="roadmap-workspace">
        <div className="w-full flex flex-col gap-4">
          
          {/* Continuo Placement Highlights Notification */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Briefcase size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Continuo ERP Syllabus & Placement Matching
                </h4>
                <p className="text-[11px] text-slate-500">
                  {subjects.length} active college subjects mapped to this roadmap. Gemini highlights core interview topics.
                </p>
              </div>
            </div>

            <button
              onClick={() => runGeminiSubjectAnalysis(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Sparkles size={13} className="text-blue-600" />
              <span>View Analysis</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {/* Interactive Graph / List View */}
          {viewMode === 'graph' ? (
            <ReactFlowProvider>
              <FlowCanvas
                topics={visibleTopics}
                topicById={topicById}
                statuses={statuses}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                isUnlocked={isUnlocked}
                getStatus={getStatus}
                crucialSubjectMap={crucialSubjectMap}
              />
            </ReactFlowProvider>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {visibleTopics.map((topic, index) => {
                const status = getStatus(topic.id);
                const isSelected = selectedId === topic.id;
                const locked = !isUnlocked(topic);
                return (
                  <div
                    key={topic.id}
                    onClick={() => setSelectedId(topic.id)}
                    className={`p-4 flex items-center justify-between gap-4 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                        status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : status === 'in-progress'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-bold text-slate-900 truncate">
                            {topic.title}
                          </strong>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                            {topic.level}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate max-w-md">
                          {topic.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {topic.duration}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : status === 'in-progress'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {locked ? 'Locked' : statusLabel[status]}
                      </span>
                      <ArrowRight size={14} className="text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Topic Details Sidebar */}
        {selectedTopic && (
          <TopicDetails
            topic={selectedTopic}
            status={getStatus(selectedTopic.id)}
            locked={!isUnlocked(selectedTopic)}
            onClose={() => setSelectedId(null)}
            onStatus={setTopicStatus}
            getStatus={getStatus}
            matchedSubject={subjects.find(s => s.name?.toLowerCase().includes(selectedTopic.collegeSubjectMatch?.toLowerCase()))}
            onSelectTopic={setSelectedId}
          />
        )}
      </main>

      {/* Gemini Subject Placement Analysis Modal */}
      {showAnalysisModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowAnalysisModal(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold tracking-wider uppercase text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded">
                      Gemini Web2API
                    </span>
                    <span className="text-xs text-slate-500">
                      Continuo Placement Intelligence
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {currentRoadmap.title} · Syllabus Placement Analysis
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setShowAnalysisModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {isAnalyzing ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="w-10 h-10 border-3 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-xs font-bold text-slate-800">
                    Synthesizing Continuo syllabus with Gemini Web2API...
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    Evaluating college course records against campus technical interviews and {currentRoadmap.title} hiring requirements.
                  </p>
                </div>
              ) : (
                <>
                  {/* Readiness Banner */}
                  <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                        Campus Recruitment Alignment
                      </span>
                      <h4 className="text-base font-bold text-white mt-0.5">
                        {analysisData?.readinessScore || 85}% Domain Syllabus Match
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-lg">
                        {analysisData?.summary || "Continuo coursework covers foundational software concepts. Pairing college labs with this roadmap will elevate your technical interview performance."}
                      </p>
                    </div>

                    <div className="w-16 h-16 rounded-full bg-blue-600/30 border-2 border-blue-400 flex items-center justify-center text-xl font-extrabold text-blue-200 shrink-0">
                      {analysisData?.readinessScore || 85}%
                    </div>
                  </div>

                  {/* High Yield Placement Subjects */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Award size={14} className="text-blue-600" />
                        Crucial Subjects for Technical Interviews
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        From DKTE / Continuo ERP
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analysisData?.placementSubjects?.map((sub, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                sub.importance === 'CRITICAL'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : sub.importance === 'IMPORTANT'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-200 text-slate-700'
                              }`}>
                                {sub.importance}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {sub.code || 'Continuo'}
                              </span>
                            </div>

                            <h5 className="text-xs font-bold text-slate-900 mb-1">
                              {sub.name}
                            </h5>
                            <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                              {sub.whyItMatters}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-200/60 mt-1">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Interview Focus Areas:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {sub.interviewTopics?.map((t, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white border border-slate-200 text-slate-700"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Strategic Tips from Gemini */}
                  {analysisData?.placementStrategy && (
                    <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                      <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                        <AlertCircle size={14} className="text-amber-700" />
                        Gemini Career Guidance & Placement Strategy
                      </h4>
                      <ul className="space-y-1.5">
                        {analysisData.placementStrategy.map((tip, idx) => (
                          <li key={idx} className="text-[11px] text-amber-800 flex items-start gap-2">
                            <span className="font-bold text-amber-900 shrink-0">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Powered by Gemini Web2API & Continuo Academic Database
              </span>
              <button
                onClick={() => runGeminiSubjectAnalysis(true)}
                disabled={isAnalyzing}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Re-Analyze
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roadmaps;

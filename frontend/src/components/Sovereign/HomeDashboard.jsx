import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Calendar,
  ChevronRight,
  BookOpen,
  AlertCircle,
  TrendingUp,
  Zap,
  Clock,
  FileText,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const API_BASE = 'http://localhost:8081/api';

const getDepartmentName = (deptCode) => {
  if (!deptCode) return "Unknown Department";
  const code = deptCode.toUpperCase();
  if (code.includes('UAD')) return 'Artificial Intelligence & Data Science (AI&DS)';
  if (code.includes('UAM')) return 'Computer Science & Engineering (CSE-AIML)';
  if (code.includes('UCS')) return 'Computer Science & Engineering (CSE)';
  if (code.includes('UME')) return 'Mechanical Engineering';
  if (code.includes('UET')) return 'Electronics & Telecommunication Engineering';
  if (code.includes('UCE')) return 'Civil Engineering';
  if (code.includes('UEE')) return 'Electrical Engineering';
  if (code.includes('UTT')) return 'Textile Technology';
  if (code.includes('UMT')) return 'Man-Made Textile Technology';
  if (code.includes('UTC')) return 'Textile Chemistry';
  if (code.includes('UTX')) return 'Technical Textiles';
  if (code.includes('UFT')) return 'Fashion Technology';
  return deptCode;
};

const getOrdinalSuffix = (i) => {
  const j = i % 10, k = i % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

const formatSemester = (semStr) => {
  if (!semStr) return "Unknown Semester";
  const numMatch = semStr.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    const suffix = getOrdinalSuffix(num);
    return (
      <span>
        {num}<sup>{suffix}</sup> Semester
      </span>
    );
  }
  return semStr;
};

const formatName = (fullName) => {
  if (!fullName) return "Student";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    const firstName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
    const lastName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    return `${firstName} ${lastName}`;
  }
  return fullName.split(/\s+/).map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

/* ─── Heatmap Logic ─── */
function buildHeatmapData(subjects, fallbackWeeks = 18) {
  const dayMap = new Map();
  const dates = [];
  (subjects || []).forEach(sub => {
    (sub.detailedAttendance || []).forEach(rec => {
      const key = rec.date;
      if (!dayMap.has(key)) dayMap.set(key, { present: 0, absent: 0, total: 0, date: key });
      const entry = dayMap.get(key);
      entry.total++;
      if (rec.status === 'Present') entry.present++;
      else entry.absent++;

      // Capture lecture names and statuses
      if (!entry.lectures) entry.lectures = [];
      entry.lectures.push({
        name: sub.subjectName || sub.name || "Lecture",
        status: rec.status
      });

      const parts = key.split('-');
      if (parts.length === 3) {
        dates.push(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    });
  });

  const today = new Date();
  const endSaturday = new Date(today);
  endSaturday.setDate(today.getDate() + (6 - today.getDay()));

  let startOfGrid = new Date(endSaturday);
  startOfGrid.setDate(endSaturday.getDate() - (fallbackWeeks * 7) + 1);
  let weeksToShow = fallbackWeeks;

  if (dates.length > 0) {
    const earliestStr = dates.sort()[0];
    const earliest = new Date(earliestStr.replace(/-/g, '/'));
    const startSunday = new Date(earliest);
    startSunday.setDate(earliest.getDate() - earliest.getDay());
    
    weeksToShow = 19;
    startOfGrid = startSunday;
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
  return grid;
}

const getHeatColor = (entry, isFuture) => {
  if (isFuture) return 'bg-zinc-800/30 border-zinc-700/50';
  if (!entry) return 'bg-zinc-800/50 border-zinc-700/50';

  // GitHub's exact contribution graph colors with custom styles
  // Level 0: #ebedf0 (no contribution) - very light gray
  // Level 1: #9be9a8 (1-3 contributions) - very light green
  // Level 2: #40c463 (4-6 contributions) - light green
  // Level 3: #30a14e (7-9 contributions) - medium green
  // Level 4: #216e39 (10+ contributions) - dark green

  if (entry.absent > 0 && entry.present === 0) {
    // All absent - red color
    return 'bg-red-500 border-red-600';
  }

  // Calculate total lectures as "contributions"
  const totalContributions = entry.present;

  if (totalContributions >= 10) {
    return 'bg-[#216e39] border-[#1a5129]'; // Level 4 - dark green
  }
  if (totalContributions >= 7) {
    return 'bg-[#30a14e] border-[#267f42]'; // Level 3 - medium green
  }
  if (totalContributions >= 4) {
    return 'bg-[#40c463] border-[#2fa048]'; // Level 2 - light green
  }
  if (totalContributions >= 1) {
    return 'bg-[#9be9a8] border-[#7bc96f]'; // Level 1 - very light green
  }

  return 'bg-[#ebedf0] border-[#d1d5db]'; // No contributions
};

/* ─── Shared Components ─── */
const Card = ({ children, className, title, icon: Icon, action, description }) => (
  <div className={cn(
    "bg-card text-card-foreground border rounded-lg shadow-sm flex flex-col",
    className
  )}>
    {(title || Icon || description) && (
      <div className="flex flex-col space-y-1.5 p-6 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
            <h3 className="font-semibold leading-none tracking-tight">{title}</h3>
          </div>
          {action && action}
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
    )}
    <div className="p-6 pt-0 flex-1">
      {children}
    </div>
  </div>
);



const HomeDashboard = () => {
  const { profile, subjects, notes, loading, refreshData } = useOutletContext();
  const [announcements, setAnnouncements] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [ciePopupOpen, setCiePopupOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [hoveredDay, setHoveredDay] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [loginPrn, setLoginPrn] = useState('');
  const [loginDob, setLoginDob] = useState('');
  const [syncing, setSyncing] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginPrn || !loginDob) {
      toast.error('Please enter both PRN and DOB');
      return;
    }

    setSyncing(true);
    const toastId = toast.loading('Syncing with college portal...');
    try {
      // 1. Update/Save profile on backend
      await axios.post(`${API_BASE}/profile`, {
        ...profile,
        prn: loginPrn,
        dob: loginDob
      });

      // 2. Trigger Portal Sync
      const syncResponse = await axios.post(`${API_BASE}/portal/dashboard`, {
        prn: loginPrn,
        dob: loginDob
      });

      if (syncResponse.data) {
        toast.success('Sync complete! Welcome to EduVault.', { id: toastId });
        if (refreshData) {
          await refreshData();
        }
      }
    } catch (err) {
      console.error('Portal sync error:', err);
      const msg = err.response?.data?.error || 'Failed to sync with portal. Check credentials.';
      toast.error(msg, { id: toastId });
    } finally {
      setSyncing(false);
    }
  };

  const fetchData = async () => {
    try {
      const [annoRes, timeRes] = await Promise.all([
        axios.get(`${API_BASE}/announcements/recent`),
        axios.get(`${API_BASE}/timeline`)
      ]);
      setAnnouncements(annoRes.data);
      setTimeline(timeRes.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const { stats, subjectRegistry } = useMemo(() => {
    if (!subjects?.length) return { stats: {}, subjectRegistry: [] };

    const saved = localStorage.getItem('eduvault_excluded_subjects');
    const excludedIds = saved ? JSON.parse(saved) : [];
    const active = subjects.filter(s => !excludedIds.includes(s.id));

    const calcAvg = (subs) => {
      if (!subs.length) return 0;
      return Math.round(subs.reduce((a, b) => a + (parseFloat(b.attendance) || 0), 0) / subs.length);
    };

    const theory = active.filter(s => !(s.code?.toUpperCase().endsWith('P') || s.name.toLowerCase().includes('lab')));
    const lab = active.filter(s => (s.code?.toUpperCase().endsWith('P') || s.name.toLowerCase().includes('lab')));

    // Bunk Logic
    const target = 0.75;
    const registry = active.map(sub => {
      const a = parseInt(sub.attended) || 0;
      const h = parseInt(sub.held) || 0;

      if (h === 0) return { ...sub, bunks: 0, mustAttend: 0, isAtRisk: false };

      let bunks = 0;
      let mustAttend = 0;
      const currentPct = a / h;

      if (currentPct >= target) {
        bunks = Math.floor(a / target - h);
      } else {
        mustAttend = Math.ceil((target * h - a) / (1 - target));
      }

      return {
        ...sub,
        bunks,
        mustAttend,
        isAtRisk: currentPct < target
      };
    }).sort((a, b) => (a.mustAttend > 0 ? -1 : 1) || a.bunks - b.bunks);

    return {
      stats: {
        theory: calcAvg(theory),
        lab: calcAvg(lab),
        overall: calcAvg(active),
        totalDocs: notes?.length || 0,
        riskCount: active.filter(s => parseFloat(s.attendance) < 75).length
      },
      subjectRegistry: registry
    };
  }, [subjects, notes]);

  const heatmapGrid = useMemo(() => buildHeatmapData(subjects), [subjects]);

  /* ─── GSAP Entrance Timeline ─── */
  useGSAP(() => {
    if (loading || !profile) return;

    const tl = gsap.timeline({ defaults: { duration: 0.9, ease: 'expo.out' } });

    // 1. Profile card — gentle rise + fade
    tl.from('[data-sv="profile-card"]', {
      autoAlpha: 0, y: 20, duration: 0.8, ease: 'power2.out'
    })
    // 2. Avatar — smooth scale-in
    .from('[data-sv="avatar"]', {
      scale: 0.6, autoAlpha: 0, duration: 0.7, ease: 'power3.out'
    }, '<0.1')
    // 3. Name + badges — soft stagger
    .from('[data-sv="identity"] > *', {
      autoAlpha: 0, y: 8, stagger: 0.06, duration: 0.5, ease: 'power2.out'
    }, '<0.08')
    // 4. Stats — slide in from right
    .from('[data-sv="stats-block"]', {
      autoAlpha: 0, x: 20, duration: 0.6, ease: 'power2.out'
    }, '<0.15')
    // 5. CTA button — fade + subtle scale
    .from('[data-sv="cta-btn"]', {
      scale: 0.92, duration: 0.5, ease: 'power2.out'
    }, '<0.1');

    // 6. Top row cards — silky stagger rise
    tl.from('[data-sv="top-card"]', {
      autoAlpha: 0, y: 30,
      stagger: 0.1, duration: 0.7, ease: 'expo.out'
    }, '-=0.4');

    // 7. Online pulse dot — gentle breathing
    gsap.to('[data-sv="pulse-dot"]', {
      boxShadow: '0 0 0 5px rgba(16,185,129,0)',
      repeat: -1, yoyo: true, duration: 1.6, ease: 'sine.inOut'
    });

    // 8. Below-fold cards — smooth scroll reveal
    ScrollTrigger.batch('[data-sv="bento-card"]', {
      onEnter: (elements) => {
        gsap.from(elements, {
          autoAlpha: 0, y: 35,
          stagger: 0.08, duration: 0.8, ease: 'expo.out',
          overwrite: true
        });
      },
      start: 'top 90%',
      once: true
    });

    // 9. Heatmap cells — gentle random fade-in
    ScrollTrigger.create({
      trigger: '[data-sv="heatmap"]',
      start: 'top 88%',
      once: true,
      onEnter: () => {
        gsap.from('[data-sv="heat-cell"]', {
          scale: 0.5, autoAlpha: 0,
          stagger: { amount: 1.2, from: 'random' },
          duration: 0.4, ease: 'power2.out'
        });
      }
    });

    // 10. CIE progress bars — smooth width fill
    ScrollTrigger.create({
      trigger: '[data-sv="cie-card"]',
      start: 'top 88%',
      once: true,
      onEnter: () => {
        gsap.from('[data-sv="cie-bar"]', {
          width: 0, duration: 1.4, stagger: 0.12, ease: 'expo.out'
        });
      }
    });

  }, { scope: containerRef, dependencies: [loading, profile], revertOnUpdate: true });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4 bg-black">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-zinc-400 font-medium">Synchronizing Interface...</span>
      </div>
    );
  }

  if (!profile || !profile.prn || !profile.dob) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 bg-black text-zinc-100">
        <div className="w-full max-w-md bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col items-center text-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center shadow-inner mb-2">
              <Zap className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-100">EduVault Integration</h2>
            <p className="text-xs text-zinc-400 max-w-xs leading-normal">
              Enter your college PRN and Date of Birth to synchronize your student portal and initialize your dashboard.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-0.5">College PRN</label>
              <input
                type="text"
                placeholder="e.g. 24UAD022"
                value={loginPrn}
                onChange={(e) => setLoginPrn(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950/40 border border-zinc-800/80 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/65 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                disabled={syncing}
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 ml-0.5">Date of Birth</label>
              <input
                type="text"
                placeholder="DD-MM-YYYY (e.g. 22-11-2006)"
                value={loginDob}
                onChange={(e) => setLoginDob(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950/40 border border-zinc-800/80 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/65 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                disabled={syncing}
                required
              />
              <span className="text-[9px] text-zinc-500 block leading-tight">Format: DD-MM-YYYY (Day-Month-Year)</span>
            </div>

            <button
              type="submit"
              disabled={syncing}
              className="w-full mt-2 inline-flex items-center justify-center rounded-lg text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 hover:to-indigo-550 text-white py-2.5 shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              {syncing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Syncing Portal...</span>
                </div>
              ) : (
                <span>Initialize & Sync</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto w-full antialiased bg-black text-zinc-100 min-h-screen">
      {/* Header Section */}
      <section className="pb-6">
        {/* SaaS-style Profile Card */}
        <div data-sv="profile-card" className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-md">
          <div className="flex flex-col gap-4">
            {/* Top: Avatar and Identity */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div data-sv="avatar" className="w-14 h-14 rounded-lg border-2 border-zinc-700/50 bg-zinc-800/50 overflow-hidden ring-1 ring-zinc-800/50">
                  <img
                    src={profile?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.name}`}
                    className="w-full h-full object-contain"
                    alt="Profile"
                  />
                </div>
                <div data-sv="pulse-dot" className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border border-zinc-900" />
              </div>
              <div data-sv="identity" className="flex flex-col justify-center space-y-1">
                <h1 className="text-lg font-bold text-zinc-100">Hello, {formatName(profile?.name)}!</h1>
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="px-1.5 py-0.5 bg-zinc-800/50 border border-zinc-700/30 rounded-sm text-zinc-300 font-medium">
                    {profile?.rollNo || profile?.prn}
                  </span>
                  <span className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded-sm text-blue-400 font-medium">
                    {getDepartmentName(profile?.department)}
                  </span>
                  <span className="px-1.5 py-0.5 bg-zinc-800/50 border border-zinc-700/30 rounded-sm text-zinc-400 font-medium">
                    {formatSemester(profile?.semester)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom: Stats and CTA */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
              <div data-sv="stats-block" className="flex items-center gap-6">
                <div className="text-left">
                  <div className="flex items-baseline gap-1 mb-0.5">
                    <span className="text-lg font-bold text-emerald-400">{stats.overall}</span>
                    <span className="text-[10px] text-zinc-500 font-bold">%</span>
                  </div>
                  <span className="text-[8px] uppercase tracking-wider text-zinc-600 font-bold">Attendance</span>
                </div>
                <div className="text-left">
                  <div className="flex items-baseline gap-1 mb-0.5">
                    <span className={cn("text-lg font-bold", stats.riskCount > 0 ? "text-orange-400" : "text-zinc-300")}>
                      {stats.riskCount}
                    </span>
                  </div>
                  <span className="text-[8px] uppercase tracking-wider text-zinc-600 font-bold">Risks</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/attendance')}
                data-sv="cta-btn"
                className="inline-flex items-center justify-center rounded-sm text-xs font-bold bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400 px-3 py-1.5 gap-1.5 shadow-md shadow-blue-500/20 w-auto"
              >
                <span>Attendance</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

        {/* Milestones Mini-View */}
        <div data-sv="top-card" className="md:col-span-2 bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-md flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-500/5 rounded-lg">
                <Clock className="w-4 h-4 text-blue-400/80" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 leading-none">Milestones</h3>
                <p className="text-[9px] text-zinc-600 mt-0.5 uppercase tracking-wider font-bold">Timeline</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-[9px] font-bold uppercase tracking-wider text-blue-400/70 hover:text-blue-400 px-2.5 py-1 border border-blue-400/10 rounded-sm transition-colors bg-blue-400/5"
            >
              {showAddForm ? 'Cancel' : 'Add'}
            </button>
          </div>

          <div className="flex-1 relative">
            {showAddForm ? (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200 bg-zinc-900/40 border border-zinc-800/40 p-3 rounded-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-600 uppercase ml-1">Date</label>
                    <input
                      type="date"
                      value={newMilestone.date}
                      onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-sm text-[11px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-600 uppercase ml-1">Event</label>
                    <input
                      type="text"
                      placeholder="Title"
                      value={newMilestone.title}
                      onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-sm text-[11px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <textarea
                    placeholder="Details..."
                    value={newMilestone.description}
                    onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 bg-zinc-800/50 border border-zinc-700/50 rounded-lg text-[11px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-all"
                    rows={1}
                  />
                  <button
                    onClick={() => {
                      if (newMilestone.title.trim()) {
                        setTimeline([{ ...newMilestone, id: Date.now() }, ...timeline]);
                        setNewMilestone({ title: '', description: '', date: new Date().toISOString().split('T')[0] });
                        setShowAddForm(false);
                      }
                    }}
                    className="px-4 py-1.5 bg-blue-600/90 text-white text-[9px] font-bold rounded-sm hover:bg-blue-600 transition-all"
                  >
                    SAVE
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {timeline.length > 0 ? timeline.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex-shrink-0 bg-zinc-900/30 border border-zinc-800/40 p-3 rounded-sm min-w-[180px] max-w-[220px] hover:bg-zinc-800/50 transition-all group relative overflow-hidden">
                    <div className="relative">
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-zinc-800/80 text-zinc-500 border border-zinc-700/30 uppercase tracking-tight">
                          {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <button
                          onClick={() => {
                            const updated = timeline.filter((_, index) => index !== i);
                            setTimeline(updated);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-orange-400/80 transition-all p-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <h4 className="text-[13px] font-medium text-zinc-300 group-hover:text-white transition-colors truncate">{item.title}</h4>
                      <p className="text-[9px] text-zinc-600 line-clamp-1 mt-0.5">{item.description}</p>
                    </div>
                  </div>
                )) : (
                  <div className="flex flex-col items-center justify-center w-full py-4 opacity-20 border border-dashed border-zinc-800 rounded-sm">
                    <Clock className="w-5 h-5 mb-1.5 text-zinc-600" />
                    <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Empty</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Broadcasts Mini */}
        <div data-sv="top-card" className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-md flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-1.5 bg-orange-500/5 rounded-sm">
              <Zap className="w-4 h-4 text-orange-400/80" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 leading-none">Broadcasts</h3>
              <p className="text-[9px] text-zinc-600 mt-0.5 uppercase tracking-wider font-bold">Latest</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {announcements.length > 0 ? (
              <div className="group relative p-3.5 rounded-sm border border-zinc-800/40 bg-zinc-900/40 hover:bg-zinc-800/50 transition-all">
                <div className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-orange-500/10 text-orange-500/70 border border-orange-500/10 uppercase tracking-tight">
                      Notice
                    </span>
                    <span className="text-[9px] font-medium text-zinc-600">{new Date(announcements[0].createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-[13px] font-medium text-zinc-300 group-hover:text-white transition-colors line-clamp-1">{announcements[0].title}</h4>
                  <p className="text-[9px] text-zinc-600 line-clamp-1 mt-0.5 mb-2.5">{announcements[0].description}</p>
                  <button
                    onClick={() => navigate('/announcements')}
                    className="w-full py-1.5 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/40 rounded-sm text-[9px] font-bold text-zinc-400 hover:text-white transition-all flex items-center justify-center gap-1"
                  >
                    VIEW ARCHIVE <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 opacity-20 border border-dashed border-zinc-800 rounded-md">
                <Zap className="w-5 h-5 mb-1.5 text-zinc-600" />
                <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">None</span>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Bento Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left Column: Analytics & Subject Registry */}
        <div className="lg:col-span-2 space-y-6">

          {/* Intellectual Assets - Premium Redesign */}
          <div data-sv="bento-card" className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-blue-500/5 rounded-sm">
                  <FileText className="w-4 h-4 text-blue-400/80" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200 leading-none">Intellectual Assets</h3>
                  <p className="text-[9px] text-zinc-600 mt-0.5 uppercase tracking-wider font-bold">Repository</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/notes')}
                className="text-[9px] font-bold text-zinc-500 hover:text-blue-400 transition-colors flex items-center gap-1 uppercase tracking-wider"
              >
                OPEN <ChevronRight className="w-2.5 h-2.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {notes?.slice(0, 3).map((note, i) => (
                <div
                  key={i}
                  onClick={() => navigate('/notes')}
                  className="group relative flex flex-col p-3.5 rounded-sm border border-zinc-800/40 bg-zinc-900/40 hover:bg-zinc-800/60 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="relative flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-zinc-800/80 text-zinc-500 border border-zinc-700/30 uppercase tracking-tight">
                        {note.courseCode}
                      </span>
                      <ArrowUpRight className="w-3 h-3 text-zinc-700 group-hover:text-blue-400 transition-all" />
                    </div>
                    <h5 className="text-[13px] font-medium text-zinc-300 group-hover:text-white transition-colors line-clamp-1 mb-3">
                      {note.title}
                    </h5>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-tighter">Verified Asset</span>
                      <div className="w-5 h-5 rounded-full bg-zinc-800/50 border border-zinc-700/30 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-blue-500/50" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {(!notes || notes.length === 0) && (
                <div className="col-span-full py-6 border border-dashed border-zinc-800 rounded-sm flex flex-col items-center justify-center opacity-20">
                  <FileText className="w-6 h-6 mb-1.5 text-zinc-600" />
                  <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Empty</span>
                </div>
              )}
            </div>
          </div>

          {/* Heatmap Section */}
          <div data-sv="bento-card" data-sv-extra="heatmap" className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-emerald-500/5 rounded-sm">
                  <Calendar className="w-4 h-4 text-emerald-400/80" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200 leading-none">Attendance Activity</h3>
                  <p className="text-[9px] text-zinc-600 mt-0.5 uppercase tracking-wider font-bold">Daily Engagement</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 overflow-x-auto pb-1 scrollbar-hide">
                <div className="flex gap-1.5 min-w-max p-0.5">
                  {heatmapGrid.map((week, wi) => (
                    <div key={wi} data-sv="heatmap" className="flex flex-col gap-1.5">
                      {week.map((cell) => (
                        <div
                          data-sv="heat-cell"
                          key={cell.key}
                          onMouseEnter={() => setHoveredDay(cell)}
                          onMouseLeave={() => setHoveredDay(null)}
                          className={cn(
                            "w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-md border transition-all duration-300 hover:scale-110 cursor-crosshair",
                            getHeatColor(cell.entry, cell.isFuture),
                            hoveredDay?.key === cell.key ? "ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-900 scale-110" : ""
                          )}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar Detail Panel */}
              <div className="w-full md:w-56 bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-3 flex flex-col justify-start min-h-[160px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
                  <Calendar className="w-16 h-16 text-emerald-400" />
                </div>
                {hoveredDay ? (
                  <div className="animate-in fade-in zoom-in-95 duration-200 h-full flex flex-col">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 border-b border-zinc-800/50 pb-1 flex justify-between items-center">
                      <span>{(() => {
                        const [day, month, year] = hoveredDay.key.split('-');
                        const date = new Date(`${year}-${month}-${day}`);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      })()}</span>
                      <span className="text-[8px] text-zinc-700">#{hoveredDay.key.split('-')[0]}</span>
                    </p>

                    {hoveredDay.entry ? (
                      <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar max-h-[140px]">
                        <div className="space-y-1.5">
                          {hoveredDay.entry.lectures?.map((lecture, i) => (
                            <div key={i} className="flex items-center gap-2 group/item">
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                lecture.status === 'Present' ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" : "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]"
                              )} />
                              <span className={cn(
                                "text-[10px] truncate transition-colors",
                                lecture.status === 'Present' ? "text-zinc-200" : "text-zinc-400 line-through decoration-rose-500/30"
                              )}>
                                {lecture.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-tight">System Offline</p>
                        <p className="text-[8px] text-zinc-700 leading-tight mt-1">No logs for this cycle.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Pulse Monitor</p>
                    <p className="text-[8px] text-zinc-700 mt-1 italic">Scan timeline to audit sessions</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: CIE & Assets */}
        <div className="lg:col-span-1 space-y-6">

          {/* CIE Scores Card */}
          <div data-sv="bento-card" data-sv-extra="cie-card" className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-md">
            <div data-sv="cie-card" className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-rose-500/5 rounded-lg">
                  <BookOpen className="w-4 h-4 text-rose-400/80" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200 leading-none">CIE Scores</h3>
                  <p className="text-[9px] text-zinc-600 mt-0.5 uppercase tracking-wider font-bold">Academic Status</p>
                </div>
              </div>
            </div>

            <div className="space-y-3.5">
              {subjectRegistry.length > 0 ? (
                <>
                  {subjectRegistry.slice(0, 3).map((sub, i) => {
                    const cie = parseFloat(sub.cie) || 0;
                    const maxCie = 50;
                    const percentage = Math.min((cie / maxCie) * 100, 100);
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] uppercase tracking-wide font-bold">
                          <span className="text-zinc-500 truncate max-w-[130px]">{sub.name}</span>
                          <span className="text-zinc-300 font-mono">{cie || '-'}/50</span>
                        </div>
                        <div className="h-1.5 bg-zinc-800/50 border border-zinc-700/30 rounded-full overflow-hidden">
                          <div
                            data-sv="cie-bar"
                            className={cn(
                              "h-full rounded-full transition-all duration-1000",
                              cie >= 40 ? "bg-emerald-500/80" :
                                cie >= 30 ? "bg-blue-500/80" :
                                  cie > 0 ? "bg-orange-500/80" : "bg-zinc-700"
                            )}
                            style={{ width: `${cie > 0 ? percentage : 0}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {subjectRegistry.length > 3 && (
                    <button
                      onClick={() => setCiePopupOpen(true)}
                      className="w-full mt-1.5 py-1.5 bg-zinc-800/40 hover:bg-zinc-700/60 border border-zinc-700/40 rounded-lg text-[9px] font-bold text-zinc-500 hover:text-white transition-all flex items-center justify-center gap-1"
                    >
                      ALL SUBJECTS <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 opacity-20 border border-dashed border-zinc-800 rounded-md">
                  <BookOpen className="w-5 h-5 mb-1.5 text-zinc-600" />
                  <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">No Data</span>
                </div>
              )}
            </div>
          </div>



        </div>

      </div>

      {/* CIE Popup Modal */}
      {ciePopupOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => setCiePopupOpen(false)}
        >
          <div className="fixed inset-0 bg-black/80" />

          <div
            className="relative w-full max-w-5xl max-h-[85vh] bg-zinc-900/30 border border-zinc-800/50 rounded-xl backdrop-blur-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-rose-500/5 rounded-lg">
                  <BookOpen className="w-4 h-4 text-rose-400/80" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200 leading-none">CIE Performance</h3>
                  <p className="text-[9px] text-zinc-600 mt-0.5 uppercase tracking-wider font-bold">All Subjects</p>
                </div>
              </div>
              <button
                onClick={() => setCiePopupOpen(false)}
                className="p-2 rounded-md hover:bg-zinc-800/50 transition-colors text-zinc-400 hover:text-zinc-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 p-4 border-b border-zinc-800/50">
              {(() => {
                const subjectsWithCie = subjectRegistry.filter(sub => sub.cie && parseFloat(sub.cie) > 0);
                const avgCie = subjectsWithCie.length > 0
                  ? Math.round(subjectsWithCie.reduce((acc, sub) => acc + parseFloat(sub.cie), 0) / subjectsWithCie.length)
                  : 0;
                const highScorers = subjectsWithCie.filter(sub => parseFloat(sub.cie) >= 40).length;
                return [
                  { value: subjectsWithCie.length, label: 'Subjects' },
                  { value: avgCie, label: 'Average' },
                  { value: highScorers, label: 'Excellence (≥40)' }
                ].map((stat, i) => (
                  <div key={i} className="text-center p-3 bg-zinc-900/30 rounded-xl border border-zinc-800/50 backdrop-blur-md">
                    <p className="text-xl font-semibold text-zinc-200">{stat.value}</p>
                    <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold">{stat.label}</p>
                  </div>
                ));
              })()}
            </div>

            {/* Chart */}
            <div className="p-5 overflow-x-auto">
              <div className="flex items-end justify-center gap-4 min-h-[200px] py-4 p-4 bg-zinc-900/30 rounded-xl border border-zinc-800/50 backdrop-blur-md">
                {subjectRegistry
                  .filter(sub => sub.cie && parseFloat(sub.cie) > 0)
                  .map((sub, i) => {
                    const cie = parseFloat(sub.cie);
                    const maxCie = 50;
                    const height = Math.min((cie / maxCie) * 100, 100);
                    const isHigh = cie >= 40;
                    const isGood = cie >= 30;
                    const isLab = sub.code?.toUpperCase().endsWith('P') || sub.name?.toLowerCase().includes('lab');
                    return (
                      <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0" style={{ width: '60px' }}>
                        <span className={cn(
                          "text-xs font-medium",
                          isHigh ? "text-emerald-400" : isGood ? "text-blue-400" : "text-orange-400"
                        )}>
                          {cie}
                        </span>

                        <div className="relative bg-zinc-900/30 rounded-t-xl border border-zinc-800/50 overflow-hidden" style={{ height: '160px', width: '32px' }}>
                          <div
                            className={cn(
                              "absolute bottom-0 w-full rounded-t-xl transition-all duration-500",
                              isHigh ? "bg-emerald-500/80" : isGood ? "bg-blue-500/80" : "bg-orange-500/80"
                            )}
                            style={{ height: `${Math.max(height * 1.4, 4)}px` }}
                          />
                        </div>

                        <div className="text-center flex flex-col items-center mt-1">
                          <p className="text-[10px] font-bold text-zinc-300 truncate max-w-[60px] leading-tight" title={sub.code}>{sub.code}</p>
                          <p className={cn(
                            "text-[9px] truncate max-w-[60px]",
                            isLab ? "text-indigo-400 font-medium" : "text-zinc-600"
                          )} title={sub.name}>
                            {sub.name}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-zinc-800/50 bg-zinc-900/30 backdrop-blur-md">
              <div className="flex items-center gap-4 text-[9px] text-zinc-600 uppercase tracking-wider font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-emerald-500/80" />
                  ≥40
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-blue-500/80" />
                  ≥30
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-orange-500/80" />
                  &lt;30
                </span>
              </div>
              <button
                onClick={() => setCiePopupOpen(false)}
                className="px-5 py-1.5 bg-zinc-800 text-zinc-300 text-[9px] font-bold rounded-xl hover:bg-zinc-700 hover:text-zinc-100 transition-all uppercase tracking-widest"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeDashboard;

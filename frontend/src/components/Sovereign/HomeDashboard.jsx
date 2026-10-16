import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import SharedAttendanceHeatmap from './SharedAttendanceHeatmap';
import HackathonsFeed from './HackathonsFeed';

const API_BASE = 'http://localhost:8081/api';

const getDepartmentName = (deptCode) => {
  if (!deptCode) return "";
  const code = deptCode.toUpperCase();
  if (code.includes('UAD')) return 'AI & Data Science';
  if (code.includes('UAM')) return 'CSE (AI & ML)';
  if (code.includes('UCS')) return 'Computer Science & Engineering';
  if (code.includes('UME')) return 'Mechanical Engineering';
  if (code.includes('UET')) return 'Electronics & Telecom';
  if (code.includes('UCE')) return 'Civil Engineering';
  if (code.includes('UEE')) return 'Electrical Engineering';
  return deptCode;
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

const getInitials = (fullName) => {
  if (!fullName) return "ST";
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[1][0] + parts[0][0]).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
};

const getSubjectIcon = (name = '') => {
  const lower = name.toLowerCase();
  if (lower.includes('data') || lower.includes('dbms')) return 'database';
  if (lower.includes('machine') || lower.includes('ai') || lower.includes('intelligence')) return 'psychology';
  if (lower.includes('network') || lower.includes('security')) return 'shield';
  if (lower.includes('entrepreneur') || lower.includes('manage')) return 'lightbulb';
  if (lower.includes('web') || lower.includes('software')) return 'code';
  return 'menu_book';
};

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
  return { grid, dayMap };
}

const HomeDashboard = () => {
  const { profile, subjects, notes, loading, refreshData } = useOutletContext();
  const [announcements, setAnnouncements] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [ciePopupOpen, setCiePopupOpen] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [hoveredDay, setHoveredDay] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const [loginPrn, setLoginPrn] = useState('');
  const [loginDob, setLoginDob] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStage, setSyncStage] = useState('');
  const [syncStep, setSyncStep] = useState(1);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginPrn || !loginDob) {
      toast.error('Please enter both PRN and DOB');
      return;
    }

    setSyncing(true);
    setSyncProgress(15);
    setSyncStage('Authenticating with Continuo Portal...');
    setSyncStep(1);

    const timer1 = setTimeout(() => {
      setSyncProgress(35);
      setSyncStage('Ingesting enrolled subjects & syllabus...');
      setSyncStep(2);
    }, 1200);

    const timer2 = setTimeout(() => {
      setSyncProgress(65);
      setSyncStage('Parsing attendance slots & session logs...');
      setSyncStep(3);
    }, 2800);

    const timer3 = setTimeout(() => {
      setSyncProgress(85);
      setSyncStage('Compiling Continuous Evaluation (CIE) scores...');
      setSyncStep(4);
    }, 4500);

    try {
      await axios.post(`${API_BASE}/profile`, {
        ...profile,
        prn: loginPrn,
        dob: loginDob
      });

      // Perform live portal scrape
      await axios.post(`${API_BASE}/portal/dashboard`, {
        prn: loginPrn,
        dob: loginDob
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setSyncProgress(100);
      setSyncStage('Vault Initialized! Redirecting to Dashboard...');
      setSyncStep(5);

      toast.success('Welcome to EduVault.');
      if (refreshData) {
        await refreshData();
      }
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      console.error('Login error:', err);
      const msg = err.response?.data?.error || 'Failed to login. Check credentials.';
      toast.error(msg);
    } finally {
      setTimeout(() => {
        setSyncing(false);
      }, 500);
    }
  };

  const fetchData = async () => {
    try {
      const [annoRes, timeRes] = await Promise.all([
        axios.get(`${API_BASE}/announcements/recent`),
        axios.get(`${API_BASE}/timeline`)
      ]);
      setAnnouncements(Array.isArray(annoRes.data) ? annoRes.data : []);
      setTimeline(Array.isArray(timeRes.data) ? timeRes.data : []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const { stats, subjectRegistry, totalSessionsRecorded } = useMemo(() => {
    const saved = localStorage.getItem('eduvault_excluded_subjects');
    const excludedIds = saved ? JSON.parse(saved) : [];
    const active = (subjects || []).filter(s => !excludedIds.includes(s.id));

    const getPrecisePct = (s) => {
      const direct = parseFloat(s.attendance);
      if (!isNaN(direct) && direct > 0) return direct;
      const conducted = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);
      const present = s.totalAttended > 0 ? s.totalAttended : (s.detailedAttendance?.filter(r => r.status === 'Present').length || 0);
      if (conducted === 0) return !isNaN(direct) ? direct : 0;
      return parseFloat(((present / conducted) * 100).toFixed(2));
    };

    const hasAttendance = (s) => {
      if (s.totalConducted > 0) return true;
      if (s.detailedAttendance && s.detailedAttendance.length > 0) return true;
      const direct = parseFloat(s.attendance);
      return !isNaN(direct) && direct > 0;
    };

    const getAverage = (subs) => {
      let totalAttended = 0;
      let totalConducted = 0;
      (subs || []).forEach(s => {
        const cond = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);
        const att = s.totalAttended > 0 ? s.totalAttended : (s.detailedAttendance?.filter(r => r.status === 'Present').length || 0);
        totalConducted += cond;
        totalAttended += att;
      });
      if (totalConducted > 0) {
        return ((totalAttended / totalConducted) * 100).toFixed(2);
      }
      const valid = (subs || []).filter(hasAttendance);
      if (valid.length === 0) return "0.00";
      const sum = valid.reduce((acc, s) => acc + getPrecisePct(s), 0);
      return (sum / valid.length).toFixed(2);
    };

    let totalSessions = 0;
    active.forEach(s => {
      const cond = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);
      totalSessions += cond;
    });

    const registry = active.map(sub => {
      const a = sub.totalAttended > 0 ? sub.totalAttended : (sub.detailedAttendance?.filter(r => r.status === 'Present').length || parseInt(sub.attended) || 0);
      const h = sub.totalConducted > 0 ? sub.totalConducted : (sub.detailedAttendance?.length || parseInt(sub.held) || 0);
      const target = 0.75;
      const currentPct = h > 0 ? a / h : 0;
      let Skips = 0;
      let mustAttend = 0;
      if (currentPct >= target) {
        Skips = Math.floor(a / target - h);
      } else {
        mustAttend = Math.ceil((target * h - a) / (1 - target));
      }
      return {
        ...sub,
        preciseAttendance: getPrecisePct(sub),
        Skips,
        mustAttend,
        isAtRisk: currentPct < target
      };
    });

    return {
      stats: {
        overall: getAverage(active),
        totalDocs: notes?.length || 0,
        riskCount: active.filter(s => hasAttendance(s) && getPrecisePct(s) < 75).length
      },
      subjectRegistry: registry,
      totalSessionsRecorded: totalSessions
    };
  }, [subjects, notes]);

  const { grid: heatmapGrid } = useMemo(() => buildHeatmapData(subjects), [subjects]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/notes?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleAddMilestone = async () => {
    if (!newMilestone.title.trim()) return;
    const item = { ...newMilestone, id: Date.now() };
    const updated = [item, ...timeline];
    setTimeline(updated);
    setNewMilestone({ title: '', description: '', date: new Date().toISOString().split('T')[0] });
    setShowAddForm(false);
    try {
      await axios.post(`${API_BASE}/timeline`, item);
    } catch (e) {
      console.warn("Failed saving milestone to server:", e);
    }
  };

  const handleDeleteMilestone = async (index, id) => {
    const updated = timeline.filter((_, idx) => idx !== index);
    setTimeline(updated);
    if (id) {
      try {
        await axios.delete(`${API_BASE}/timeline/${id}`);
      } catch (e) {
        console.warn("Failed deleting milestone on server:", e);
      }
    }
  };

  const displayCurriculumCards = useMemo(() => {
    if (subjects && subjects.length > 0) {
      return subjects.slice(0, 4).map(s => ({
        id: s.id,
        title: s.name,
        icon: getSubjectIcon(s.name),
        verified: true
      }));
    }
    return [];
  }, [subjects]);

  const displayCieList = useMemo(() => {
    if (subjectRegistry && subjectRegistry.length > 0) {
      const sorted = [...subjectRegistry].sort((a, b) => {
        const aCie = parseFloat(a.cie) || 0;
        const bCie = parseFloat(b.cie) || 0;
        if (aCie > 0 && bCie === 0) return -1;
        if (bCie > 0 && aCie === 0) return 1;
        return bCie - aCie;
      });
      return sorted.slice(0, 3);
    }
    return [];
  }, [subjectRegistry]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[75vh] gap-4 bg-canvas-bg text-text-primary">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-text-secondary tracking-wide">Synchronizing Interface...</span>
      </div>
    );
  }

  if (!profile || !profile.prn || !profile.dob) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 bg-canvas-bg text-text-primary">
        <div className="w-full max-w-md bg-surface-card border border-border-subtle rounded-2xl p-6">
          <div className="flex flex-col items-center text-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-xl bg-surface-subtle-blue flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-[24px] text-primary">shield</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">EduVault Integration</h2>
            <p className="text-xs text-text-secondary max-w-xs leading-normal">
              Enter your college PRN and Date of Birth to synchronize your student portal and initialize your dashboard.
            </p>
          </div>

          {syncing ? (
            <div className="space-y-4 py-2 animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  <span>{syncStage}</span>
                </span>
                <span className="text-primary font-mono font-bold text-sm">{syncProgress}%</span>
              </div>

              {/* Progress Track */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-border-subtle p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>

              {/* Step Checklist */}
              <div className="space-y-2.5 pt-3 border-t border-border-subtle/70 text-xs">
                {[
                  { step: 1, label: 'Portal Authentication' },
                  { step: 2, label: 'Curriculum & Subjects Ingestion' },
                  { step: 3, label: 'Attendance Slots & Session Matrix' },
                  { step: 4, label: 'Continuous Internal Evaluation (CIE)' }
                ].map((item) => (
                  <div key={item.step} className="flex items-center gap-2.5">
                    {syncStep > item.step ? (
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                    ) : syncStep === item.step ? (
                      <span className="material-symbols-outlined text-[16px] text-blue-600 animate-spin">sync</span>
                    ) : (
                      <span className="material-symbols-outlined text-[16px] text-slate-300">radio_button_unchecked</span>
                    )}
                    <span className={syncStep === item.step ? 'font-bold text-primary' : (syncStep > item.step ? 'text-text-primary' : 'text-text-secondary')}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary ml-0.5">College PRN</label>
                <input
                  type="text"
                  placeholder="e.g. 24UAD022"
                  value={loginPrn}
                  onChange={(e) => setLoginPrn(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  disabled={syncing}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary ml-0.5">Date of Birth</label>
                <input
                  type="text"
                  placeholder="DD-MM-YYYY (e.g. 22-11-2006)"
                  value={loginDob}
                  onChange={(e) => setLoginDob(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  disabled={syncing}
                  required
                />
                <span className="text-[10px] text-text-secondary block">Format: DD-MM-YYYY (Day-Month-Year)</span>
              </div>

              <button
                type="submit"
                disabled={syncing}
                className="w-full mt-2 inline-flex items-center justify-center rounded-xl text-sm font-bold bg-primary hover:bg-primary-hover text-white py-2.5 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <span>Initialize &amp; Sync</span>
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const latestAnnouncement = announcements[0];

  return (
    <div className="flex flex-col min-h-screen bg-canvas-bg text-text-primary">
      {/* Top Header */}
      <header className="sticky top-0 z-40 h-16 bg-surface-card/95 backdrop-blur-md px-6 lg:px-8 flex items-center justify-between border-b border-border-subtle shrink-0">
        <div className="flex items-center gap-4 flex-1 max-w-lg">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary text-[20px]">search</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full h-9 pl-10 pr-4 rounded-xl bg-slate-50 border border-border-subtle text-text-primary placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="Search courses, roadmaps, notices..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-subtle-blue text-primary text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">school</span>For Students
          </span>
          <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-success-bg text-status-success-text text-xs font-semibold">
            <span className="material-symbols-outlined text-[15px]">task_alt</span>Attendance {stats.overall}%
          </span>
          <button
            onClick={() => navigate('/announcements')}
            className="relative w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-white"></span>
          </button>
          <div className="flex items-center gap-3 pl-2 border-l border-border-subtle">
            {profile?.image ? (
              <img
                src={profile.image}
                alt={formatName(profile?.name)}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover shadow-sm ring-1 ring-border-subtle"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  if (e.currentTarget.nextElementSibling) {
                    e.currentTarget.nextElementSibling.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <div className={`w-9 h-9 rounded-full bg-primary text-white items-center justify-center font-semibold text-sm shadow-sm ${profile?.image ? 'hidden' : 'flex'}`}>
              {getInitials(profile?.name)}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-text-primary leading-tight">{formatName(profile?.name)}</span>
              <span className="text-[11px] text-text-secondary leading-tight mt-0.5">
                {[profile?.rollNo || profile?.prn, getDepartmentName(profile?.department), profile?.semester ? `Sem ${profile.semester}` : null].filter(Boolean).join(' • ')}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative py-6 px-4 sm:px-8 pb-10 flex-1">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Student Profile & Hero Area */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-card via-surface-card to-blue-50/40 p-6 border border-border-subtle">
            <div className="absolute top-0 right-0 w-80 h-full bg-radial from-primary/5 via-transparent to-transparent pointer-events-none" />

            <div className="relative flex flex-wrap lg:flex-nowrap items-center justify-between gap-6">
              <div className="flex items-center gap-4.5 min-w-0">
                <div className="relative flex-shrink-0 group">
                  <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary to-blue-400 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-300" />
                  {profile?.image ? (
                    <img
                      src={profile.image}
                      alt={formatName(profile?.name)}
                      referrerPolicy="no-referrer"
                      className="relative w-14 h-14 rounded-xl object-cover ring-2 ring-white"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                          e.currentTarget.nextElementSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div className={`relative w-14 h-14 rounded-xl bg-gradient-to-tr from-primary to-blue-600 text-white items-center justify-center font-bold text-lg ring-2 ring-white ${profile?.image ? 'hidden' : 'flex'}`}>
                    {getInitials(profile?.name)}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" title="Online & Synced" />
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight leading-tight truncate">
                      Welcome, {formatName(profile?.name)}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/80">
                      <span className="material-symbols-outlined text-[13px] fill-1">verified</span>Verified Student
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] text-text-secondary flex-wrap">
                    {(profile?.rollNo || profile?.prn) && (
                      <span className="inline-flex items-center gap-1 font-mono font-medium text-slate-700 bg-slate-100/80 px-2 py-0.5 rounded-full border border-slate-200/60 text-[10px]">
                        <span className="material-symbols-outlined text-[11px] text-text-secondary">badge</span>
                        {profile?.rollNo || profile?.prn}
                      </span>
                    )}
                    {getDepartmentName(profile?.department) && (
                      <span className="inline-flex items-center gap-1 font-medium text-text-secondary bg-slate-100/70 px-2 py-0.5 rounded-full border border-slate-200/40 text-[10px]">
                        <span className="material-symbols-outlined text-[11px]">school</span>
                        {getDepartmentName(profile?.department)}
                      </span>
                    )}
                    {(profile?.semester || profile?.section) && (
                      <span className="inline-flex items-center gap-1 font-medium text-text-secondary bg-slate-100/70 px-2 py-0.5 rounded-full border border-slate-200/40 text-[10px]">
                        <span className="material-symbols-outlined text-[11px]">calendar_today</span>
                        {[profile?.semester ? `Sem ${profile.semester}` : null, profile?.section ? `Sec ${profile.section}` : null].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap ml-auto lg:ml-0">
                <div
                  onClick={() => navigate('/attendance')}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white border border-border-subtle hover:border-primary/40 transition-colors duration-200 cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-md bg-blue-50 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[16px]">fact_check</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 leading-none">
                      <span className="text-sm font-bold text-text-primary tracking-tight">{stats.overall}%</span>
                      <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 leading-none">
                        {stats.overall >= 75 ? 'Optimal' : 'Review'}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-text-secondary mt-0.5 whitespace-nowrap">Overall Attendance</span>
                  </div>
                </div>

                <div
                  onClick={() => navigate('/attendance')}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white border border-border-subtle hover:border-red-300 transition-colors duration-200 cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-md bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 leading-none">
                      <span className="text-sm font-bold text-red-600 tracking-tight">{stats.riskCount}</span>
                      <span className="text-[9px] font-semibold px-1 py-0.2 rounded bg-red-50 text-red-600 border border-red-200/60 leading-none">Below 75%</span>
                    </div>
                    <span className="text-[10px] font-medium text-text-secondary mt-0.5 whitespace-nowrap">Attendance Alerts</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Core Dashboard Layout (Minimal & Compact) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Core Academics & Tracking (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Section 1: Brabble.ai Hackathons Feed */}
              <HackathonsFeed />

              {/* Section 2: Attendance Activity Heatmap */}
              <section className="bg-surface-card rounded-xl p-4 sm:p-4.5 border border-border-subtle" id="attendance-radar">
                <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary border border-blue-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[17px]">calendar_month</span>
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-text-primary leading-tight">Attendance Activity</h2>
                      <span className="text-[11px] font-medium text-text-secondary">Semester {profile?.semester || 5} Records</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {totalSessionsRecorded} Sessions
                  </span>
                </div>

                <div className="mt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-text-primary">Attendance Matrix</span>
                    <div className="flex items-center gap-2.5 text-[10px] text-text-secondary">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-[2px] bg-[#30a14e]"></span>
                        <span className="font-medium">Present</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-[2px] bg-[#f85149]"></span>
                        <span className="font-medium">Absent</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-[2px] bg-slate-100 border border-border-subtle"></span>
                        <span className="font-medium">Holiday</span>
                      </div>
                    </div>
                  </div>

                  <SharedAttendanceHeatmap subjects={subjects} weeksCount={18} />
                </div>
              </section>

              {/* Section 3: Milestones & Events */}
              <section className="bg-surface-card rounded-xl p-4 sm:p-4.5 border border-border-subtle">
                <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary border border-blue-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[17px]">flag</span>
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-text-primary leading-tight">Milestones &amp; Events</h2>
                      <span className="text-[11px] font-medium text-text-secondary">Academic Schedule</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">{showAddForm ? 'close' : 'add'}</span>
                    <span>{showAddForm ? 'Cancel' : 'Add Event'}</span>
                  </button>
                </div>

                {showAddForm ? (
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-border-subtle space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold text-text-secondary uppercase">Date</label>
                        <input
                          type="date"
                          value={newMilestone.date}
                          onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                          className="w-full mt-0.5 px-2.5 py-1.5 bg-surface-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-text-secondary uppercase">Event Title</label>
                        <input
                          type="text"
                          placeholder="e.g. CIE 1 Exam or Submission"
                          value={newMilestone.title}
                          onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                          className="w-full mt-0.5 px-2.5 py-1.5 bg-surface-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Details or notes..."
                        value={newMilestone.description}
                        onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                        className="flex-1 px-2.5 py-1.5 bg-surface-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-primary"
                      />
                      <button
                        onClick={handleAddMilestone}
                        className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition-colors border border-primary cursor-pointer"
                      >
                        SAVE
                      </button>
                    </div>
                  </div>
                ) : timeline.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {timeline.map((item, i) => {
                      const itemDate = new Date(item.date);
                      const month = itemDate.toLocaleDateString('en-US', { month: 'short' });
                      const day = itemDate.getDate();

                      return (
                        <div key={item.id || i} className="w-full flex items-center justify-between p-2.5 bg-white border border-border-subtle hover:border-slate-300 rounded-lg group transition-all">
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold uppercase text-primary leading-tight">{month}</span>
                              <span className="text-xs font-extrabold text-text-primary leading-none">{day}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-text-primary truncate">{item.title}</p>
                              {item.description ? (
                                <p className="text-[11px] text-text-secondary truncate mt-0.5">{item.description}</p>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 mt-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Scheduled
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteMilestone(i, item.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-status-danger-text transition-opacity p-1 rounded hover:bg-slate-50 cursor-pointer"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3 p-5 rounded-lg bg-slate-50 border border-border-subtle flex flex-col items-center justify-center text-center">
                    <span className="material-symbols-outlined text-[22px] text-text-secondary/70 mb-1.5">event_upcoming</span>
                    <p className="text-xs font-bold text-text-primary">No Milestones Scheduled</p>
                    <p className="text-[11px] text-text-secondary mt-0.5 max-w-xs">Track key academic deadlines, lab submissions, and tests.</p>
                  </div>
                )}
              </section>
            </div>

            {/* Right Column: Broadcasts & CIE Scores (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Section 4: Broadcasts */}
              <section className="bg-surface-card rounded-xl p-4 sm:p-4.5 border border-border-subtle">
                <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[17px]">campaign</span>
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-text-primary leading-tight">Broadcasts</h2>
                      <span className="text-[11px] font-medium text-text-secondary">Latest Notices</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                </div>

                {/* Single Row Compact Notice Banner */}
                {latestAnnouncement ? (
                  <div className="mt-2.5 p-2 px-3 rounded-lg bg-white hover:bg-slate-50 border border-border-subtle transition-all flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Priority Circle: Red / Green / Yellow */}
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          latestAnnouncement.colorTag === 'red'
                            ? 'bg-rose-500 ring-2 ring-rose-200'
                            : latestAnnouncement.colorTag === 'green'
                            ? 'bg-emerald-500 ring-2 ring-emerald-200'
                            : latestAnnouncement.colorTag === 'yellow' || latestAnnouncement.colorTag === 'amber'
                            ? 'bg-amber-500 ring-2 ring-amber-200'
                            : 'bg-blue-500 ring-2 ring-blue-200'
                        }`}
                        title={latestAnnouncement.colorTag || 'Notice'}
                      />
                      <h3 className="text-xs font-semibold text-text-primary truncate">
                        {latestAnnouncement.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => navigate('/announcements')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-primary hover:text-white hover:bg-primary bg-blue-50 border border-blue-200/80 transition-all cursor-pointer shrink-0"
                    >
                      <span>View</span>
                      <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-2.5 py-2 px-3 rounded-lg bg-slate-50 border border-border-subtle text-center text-xs text-text-secondary">
                    No active broadcasts or notices.
                  </div>
                )}
              </section>

              {/* Section 5: CIE Scores */}
              <section className="bg-surface-card rounded-xl p-4 sm:p-4.5 border border-border-subtle">
                <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary border border-blue-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[17px]">analytics</span>
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-text-primary leading-tight">CIE Scores</h2>
                      <span className="text-[11px] font-medium text-text-secondary">Semester {profile?.semester || 5} Internal Assessment</span>
                    </div>
                  </div>
                </div>

                {/* Compact Subject Scores List */}
                <div className="mt-3 space-y-2">
                  {displayCieList.length > 0 ? (
                    displayCieList.map((sub, i) => {
                      const cie = parseFloat(sub.cie) || 0;
                      const maxCie = 50;
                      const pct = Math.min(Math.round((cie / maxCie) * 100), 100);
                      const barColor = i === 0 ? "bg-primary" : i === 1 ? "bg-teal-600" : "bg-badge-purple-text";
                      const tagColor = cie >= 40 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : cie >= 30 ? "text-primary bg-blue-50 border-blue-200" : "text-amber-700 bg-amber-50 border-amber-200";
                      const statusLabel = cie >= 40 ? "Optimal" : cie >= 30 ? "Passing" : "Review";

                      return (
                        <div key={sub.id || i} className="p-2.5 rounded-lg bg-white border border-border-subtle hover:border-slate-300 transition-all">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-text-primary tracking-tight truncate max-w-[180px]">
                              {sub.name}
                            </span>
                            <span className="text-xs font-extrabold text-text-primary">
                              {cie > 0 ? `${cie}` : '-'} <span className="text-[10px] font-semibold text-text-secondary">/ 50</span>
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", barColor)}
                              style={{ width: cie > 0 ? `${pct}%` : '0%' }}
                            />
                          </div>
                          <div className="flex justify-between items-center mt-1.5 text-[10px]">
                            <span className="font-medium text-text-secondary">{cie > 0 ? `${pct}% Score` : 'Pending evaluation'}</span>
                            {cie > 0 && (
                              <span className={cn("px-1.5 py-0.2 rounded text-[9px] font-bold border", tagColor)}>
                                {statusLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-5 text-center text-xs text-text-secondary bg-slate-50 border border-border-subtle rounded-lg">
                      No CIE evaluations registered.
                    </div>
                  )}
                </div>

                {/* All Subjects CTA */}
                <div className="mt-2.5 pt-0.5">
                  <button
                    onClick={() => setCiePopupOpen(true)}
                    className="w-full py-1.5 px-3 rounded-full bg-white hover:bg-slate-50 text-text-primary border border-border-subtle hover:border-border-hover text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>View All Subject Scores</span>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* CIE Popup Modal */}
      {ciePopupOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setCiePopupOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[85vh] bg-surface-card border border-border-subtle rounded-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-badge-purple-bg text-badge-purple-text flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">analytics</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary leading-tight">CIE Performance Analysis</h3>
                  <p className="text-[11px] text-text-secondary font-medium">All Semester Subjects Evaluation</p>
                </div>
              </div>
              <button
                onClick={() => setCiePopupOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Stats */}
            <div className="grid grid-cols-3 gap-3 p-5 border-b border-border-subtle bg-slate-50/50">
              {(() => {
                const subjectsWithCie = subjectRegistry.filter(sub => sub.cie && parseFloat(sub.cie) > 0);
                const avgCie = subjectsWithCie.length > 0
                  ? Math.round(subjectsWithCie.reduce((acc, sub) => acc + parseFloat(sub.cie), 0) / subjectsWithCie.length)
                  : 0;
                const highScorers = subjectsWithCie.filter(sub => parseFloat(sub.cie) >= 40).length;
                return [
                  { value: subjectRegistry.length, label: 'Enrolled Subjects' },
                  { value: avgCie > 0 ? `${avgCie} / 50` : 'Pending', label: 'Average Score' },
                  { value: highScorers, label: 'Excellence (≥40)' }
                ].map((stat, i) => (
                  <div key={i} className="text-center p-3 bg-surface-card rounded-xl border border-border-subtle">
                    <p className="text-xl font-bold text-text-primary">{stat.value}</p>
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold mt-0.5">{stat.label}</p>
                  </div>
                ));
              })()}
            </div>

            {/* Modal Chart */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="w-full overflow-x-auto pb-2">
                <div className="flex items-end justify-between gap-1.5 sm:gap-2.5 min-w-[620px] md:min-w-full min-h-[230px] p-4 sm:p-6 bg-slate-50 rounded-xl border border-border-subtle">
                  {subjectRegistry.length > 0 ? (
                    subjectRegistry.map((sub, i) => {
                      const cie = parseFloat(sub.cie) || 0;
                      const maxCie = 50;
                      const heightPct = Math.min((cie / maxCie) * 100, 100);
                      const isHigh = cie >= 40;
                      const isGood = cie >= 30;
                      return (
                        <div key={sub.id || i} className="flex-1 min-w-[48px] max-w-[72px] flex flex-col items-center gap-2">
                          <span className={cn(
                            "text-xs font-bold",
                            cie === 0 ? "text-slate-400" :
                              isHigh ? "text-status-success-text" : isGood ? "text-primary" : "text-amber-600 font-extrabold"
                          )}>
                            {cie > 0 ? cie : '-'}
                          </span>

                          <div className="relative bg-slate-200/90 rounded-t-lg overflow-hidden flex flex-col justify-end border border-slate-300/80 w-full max-w-[32px] sm:max-w-[36px]" style={{ height: '140px' }}>
                            <div
                              className={cn(
                                "w-full rounded-t-lg transition-all duration-500",
                                cie === 0 ? "bg-slate-300" :
                                  isHigh ? "bg-status-success-text" : isGood ? "bg-primary" : "bg-amber-600"
                              )}
                              style={{ height: cie > 0 ? `${Math.max(heightPct, 10)}%` : '6px' }}
                            />
                          </div>

                          <div className="text-center flex flex-col items-center mt-1 w-full">
                            <p className="text-[10px] font-bold text-text-primary truncate w-full text-center" title={sub.code || sub.name}>
                              {sub.code || sub.name.slice(0, 8)}
                            </p>
                            <p className="text-[9px] text-text-secondary truncate w-full text-center" title={sub.name}>
                              {sub.name}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-text-secondary font-medium">No CIE performance records loaded yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border-subtle bg-slate-50/80">
              <div className="flex items-center gap-4 text-[10px] text-text-secondary uppercase tracking-wider font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-status-success-text" />
                  ≥40 Optimal
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-primary" />
                  ≥30 Satisfactory
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm bg-amber-600" />
                  &lt;30 Review
                </span>
              </div>
              <button
                onClick={() => setCiePopupOpen(false)}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition-colors border border-primary cursor-pointer"
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

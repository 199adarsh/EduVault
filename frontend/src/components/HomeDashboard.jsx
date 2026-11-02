import React, { useEffect, useState } from 'react';
import {
  GraduationCap,
  Calendar,
  Clock,
  FileText,
  Bookmark,
  Activity,
  ArrowUpRight,
  ChevronRight,
  FlaskConical,
  Cpu,
  Bell,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import OptimizationPanel from './OptimizationPanel';

const HomeDashboard = () => {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('http://localhost:8081/api/announcements/recent');
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (err) {
      console.error('Failed to load announcements:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-8">
      {/* 1. Profile Summary Card (Apple Information Card) */}
      <section className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs relative overflow-hidden transition-all">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <img
                alt="Alex Sovereign"
                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border border-border shadow-xs"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPfYVtrlbjXFqntMy-ApvgdwAMAUdSEW-l3YbAqKSe8qWRxZ3OVuS5cdmB3JCgVNnSk3uSQRFSf__Xt5yk5nNmWBzFUXqESifl9a8506_c_udauFHdvbhk6wBPMXvM3bqTLxNLY3QNkKimknseO1bnz6t9EEODa0J_wrZ4Aj_YPlS3zCkKu4G-WxtQWsDvVobMSSSY7PvLpZ8XXaTFhZhpcCzttDHQf1DG_SvY4B4nyFmi5k0kkEyo9tGVQwKcxnH6Fi5BUcM8xw"
              />
              <span className="absolute -bottom-1.5 -right-1.5 bg-primary text-primary-foreground text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-xs">
                LVL 42
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">Alex Sovereign</h1>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                  Active
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground font-mono tracking-normal mt-1">
                PRN: 2024098234 • COMPUTER SCIENCE B.TECH
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-border/60">
            {/* Metric 1 */}
            <div className="flex flex-col min-w-[120px]">
              <span className="text-xs font-medium text-muted-foreground">Attendance</span>
              <span className="text-2xl font-semibold text-foreground tabular-nums tracking-tight mt-0.5">88.4%</span>
              <div className="w-full bg-muted rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: '88.4%' }}
                />
              </div>
            </div>

            {/* Metric 2 */}
            <div className="flex flex-col min-w-[120px]">
              <span className="text-xs font-medium text-muted-foreground">Exam Countdown</span>
              <span className="text-2xl font-semibold text-foreground tabular-nums tracking-tight mt-0.5">14 Days</span>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">S6 Mid-Term Phase II</p>
            </div>

            {/* Metric 3 */}
            <div className="flex flex-col min-w-[120px] col-span-2 sm:col-span-1">
              <span className="text-xs font-medium text-muted-foreground">Contributions</span>
              <span className="text-2xl font-semibold text-foreground tabular-nums tracking-tight mt-0.5">248</span>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">Notes & Solutions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Left Column & Right Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 2. Exam Timeline */}
          <section className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold tracking-tight text-foreground">Exam Timeline</h2>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                View Hall Ticket
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto no-scrollbar -mx-2 px-2 pb-1">
              <div className="flex gap-3.5 min-w-[620px]">
                {[
                  { time: 'In 2 Days', subject: 'Data Structures', date: 'Oct 24 • 09:30 AM', active: true },
                  { time: 'In 5 Days', subject: 'Microprocessors', date: 'Oct 27 • 09:30 AM', active: false },
                  { time: 'In 9 Days', subject: 'Operating Systems', date: 'Oct 30 • 09:30 AM', active: false },
                  { time: 'In 14 Days', subject: 'Discrete Maths', date: 'Nov 02 • 09:30 AM', active: false }
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`flex-1 p-4 rounded-xl border transition-all ${
                      item.active
                        ? 'bg-surface-muted/80 border-primary/30 shadow-xs'
                        : 'bg-surface border-border/60 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span
                        className={`text-[11px] font-semibold tracking-wide uppercase ${
                          item.active ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {item.time}
                      </span>
                      {item.active && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-foreground truncate">{item.subject}</h3>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 shrink-0" />
                      {item.date}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 3. Recent Notes */}
          <section className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold tracking-tight text-foreground">Recent Notes</h2>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Browse Library
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: 'Advanced CPU Scheduling Algorithms',
                  tag: 'UNIT 4: SCHEDULING',
                  author: 'Dr. Sarah Jenkins',
                  date: '24 Oct 2024'
                },
                {
                  title: 'Virtual Memory & Paging Mechanics',
                  tag: 'UNIT 2: MEMORY',
                  author: 'Kevin Zhang',
                  date: '24 Oct 2024'
                }
              ].map((note, i) => (
                <div
                  key={i}
                  className="bg-surface rounded-xl border border-border/70 p-4 hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2.5">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                        {note.tag}
                      </span>
                      <Bookmark className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                    </div>
                    <h3 className="text-sm font-medium text-foreground line-clamp-1 mb-1">{note.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      Detailed exploration of key core technical concepts and analytical implementations.
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">{note.author}</span>
                    <span className="tabular-nums">{note.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Attendance Heatmap Activity */}
          <section className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold tracking-tight text-foreground">Attendance Activity</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Less</span>
                <div className="flex gap-1 items-center">
                  {[0.12, 0.35, 0.65, 1].map((op, i) => (
                    <div
                      key={i}
                      className="w-2.5 h-2.5 rounded-[3px] bg-primary"
                      style={{ opacity: op }}
                    />
                  ))}
                </div>
                <span>More</span>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar pt-2">
              <div className="flex flex-col gap-1.5 min-w-[500px]">
                {['Mon', 'Wed', 'Fri'].map((day, dayIndex) => (
                  <div key={day} className="flex items-center gap-2">
                    <span className="w-7 text-[11px] font-medium text-muted-foreground">{day}</span>
                    <div className="flex gap-1.5 flex-1">
                      {Array.from({ length: 22 }).map((_, i) => {
                        const seed = (dayIndex * 22 + i) % 5;
                        const opacity = seed === 0 ? 0.08 : seed === 1 ? 0.3 : seed === 2 ? 0.6 : 0.95;
                        return (
                          <div
                            key={i}
                            className="h-3.5 flex-1 rounded-[3px] bg-primary transition-opacity hover:opacity-100 cursor-default"
                            style={{ opacity }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 5. Optimization Panel */}
          <OptimizationPanel />
        </div>

        {/* Right Column (Sidebar, 1 Col) */}
        <div className="space-y-6">
          {/* Announcements Panel */}
          <section className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold tracking-tight text-foreground">Announcements</h2>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                {announcements.length} New
              </span>
            </div>

            <div className="space-y-3">
              {announcements.length > 0 ? (
                announcements.map((ann, i) => {
                  const isRed = ann.color === 'red';
                  const isYellow = ann.color === 'yellow';
                  return (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl border border-border/70 bg-surface hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                            isRed
                              ? 'bg-destructive/10 text-destructive border-destructive/20'
                              : isYellow
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              : 'bg-primary/10 text-primary border-primary/20'
                          }`}
                        >
                          {ann.tag || 'GENERAL'}
                        </span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {ann.createdAt || 'Today'}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-foreground mb-1">{ann.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {ann.content}
                      </p>
                      <div className="mt-2.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex justify-between">
                        <span>{ann.postedBy || 'Campus Admin'}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 px-4 text-center rounded-xl border border-dashed border-border/80 bg-surface-muted/50">
                  <Bell className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground font-medium">No recent announcements</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">You are all caught up for today.</p>
                </div>
              )}
            </div>

            <button
              type="button"
              className="w-full mt-4 py-2 px-3 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
            >
              View All Notifications
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </section>

          {/* Laboratory Records Card */}
          <section className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold tracking-tight text-foreground">Laboratory Records</h2>
              </div>
              <span className="text-xs text-muted-foreground font-mono">TERM 2</span>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  title: 'OS Lab Record',
                  Icon: FlaskConical,
                  status: 'PENDING',
                  variant: 'warning'
                },
                {
                  title: 'MP Lab Code',
                  Icon: Cpu,
                  status: 'SUBMITTED',
                  variant: 'success'
                }
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-surface hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-muted border border-border flex items-center justify-center text-foreground">
                      <item.Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-foreground block">{item.title}</span>
                      <span className="text-[11px] text-muted-foreground">Experiment 0{i + 4}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                      item.variant === 'success'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HomeDashboard;

import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import DeadlinesPopover from './DeadlinesPopover';
import { FluidTabs } from '../fluid-tabs';
import {
    Megaphone01Icon,
    Search01Icon,
    Add01Icon,
    Calendar03Icon,
    Clock01Icon,
    Bookmark02Icon,
    BookmarkCheck01Icon,
    CheckmarkCircle02Icon,
    Cancel01Icon,
    Edit02Icon,
    Delete02Icon,
    File01Icon,
    SentIcon,
    InformationCircleIcon,
    ArrowRight01Icon,
    Tick02Icon,
    CheckmarkBadge01Icon
} from 'hugeicons-react';
import { cn } from '../../lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const FILTER_TABS = [
    { id: 'all', label: 'All Bulletins' },
    { id: 'exam', label: 'Exams & Schedules' },
    { id: 'official', label: 'Official Notices' },
    { id: 'bookmarked', label: 'Saved' }
];

const Announcements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [acknowledgedIds, setAcknowledgedIds] = useState(() => {
        try {
            const saved = localStorage.getItem('eduvault_ack_announcements');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [bookmarkedIds, setBookmarkedIds] = useState(() => {
        try {
            const saved = localStorage.getItem('eduvault_bookmarked_announcements');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [showCreate, setShowCreate] = useState(false);
    const [editingAnn, setEditingAnn] = useState(null);
    const [showCalendarPopup, setShowCalendarPopup] = useState(false);
    const [calendarAnchor, setCalendarAnchor] = useState('top');
    const topCalendarRef = useRef(null);
    const cardCalendarRef = useRef(null);
    const [userRole] = useState(() => localStorage.getItem('eduvault_user_role') || 'student');
    const [newAnn, setNewAnn] = useState({
        title: '',
        description: '',
        colorTag: 'blue',
        type: 'Official Notice',
        deadline: ''
    });

    const isManager = userRole === 'teacher' || userRole === 'faculty' || userRole === 'admin';

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/announcements`, { 
                headers: { 'X-User-Role': userRole },
                timeout: 4000 
            });
            setAnnouncements(Array.isArray(res.data) ? res.data : []);
        } catch {
            setAnnouncements([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAcknowledge = (id) => {
        setAcknowledgedIds(prev => {
            const next = prev.includes(id) ? prev : [...prev, id];
            localStorage.setItem('eduvault_ack_announcements', JSON.stringify(next));
            return next;
        });
        toast.success("Notice acknowledged");
    };

    const toggleBookmark = (id) => {
        setBookmarkedIds(prev => {
            const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
            localStorage.setItem('eduvault_bookmarked_announcements', JSON.stringify(next));
            return next;
        });
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...newAnn,
                tag: newAnn.type,
                color: newAnn.colorTag,
                postedBy: 'Faculty / Department',
                deadline: newAnn.deadline || null,
                createdAt: new Date().toISOString()
            };
            await axios.post(`${API_BASE}/announcements`, payload, {
                headers: { 'X-User-Role': userRole }
            });
            toast.success("Notice published successfully");
            setShowCreate(false);
            setNewAnn({ title: '', description: '', colorTag: 'blue', type: 'Official Notice', deadline: '' });
            fetchAnnouncements();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to publish notice");
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editingAnn?.id) return;
        try {
            const payload = {
                ...editingAnn,
                tag: editingAnn.type || editingAnn.tag,
                color: editingAnn.colorTag || editingAnn.color,
                deadline: editingAnn.deadline || null
            };
            await axios.put(`${API_BASE}/announcements/${editingAnn.id}`, payload, {
                headers: { 'X-User-Role': userRole }
            });
            toast.success("Notice updated successfully");
            setEditingAnn(null);
            fetchAnnouncements();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update notice");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this notice?")) return;
        try {
            await axios.delete(`${API_BASE}/announcements/${id}`, {
                headers: { 'X-User-Role': userRole }
            });
            toast.success("Notice deleted");
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to delete notice");
        }
    };

    const filteredAnnouncements = useMemo(() => {
        return announcements.filter(item => {
            const query = searchQuery.trim().toLowerCase();
            const tagStr = (item.tag || item.type || '').toLowerCase();
            const matchesSearch = !query || 
                (item.title || '').toLowerCase().includes(query) ||
                (item.description || '').toLowerCase().includes(query) ||
                (item.postedBy || item.author || '').toLowerCase().includes(query);
            if (!matchesSearch) return false;

            if (activeFilter === 'exam') {
                return tagStr.includes('exam') || (item.title || '').toLowerCase().includes('exam') || Boolean(item.deadline);
            }
            if (activeFilter === 'official') {
                return tagStr.includes('official') || (item.postedBy || '').toLowerCase().includes('admin');
            }
            if (activeFilter === 'bookmarked') {
                return bookmarkedIds.includes(item.id);
            }
            return true;
        });
    }, [announcements, searchQuery, activeFilter, bookmarkedIds]);

    const availableDeadlines = useMemo(() => {
        return (announcements || [])
            .filter(a => a && (a.deadline || a.dueDate || a.meta?.deadline))
            .map(a => ({
                ...a,
                deadline: a.deadline || a.dueDate || a.meta?.deadline
            }))
            .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    }, [announcements]);

    const acknowledgedCount = useMemo(() => {
        return announcements.filter(a => acknowledgedIds.includes(a.id)).length;
    }, [announcements, acknowledgedIds]);

    return (
        <main className="w-full px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12 max-w-[1360px] mx-auto min-w-0 font-sans text-[#383838]">
            {/* Page Header (Open, airy, unboxed) */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E2E2]">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#0073E6] uppercase tracking-wider">
                            Campus Noticeboard
                        </span>
                        <span className="text-[#E2E2E2]">•</span>
                        <span className="text-[11px] font-semibold text-[#727272]">
                            {announcements.length} Published Bulletins
                        </span>
                    </div>
                    <div className="flex items-center gap-2.5 mt-1">
                        <h1 className="text-xl sm:text-2xl font-bold text-[#383838] tracking-tight">
                            Announcements &amp; Circulars
                        </h1>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DEEDFC] text-[#0073E6] border border-[#D9ECFF]">
                            AI &amp; DS Dept
                        </span>
                    </div>
                    <p className="text-xs text-[#727272] mt-0.5">
                        Authenticated academic circulars, exam schedules, and department notices
                    </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <div className="relative" ref={topCalendarRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setCalendarAnchor('top');
                                setShowCalendarPopup(prev => (calendarAnchor === 'top' ? !prev : true));
                            }}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                                showCalendarPopup && calendarAnchor === 'top'
                                    ? 'bg-[#D9ECFF] border-[#0073E6] text-[#0073E6]'
                                    : 'bg-white border-[#E2E2E2] hover:bg-[#DEEDFC]/40 text-[#383838]'
                            }`}
                            title="View Deadlines Calendar"
                        >
                            <Calendar03Icon size={14} className="text-[#0073E6]" />
                            <span>Deadlines</span>
                            {availableDeadlines.length > 0 && (
                                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#E11D48] text-white text-[10px] font-bold">
                                    {availableDeadlines.length}
                                </span>
                            )}
                        </button>

                        {showCalendarPopup && calendarAnchor === 'top' && (
                            <DeadlinesPopover
                                isOpen={showCalendarPopup && calendarAnchor === 'top'}
                                deadlines={availableDeadlines}
                                onClose={() => setShowCalendarPopup(false)}
                                anchorRef={topCalendarRef}
                            />
                        )}
                    </div>

                    {isManager && (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#0073E6] hover:bg-[#174073] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                            <Add01Icon size={14} />
                            <span>Publish Notice</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 my-5">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-0 max-w-md">
                    <Search01Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#727272] shrink-0" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search circulars by keyword, exam, or title..."
                        className="w-full h-9 pl-9 pr-3 rounded-full bg-white border border-[#E2E2E2] text-xs text-[#383838] placeholder:text-[#727272] focus:border-[#0073E6] focus:outline-none shadow-2xs transition-colors"
                    />
                </div>

                {/* Animated Fluid Tabs Filter */}
                <div className="shrink-0 overflow-x-auto no-scrollbar">
                    <FluidTabs
                        value={activeFilter}
                        onChange={setActiveFilter}
                        size="xs"
                        layoutId="announcements-filter-tabs"
                        indicatorClassName="absolute inset-0 rounded-full bg-[#0073E6] shadow-2xs"
                        activeClassName="font-bold text-white"
                        inactiveClassName="font-semibold text-[#727272] hover:text-[#383838]"
                        className="bg-white p-1 rounded-full border border-[#E2E2E2] shadow-2xs"
                        tabs={FILTER_TABS}
                    />
                </div>
            </div>

            {/* Main Grid: Feed + Right Utility Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column: Notices Feed (8 Cols) */}
                <div className="lg:col-span-8 space-y-4 min-w-0">
                    {loading ? (
                        <div className="space-y-3.5">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-xl p-5 border border-[#E2E2E2] shadow-[0_1px_3px_rgba(0,0,0,0.02)] animate-pulse space-y-3">
                                    <div className="h-4 bg-[#DEEDFC]/40 rounded w-1/4" />
                                    <div className="h-5 bg-slate-100 rounded w-2/3" />
                                    <div className="h-14 bg-slate-50 rounded" />
                                </div>
                            ))}
                        </div>
                    ) : filteredAnnouncements.length === 0 ? (
                        <div className="bg-white rounded-xl p-12 border border-[#E2E2E2] shadow-[0_1px_3px_rgba(0,0,0,0.02)] text-center text-[#727272]">
                            <Megaphone01Icon size={32} className="mx-auto mb-2 text-[#D9ECFF]" />
                            <p className="text-xs font-semibold text-[#383838]">No circulars match your query</p>
                            <p className="text-[11px] text-[#727272] mt-0.5">Try searching with a different keyword or reset the filter.</p>
                        </div>
                    ) : (
                        filteredAnnouncements.map((ann, idx) => {
                            const isAck = acknowledgedIds.includes(ann.id);
                            const isBookmarked = bookmarkedIds.includes(ann.id);
                            const dateFormatted = new Date(ann.createdAt).toLocaleDateString(undefined, {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            });
                            const tagLabel = ann.tag || ann.type || 'Notice';
                            const isUrgent = ann.color === 'red' || ann.colorTag === 'red' || tagLabel.toLowerCase().includes('exam') || (ann.title || '').toLowerCase().includes('exam');
                            const isOfficial = !isUrgent && (tagLabel.toLowerCase().includes('official') || (ann.postedBy || '').toLowerCase().includes('admin'));

                            return (
                                <article
                                    key={ann.id || idx}
                                    className={cn(
                                        "bg-white rounded-xl p-5 sm:p-6 border border-[#E2E2E2] hover:border-[#4A9AF0] transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)] group flex flex-col justify-between",
                                        isUrgent && "border-l-4 border-l-[#E11D48] bg-white",
                                        isOfficial && "border-l-4 border-l-[#0073E6]"
                                    )}
                                >
                                    <div>
                                        {/* Top Meta Line */}
                                        <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#F0F0F0]">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={cn(
                                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                                    isUrgent
                                                        ? "bg-rose-50 text-[#E11D48] border border-rose-200"
                                                        : isOfficial
                                                        ? "bg-[#DEEDFC] text-[#0073E6] border border-[#D9ECFF]"
                                                        : "bg-slate-100 text-[#174073] border border-slate-200"
                                                )}>
                                                    {tagLabel}
                                                </span>

                                                <span className="inline-flex items-center gap-1 text-[11px] font-normal text-[#727272]">
                                                    <Calendar03Icon size={12} className="text-[#727272]" />
                                                    {dateFormatted}
                                                </span>

                                                {ann.deadline && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-[#E11D48] border border-rose-200">
                                                        <Clock01Icon size={12} className="text-[#E11D48]" />
                                                        Due: {new Date(ann.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                {isManager && (
                                                    <>
                                                        <button
                                                            onClick={() => setEditingAnn({ ...ann })}
                                                            className="p-1 rounded-md text-[#727272] hover:text-[#0073E6] hover:bg-[#DEEDFC]/40 transition-colors cursor-pointer"
                                                            title="Edit Notice"
                                                        >
                                                            <Edit02Icon size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(ann.id)}
                                                            className="p-1 rounded-md text-[#727272] hover:text-[#E11D48] hover:bg-rose-50 transition-colors cursor-pointer"
                                                            title="Delete Notice"
                                                        >
                                                            <Delete02Icon size={14} />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => toggleBookmark(ann.id)}
                                                    className={cn(
                                                        "p-1.5 rounded-full transition-colors cursor-pointer",
                                                        isBookmarked
                                                            ? "text-[#0073E6] bg-[#DEEDFC]"
                                                            : "text-[#727272] hover:text-[#0073E6] hover:bg-[#DEEDFC]/40"
                                                    )}
                                                    title={isBookmarked ? 'Saved to bookmarks' : 'Save notice'}
                                                >
                                                    {isBookmarked ? (
                                                        <BookmarkCheck01Icon size={15} />
                                                    ) : (
                                                        <Bookmark02Icon size={15} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Notice Headline */}
                                        <h2 className="text-base sm:text-[17px] font-bold text-[#383838] leading-snug group-hover:text-[#0073E6] transition-colors mt-3">
                                            {ann.title}
                                        </h2>

                                        {/* Notice Text Body */}
                                        <p className="text-xs sm:text-[13px] text-[#4A4A4A] font-normal mt-2 leading-relaxed whitespace-pre-line">
                                            {ann.description}
                                        </p>
                                    </div>

                                    {/* Card Footer: Source Authority + Acknowledge Button */}
                                    <div className="pt-3.5 mt-4 border-t border-[#F0F0F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-7 h-7 rounded-full bg-[#DEEDFC] text-[#0073E6] flex items-center justify-center font-bold text-xs shrink-0">
                                                {(ann.postedBy || ann.author || 'A').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-[#727272] truncate">
                                                <span className="font-semibold text-[#383838] truncate">{ann.postedBy || ann.author || 'Academic Administration'}</span>
                                                <span className="text-[#E2E2E2]">•</span>
                                                <span className="text-[11px] truncate">{ann.authorRole || 'Department Notice Desk'}</span>
                                            </div>
                                        </div>

                                        {isAck ? (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-semibold shrink-0 self-start sm:self-auto">
                                                <Tick02Icon size={13} className="text-emerald-600" />
                                                <span>Acknowledged</span>
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleAcknowledge(ann.id)}
                                                className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#DEEDFC] text-[#0073E6] hover:bg-[#0073E6] hover:text-white border border-[#D9ECFF] text-xs font-semibold transition-all cursor-pointer shrink-0 self-start sm:self-auto shadow-2xs"
                                            >
                                                <CheckmarkCircle02Icon size={14} />
                                                <span>Acknowledge Notice</span>
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>

                {/* Right Column: Deadlines & Department Portal Guide (4 Cols) */}
                <div className="lg:col-span-4 space-y-4">
                    {/* Section 1: Upcoming Academic Deadlines */}
                    <section className="bg-white rounded-xl p-5 border border-[#E2E2E2] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center justify-between pb-3 border-b border-[#E2E2E2] gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-rose-50 text-[#E11D48] flex items-center justify-center shrink-0">
                                    <Clock01Icon size={15} />
                                </div>
                                <h3 className="text-xs font-bold text-[#383838] uppercase tracking-wider">
                                    Upcoming Deadlines
                                </h3>
                            </div>
                            <div className="relative" ref={cardCalendarRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCalendarAnchor('card');
                                        setShowCalendarPopup(prev => (calendarAnchor === 'card' ? !prev : true));
                                    }}
                                    className="text-xs font-semibold text-[#0073E6] hover:underline cursor-pointer"
                                >
                                    Calendar
                                </button>

                                {showCalendarPopup && calendarAnchor === 'card' && (
                                    <DeadlinesPopover
                                        isOpen={showCalendarPopup && calendarAnchor === 'card'}
                                        deadlines={availableDeadlines}
                                        onClose={() => setShowCalendarPopup(false)}
                                        anchorRef={cardCalendarRef}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="space-y-2.5 mt-3.5">
                            {availableDeadlines.slice(0, 5).map((ann, i) => {
                                const deadlineDate = new Date(ann.deadline);
                                const month = !isNaN(deadlineDate.getTime())
                                    ? deadlineDate.toLocaleDateString(undefined, { month: 'short' })
                                    : 'Due';
                                const day = !isNaN(deadlineDate.getTime())
                                    ? deadlineDate.getDate()
                                    : '--';
                                const diffDays = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                                return (
                                    <div
                                        key={ann.id || i}
                                        className="flex items-center justify-between gap-3 p-2.5 bg-white hover:bg-[#DEEDFC]/30 border border-[#E2E2E2] hover:border-[#4A9AF0] rounded-xl transition-all shadow-2xs group"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-white border border-rose-200 text-[#E11D48] flex flex-col items-center justify-center shrink-0">
                                                <span className="text-[7px] font-bold uppercase tracking-wider leading-none text-[#E11D48]">{month}</span>
                                                <span className="text-xs font-extrabold leading-none mt-0.5 text-[#E11D48]">{day}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs font-semibold text-[#383838] truncate group-hover:text-[#0073E6] transition-colors">
                                                    {ann.title}
                                                </h4>
                                                <p className="text-[10px] text-[#727272] truncate">
                                                    {deadlineDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        {diffDays >= 0 ? (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#DEEDFC] text-[#0073E6] border border-[#D9ECFF] shrink-0">
                                                {diffDays === 0 ? 'Today' : `${diffDays}d left`}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-[#727272] shrink-0">
                                                Closed
                                            </span>
                                        )}
                                    </div>
                                );
                            })}

                            {availableDeadlines.length === 0 && (
                                <div className="py-6 text-center text-xs text-[#727272] bg-[#F8F9FA] rounded-xl border border-dashed border-[#E2E2E2]">
                                    No deadlines recorded for this semester.
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Section 2: Department Desk Summary */}
                    <section className="bg-white rounded-xl p-5 border border-[#E2E2E2] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center gap-2 pb-3 border-b border-[#E2E2E2]">
                            <div className="w-7 h-7 rounded-lg bg-[#D9ECFF] text-[#0073E6] flex items-center justify-center shrink-0">
                                <CheckmarkBadge01Icon size={16} />
                            </div>
                            <h3 className="text-xs font-bold text-[#383838] uppercase tracking-wider">
                                Compliance &amp; Verification
                            </h3>
                        </div>
                        <div className="mt-3 text-xs text-[#555555] space-y-2.5 leading-relaxed">
                            <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8F9FA] border border-[#EAEAEA]">
                                <span className="text-[#727272]">Total Bulletins</span>
                                <span className="font-bold text-[#383838] tabular-nums">{announcements.length}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8F9FA] border border-[#EAEAEA]">
                                <span className="text-[#727272]">Acknowledged by You</span>
                                <span className="font-bold text-emerald-700 tabular-nums">{acknowledgedCount}</span>
                            </div>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-[#F8F9FA] border border-[#EAEAEA]">
                                <span className="text-[#727272]">Pending Action</span>
                                <span className="font-bold text-[#0073E6] tabular-nums">
                                    {Math.max(0, announcements.length - acknowledgedCount)}
                                </span>
                            </div>
                            <p className="text-[11px] text-[#727272] pt-1">
                                Official notifications are digitally authorized by the Department Academic Committee.
                            </p>
                        </div>
                    </section>
                </div>
            </div>

            {/* Create Announcement Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white border border-[#E2E2E2] rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-[#E2E2E2] flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-bold text-[#383838]">Publish Notice</h3>
                                <p className="text-xs text-[#727272]">Post an academic bulletin for students</p>
                            </div>
                            <button
                                onClick={() => setShowCreate(false)}
                                className="p-1 text-[#727272] hover:text-[#383838] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            >
                                <Cancel01Icon size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-5 space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-[#383838] mb-1">
                                    Notice Title
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={newAnn.title}
                                    onChange={e => setNewAnn({ ...newAnn, title: e.target.value })}
                                    placeholder="e.g. Unit Test II Syllabus & Schedule..."
                                    className="w-full bg-[#F8F9FA] border border-[#E2E2E2] rounded-lg px-3 py-2 text-xs text-[#383838] outline-none focus:border-[#0073E6] focus:bg-white transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-[#383838] mb-1">
                                        Category / Type
                                    </label>
                                    <input
                                        type="text"
                                        value={newAnn.type}
                                        onChange={e => setNewAnn({ ...newAnn, type: e.target.value })}
                                        className="w-full bg-[#F8F9FA] border border-[#E2E2E2] rounded-lg px-3 py-2 text-xs text-[#383838] outline-none focus:border-[#0073E6] focus:bg-white transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-[#383838] mb-1">
                                        Priority Tag
                                    </label>
                                    <select
                                        value={newAnn.colorTag}
                                        onChange={e => setNewAnn({ ...newAnn, colorTag: e.target.value })}
                                        className="w-full bg-[#F8F9FA] border border-[#E2E2E2] rounded-lg px-3 py-2 text-xs text-[#383838] outline-none focus:border-[#0073E6] focus:bg-white transition-colors"
                                    >
                                        <option value="blue">Blue (Official)</option>
                                        <option value="green">Green (Academic)</option>
                                        <option value="yellow">Amber (Warning)</option>
                                        <option value="red">Red (Urgent)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#383838] mb-1">
                                    Deadline / Due Date (Optional)
                                </label>
                                <input
                                    type="date"
                                    value={newAnn.deadline || ''}
                                    onChange={e => setNewAnn({ ...newAnn, deadline: e.target.value })}
                                    className="w-full bg-[#F8F9FA] border border-[#E2E2E2] rounded-lg px-3 py-2 text-xs text-[#383838] outline-none focus:border-[#0073E6] focus:bg-white transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#383838] mb-1">
                                    Bulletin Details
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={newAnn.description}
                                    onChange={e => setNewAnn({ ...newAnn, description: e.target.value })}
                                    placeholder="Enter full announcement body..."
                                    className="w-full bg-[#F8F9FA] border border-[#E2E2E2] rounded-lg p-3 text-xs text-[#383838] resize-none outline-none focus:border-[#0073E6] focus:bg-white transition-colors"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2.5 bg-[#0073E6] hover:bg-[#174073] text-white text-xs font-bold rounded-full shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <SentIcon size={15} />
                                <span>Publish Notice</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Announcement Modal */}
            {editingAnn && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white border border-[#E2E2E2] rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-[#E2E2E2] flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-bold text-[#383838]">Edit Notice</h3>
                                <p className="text-xs text-[#727272]">Update bulletin details and priority</p>
                            </div>
                            <button
                                onClick={() => setEditingAnn(null)}
                                className="p-1 text-[#727272] hover:text-[#383838] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            >
                                <Cancel01Icon size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="p-5 space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-[#383838] mb-1">
                                    Notice Title
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={editingAnn.title || ''}
                                    onChange={e => setEditingAnn({ ...editingAnn, title: e.target.value })}
                                    className="w-full bg-[#F8F9FA] border border-[#E2E2E2] rounded-lg px-3 py-2 text-xs text-[#383838] outline-none focus:border-[#0073E6] focus:bg-white transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-[#383838] mb-1">
                                        Category / Type
                                    </label>
                                    <input
                                        type="text"
                                        value={editingAnn.type || editingAnn.tag || ''}
                                        onChange={e => setEditingAnn({ ...editingAnn, type: e.target.value })}
                                        className="w-full bg-[#F8F9FA] border border-[#E2E2E2] rounded-lg px-3 py-2 text-xs text-[#383838] outline-none focus:border-[#0073E6] focus:bg-white transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-[#383838] mb-1">
                                        Priority Tag
                                    </label>
                                    <select
                                        value={editingAnn.colorTag || editingAnn.color || 'blue'}
                                        onChange={e => setEditingAnn({ ...editingAnn, colorTag: e.target.value, color: e.target.value })}
                                        className="w-full bg-[#F8F9FA] border border-[#E2E2E2] rounded-lg px-3 py-2 text-xs text-[#383838] outline-none focus:border-[#0073E6] focus:bg-white transition-colors"
                                    >
                                        <option value="blue">Blue (Official)</option>
                                        <option value="green">Green (Academic)</option>
                                        <option value="yellow">Amber (Warning)</option>
                                        <option value="red">Red (Urgent)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#383838] mb-1">
                                    Deadline / Due Date (Optional)
                                </label>
                                <input
                                    type="date"
                                    value={editingAnn.deadline || ''}
                                    onChange={e => setEditingAnn({ ...editingAnn, deadline: e.target.value })}
                                    className="w-full bg-[#F8F9FA] border border-[#E2E2E2] rounded-lg px-3 py-2 text-xs text-[#383838] outline-none focus:border-[#0073E6] focus:bg-white transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#383838] mb-1">
                                    Bulletin Details
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={editingAnn.description || ''}
                                    onChange={e => setEditingAnn({ ...editingAnn, description: e.target.value })}
                                    className="w-full bg-[#F8F9FA] border border-[#E2E2E2] rounded-lg p-3 text-xs text-[#383838] resize-none outline-none focus:border-[#0073E6] focus:bg-white transition-colors"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2.5 bg-[#0073E6] hover:bg-[#174073] text-white text-xs font-bold rounded-full shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <SentIcon size={15} />
                                <span>Save Changes</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
};

export default Announcements;

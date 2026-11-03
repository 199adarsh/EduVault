import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import DeadlinesPopover from './DeadlinesPopover';
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
    Location01Icon,
    Time02Icon,
    BookOpen01Icon,
    SentIcon,
    InformationCircleIcon
} from 'hugeicons-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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
        toast.success("Notice marked as acknowledged");
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
            const matchesSearch = !query || 
                (item.title || '').toLowerCase().includes(query) ||
                (item.description || '').toLowerCase().includes(query) ||
                (item.author || '').toLowerCase().includes(query);
            if (!matchesSearch) return false;

            if (activeFilter === 'official') {
                return (item.type || '').toLowerCase().includes('official');
            }
            if (activeFilter === 'academic') {
                return (item.type || '').toLowerCase().includes('academic') || (item.type || '').toLowerCase().includes('schedule');
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

    return (
        <main className="w-full px-4 sm:px-6 lg:px-8 py-5 pb-20 md:pb-10 bg-[#FAFAFA] text-[#383838] min-w-0 max-w-full overflow-x-hidden font-sans">
            <div className="flex flex-col w-full max-w-[1240px] mx-auto space-y-5 min-w-0">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl sm:text-[26px] font-bold text-[#383838] tracking-tight">
                                Announcements
                            </h1>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#DEEDFC] text-[#0073E6] border border-[#D9ECFF]">
                                AI &amp; DS Dept
                            </span>
                        </div>
                        <p className="text-xs sm:text-[13px] text-[#727272]">
                            Official circulars, examination schedules, and academic bulletins
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
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                                    showCalendarPopup && calendarAnchor === 'top'
                                        ? 'bg-[#DEEDFC] border-[#0073E6] text-[#0073E6]'
                                        : 'bg-white border-[#E2E2E2] hover:bg-[#F2F7FC] text-[#383838]'
                                }`}
                                title="Deadlines Calendar"
                            >
                                <Calendar03Icon size={16} className="text-[#0073E6]" />
                                <span>Deadlines</span>
                                {availableDeadlines.length > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-[#0073E6] text-white text-[10px] font-bold">
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
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0073E6] hover:bg-[#0060C0] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            >
                                <Add01Icon size={16} />
                                <span>New Notice</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white border border-[#E2E2E2] rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-0">
                        <Search01Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#727272] shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search bulletins by title, author, or keyword..."
                            className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#F8F9FA] border border-[#E2E2E2] text-xs text-[#383838] placeholder:text-[#727272] focus:outline-none focus:bg-white focus:border-[#0073E6] transition-colors"
                        />
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                        {[
                            { id: 'all', label: 'All Bulletins' },
                            { id: 'official', label: 'Official' },
                            { id: 'academic', label: 'Academic' },
                            { id: 'bookmarked', label: 'Bookmarked' }
                        ].map(chip => {
                            const active = activeFilter === chip.id;
                            return (
                                <button
                                    key={chip.id}
                                    onClick={() => setActiveFilter(chip.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                                        active
                                            ? 'bg-[#DEEDFC] text-[#0073E6] font-semibold border border-[#D9ECFF]'
                                            : 'text-[#727272] hover:text-[#383838] hover:bg-[#F2F7FC]'
                                    }`}
                                >
                                    {chip.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Two-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Left Column: Notices Feed */}
                    <div className="lg:col-span-8 space-y-4">
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-white border border-[#E2E2E2] rounded-xl p-5 shadow-2xs animate-pulse space-y-3">
                                        <div className="h-4 bg-slate-100 rounded w-1/4" />
                                        <div className="h-5 bg-slate-100 rounded w-2/3" />
                                        <div className="h-12 bg-slate-50 rounded" />
                                    </div>
                                ))}
                            </div>
                        ) : filteredAnnouncements.length === 0 ? (
                            <div className="bg-white border border-[#E2E2E2] rounded-xl p-10 text-center text-[#727272] shadow-2xs">
                                <Megaphone01Icon size={28} className="mx-auto mb-2 text-slate-300" />
                                <p className="text-xs font-semibold text-[#383838]">No announcements found</p>
                                <p className="text-[11px] text-[#727272] mt-0.5">Try refining your search keyword or selected filter.</p>
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
                                const isOfficial = (ann.type || '').toLowerCase().includes('official');
                                const isUrgent = ann.colorTag === 'red' || (ann.type || '').toLowerCase().includes('urgent');

                                return (
                                    <article
                                        key={ann.id || idx}
                                        className="bg-white border border-[#E2E2E2] hover:border-[#D9ECFF] rounded-xl p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                                    >
                                        <div>
                                            {/* Top Meta Line */}
                                            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#F0F0F0]">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                                                        isUrgent
                                                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                            : isOfficial
                                                            ? 'bg-[#DEEDFC] text-[#0073E6] border-[#D9ECFF]'
                                                            : 'bg-slate-50 text-slate-700 border-slate-200'
                                                    }`}>
                                                        {ann.type || 'Notice'}
                                                    </span>

                                                    <span className="inline-flex items-center gap-1 text-[11px] text-[#727272]">
                                                        <Calendar03Icon size={13} className="text-[#727272]" />
                                                        {dateFormatted}
                                                    </span>

                                                    {ann.deadline && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                                                            <Clock01Icon size={12} className="text-amber-700" />
                                                            Due: {new Date(ann.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    {isManager && (
                                                        <>
                                                            <button
                                                                onClick={() => setEditingAnn({ ...ann })}
                                                                className="p-1 rounded-md text-[#727272] hover:text-[#0073E6] hover:bg-[#F2F7FC] transition-colors cursor-pointer"
                                                                title="Edit Notice"
                                                            >
                                                                <Edit02Icon size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(ann.id)}
                                                                className="p-1 rounded-md text-[#727272] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                                                title="Delete Notice"
                                                            >
                                                                <Delete02Icon size={15} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => toggleBookmark(ann.id)}
                                                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                                                            isBookmarked
                                                                ? 'text-[#0073E6] bg-[#DEEDFC]'
                                                                : 'text-[#727272] hover:text-[#383838] hover:bg-[#F2F7FC]'
                                                        }`}
                                                        title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Notice'}
                                                    >
                                                        {isBookmarked ? (
                                                            <BookmarkCheck01Icon size={16} />
                                                        ) : (
                                                            <Bookmark02Icon size={16} />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Title */}
                                            <h2 className="text-base font-bold text-[#383838] mt-3 leading-snug">
                                                {ann.title}
                                            </h2>

                                            {/* Description */}
                                            <p className="text-[13px] text-[#555555] mt-1.5 leading-relaxed whitespace-pre-line">
                                                {ann.description}
                                            </p>

                                            {/* Structured Academic Details */}
                                            {ann.meta && (
                                                <div className="mt-3 p-2.5 rounded-lg bg-[#F8F9FA] border border-[#EAEAEA] flex flex-wrap items-center gap-3 text-xs text-[#555555]">
                                                    {ann.meta.duration && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Time02Icon size={14} className="text-[#0073E6]" />
                                                            <span>Duration: <strong className="text-[#383838]">{ann.meta.duration}</strong></span>
                                                        </div>
                                                    )}
                                                    {ann.meta.portion && (
                                                        <div className="flex items-center gap-1.5">
                                                            <BookOpen01Icon size={14} className="text-[#0073E6]" />
                                                            <span>Syllabus: <strong className="text-[#383838]">{ann.meta.portion}</strong></span>
                                                        </div>
                                                    )}
                                                    {ann.meta.hall && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Location01Icon size={14} className="text-[#0073E6]" />
                                                            <span>Venue: <strong className="text-[#383838]">{ann.meta.hall}</strong></span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Attachments */}
                                            {ann.attachments && ann.attachments.length > 0 && (
                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    {ann.attachments.map((att, aIdx) => (
                                                        <span
                                                            key={aIdx}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F8F9FA] border border-[#E2E2E2] text-[#383838] text-xs font-medium hover:bg-[#DEEDFC]/40 transition-colors cursor-pointer"
                                                        >
                                                            <File01Icon size={13} className="text-[#0073E6]" />
                                                            {att.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer Row */}
                                        <div className="pt-3 mt-4 border-t border-[#F0F0F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                            <div className="text-xs text-[#727272]">
                                                <span className="font-semibold text-[#383838]">{ann.author || 'Department Office'}</span>
                                                <span className="mx-1.5 text-slate-300">•</span>
                                                <span>{ann.authorRole || 'Faculty Noticeboard'}</span>
                                            </div>

                                            {isAck ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg self-start sm:self-auto">
                                                    <CheckmarkCircle02Icon size={14} className="text-emerald-600" />
                                                    <span>Acknowledged</span>
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleAcknowledge(ann.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-[#0073E6] bg-[#DEEDFC]/60 hover:bg-[#0073E6] hover:text-white border border-[#D9ECFF] transition-all cursor-pointer self-start sm:self-auto"
                                                >
                                                    <CheckmarkCircle02Icon size={14} />
                                                    <span>Acknowledge</span>
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })
                        )}
                    </div>

                    {/* Right Column: Deadlines & Department Info */}
                    <div className="lg:col-span-4 space-y-4">
                        {/* Upcoming Deadlines Card */}
                        <div className="bg-white border border-[#E2E2E2] rounded-xl p-4 shadow-2xs">
                            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
                                <div className="flex items-center gap-2">
                                    <Clock01Icon size={16} className="text-amber-600" />
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
                                        className="text-[11px] font-semibold text-[#0073E6] hover:underline cursor-pointer"
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

                            <div className="space-y-2.5 mt-3">
                                {availableDeadlines.slice(0, 5).map((ann, i) => {
                                    const deadlineDate = new Date(ann.deadline);
                                    const month = !isNaN(deadlineDate.getTime())
                                        ? deadlineDate.toLocaleDateString(undefined, { month: 'short' })
                                        : 'Due';
                                    const day = !isNaN(deadlineDate.getTime())
                                        ? deadlineDate.getDate()
                                        : '--';
                                    return (
                                        <div
                                            key={ann.id || i}
                                            className="flex items-start gap-2.5 p-2 rounded-lg bg-[#F8F9FA] border border-[#EAEAEA]"
                                        >
                                            <div className="w-9 h-9 rounded-md bg-white border border-amber-200 text-amber-700 flex flex-col items-center justify-center font-bold shrink-0 shadow-2xs">
                                                <span className="text-[8px] uppercase tracking-wider leading-none text-amber-600">{month}</span>
                                                <span className="text-xs font-bold leading-none mt-0.5">{day}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-[#383838] truncate">
                                                    {ann.title}
                                                </p>
                                                <p className="text-[11px] text-[#727272] truncate">
                                                    {deadlineDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}

                                {availableDeadlines.length === 0 && (
                                    <div className="py-6 text-center text-xs text-[#727272]">
                                        No upcoming deadlines scheduled
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Department Circular Guidelines Card */}
                        <div className="bg-white border border-[#E2E2E2] rounded-xl p-4 shadow-2xs">
                            <div className="flex items-center gap-2 pb-2.5 border-b border-[#F0F0F0]">
                                <InformationCircleIcon size={16} className="text-[#0073E6]" />
                                <h3 className="text-xs font-bold text-[#383838] uppercase tracking-wider">
                                    Official Circulars
                                </h3>
                            </div>
                            <div className="mt-3 text-xs text-[#555555] space-y-2 leading-relaxed">
                                <p>
                                    All notices posted here are synchronized with the campus academic registry.
                                </p>
                                <p className="text-[11px] text-[#727272]">
                                    Important notifications marked as <strong className="text-[#0073E6]">Official</strong> require student acknowledgment before end-term examinations.
                                </p>
                            </div>
                        </div>
                    </div>
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
                                className="w-full py-2.5 bg-[#0073E6] hover:bg-[#0060C0] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
                                        value={editingAnn.type || ''}
                                        onChange={e => setEditingAnn({ ...editingAnn, type: e.target.value })}
                                        className="w-full bg-[#F8F9FA] border border-[#E2E2E2] rounded-lg px-3 py-2 text-xs text-[#383838] outline-none focus:border-[#0073E6] focus:bg-white transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-[#383838] mb-1">
                                        Priority Tag
                                    </label>
                                    <select
                                        value={editingAnn.colorTag || 'blue'}
                                        onChange={e => setEditingAnn({ ...editingAnn, colorTag: e.target.value })}
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
                                className="w-full py-2.5 bg-[#0073E6] hover:bg-[#0060C0] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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

import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import DeadlinesPopover from './DeadlinesPopover';
import { FluidTabs } from '../fluid-tabs';
import { DropdownDisclosure } from '../dropdown-disclosure';
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
    { id: 'official', label: 'Official Notices' },
    { id: 'events', label: 'Events update' },
    { id: 'exams', label: 'Exams' },
    { id: 'general', label: 'General / Other' },
    { id: 'bookmarked', label: 'Saved' }
];

const CATEGORY_OPTIONS = [
    'Official Notices',
    'Events update',
    'Exams',
    'General / Other'
];

const PRIORITY_OPTIONS = [
    {
        id: 'blue',
        name: 'Blue (Official)',
        description: 'Standard departmental circular',
        icon: <span className="w-2.5 h-2.5 rounded-full bg-[#0073E6] shrink-0" />
    },
    {
        id: 'green',
        name: 'Green (Academic)',
        description: 'Course & curriculum notice',
        icon: <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
    },
    {
        id: 'yellow',
        name: 'Amber (Warning)',
        description: 'Advisory or deadline alert',
        icon: <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
    },
    {
        id: 'red',
        name: 'Red (Urgent)',
        description: 'High-priority or exam bulletin',
        icon: <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] shrink-0" />
    }
];

const DEFAULT_ANNOUNCEMENTS = [
    {
        id: "bbcee379-d370-44fc-ac9b-d266d60d3bc0",
        title: "End-Semester Examination Timetable",
        description: "The end-semester examination timetable is available. Check the schedule and note your exam dates.",
        tag: "Exam",
        color: "red",
        postedBy: "Academic Administration",
        createdAt: "2026-10-14T15:33:30.604Z",
        isPinned: true
    },
    {
        id: "55160785-d8a7-4e8d-8f50-bea2c2724f57",
        title: "Mandatory Industrial Visit Registration",
        description: "All students must complete the registration form for the upcoming industrial visit by 5:00 PM on Friday. Students who fail to register before the deadline may not be included in the final participant list. Contact your class coordinator for further details.",
        tag: "Student Activity",
        color: "blue",
        postedBy: "Faculty / Department",
        createdAt: "2026-10-16T05:07:54.606Z",
        isPinned: false
    }
];

const getAccountName = () => {
    try {
        const saved = localStorage.getItem('eduvault_profile');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed?.name && parsed.name.trim()) return parsed.name.trim();
        }
    } catch {
        // ignore
    }
    return localStorage.getItem('eduvault_user_name') || 'Faculty Member';
};

const getAuthorInfo = (ann) => {
    const rawName = ann.postedBy || ann.author;
    const name = rawName && rawName.trim() ? rawName.trim() : 'Department Office';
    const cleanInitial = name.replace(/^(?:Prof\.|Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim().charAt(0) || 'A';
    return {
        name,
        initial: cleanInitial.toUpperCase()
    };
};

const Announcements = () => {
    const [announcements, setAnnouncements] = useState(() => {
        try {
            const saved = localStorage.getItem('eduvault_announcements');
            const parsed = saved ? JSON.parse(saved) : null;
            return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ANNOUNCEMENTS;
        } catch {
            return DEFAULT_ANNOUNCEMENTS;
        }
    });
    const [loading, setLoading] = useState(false);
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
    const [createPriorityOpen, setCreatePriorityOpen] = useState(false);
    const [editPriorityOpen, setEditPriorityOpen] = useState(false);
    const [showCalendarPopup, setShowCalendarPopup] = useState(false);
    const [calendarAnchor, setCalendarAnchor] = useState('top');
    const topCalendarRef = useRef(null);
    const cardCalendarRef = useRef(null);
    const [userRole] = useState(() => localStorage.getItem('eduvault_user_role') || 'student');
    const [newAnn, setNewAnn] = useState({
        title: '',
        description: '',
        colorTag: 'blue',
        type: 'Official Notices',
        deadline: ''
    });

    const isManager = userRole === 'teacher' || userRole === 'faculty' || userRole === 'admin';

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const res = await axios.get(`${API_BASE}/announcements`, {
                headers: { 'X-User-Role': userRole }
            });
            const data = Array.isArray(res.data) && res.data.length > 0 ? res.data : DEFAULT_ANNOUNCEMENTS;
            setAnnouncements(data);
            localStorage.setItem('eduvault_announcements', JSON.stringify(data));
        } catch {
            // Keep existing state or fallback
            const cached = localStorage.getItem('eduvault_announcements');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setAnnouncements(parsed);
                    }
                } catch {
                    // ignore
                }
            }
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
                postedBy: getAccountName(),
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

            if (activeFilter === 'official') {
                return tagStr.includes('official') || (item.postedBy || '').toLowerCase().includes('admin');
            }
            if (activeFilter === 'events') {
                return tagStr.includes('event') || tagStr.includes('activity');
            }
            if (activeFilter === 'exams') {
                return tagStr.includes('exam') || (item.title || '').toLowerCase().includes('exam') || Boolean(item.deadline);
            }
            if (activeFilter === 'general') {
                return tagStr.includes('general') || tagStr.includes('other');
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
        <main className="w-full px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12 max-w-[1360px] mx-auto min-w-0 font-sans text-[#1D1D1F]">
            {/* Page Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E5EA]">
                <div>
                    <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-[#0071E3] tracking-wide">
                            Department Notices
                        </span>
                        <span className="text-[#D2D2D7]">•</span>
                        <span className="text-[#8E8E93]">
                            {announcements.length} Bulletins
                        </span>
                    </div>
                    <div className="flex items-center gap-2.5 mt-1">
                        <h1 className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] tracking-tight">
                            Announcements &amp; Circulars
                        </h1>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#0071E3]/10 text-[#0071E3]">
                            AI &amp; DS Dept
                        </span>
                    </div>
                    <p className="text-xs text-[#6E6E73] mt-0.5">
                        Academic circulars, timetables, and department notices
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
                            className={cn(
                                "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
                                showCalendarPopup && calendarAnchor === 'top'
                                    ? "bg-[#0071E3]/10 border-[#0071E3] text-[#0071E3]"
                                    : "bg-white border-[#E5E5EA] hover:bg-[#F5F5F7] text-[#1D1D1F]"
                            )}
                            title="View Deadlines Calendar"
                        >
                            <Calendar03Icon size={14} className="text-[#0071E3]" />
                            <span>Deadlines</span>
                            {availableDeadlines.length > 0 && (
                                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#FF3B30] text-white text-[10px] font-bold">
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
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0071E3] hover:bg-[#005BB5] text-white text-xs font-medium shadow-2xs transition-colors cursor-pointer"
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
                    <Search01Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93] shrink-0" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search circulars by keyword, exam, or title..."
                        className="w-full h-9 pl-9 pr-3 rounded-xl bg-white border border-[#E5E5EA] text-xs text-[#1D1D1F] placeholder:text-[#8E8E93] focus:border-[#0071E3] focus:outline-none transition-colors"
                    />
                </div>

                {/* Fluid Tabs Filter */}
                <div className="shrink-0 overflow-x-auto no-scrollbar">
                    <FluidTabs
                        value={activeFilter}
                        onChange={setActiveFilter}
                        size="xs"
                        layoutId="announcements-filter-tabs"
                        indicatorClassName="absolute inset-0 rounded-full bg-[#0071E3] shadow-2xs"
                        activeClassName="font-medium text-white"
                        inactiveClassName="font-medium text-[#6E6E73] hover:text-[#1D1D1F]"
                        className="bg-white p-1 rounded-full border border-[#E5E5EA] shadow-2xs"
                        tabs={FILTER_TABS}
                    />
                </div>
            </div>

            {/* Main Grid: Feed + Right Utility Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column: Notices Feed (8 Cols) */}
                <div className="lg:col-span-8 space-y-3 min-w-0">

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-2xl p-5 border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04)] animate-pulse space-y-3">
                                    <div className="h-3.5 bg-[#F5F5F7] rounded w-1/4" />
                                    <div className="h-4 bg-[#F5F5F7] rounded w-2/3" />
                                    <div className="h-10 bg-[#F5F5F7] rounded" />
                                </div>
                            ))}
                        </div>
                    ) : filteredAnnouncements.length === 0 ? (
                        <div className="bg-white rounded-2xl p-10 border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-center text-[#8E8E93]">
                            <Megaphone01Icon size={28} className="mx-auto mb-2 text-[#D2D2D7]" />
                            <p className="text-sm font-medium text-[#1D1D1F]">No notices match your filter</p>
                            <p className="text-xs text-[#8E8E93] mt-0.5">Try a different search keyword or category.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-[#EFF3F4] divide-y divide-[#EFF3F4] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                            {filteredAnnouncements.map((ann, idx) => {
                                const isAck = acknowledgedIds.includes(ann.id);
                                const isBookmarked = bookmarkedIds.includes(ann.id);
                                const dateFormatted = new Date(ann.createdAt).toLocaleDateString(undefined, {
                                    day: 'numeric',
                                    month: 'short'
                                });
                                const tagLabel = ann.tag || ann.type || 'Notice';
                                const isUrgent = ann.color === 'red' || ann.colorTag === 'red' || tagLabel.toLowerCase().includes('exam') || (ann.title || '').toLowerCase().includes('exam');
                                const isOfficial = !isUrgent && (tagLabel.toLowerCase().includes('official') || (ann.postedBy || '').toLowerCase().includes('admin'));
                                const isEvent = !isUrgent && !isOfficial && (tagLabel.toLowerCase().includes('event') || tagLabel.toLowerCase().includes('activity'));
                                const author = getAuthorInfo(ann);

                                return (
                                    <article
                                        key={ann.id || idx}
                                        className="p-2.5 sm:p-4 hover:bg-[#F7F9F9] transition-colors duration-150 flex gap-2.5 sm:gap-3 group"
                                    >
                                        {/* Left: Author Avatar */}
                                        <div className="shrink-0 pt-0.5">
                                            <div className="w-7.5 h-7.5 sm:w-9 sm:h-9 rounded-full bg-[#EBF5FF] text-[#0071E3] flex items-center justify-center font-bold text-[11px] sm:text-xs ring-1 ring-[#D0E7FF]">
                                                {author.initial}
                                            </div>
                                        </div>

                                        {/* Right: Post Content */}
                                        <div className="flex-1 min-w-0">
                                            {/* Header */}
                                            <div className="flex items-center justify-between gap-1.5">
                                                <div className="flex items-center gap-1 min-w-0">
                                                    <span className="font-bold text-[13px] sm:text-[13.5px] text-[#0F1419] truncate group-hover:underline">
                                                        {author.name}
                                                    </span>
                                                    <CheckmarkBadge01Icon size={13} className="text-[#0071E3] shrink-0 fill-[#0071E3]/20" />
                                                    <span className="text-[#536471] text-xs font-normal hidden sm:inline truncate">
                                                        @{tagLabel.toLowerCase().replace(/[^a-z0-9]/g, '')}
                                                    </span>
                                                    <span className="text-[#536471] text-[11px] sm:text-xs">·</span>
                                                    <span className="text-[#536471] text-[11px] sm:text-xs font-normal whitespace-nowrap">
                                                        {dateFormatted}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    <span className={cn(
                                                        "px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full text-[9.5px] sm:text-[10.5px] font-medium tracking-tight",
                                                        isUrgent
                                                            ? "bg-rose-50 text-[#E11D48] border border-rose-100"
                                                            : isOfficial
                                                                ? "bg-sky-50 text-[#0284C7] border border-sky-100"
                                                                : isEvent
                                                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                                    : "bg-[#F3F4F6] text-[#4B5563] border border-gray-200/60"
                                                    )}>
                                                        {tagLabel}
                                                    </span>

                                                    {isManager && (
                                                        <div className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingAnn({ ...ann })}
                                                                className="p-1 rounded-full text-[#536471] hover:text-[#0071E3] hover:bg-[#0071E3]/10 transition-colors cursor-pointer"
                                                                title="Edit Notice"
                                                            >
                                                                <Edit02Icon size={12} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(ann.id)}
                                                                className="p-1 rounded-full text-[#536471] hover:text-[#E11D48] hover:bg-rose-50 transition-colors cursor-pointer"
                                                                title="Delete Notice"
                                                            >
                                                                <Delete02Icon size={12} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Title */}
                                            <h2 className="text-[13px] sm:text-[14px] font-bold text-[#0F1419] tracking-tight leading-snug mt-0.5">
                                                {ann.title}
                                            </h2>

                                            {/* Body */}
                                            <p className="text-[12px] sm:text-[13px] text-[#2F3336] font-normal leading-relaxed whitespace-pre-line mt-0.5">
                                                {ann.description}
                                            </p>

                                            {/* Minimal X-style Action Bar */}
                                            <div className="flex items-center gap-4 sm:gap-6 mt-1.5 pt-0.5 text-[#536471]">
                                                <button
                                                    type="button"
                                                    onClick={() => handleAcknowledge(ann.id)}
                                                    className={cn(
                                                        "inline-flex items-center gap-1 -ml-1 p-1 rounded-full hover:bg-emerald-50 hover:text-emerald-600 transition-colors cursor-pointer group/ack",
                                                        isAck ? "text-emerald-600 font-semibold" : "text-[#536471]"
                                                    )}
                                                    title={isAck ? "Acknowledged" : "Acknowledge"}
                                                >
                                                    <CheckmarkCircle02Icon size={14} className={cn(isAck && "fill-emerald-600/20")} />
                                                    <span className="text-[10.5px] sm:text-[11px]">{isAck ? "Acknowledged" : "Acknowledge"}</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => toggleBookmark(ann.id)}
                                                    className={cn(
                                                        "inline-flex items-center gap-1 p-1 rounded-full hover:bg-sky-50 hover:text-[#0071E3] transition-colors cursor-pointer group/bm",
                                                        isBookmarked ? "text-[#0071E3] font-semibold" : "text-[#536471]"
                                                    )}
                                                    title={isBookmarked ? "Saved" : "Save"}
                                                >
                                                    {isBookmarked ? (
                                                        <BookmarkCheck01Icon size={14} className="fill-[#0071E3]/20" />
                                                    ) : (
                                                        <Bookmark02Icon size={14} />
                                                    )}
                                                    <span className="text-[10.5px] sm:text-[11px]">{isBookmarked ? "Saved" : "Save"}</span>
                                                </button>

                                                {ann.deadline && (
                                                    <span className="inline-flex items-center gap-1 text-[10.5px] sm:text-[11.5px] font-medium text-[#E11D48] ml-auto">
                                                        <Calendar03Icon size={12} className="shrink-0" />
                                                        Due {new Date(ann.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Column: Deadlines & Department Portal Guide (4 Cols) */}
                <div className="lg:col-span-4 space-y-4">
                    {/* Section 1: Upcoming Academic Deadlines */}
                    <section className="bg-white rounded-2xl p-5 border border-[#E5E5EA] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between pb-3 border-b border-[#F5F5F7] gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-[#FF3B30]/10 text-[#FF3B30] flex items-center justify-center shrink-0">
                                    <Clock01Icon size={14} />
                                </div>
                                <h3 className="text-xs font-semibold text-[#1D1D1F] uppercase tracking-wider">
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
                                    className="text-xs font-medium text-[#0071E3] hover:text-[#005BB5] cursor-pointer"
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

                        <div className="space-y-2 mt-3.5">
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
                                        className="flex items-center justify-between gap-3 p-2.5 bg-[#FBFBFD] hover:bg-white border border-[#E5E5EA] hover:border-[#D2D2D7] rounded-xl transition-all duration-150 group"
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-white border border-[#E5E5EA] text-[#FF3B30] flex flex-col items-center justify-center shrink-0 shadow-2xs">
                                                <span className="text-[7px] font-bold uppercase tracking-wider leading-none text-[#FF3B30]">{month}</span>
                                                <span className="text-xs font-bold leading-none mt-0.5 text-[#1D1D1F]">{day}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs font-medium text-[#1D1D1F] truncate group-hover:text-[#0071E3] transition-colors">
                                                    {ann.title}
                                                </h4>
                                                <p className="text-[10px] text-[#8E8E93] truncate">
                                                    {deadlineDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        {diffDays >= 0 ? (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#0071E3]/10 text-[#0071E3] shrink-0">
                                                {diffDays === 0 ? 'Today' : `${diffDays}d left`}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F5F5F7] text-[#8E8E93] shrink-0">
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


                </div>
            </div>

            {/* Create Announcement Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white border border-[#E5E5EA] rounded-2xl w-full max-w-lg shadow-2xl overflow-visible">
                        <div className="px-5 py-3.5 border-b border-[#E5E5EA] flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-semibold text-[#1D1D1F]">Publish Notice</h3>
                                <p className="text-xs text-[#8E8E93]">Post an academic bulletin for students</p>
                            </div>
                            <button
                                onClick={() => setShowCreate(false)}
                                className="p-1 text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-md transition-colors cursor-pointer"
                            >
                                <Cancel01Icon size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-5 space-y-3.5">
                            <div>
                                <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
                                    Notice Title
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={newAnn.title}
                                    onChange={e => setNewAnn({ ...newAnn, title: e.target.value })}
                                    placeholder="e.g. Unit Test II Syllabus & Schedule..."
                                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-xs text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
                                        Category / Type
                                    </label>
                                    <select
                                        value={newAnn.type}
                                        onChange={e => setNewAnn({ ...newAnn, type: e.target.value })}
                                        className="w-full h-[38px] bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-xs text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white transition-colors cursor-pointer font-medium"
                                    >
                                        {CATEGORY_OPTIONS.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
                                        Priority Tag
                                    </label>
                                    <DropdownDisclosure
                                        items={PRIORITY_OPTIONS}
                                        selectedId={newAnn.colorTag || 'blue'}
                                        onChange={opt => setNewAnn({ ...newAnn, colorTag: opt.id })}
                                        isOpen={createPriorityOpen}
                                        onOpenChange={setCreatePriorityOpen}
                                        title="Select Priority"
                                        className="w-full"
                                        triggerClassName="w-full justify-between h-[38px] !rounded-xl !border-[#E5E5EA] !bg-[#F5F5F7] hover:!bg-white focus:!border-[#0071E3] px-3 py-2 text-xs"
                                        align="right"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
                                    Deadline / Due Date (Optional)
                                </label>
                                <input
                                    type="date"
                                    value={newAnn.deadline || ''}
                                    onChange={e => setNewAnn({ ...newAnn, deadline: e.target.value })}
                                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-xs text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
                                    Bulletin Details
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={newAnn.description}
                                    onChange={e => setNewAnn({ ...newAnn, description: e.target.value })}
                                    placeholder="Enter full announcement body..."
                                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-3 text-xs text-[#1D1D1F] resize-none outline-none focus:border-[#0071E3] focus:bg-white transition-colors"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2.5 bg-[#0071E3] hover:bg-[#005BB5] text-white text-xs font-medium rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
                    <div className="bg-white border border-[#E5E5EA] rounded-2xl w-full max-w-lg shadow-2xl overflow-visible">
                        <div className="px-5 py-3.5 border-b border-[#E5E5EA] flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-semibold text-[#1D1D1F]">Edit Notice</h3>
                                <p className="text-xs text-[#8E8E93]">Update bulletin details and priority</p>
                            </div>
                            <button
                                onClick={() => setEditingAnn(null)}
                                className="p-1 text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-md transition-colors cursor-pointer"
                            >
                                <Cancel01Icon size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="p-5 space-y-3.5">
                            <div>
                                <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
                                    Notice Title
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={editingAnn.title || ''}
                                    onChange={e => setEditingAnn({ ...editingAnn, title: e.target.value })}
                                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-xs text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
                                        Category / Type
                                    </label>
                                    <select
                                        value={editingAnn.type || editingAnn.tag || 'Official Notice'}
                                        onChange={e => setEditingAnn({ ...editingAnn, type: e.target.value, tag: e.target.value })}
                                        className="w-full h-[38px] bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-xs text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white transition-colors cursor-pointer font-medium"
                                    >
                                        {CATEGORY_OPTIONS.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
                                        Priority Tag
                                    </label>
                                    <DropdownDisclosure
                                        items={PRIORITY_OPTIONS}
                                        selectedId={editingAnn.colorTag || editingAnn.color || 'blue'}
                                        onChange={opt => setEditingAnn({ ...editingAnn, colorTag: opt.id, color: opt.id })}
                                        isOpen={editPriorityOpen}
                                        onOpenChange={setEditPriorityOpen}
                                        title="Select Priority"
                                        className="w-full"
                                        triggerClassName="w-full justify-between h-[38px] !rounded-xl !border-[#E5E5EA] !bg-[#F5F5F7] hover:!bg-white focus:!border-[#0071E3] px-3 py-2 text-xs"
                                        align="right"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
                                    Deadline / Due Date (Optional)
                                </label>
                                <input
                                    type="date"
                                    value={editingAnn.deadline || ''}
                                    onChange={e => setEditingAnn({ ...editingAnn, deadline: e.target.value })}
                                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl px-3 py-2 text-xs text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#1D1D1F] mb-1">
                                    Bulletin Details
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={editingAnn.description || ''}
                                    onChange={e => setEditingAnn({ ...editingAnn, description: e.target.value })}
                                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-3 text-xs text-[#1D1D1F] resize-none outline-none focus:border-[#0071E3] focus:bg-white transition-colors"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2.5 bg-[#0071E3] hover:bg-[#005BB5] text-white text-xs font-medium rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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

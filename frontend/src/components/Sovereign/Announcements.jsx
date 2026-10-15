import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Plus,
    Search,
    Bookmark,
    BookmarkCheck,
    Calendar as CalendarIcon,
    Timer,
    BookOpen,
    MapPin,
    FileText,
    ExternalLink,
    CheckCircle2,
    X,
    Send,
    Radio,
    Clock,
    Edit2,
    Trash2,
    ShieldCheck,
    ShieldAlert
} from 'lucide-react';

const API_BASE = 'http://localhost:8081/api';

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
    const [userRole, setUserRole] = useState(() => localStorage.getItem('eduvault_user_role') || 'admin');
    const [newAnn, setNewAnn] = useState({
        title: '',
        description: '',
        colorTag: 'blue',
        type: 'Official Notice'
    });

    const isManager = userRole === 'admin' || userRole === 'faculty';

    const toggleRole = () => {
        const next = isManager ? 'student' : 'admin';
        setUserRole(next);
        localStorage.setItem('eduvault_user_role', next);
        toast.info(`Switched role mode to: ${next.toUpperCase()}`);
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/announcements`, { 
                headers: { 'X-User-Role': userRole },
                timeout: 3000 
            });
            setAnnouncements(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
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
                createdAt: new Date().toISOString()
            };
            await axios.post(`${API_BASE}/announcements`, payload, {
                headers: { 'X-User-Role': userRole }
            });
            toast.success("Notice published successfully");
            setShowCreate(false);
            setNewAnn({ title: '', description: '', colorTag: 'blue', type: 'Official Notice' });
            fetchAnnouncements();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to publish notice. Check permissions.");
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editingAnn?.id) return;
        try {
            await axios.put(`${API_BASE}/announcements/${editingAnn.id}`, editingAnn, {
                headers: { 'X-User-Role': userRole }
            });
            toast.success("Notice updated successfully");
            setEditingAnn(null);
            fetchAnnouncements();
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to update notice.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this notice?")) return;
        try {
            await axios.delete(`${API_BASE}/announcements/${id}`, {
                headers: { 'X-User-Role': userRole }
            });
            toast.success("Notice deleted successfully");
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            toast.error(err.response?.data?.error || "Failed to delete notice. Admin/faculty required.");
        }
    };

    const filteredAnnouncements = useMemo(() => {
        return announcements.filter(item => {
            const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
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

    return (
        <main className="w-full px-6 lg:px-10 py-8 bg-[#F7F9FC] min-h-screen text-slate-900">
            <div className="flex flex-col w-full max-w-[1360px] mx-auto pb-12 space-y-6">
                {/* Interactive Top Action & Heading Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-[26px] font-bold text-slate-900 tracking-tight">
                                Announcements
                            </h1>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200/50">
                                AI &amp; DS Dept
                            </span>
                        </div>
                        <p className="text-[13px] text-slate-500">
                            Important academic and college updates
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleRole}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                                isManager 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            }`}
                            title="Toggle Manager/Student Permission Mode"
                        >
                            {isManager ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> : <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />}
                            <span>Role: {isManager ? 'Faculty / Admin' : 'Student (Read-Only)'}</span>
                        </button>
                        <button
                            className="relative w-9 h-9 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center text-slate-500 hover:text-blue-600 shadow-xs"
                            title="Bulletin Subscriptions"
                        >
                            <Radio className="w-4 h-4" />
                            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
                        </button>
                        {isManager && (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Create Announcement</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter & Search Toolbar */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                    {/* Search Input */}
                    <div className="relative w-full md:max-w-md">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search announcements, keywords..."
                            className="w-full h-10 pl-10 pr-4 rounded-full bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-all"
                        />
                    </div>

                    {/* Filter Chips */}
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                        {[
                            { id: 'all', label: 'All Bulletins' },
                            { id: 'official', label: 'Official Notices' },
                            { id: 'academic', label: 'Academic Schedule' },
                            { id: 'bookmarked', label: 'Bookmarked' }
                        ].map(chip => (
                            <button
                                key={chip.id}
                                onClick={() => setActiveFilter(chip.id)}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                                    activeFilter === chip.id
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Announcement Cards & Sidebar Container */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Feed */}
                    <div className="lg:col-span-8 flex flex-col space-y-5">
                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2].map(i => (
                                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs animate-pulse space-y-4">
                                        <div className="h-4 bg-slate-100 rounded w-1/4" />
                                        <div className="h-6 bg-slate-100 rounded w-3/4" />
                                        <div className="h-16 bg-slate-50 rounded" />
                                    </div>
                                ))}
                            </div>
                        ) : filteredAnnouncements.length === 0 ? (
                            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                                <p className="text-sm font-semibold">No announcements match your search criteria.</p>
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

                                return (
                                    <article
                                        key={ann.id || idx}
                                        className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                                    >
                                        <div>
                                            {/* Header / Metadata */}
                                            <div className="flex items-center justify-between pb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                                        isOfficial
                                                            ? 'bg-blue-50 text-blue-600 border border-blue-200/50'
                                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                                                    }`}>
                                                        {isOfficial && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />}
                                                        {ann.type || 'Official Notice'}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium">
                                                        <CalendarIcon className="w-3.5 h-3.5" />
                                                        {dateFormatted}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    {isManager && (
                                                        <>
                                                            <button
                                                                onClick={() => setEditingAnn({ ...ann })}
                                                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                                                title="Edit Notice"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(ann.id)}
                                                                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                                                title="Delete Notice"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => toggleBookmark(ann.id)}
                                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                                                            isBookmarked
                                                                ? 'text-blue-600 bg-blue-50'
                                                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                                                        }`}
                                                        title="Bookmark"
                                                    >
                                                        {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Title */}
                                            <h2 className="text-[17px] font-bold text-slate-900 mt-1 group-hover:text-blue-600 transition-colors">
                                                {ann.title}
                                            </h2>

                                            {/* Message Body */}
                                            <p className="text-[13px] text-slate-600 mt-3 leading-relaxed">
                                                {ann.description}
                                            </p>

                                            {/* Details Meta Box */}
                                            {ann.meta && (
                                                <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                                                    {ann.meta.duration && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Timer className="w-4 h-4 text-blue-600" />
                                                            <span>Duration: <strong className="text-slate-900">{ann.meta.duration}</strong></span>
                                                        </div>
                                                    )}
                                                    {ann.meta.portion && (
                                                        <div className="flex items-center gap-1.5">
                                                            <BookOpen className="w-4 h-4 text-blue-600" />
                                                            <span>Portion: <strong className="text-slate-900">{ann.meta.portion}</strong></span>
                                                        </div>
                                                    )}
                                                    {ann.meta.hall && (
                                                        <div className="flex items-center gap-1.5">
                                                            <MapPin className="w-4 h-4 text-blue-600" />
                                                            <span>Hall: <strong className="text-slate-900">{ann.meta.hall}</strong></span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Attachments */}
                                            {ann.attachments && (
                                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                                    {ann.attachments.map((att, aIdx) => (
                                                        <span
                                                            key={aIdx}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                                                        >
                                                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                                                            {att.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Footer Row */}
                                        <div className="pt-5 mt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                                    {ann.authorInitials || 'SC'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-800 leading-tight">
                                                        {ann.author || 'SC Sovereign Command'}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        {ann.authorRole || 'Department of AI & Data Science'}
                                                    </span>
                                                </div>
                                            </div>

                                            {isAck ? (
                                                <button
                                                    disabled
                                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-xs font-semibold cursor-default"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                    <span>Acknowledged ✓</span>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleAcknowledge(ann.id)}
                                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/60 hover:bg-blue-600 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    <span>Acknowledge</span>
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })
                        )}
                    </div>

                    {/* Right Column: Deadlines & Channels */}
                    <div className="lg:col-span-4 flex flex-col space-y-6">
                        {/* Upcoming Deadlines Card */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <h3 className="text-sm font-bold text-slate-900">Upcoming Deadlines</h3>
                                <span className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
                                    Calendar
                                </span>
                            </div>

                            <div className="space-y-3 mt-4">
                                {announcements.slice(0, 3).map((ann, i) => {
                                    const d = new Date(ann.createdAt);
                                    const month = !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: 'short' }) : 'Now';
                                    const day = !isNaN(d.getTime()) ? d.getDate() : '--';
                                    return (
                                        <div key={ann.id || i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 text-blue-600 flex flex-col items-center justify-center font-bold shadow-xs shrink-0">
                                                <span className="text-[9px] uppercase text-slate-400 leading-none">{month}</span>
                                                <span className="text-sm font-bold leading-tight">{day}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-800 truncate">
                                                    {ann.title}
                                                </p>
                                                <p className="text-[11px] text-slate-400 truncate">
                                                    {ann.type || 'Notice'} • {ann.authorRole || 'Department'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {announcements.length === 0 && (
                                    <p className="text-xs text-slate-400 py-6 text-center">No upcoming deadlines logged</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Announcement Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Create Academic Notice</h3>
                                <p className="text-xs text-slate-500">Authorized Sovereign Command broadcast</p>
                            </div>
                            <button
                                onClick={() => setShowCreate(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Notice Title
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={newAnn.title}
                                    onChange={e => setNewAnn({ ...newAnn, title: e.target.value })}
                                    placeholder="e.g. Unit Test II Syllabus & Schedule..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Category / Type
                                    </label>
                                    <input
                                        type="text"
                                        value={newAnn.type}
                                        onChange={e => setNewAnn({ ...newAnn, type: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Priority Tag
                                    </label>
                                    <select
                                        value={newAnn.colorTag}
                                        onChange={e => setNewAnn({ ...newAnn, colorTag: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                                    >
                                        <option value="blue">Blue (Official)</option>
                                        <option value="green">Green (Academic)</option>
                                        <option value="yellow">Amber (Warning)</option>
                                        <option value="red">Red (Urgent)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Bulletin Details
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={newAnn.description}
                                    onChange={e => setNewAnn({ ...newAnn, description: e.target.value })}
                                    placeholder="Enter full announcement body..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-medium text-slate-800 resize-none outline-none focus:border-blue-500 focus:bg-white transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Send className="w-3.5 h-3.5" />
                                <span>Publish Notice</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Announcement Modal */}
            {editingAnn && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Edit Notice</h3>
                                <p className="text-xs text-slate-500">Update academic bulletin details and priority</p>
                            </div>
                            <button
                                onClick={() => setEditingAnn(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Notice Title
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={editingAnn.title || ''}
                                    onChange={e => setEditingAnn({ ...editingAnn, title: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Category / Type
                                    </label>
                                    <input
                                        type="text"
                                        value={editingAnn.type || ''}
                                        onChange={e => setEditingAnn({ ...editingAnn, type: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Priority Tag
                                    </label>
                                    <select
                                        value={editingAnn.colorTag || 'blue'}
                                        onChange={e => setEditingAnn({ ...editingAnn, colorTag: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all"
                                    >
                                        <option value="blue">Blue (Official)</option>
                                        <option value="green">Green (Academic)</option>
                                        <option value="yellow">Amber (Warning)</option>
                                        <option value="red">Red (Urgent)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Bulletin Details
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={editingAnn.description || ''}
                                    onChange={e => setEditingAnn({ ...editingAnn, description: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-medium text-slate-800 resize-none outline-none focus:border-blue-500 focus:bg-white transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Send className="w-3.5 h-3.5" />
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

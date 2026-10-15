import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE = 'http://localhost:8081/api';

const Roadmaps = () => {
    const { loading: globalLoading } = useOutletContext();
    const [roadmaps, setRoadmaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRoadmap, setSelectedRoadmap] = useState(null);
    const [activeVideo, setActiveVideo] = useState(null);
    const [selectedResourceMap, setSelectedResourceMap] = useState({});

    useEffect(() => {
        const fetchRoadmaps = async () => {
            try {
                const res = await axios.get(`${API_BASE}/roadmaps`);
                setRoadmaps(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                toast.error("Failed to load roadmaps");
            } finally {
                setLoading(false);
            }
        };
        fetchRoadmaps();
    }, []);

    const categories = useMemo(() => {
        const set = new Set();
        (roadmaps || []).forEach(r => {
            if (r.subject) set.add(r.subject);
        });
        return ['All', ...Array.from(set)];
    }, [roadmaps]);

    const filteredRoadmaps = useMemo(() => {
        return roadmaps.filter(r => {
            const matchesCategory = selectedCategory === 'All' || r.subject?.toLowerCase() === selectedCategory.toLowerCase();
            const term = searchQuery.toLowerCase().trim();
            const matchesSearch = !term || r.title?.toLowerCase().includes(term) || r.subject?.toLowerCase().includes(term);
            return matchesCategory && matchesSearch;
        });
    }, [roadmaps, selectedCategory, searchQuery]);

    const extractYouTubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    if (globalLoading || loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-slate-50/60 text-slate-900 antialiased overflow-y-auto">
            <main className="w-full px-4 sm:px-8 py-6 max-w-6xl mx-auto flex flex-col gap-6">
                
                {/* Header (Unstop Clean Style) */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                Curated Tracks
                            </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                            {selectedRoadmap ? selectedRoadmap.title : 'Developer Roadmaps'}
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {selectedRoadmap 
                                ? (selectedRoadmap.description || `Step-by-step curriculum for ${selectedRoadmap.subject}`)
                                : 'Master in-demand engineering sequences with step-by-step modules.'}
                        </p>
                    </div>

                    {selectedRoadmap ? (
                        <button
                            onClick={() => {
                                setSelectedRoadmap(null);
                                setActiveVideo(null);
                                setSelectedResourceMap({});
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs cursor-pointer self-start md:self-auto"
                        >
                            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                            <span>All Tracks</span>
                        </button>
                    ) : (
                        <div className="relative w-full md:w-64">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">
                                search
                            </span>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search roadmaps..."
                                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                            />
                        </div>
                    )}
                </div>

                {!selectedRoadmap ? (
                    <>
                        {/* Category Filter Pills */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {categories.map(cat => {
                                const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                                            isActive
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Cards Grid (Unstop Minimal Cards) */}
                        {filteredRoadmaps.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredRoadmaps.map(rm => (
                                    <div
                                        key={rm.id}
                                        onClick={() => setSelectedRoadmap(rm)}
                                        className="group bg-white rounded-xl p-5 border border-slate-200 hover:border-blue-500/50 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                                                    {rm.subject || 'Engineering'}
                                                </span>
                                                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[13px]">view_module</span>
                                                    {rm.phases?.length || 0} Modules
                                                </span>
                                            </div>

                                            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1">
                                                {rm.title}
                                            </h3>
                                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                {rm.description || `Comprehensive guided curriculum tailored for ${rm.title}.`}
                                            </p>
                                        </div>

                                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                            <span className="font-semibold text-slate-500 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px] text-emerald-600">verified</span>
                                                Verified Track
                                            </span>
                                            <span className="font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                                                Start Learning
                                                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-3xl text-slate-300">search_off</span>
                                <p className="text-xs font-semibold text-slate-700">No matching roadmaps found</p>
                                <p className="text-[11px] text-slate-400">Clear filters or try searching for another technology.</p>
                            </div>
                        )}
                    </>
                ) : (
                    /* Minimal Roadmap Sequence View */
                    <div className="max-w-3xl mx-auto w-full space-y-4 pb-20">
                        {selectedRoadmap.phases?.map((phase, idx) => (
                            <div
                                key={idx}
                                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs transition-all hover:border-slate-300"
                            >
                                <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-slate-100">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold text-xs flex items-center justify-center border border-blue-100">
                                            {idx + 1}
                                        </span>
                                        <h3 className="text-sm font-bold text-slate-900">
                                            {phase.title}
                                        </h3>
                                    </div>
                                    {phase.critical && (
                                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                            Essential
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    {/* Lessons List */}
                                    <div className="md:col-span-7 space-y-1.5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Topic Units
                                        </span>
                                        <div className="space-y-1">
                                            {phase.resources?.map((res, rIdx) => {
                                                const isSelected = selectedResourceMap[idx] === rIdx || (selectedResourceMap[idx] === undefined && rIdx === 0);
                                                return (
                                                    <div
                                                        key={rIdx}
                                                        onClick={() => setSelectedResourceMap(prev => ({ ...prev, [idx]: rIdx }))}
                                                        className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-blue-50/70 text-blue-700 font-semibold'
                                                                : 'hover:bg-slate-50 text-slate-700 font-medium'
                                                        }`}
                                                    >
                                                        <span className="material-symbols-outlined text-[15px] text-blue-500 shrink-0">
                                                            {isSelected ? 'play_circle' : 'radio_button_unchecked'}
                                                        </span>
                                                        <span className="truncate flex-1" title={res.name}>
                                                            {res.name.split(' | ')[0].split(' - ')[0]}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Video Thumbnail Preview */}
                                    <div className="md:col-span-5">
                                        {phase.resources && phase.resources.length > 0 ? (() => {
                                            const selectedIdx = selectedResourceMap[idx] || 0;
                                            const res = phase.resources[selectedIdx];
                                            const ytId = extractYouTubeId(res.url);

                                            return (
                                                <div
                                                    onClick={() => ytId && setActiveVideo(ytId)}
                                                    className="rounded-lg border border-slate-200 overflow-hidden relative aspect-video flex flex-col group/video cursor-pointer bg-slate-900"
                                                >
                                                    <img
                                                        alt={res.name}
                                                        className="w-full h-full object-cover group-hover/video:scale-105 transition-transform duration-300 opacity-90"
                                                        src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                                                        onError={(e) => { e.target.src = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`; }}
                                                    />
                                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                        <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md group-hover/video:scale-110 transition-transform">
                                                            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                                play_arrow
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                                        <p className="text-[11px] font-medium text-white truncate">
                                                            {res.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })() : (
                                            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 aspect-video flex items-center justify-center">
                                                No Media
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Minimal Video Player Modal */}
                {activeVideo && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
                        onClick={() => setActiveVideo(null)}
                    >
                        <div
                            className="relative w-full max-w-3xl aspect-video bg-black rounded-xl shadow-2xl overflow-hidden border border-slate-800"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute top-2.5 right-2.5 flex items-center gap-2 z-10">
                                <button
                                    onClick={() => window.open(`https://www.youtube.com/watch?v=${activeVideo}`, '_blank')}
                                    className="w-7 h-7 flex items-center justify-center bg-black/60 hover:bg-black text-white rounded-md cursor-pointer"
                                    title="Open in YouTube"
                                >
                                    <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                                </button>
                                <button
                                    onClick={() => setActiveVideo(null)}
                                    className="w-7 h-7 flex items-center justify-center bg-black/60 hover:bg-black text-white rounded-md cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                </button>
                            </div>
                            <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube-nocookie.com/embed/${activeVideo}?autoplay=1&rel=0&modestbranding=1`}
                                title="Lecture player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                                allowFullScreen
                                className="w-full h-full"
                            />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Roadmaps;

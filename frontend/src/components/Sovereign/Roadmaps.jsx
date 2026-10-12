import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE = 'http://localhost:8081/api';

const Roadmaps = () => {
    const { loading: globalLoading } = useOutletContext();
    const [roadmaps, setRoadmaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState('All');
    const [selectedRoadmap, setSelectedRoadmap] = useState(null);
    const [activeVideo, setActiveVideo] = useState(null);
    const [selectedResourceMap, setSelectedResourceMap] = useState({});

    useEffect(() => {
        const fetchRoadmaps = async () => {
            try {
                const res = await axios.get(`${API_BASE}/roadmaps`);
                setRoadmaps(res.data);
                // Don't auto-select a roadmap. Show the folder overview first.
            } catch (err) {
                toast.error("Failed to synchronize curriculum nodes");
            } finally {
                setLoading(false);
            }
        };
        fetchRoadmaps();
    }, []);

    const subjects = useMemo(() => {
        const set = new Set(roadmaps.map(r => r.subject));
        return ['All', ...Array.from(set)];
    }, [roadmaps]);

    const filteredRoadmaps = useMemo(() => {
        if (selectedSubject === 'All') return roadmaps;
        return roadmaps.filter(r => r.subject === selectedSubject);
    }, [roadmaps, selectedSubject]);

    const extractYouTubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    if (globalLoading || loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-surface">
                <div className="flex flex-col items-center gap-4 animate-pulse font-mono tracking-widest uppercase text-on-surface-variant/40">
                    <span className="material-symbols-outlined text-4xl animate-spin">schema</span>
                    Accessing Knowledge Matrix...
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex overflow-hidden h-full bg-surface antialiased">
            <main className="flex-1 overflow-y-auto no-scrollbar bg-surface relative">
                
                {/* Header Section (Always Visible) */}
                <header className="pt-6 px-6 lg:pt-10 lg:px-10 max-w-[1000px] mx-auto">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                            {subjects.map(s => (
                                <button 
                                    key={s}
                                    onClick={() => {
                                        setSelectedSubject(s);
                                        setSelectedRoadmap(null);
                                        setActiveVideo(null);
                                        setSelectedResourceMap({});
                                    }}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${selectedSubject === s ? 'bg-primary/10 text-primary border-primary/20 shadow-sm' : 'bg-surface-container-high/40 text-on-surface-variant border-transparent hover:bg-surface-container-high hover:text-on-surface'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                        {selectedRoadmap && (
                            <button 
                                onClick={() => setSelectedRoadmap(null)}
                                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all border bg-surface-container-high/40 text-on-surface-variant border-transparent hover:bg-surface-container-high hover:text-on-surface"
                            >
                                <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                                Back to All
                            </button>
                        )}
                    </div>

                    {selectedRoadmap && (
                        <div className="space-y-1 mb-24">
                            <div className="flex items-center gap-2 text-primary mb-1">
                                <span className="material-symbols-outlined text-[16px]">account_tree</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Path Sequence Protocol</span>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-white uppercase">{selectedRoadmap.title}</h1>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] opacity-60">
                                {selectedRoadmap.description || `Structural comprehension of the ${selectedRoadmap.subject} ecosystem`}
                            </p>
                        </div>
                    )}
                </header>

                {!selectedRoadmap ? (
                    <div className="max-w-[1000px] mx-auto px-6 lg:px-10 pb-32">
                        <div className="space-y-1 mb-10">
                            <h1 className="text-3xl font-bold tracking-tight text-white uppercase">Course Library</h1>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] opacity-60">
                                Select a roadmap to begin your journey
                            </p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filteredRoadmaps.map(rm => (
                                <div key={rm.id} onClick={() => setSelectedRoadmap(rm)} className="group cursor-pointer bg-surface-container/50 rounded-xl p-4 border border-outline-variant/20 hover:border-primary/40 transition-all duration-300 hover:bg-surface-container flex flex-col items-center text-center gap-3">
                                    <span className="material-symbols-outlined text-6xl text-primary/80 group-hover:scale-110 transition-transform drop-shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>folder</span>
                                    <div>
                                        <h3 className="text-xs font-bold text-white line-clamp-2 leading-tight group-hover:text-primary transition-colors">{rm.title}</h3>
                                        <p className="text-[10px] text-zinc-500 font-medium mt-1">{rm.phases?.length || 0} Modules</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-[1000px] mx-auto px-6 lg:px-10 pb-32 -mt-10">

                        {/* Timeline Flow */}
                        <div className="relative">
                            {/* Vertical Connector Line */}
                            <div className="absolute left-0 top-4 bottom-0 w-px bg-surface-container-highest"></div>

                            <div className="space-y-32">
                                {selectedRoadmap.phases?.map((phase, idx) => (
                                    <article key={idx} className="group relative pl-10">
                                        {/* Progress Node */}
                                        <div className="absolute -left-[4px] top-6 w-2 h-2 rounded-full bg-primary ring-4 ring-surface z-10 shadow-[0_0_15px_rgba(208,188,255,0.4)]"></div>
                                        
                                        <div className="flex items-baseline gap-6 mb-8 relative">
                                            {/* Large Node Number */}
                                            <h2 className="text-7xl font-black text-surface-container-highest/20 select-none tracking-tighter absolute -left-20 -top-8 group-hover:text-primary transition-colors duration-500">
                                                {(idx + 1).toString().padStart(2, '0')}
                                            </h2>
                                            
                                            <div className="flex flex-col gap-3 ml-2">
                                                {phase.critical && (
                                                    <span className="font-bold text-[9px] text-primary tracking-[0.2em] uppercase bg-primary/10 px-2.5 py-1 rounded w-fit border border-primary/20 shadow-sm">
                                                        Critical Node
                                                    </span>
                                                )}
                                                <h3 className="text-2xl font-bold text-on-surface tracking-tight group-hover:text-primary transition-colors">{phase.title}</h3>
                                            </div>
                                        </div>

                                        <div className="flex flex-col lg:flex-row gap-12 ml-2">
                                            <div className="flex-1 space-y-6">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/30">Structural Units</h4>
                                                <ul className="space-y-4">
                                                    {phase.resources?.map((res, rIdx) => {
                                                        const isSelected = selectedResourceMap[idx] === rIdx || (selectedResourceMap[idx] === undefined && rIdx === 0);
                                                        return (
                                                            <li key={rIdx} 
                                                                className="flex items-start gap-4 group/topic cursor-pointer"
                                                                onClick={() => setSelectedResourceMap(prev => ({...prev, [idx]: rIdx}))}
                                                            >
                                                                <div className={`mt-2.5 h-px w-4 shrink-0 transition-colors ${isSelected ? 'bg-primary' : 'bg-outline-variant/30 group-hover/topic:bg-primary/50'}`}></div>
                                                                <div className="flex-1 min-w-0">
                                                                    <span className={`block text-sm font-medium transition-colors truncate ${isSelected ? 'text-primary' : 'text-on-surface-variant group-hover/topic:text-on-surface'}`} title={res.name}>
                                                                        {res.name.split(' | ')[0].split(' - ')[0]}
                                                                    </span>
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>

                                            {/* Instructional Media Card */}
                                            <div className="w-full lg:w-[320px] shrink-0">
                                                {phase.resources && phase.resources.length > 0 ? (() => {
                                                    const selectedIdx = selectedResourceMap[idx] || 0;
                                                    const res = phase.resources[selectedIdx];
                                                    return (
                                                        <div
                                                            className="bg-surface-container rounded-lg border border-outline-variant/20 overflow-hidden group/media cursor-pointer relative aspect-video flex flex-col shadow-2xl hover:border-primary/40 transition-all duration-500"
                                                            onClick={() => setActiveVideo(extractYouTubeId(res.url))}
                                                        >
                                                            {/* Real YouTube thumbnail */}
                                                            <img
                                                                alt={res.name}
                                                                className="w-full h-full object-cover absolute inset-0 group-hover/media:scale-105 transition-all duration-700"
                                                                src={`https://img.youtube.com/vi/${extractYouTubeId(res.url)}/hqdefault.jpg`}
                                                                onError={(e) => { e.target.src = `https://img.youtube.com/vi/${extractYouTubeId(res.url)}/mqdefault.jpg`; }}
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 group-hover/media:bg-black/20 transition-colors duration-300" />
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <div className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.5)] group-hover/media:scale-125 transition-all duration-300">
                                                                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                                                                </div>
                                                            </div>
                                                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                                                                <span className="text-[9px] font-black text-red-400 uppercase tracking-[0.2em] mb-1 block">▶ Unit {selectedIdx + 1}</span>
                                                                <h4 className="text-xs font-bold text-white truncate" title={res.name}>{res.name}</h4>
                                                            </div>
                                                        </div>
                                                    );
                                                })() : (
                                                    <div className="bg-surface-container-high/30 rounded-lg border border-dashed border-outline-variant/20 p-8 flex flex-col items-center justify-center text-center gap-3 h-[240px]">
                                                        <span className="material-symbols-outlined text-2xl text-on-surface-variant/20">videocam_off</span>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/20">Media Pending</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Video Player Modal */}
                {activeVideo && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setActiveVideo(null)}>
                        <div
                            className="relative w-full max-w-[800px] mx-4 aspect-video bg-black rounded-xl shadow-[0_30px_100px_rgba(0,0,0,0.9)] overflow-hidden border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close & Open buttons — pointer-events-auto on top of iframe */}
                            <div className="absolute top-3 right-3 flex items-center gap-2 z-10 pointer-events-none">
                                <button
                                    onClick={() => window.open(`https://www.youtube.com/watch?v=${activeVideo}`, '_blank')}
                                    className="pointer-events-auto w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-white/20 rounded-full transition-colors"
                                    title="Open in YouTube"
                                >
                                    <span className="material-symbols-outlined text-white text-[16px]">open_in_new</span>
                                </button>
                                <button
                                    onClick={() => setActiveVideo(null)}
                                    className="pointer-events-auto w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <span className="material-symbols-outlined text-white text-[18px]">close</span>
                                </button>
                            </div>
                            <iframe
                                width="100%"
                                height="100%"
                                src={`https://www.youtube-nocookie.com/embed/${activeVideo}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                                allowFullScreen
                                referrerPolicy="strict-origin-when-cross-origin"
                                style={{ display: 'block' }}
                            />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Roadmaps;

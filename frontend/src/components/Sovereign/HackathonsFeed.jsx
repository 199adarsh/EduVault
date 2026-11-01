import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const CITIES = [
    { id: 'all', label: 'All' },
    { id: 'mumbai', label: 'Mumbai' },
    { id: 'pune', label: 'Pune' },
    { id: 'bengaluru', label: 'Bengaluru' }
];

const HackathonsFeed = () => {
    const [city, setCity] = useState('all');
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        const fetchEvents = async () => {
            try {
                if (city === 'all') {
                    const [m, p, b] = await Promise.all([
                        axios.get(`${API_BASE}/hackathons?city=mumbai&limit=6`),
                        axios.get(`${API_BASE}/hackathons?city=pune&limit=6`),
                        axios.get(`${API_BASE}/hackathons?city=bengaluru&limit=6`)
                    ]);
                    const merged = [...(m.data?.listings || []), ...(p.data?.listings || []), ...(b.data?.listings || [])];
                    const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
                    if (isMounted) setListings(unique.slice(0, 6));
                } else {
                    const res = await axios.get(`${API_BASE}/hackathons?city=${city}&limit=6`);
                    if (isMounted) setListings(res.data?.listings || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchEvents();
        return () => { isMounted = false; };
    }, [city]);

    return (
        <section className="bg-surface-card rounded-2xl p-4 sm:p-5 border border-border-subtle shadow-2xs w-full min-w-0 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border-subtle gap-2.5 w-full min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[17px]">terminal</span>
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-bold text-text-primary leading-tight truncate">Hackathons</h2>
                        <span className="text-[11px] font-medium text-text-secondary truncate block">Mumbai • Pune • BLR</span>
                    </div>
                </div>

                {/* City Selector: Horizontally scrollable without page overflow */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto no-scrollbar max-w-full touch-pan-x w-full sm:w-auto shrink-0">
                    {CITIES.map(c => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCity(c.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap ${city === c.id
                                    ? 'bg-white text-indigo-600 shadow-xs'
                                    : 'text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List: Responsive 1 col on mobile, 2 col on sm+ */}
            <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full min-w-0">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="p-3 bg-slate-50 border border-border-subtle rounded-xl animate-pulse h-16 w-full" />
                    ))
                ) : listings.length > 0 ? (
                    listings.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between gap-2.5 p-3 bg-white hover:bg-slate-50 border border-border-subtle rounded-xl transition-all min-w-0 w-full overflow-hidden"
                        >
                            <div className="min-w-0 flex-1">
                                <h3
                                    className="text-xs sm:text-sm font-medium text-text-primary leading-snug line-clamp-2 break-words"
                                    title={item.title}
                                >
                                    {item.title}
                                </h3>
                                <div className="flex items-center gap-1.5 text-[10px] text-text-secondary mt-1 flex-wrap">
                                    <span className="font-medium text-slate-700">{item.city || 'BLR'}</span>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-medium">{item.fee || 'Free'}</span>
                                    {item.mode && (
                                        <>
                                            <span>•</span>
                                            <span className="uppercase text-[9px] tracking-wider px-1 py-0.2 rounded bg-slate-100 font-medium text-slate-600">
                                                {item.mode}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <a
                                href={item.url || item.shareUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shrink-0 transition-transform shadow-xs min-w-[62px] text-center whitespace-nowrap"
                            >
                                Apply
                            </a>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-6 text-center text-xs text-text-secondary bg-slate-50 border border-dashed border-border-subtle rounded-xl">
                        No hackathons found in this region.
                    </div>
                )}
            </div>
        </section>
    );
};

export default HackathonsFeed;

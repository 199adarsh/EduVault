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
        <section className="bg-surface-card rounded-xl p-4 sm:p-4.5 border border-border-subtle">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[17px]">terminal</span>
                    </div>
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-text-primary leading-tight">Hackathons</h2>
                        <span className="text-[11px] font-medium text-text-secondary">Mumbai • Pune • BLR</span>
                    </div>
                </div>

                {/* City Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                    {CITIES.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setCity(c.id)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                                city === c.id
                                    ? 'bg-white text-indigo-600 shadow-xs'
                                    : 'text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List (3 rows x 2 cols = 6 cards) */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="p-2.5 bg-slate-50 border border-border-subtle rounded-lg animate-pulse h-16" />
                    ))
                ) : listings.length > 0 ? (
                    listings.map((item) => (
                        <div
                            key={item.id}
                            className="flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 border border-border-subtle rounded-lg transition-all"
                        >
                            <div className="min-w-0 pr-2">
                                <h3 className="text-xs font-bold text-text-primary truncate">
                                    {item.title}
                                </h3>
                                <div className="flex items-center gap-2 text-[10px] text-text-secondary mt-0.5">
                                    <span>{item.city || 'BLR'}</span>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-medium">{item.fee || 'Free'}</span>
                                    {item.mode && (
                                        <>
                                            <span>•</span>
                                            <span>{item.mode}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <a
                                href={item.url || item.shareUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 flex-shrink-0"
                            >
                                Apply
                            </a>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-4 text-center text-xs text-text-secondary bg-slate-50 border border-border-subtle rounded-lg">
                        No hackathons found.
                    </div>
                )}
            </div>
        </section>
    );
};

export default HackathonsFeed;

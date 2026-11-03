import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FluidTabs } from '../fluid-tabs';
import { Trophy, ArrowUpRight } from 'lucide-react';

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
        <section className="bg-white rounded-xl p-5 sm:p-6 border border-[#E2E2E2] shadow-[0_1px_3px_rgba(0,0,0,0.02)] w-full min-w-0 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#E2E2E2] gap-2.5 w-full min-w-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#D9ECFF] text-[#0073E6] flex items-center justify-center shrink-0">
                        <Trophy className="w-4 h-4 text-[#0073E6]" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-[#383838] leading-tight truncate">Hackathons</h2>
                        <span className="text-xs font-normal text-[#727272] truncate block">Curated student opportunities</span>
                    </div>
                </div>

                {/* City Selector */}
                <div className="overflow-x-auto no-scrollbar max-w-full touch-pan-x w-full sm:w-auto shrink-0">
                    <FluidTabs
                        value={city}
                        onChange={setCity}
                        size="xs"
                        layoutId="hackathons-city-tabs"
                        tabs={CITIES}
                    />
                </div>
            </div>

            {/* List: Clean Horizontal Cards with Arrow */}
            <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-16 bg-[#DEEDFC]/30 border border-[#E2E2E2] rounded-xl animate-pulse w-full" />
                    ))
                ) : listings.length > 0 ? (
                    listings.map((item) => (
                        <a
                            key={item.id}
                            href={item.url || item.shareUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-3 p-3.5 bg-white hover:bg-[#DEEDFC]/30 border border-[#E2E2E2] hover:border-[#4A9AF0] rounded-xl transition-all min-w-0 w-full group shadow-2xs"
                        >
                            <div className="min-w-0 flex-1">
                                <h3
                                    className="text-xs font-semibold text-[#383838] tracking-tight truncate leading-tight group-hover:text-[#0073E6] transition-colors"
                                    title={item.title}
                                >
                                    {item.title}
                                </h3>
                                <div className="flex items-center gap-1.5 text-[11px] font-normal text-[#727272] mt-1.5">
                                    <span className="font-semibold text-[#174073] capitalize">{item.city || 'National'}</span>
                                    <span className="text-[#E2E2E2]">•</span>
                                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded-full text-[10px] font-semibold">
                                        {item.fee || 'Free'}
                                    </span>
                                    {item.mode && (
                                        <>
                                            <span className="text-[#E2E2E2]">•</span>
                                            <span className="uppercase text-[9px] font-semibold tracking-wider text-[#727272]">
                                                {item.mode}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="w-7 h-7 rounded-full bg-[#DEEDFC]/50 group-hover:bg-[#0073E6] text-[#0073E6] group-hover:text-white flex items-center justify-center shrink-0 transition-all border border-[#D9ECFF] group-hover:border-[#0073E6]">
                                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </div>
                        </a>
                    ))
                ) : (
                    <div className="col-span-full py-6 text-center text-xs text-[#727272] bg-white border border-[#E2E2E2] rounded-xl">
                        No hackathons found in this region.
                    </div>
                )}
            </div>
        </section>
    );
};

export default HackathonsFeed;

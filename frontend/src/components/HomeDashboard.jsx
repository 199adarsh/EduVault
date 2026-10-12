import React from 'react';
import OptimizationPanel from './OptimizationPanel';

const HomeDashboard = () => {
    const [announcements, setAnnouncements] = React.useState([]);

    React.useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const res = await fetch('http://localhost:8081/api/announcements/recent');
            if (res.ok) setAnnouncements(await res.json());
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-8">
            {/* 1. Profile Card (Full-Width) */}
            <section className="bg-surface-container-low border border-outline-variant/15 p-6 relative overflow-hidden group rounded-lg">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <span className="material-symbols-outlined text-[120px]">school</span>
                </div>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <img 
                                alt="Alex Sovereign" 
                                className="w-20 h-20 rounded-lg object-cover border-2 border-primary/20" 
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPfYVtrlbjXFqntMy-ApvgdwAMAUdSEW-l3YbAqKSe8qWRxZ3OVuS5cdmB3JCgVNnSk3uSQRFSf__Xt5yk5nNmWBzFUXqESifl9a8506_c_udauFHdvbhk6wBPMXvM3bqTLxNLY3QNkKimknseO1bnz6t9EEODa0J_wrZ4Aj_YPlS3zCkKu4G-WxtQWsDvVobMSSSY7PvLpZ8XXaTFhZhpcCzttDHQf1DG_SvY4B4nyFmi5k0kkEyo9tGVQwKcxnH6Fi5BUcM8xw" 
                            />
                            <div className="absolute -bottom-2 -right-2 bg-primary text-on-primary-fixed text-[10px] font-bold px-1.5 py-0.5 rounded-lg">LVL 42</div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-medium tracking-tight text-on-surface">Alex Sovereign</h1>
                            <p className="text-sm text-on-surface-variant/70 font-mono tracking-wider">PRN: 2024098234 • COMPUTER SCIENCE B.TECH</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 w-full md:w-auto">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-semibold text-on-surface-variant/60 tracking-widest">Attendance</span>
                            <span className="text-2xl font-medium text-primary">88.4%</span>
                            <div className="w-full bg-surface-container-highest h-1 mt-2">
                                <div className="bg-primary h-full" style={{ width: '88.4%' }}></div>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-semibold text-on-surface-variant/60 tracking-widest">Exam Countdown</span>
                            <span className="text-2xl font-medium text-tertiary">14 Days</span>
                            <p className="text-[10px] text-on-surface-variant/40 mt-1">S6 Mid-Term Phase II</p>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-semibold text-on-surface-variant/60 tracking-widest">Contributions</span>
                            <span className="text-2xl font-medium text-on-surface">248</span>
                            <p className="text-[10px] text-on-surface-variant/40 mt-1">Notes & Solutions</p>
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* 2. Exam Timeline */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant">Exam Timeline</h2>
                            <span className="text-[10px] text-primary hover:underline cursor-pointer">View Hall Ticket</span>
                        </div>
                        <div className="bg-surface-container-low border border-outline-variant/10 p-6 overflow-x-auto no-scrollbar rounded-lg">
                            <div className="flex gap-4 min-w-[600px] relative">
                                <div className="absolute top-[21px] left-0 right-0 h-[1px] bg-outline-variant/20 z-0"></div>
                                
                                {['IN 2 DAYS', 'IN 5 DAYS', 'IN 9 DAYS', 'IN 14 DAYS'].map((time, i) => (
                                    <div key={i} className="flex-1 relative z-10 group">
                                        <div className={`w-3 h-3 ${i === 0 ? 'bg-primary' : 'bg-outline-variant'} border-2 border-surface-container-low mb-4 relative z-20`}></div>
                                        <div className="p-3 bg-surface-container-high border border-outline-variant/15 rounded-lg">
                                            <p className={`text-[10px] font-bold ${i === 0 ? 'text-primary' : 'text-on-surface-variant/40'} mb-1`}>{time}</p>
                                            <h3 className="text-xs font-semibold truncate">
                                                {['Data Structures', 'Microprocessors', 'Operating Systems', 'Discrete Maths'][i]}
                                            </h3>
                                            <p className="text-[10px] text-on-surface-variant/60 mt-2">Oct {24 + i*3} • 09:30 AM</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* 4. Recent Notes */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant">Recent Notes</h2>
                            <button className="text-[10px] bg-surface-container hover:bg-surface-container-high px-2 py-1 transition-colors border border-outline-variant/10 rounded-lg">Browse Library</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { title: 'Advanced CPU Scheduling Algorithms', tag: 'UNIT 4: SCHEDULING', author: 'Dr. Sarah Jenkins' },
                                { title: 'Virtual Memory & Paging Mechanics', tag: 'UNIT 2: MEMORY', author: 'Kevin Zhang' }
                            ].map((note, i) => (
                                <div key={i} className="bg-surface-container-low border border-outline-variant/15 p-4 hover:border-primary/30 transition-all cursor-pointer group rounded-lg">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20">{note.tag}</span>
                                        <span className="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary transition-colors text-[18px]">bookmark</span>
                                    </div>
                                    <h3 className="text-sm font-medium mb-1">{note.title}</h3>
                                    <p className="text-[10px] text-on-surface-variant/60 mb-4 line-clamp-1">Detailed exploration of key core technical concepts...</p>
                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-outline-variant/5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full bg-surface-container-high"></div>
                                            <span className="text-[10px] text-on-surface-variant/70">{note.author}</span>
                                        </div>
                                        <span className="text-[10px] text-on-surface-variant/40">24 Oct 2024</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 5. Attendance Heatmap */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant">Attendance Activity</h2>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] text-on-surface-variant/40">Less</span>
                                <div className="flex gap-1">
                                    {[0, 0.3, 0.6, 1].map((op, i) => (
                                        <div key={i} className="w-2.5 h-2.5 bg-primary rounded-[1px]" style={{ opacity: op || 0.1 }}></div>
                                    ))}
                                </div>
                                <span className="text-[10px] text-on-surface-variant/40">More</span>
                            </div>
                        </div>
                        <div className="bg-surface-container-low border border-outline-variant/10 p-6 rounded-lg">
                            <div className="flex flex-col gap-1 overflow-x-auto no-scrollbar">
                                {['Mon', 'Wed', 'Fri'].map((day) => (
                                    <div key={day} className="flex gap-1">
                                        <span className="w-6 text-[8px] text-on-surface-variant/40 leading-none">{day}</span>
                                        <div className="flex gap-1 flex-1">
                                            {Array.from({ length: 20 }).map((_, i) => (
                                                <div key={i} className="w-3 h-3 bg-primary rounded-[1px]" style={{ opacity: Math.random() > 0.2 ? Math.random() : 0.05 }}></div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* 6. Optimization Panel */}
                    <OptimizationPanel />
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                    {/* 3. Announcements Panel */}
                    <section>
                        <h2 className="text-sm font-semibold uppercase tracking-widest text-on-surface-variant mb-4">Announcements</h2>
                        <div className="space-y-4">
                            {announcements.length > 0 ? (
                                announcements.map((ann, i) => (
                                    <div key={i} className={`bg-surface-container border-l-2 transition-all hover:scale-[1.01] ${
                                        ann.color === 'red' ? 'border-error' : 
                                        ann.color === 'yellow' ? 'border-tertiary' : 'border-primary'
                                    } p-4 rounded-lg`}>
                                        <div className="flex gap-2 mb-2">
                                            <span className={`text-[9px] px-1.5 py-0.5 font-bold border ${
                                                ann.color === 'red' ? 'bg-error-container/20 text-error border-error/30' : 
                                                ann.color === 'yellow' ? 'bg-tertiary-container/20 text-tertiary border-tertiary/30' : 
                                                'bg-primary-container/20 text-primary border-primary/30'
                                            }`}>
                                                {ann.tag || 'GENERAL'}
                                            </span>
                                        </div>
                                        <h3 className="text-sm font-medium mb-1">{ann.title}</h3>
                                        <p className="text-[10px] text-on-surface-variant/60 leading-relaxed line-clamp-2">{ann.content}</p>
                                        <div className="mt-3 flex items-center justify-between text-[9px] text-on-surface-variant/40">
                                            <span>{ann.postedBy || 'System'}</span>
                                            <span>{ann.createdAt}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center border border-dashed border-outline-variant/20 rounded-lg">
                                    <p className="text-xs text-on-surface-variant/40 italic">No recent announcements</p>
                                </div>
                            )}
                        </div>
                        <button className="w-full mt-4 py-2 border border-outline-variant/10 text-[10px] text-on-surface-variant/60 hover:bg-surface-container transition-colors uppercase tracking-widest font-semibold rounded-lg">View All Notifications</button>
                    </section>
                    
                    {/* Quick Links Widget */}
                    <section className="bg-surface-container-low border border-outline-variant/10 p-4 rounded-lg">
                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-4">Laboratory Records</h2>
                        <div className="space-y-3">
                            {[
                                { title: 'OS Lab Record', icon: 'science', status: 'PENDING', color: 'tertiary' },
                                { title: 'MP Lab Code', icon: 'memory', status: 'SUBMITTED', color: 'primary' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-2 hover:bg-surface-container cursor-pointer transition-colors border border-transparent hover:border-outline-variant/10 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-primary text-[20px]">{item.icon}</span>
                                        <span className="text-xs font-medium">{item.title}</span>
                                    </div>
                                    <span className={`text-[9px] bg-${item.color}/10 text-${item.color} px-1.5 py-0.5 border border-${item.color}/20 font-bold`}>{item.status}</span>
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

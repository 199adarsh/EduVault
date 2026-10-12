import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Megaphone, 
  Clock, 
  ArrowUpRight, 
  Plus, 
  X, 
  Send,
  Zap,
  Bell,
  Inbox,
  AlertTriangle,
  Info,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../../lib/utils';

const API_BASE = 'http://localhost:8081/api';

const Announcements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newAnn, setNewAnn] = useState({
        title: '',
        description: '',
        colorTag: 'yellow',
        type: 'General'
    });

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/announcements`);
            setAnnouncements(res.data);
        } catch (err) {
            toast.error("Institutional feed offline");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/announcements`, {
                ...newAnn,
                createdAt: new Date().toISOString()
            });
            toast.success("Broadcast Disseminated");
            setShowCreate(false);
            setNewAnn({ title: '', description: '', colorTag: 'yellow', type: 'General' });
            fetchAnnouncements();
        } catch (err) {
            toast.error("Transmission failed");
        }
    };

    const getTagStyles = (color) => {
        switch(color) {
            case 'red': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'green': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'blue': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        }
    };

    return (
        <div className="p-6 lg:p-10 space-y-10 max-w-7xl mx-auto w-full antialiased bg-black text-zinc-100 min-h-screen">
            {/* Page Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-orange-400 mb-1">
                        <Zap className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Institutional Command</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white uppercase">Broadcast Feed</h1>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] opacity-60">Real-time dissemination of academic and administrative bulletins</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all duration-200 bg-orange-600/90 text-white hover:bg-orange-600 h-9 px-4 gap-2 shadow-lg shadow-orange-500/10"
                    >
                        <Megaphone className="w-3.5 h-3.5" />
                        <span>INITIATE BROADCAST</span>
                    </button>
                    <div className="flex items-center gap-2 ml-2 pl-4 border-l border-zinc-800">
                        <button className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-all">
                            <Bell className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 bg-zinc-900/30 backdrop-blur-md animate-pulse rounded-xl border border-zinc-800/50"></div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4 pb-24">
                        {announcements.length > 0 ? announcements.map((ann, i) => (
                            <article 
                                key={ann.id || i} 
                                className="group relative bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6 hover:bg-zinc-800/40 hover:border-zinc-700/50 transition-all duration-300 backdrop-blur-md"
                            >
                                <div className="relative flex flex-col space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border",
                                                getTagStyles(ann.colorTag)
                                            )}>
                                                {ann.type}
                                            </span>
                                            <div className="flex items-center gap-1.5 text-zinc-600">
                                                <Clock className="w-3 h-3" />
                                                <span className="text-[10px] font-bold uppercase tracking-tight">
                                                    {new Date(ann.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>
                                        <ArrowUpRight className="w-4 h-4 text-zinc-800 group-hover:text-orange-400/50 transition-all" />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <h3 className="text-lg font-bold text-zinc-200 group-hover:text-white transition-colors tracking-tight">
                                            {ann.title}
                                        </h3>
                                        <p className="text-[13px] text-zinc-500 leading-relaxed font-medium">
                                            {ann.description}
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                                                <span className="text-[8px] font-bold text-zinc-500">SC</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Sovereign Command</span>
                                        </div>
                                        <button className="text-[10px] font-bold text-zinc-600 group-hover:text-orange-400/80 transition-colors uppercase tracking-widest">
                                            ACKNOWLEDGE
                                        </button>
                                    </div>
                                </div>
                            </article>
                        )) : (
                            <div className="py-32 bg-zinc-900/10 border border-dashed border-zinc-800/50 rounded-xl backdrop-blur-md flex flex-col items-center justify-center text-zinc-800 group transition-all hover:bg-zinc-900/20">
                                <div className="w-16 h-16 rounded-full bg-zinc-950 border border-zinc-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                                    <Inbox className="w-8 h-8 text-zinc-800 group-hover:text-zinc-700 transition-colors" />
                                </div>
                                <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-600 mb-2">Feed Silence</p>
                                <p className="text-[10px] text-zinc-700 font-medium italic">No active institutional bulletins at this coordinate</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Create Broadcast Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/50 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-zinc-800 flex justify-between items-center">
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold tracking-tight text-zinc-200 uppercase tracking-widest">Initiate Broadcast</h3>
                                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Protocol: Faculty Override</p>
                            </div>
                            <button 
                                onClick={() => setShowCreate(false)} 
                                className="p-2 text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreate} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Broadcast Header</label>
                                    <input 
                                        required
                                        type="text"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 outline-none focus:border-orange-500/40 transition-all font-medium"
                                        placeholder="Enter bulletin title..."
                                        value={newAnn.title}
                                        onChange={e => setNewAnn({...newAnn, title: e.target.value})}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Category</label>
                                        <input 
                                            type="text"
                                            value={newAnn.type}
                                            onChange={e => setNewAnn({...newAnn, type: e.target.value})}
                                            placeholder="Enter category..."
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 outline-none focus:border-orange-500/40 transition-all placeholder-zinc-700"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Priority Protocol</label>
                                        <div className="flex gap-2">
                                            {[
                                                { id: 'red', color: 'bg-red-500' },
                                                { id: 'yellow', color: 'bg-amber-500' },
                                                { id: 'green', color: 'bg-emerald-500' },
                                            
                                            ].map(item => (
                                                <button 
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() => setNewAnn({...newAnn, colorTag: item.id})}
                                                    className={cn(
                                                        "flex-1 h-9 rounded-lg border transition-all relative overflow-hidden",
                                                        item.color,
                                                        newAnn.colorTag === item.id 
                                                            ? "border-zinc-100 ring-2 ring-zinc-100/20 scale-105" 
                                                            : "border-transparent opacity-40 hover:opacity-100"
                                                    )}
                                                >
                                                    {newAnn.colorTag === item.id && (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Bulletin Content</label>
                                    <textarea 
                                        required
                                        className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-xs text-zinc-200 resize-none outline-none focus:border-orange-500/40 transition-all leading-relaxed"
                                        placeholder="Detail the dissemination context..."
                                        value={newAnn.description}
                                        onChange={e => setNewAnn({...newAnn, description: e.target.value})}
                                    />
                                </div>
                            </div>

                            <button className="w-full py-4 bg-orange-600 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-xl shadow-orange-500/20 hover:bg-orange-500 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2">
                                <Send className="w-3.5 h-3.5" />
                                DISSEMINATE WORLDWIDE
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Announcements;


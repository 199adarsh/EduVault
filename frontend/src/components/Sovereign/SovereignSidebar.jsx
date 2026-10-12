import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    Home,
    FileText,
    BookOpen,
    TrendingUp,
    Zap,
    AlertCircle,
    Calendar,
    ArrowUpRight,
    Settings,
    User,
    LogOut,
    RefreshCcw,
    ChevronUp
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import axios from 'axios';

const API_BASE = 'http://localhost:8081/api';

const SovereignSidebar = ({ profile, mobileMenuOpen, setMobileMenuOpen }) => {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSync = async (e) => {
        e.stopPropagation();
        if (!profile?.prn || !profile?.dob) {
            toast.error('Sync failed: Portal credentials missing');
            setShowUserMenu(false);
            return;
        }

        const id = toast.loading('Synchronizing Sovereign Vault...');
        try {
            await axios.post(`${API_BASE}/portal/dashboard`, {
                prn: profile.prn,
                dob: profile.dob
            });
            toast.success('Synchronization Complete', { id });
            setShowUserMenu(false);
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            toast.error('Vault synchronization failed', { id });
            setShowUserMenu(false);
        }
    };

    const handleLogout = async (e) => {
        e.stopPropagation();
        toast.info('Terminating Sovereign Session...');
        try {
            await axios.post(`${API_BASE}/profile/logout`);
        } catch (err) {
            console.error('Failed to log out on server:', err);
        }
        localStorage.clear();
        setTimeout(() => window.location.href = '/', 1000);
    };

    const navItems = [
        { name: 'Home', icon: Home, path: '/' },
        { name: 'Notes', icon: FileText, path: '/notes' },
        { name: 'PYQs', icon: BookOpen, path: '/pyqs' },
        { name: 'Roadmaps', icon: TrendingUp, path: '/roadmaps' },
        { name: 'AI Assistant', icon: Zap, path: '/ai-assistant' },
        { name: 'Announcements', icon: AlertCircle, path: '/announcements' },
        { name: 'Attendance', icon: Calendar, path: '/attendance' },
        { name: 'Optimization', icon: ArrowUpRight, path: '/optimization' },
        { name: 'Settings', icon: Settings, path: '/settings' },
    ];

    const getCompactName = (name) => {
        if (!name) return "student";
        const parts = name.split(' ');
        return (parts[1] || parts[0]).toLowerCase();
    };

    return (
        <aside className={cn(
            "flex flex-col h-screen w-64 border-r border-zinc-800/50 bg-zinc-950/95 backdrop-blur-xl shrink-0 text-left z-[60] transition-transform duration-300",
            "fixed md:static inset-y-0 left-0",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
            <div className="px-6 py-8 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center shadow-inner">
                    <Zap className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="flex flex-col">
                    <span className="text-lg font-bold text-zinc-100 tracking-tighter leading-none">EduVault</span>
                    <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold mt-1">Sovereign System</span>
                </div>
            </div>

            <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto scrollbar-hide">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen && setMobileMenuOpen(false)}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-3 py-2 text-[13px] font-medium tracking-tight rounded-lg transition-all duration-200 group",
                            isActive
                                ? "bg-zinc-800/60 text-zinc-100 border border-zinc-700/30 shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
                        )}
                    >
                        <item.icon className={cn(
                            "w-4 h-4 transition-colors",
                            "group-hover:text-indigo-400"
                        )} />
                        <span>{item.name}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 mt-auto border-t border-zinc-800/30 relative" ref={menuRef}>
                {/* User Menu Dropup */}
                {showUserMenu && (
                    <div className="absolute bottom-full left-4 right-4 mb-2 p-1.5 bg-zinc-900/95 border border-zinc-800/80 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200 z-[70]">
                        <button
                            onClick={handleSync}
                            className="w-full flex items-center gap-3 px-3 py-2 text-[12px] font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-lg transition-all"
                        >
                            <RefreshCcw className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Sync Vault</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2 text-[12px] font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-lg transition-all"
                        >
                            <LogOut className="w-3.5 h-3.5 text-red-400" />
                            <span>Logout</span>
                        </button>
                    </div>
                )}

                <div
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={cn(
                        "flex items-center gap-3 p-2 bg-zinc-900/30 border border-zinc-800/50 rounded-xl transition-all duration-300 cursor-pointer group hover:bg-zinc-800/60",
                        showUserMenu && "bg-zinc-800/80 border-zinc-700/50 shadow-inner ring-1 ring-white/5"
                    )}
                >
                    <div className="w-10 h-10 rounded-full bg-zinc-800/50 overflow-hidden border border-zinc-700/30 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                        {profile?.image ? (
                            <img
                                alt="Student"
                                className="w-full h-full object-cover"
                                src={profile.image}
                            />
                        ) : (
                            <User className="w-5 h-5 text-zinc-500" />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[12px] font-bold text-zinc-200 truncate leading-tight tracking-tight uppercase">
                            {getCompactName(profile?.name)}
                        </span>
                        <span className="text-[9px] text-zinc-500 truncate uppercase font-bold tracking-widest mt-0.5 opacity-60">
                            {profile?.rollNo || "Sovereign Tier"}
                        </span>
                    </div>
                    <ChevronUp className={cn(
                        "w-3 h-3 text-zinc-600 transition-transform duration-300",
                        showUserMenu && "rotate-180 text-zinc-400"
                    )} />
                </div>
            </div>
        </aside>
    );
};

export default SovereignSidebar;


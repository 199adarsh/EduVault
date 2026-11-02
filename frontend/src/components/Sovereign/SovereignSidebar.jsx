import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../../lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const SovereignSidebar = ({ profile, attendance, mobileMenuOpen, setMobileMenuOpen, onLogout }) => {
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

        // 2-minute client cooldown to reduce load
        const lastSync = localStorage.getItem('eduvault_last_synced');
        if (lastSync && Date.now() - parseInt(lastSync, 10) < 2 * 60 * 1000) {
            toast.info('Data was synced recently (< 2 min ago). Serving cached records.');
            setShowUserMenu(false);
            return;
        }

        const id = toast.loading('Syncing student portal...');
        try {
            const resp = await axios.post(`${API_BASE}/portal/dashboard`, {
                prn: profile.prn,
                dob: profile.dob
            });
            if (resp.data) {
                const updatedProfile = {
                    ...(resp.data.profile || {}),
                    prn: profile.prn,
                    dob: profile.dob
                };
                const updatedSubjects = resp.data.subjects || [];
                localStorage.setItem('eduvault_profile', JSON.stringify(updatedProfile));
                localStorage.setItem('eduvault_subjects', JSON.stringify(updatedSubjects));
                localStorage.setItem('eduvault_last_synced', Date.now().toString());
            }
            toast.success('Sync complete', { id });
            setShowUserMenu(false);
            setTimeout(() => window.location.reload(), 500);
        } catch (err) {
            toast.error('Failed to sync portal data', { id });
            setShowUserMenu(false);
        }
    };

    const handleLogout = (e) => {
        e.stopPropagation();
        toast.info('Signing out...');
        if (onLogout) {
            onLogout();
        } else {
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace('/');
            window.location.reload();
        }
    };

    const isTeacher = (localStorage.getItem('eduvault_user_role') === 'teacher' || profile?.dob === 'TEACHER');

    const navItems = [
        { name: 'Home', icon: 'home', path: '/' },
        { name: 'Notes & PYQs', icon: 'menu_book', path: '/notes' },
        { name: 'Roadmaps', icon: 'alt_route', path: '/roadmaps' },
        { 
            name: 'AI Assistant', 
            icon: 'smart_toy', 
            path: '/ai-assistant',
            
        },
        { name: 'Announcements', icon: 'campaign', path: '/announcements' },
        { 
            name: isTeacher ? 'Attendance & NC' : 'Attendance', 
            icon: 'event_available', 
            path: '/attendance',
            badge: attendance ? `${attendance}%` : null,
            badgeClass: 'bg-status-success-bg text-status-success-text'
        },
        { name: 'Settings', icon: 'settings', path: '/settings' },
    ];

    const formatName = (fullName) => {
        if (!fullName) return profile?.username || "Student";
        const trimmed = fullName.trim();
        if (!trimmed) return "Student";
        return trimmed.split(/\s+/).map(word => {
            if (word.length <= 2 && word.toUpperCase() === word) return word;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    };

    return (
        <aside className={cn(
            "fixed left-0 top-0 h-full w-64 bg-white border-r border-[#E2E2E2] z-50 flex flex-col transition-transform duration-300 md:translate-x-0 select-none",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
            {/* Brand */}
            <div className="h-16 px-5 flex items-center justify-between border-b border-[#E2E2E2]">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#0073E6] flex items-center justify-center text-white shadow-xs">
                        <span className="material-symbols-outlined text-[19px]">shield</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-[15px] tracking-tight text-[#383838] leading-tight">Campusaxis</span>
                        <span className="text-[10px] font-medium text-[#727272] leading-none">Student Portal</span>
                    </div>
                </div>
                <button
                    onClick={() => setMobileMenuOpen && setMobileMenuOpen(false)}
                    className="md:hidden p-1.5 rounded-lg text-[#727272] hover:text-[#383838] hover:bg-[#DEEDFC]/50 transition-colors cursor-pointer"
                    aria-label="Close sidebar"
                >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
            </div>

            {/* Navigation */}
            <div className="px-3 py-4 flex-1 overflow-y-auto">
                <div className="text-[10px] font-semibold text-[#727272] uppercase tracking-wider px-2.5 mb-2">Workspace</div>
                <nav className="space-y-0.5">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            onClick={() => setMobileMenuOpen && setMobileMenuOpen(false)}
                            className={({ isActive }) => cn(
                                "flex items-center justify-between px-2.5 py-1.5 rounded-xl font-medium text-xs transition-all duration-150",
                                isActive
                                    ? "bg-slate-100 text-[#383838] font-semibold"
                                    : "text-[#383838] hover:text-[#383838] hover:bg-[#DEEDFC]/40 hover:text-[#0073E6]"
                            )}
                        >
                            {({ isActive }) => (
                                <>
                                    <div className="flex items-center gap-2.5">
                                        <span className={cn(
                                            "material-symbols-outlined text-[18px] text-[#727272]",
                                            isActive && "text-[#0073E6]"
                                        )}>
                                            {item.icon}
                                        </span>
                                        <span>{item.name}</span>
                                    </div>
                                    {item.badge && (
                                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                            {item.badge}
                                        </span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>
            </div>

            {/* Active Session Indicator */}
            <div className="p-3 border-t border-[#E2E2E2] relative" ref={menuRef}>
                {showUserMenu && (
                    <div className="absolute bottom-full left-3 right-3 mb-2 p-1 bg-white border border-[#E2E2E2] rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150 z-50">
                        <button
                            onClick={handleSync}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-[#383838] hover:bg-[#DEEDFC]/40 hover:text-[#0073E6] hover:text-[#0073E6] rounded transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[16px] text-[#0073E6]">sync</span>
                            <span>Refresh Data</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-[16px]">logout</span>
                            <span>Logout</span>
                        </button>
                    </div>
                )}

                <div 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="p-2 rounded-lg bg-[#DEEDFC]/30 border border-[#E2E2E2] hover:bg-[#DEEDFC]/50/70 transition-all flex items-center justify-between cursor-pointer"
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        {profile?.image ? (
                            <img
                                src={profile.image}
                                alt={formatName(profile?.name)}
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    if (e.currentTarget.nextElementSibling) {
                                        e.currentTarget.nextElementSibling.style.display = 'flex';
                                    }
                                }}
                            />
                        ) : null}
                        <div className={`w-7 h-7 rounded-full bg-blue-50 text-[#0073E6] items-center justify-center shrink-0 ${profile?.image ? 'hidden' : 'flex'}`}>
                            <span className="material-symbols-outlined text-[16px]">verified_user</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-[#383838] truncate">{formatName(profile?.name)}</span>
                            <span className="text-[10px] text-[#727272] font-mono truncate">
                                {(localStorage.getItem('eduvault_user_role') === 'teacher' || profile?.dob === 'TEACHER') ? 'Faculty Account' : (profile?.prn || profile?.rollNo || '—')}
                            </span>
                        </div>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ml-1.5" title="Active Session"></div>
                </div>
            </div>
        </aside>
    );
};

export default SovereignSidebar;

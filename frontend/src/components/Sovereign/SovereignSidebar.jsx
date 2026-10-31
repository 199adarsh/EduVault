import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { cn } from '../../lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const SovereignSidebar = ({ profile, attendance, mobileMenuOpen, setMobileMenuOpen }) => {
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

        const id = toast.loading('Synchronizing Sovereign Vault...');
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
            toast.success('Synchronization Complete', { id });
            setShowUserMenu(false);
            setTimeout(() => window.location.reload(), 500);
        } catch (err) {
            toast.error('Vault synchronization failed', { id });
            setShowUserMenu(false);
        }
    };

    const handleLogout = (e) => {
        e.stopPropagation();
        toast.info('Terminating Sovereign Session...');
        localStorage.removeItem('eduvault_profile');
        localStorage.removeItem('eduvault_subjects');
        localStorage.removeItem('eduvault_last_synced');
        localStorage.removeItem('eduvault_user_role');
        localStorage.removeItem('eduvault_teacher_name');
        localStorage.removeItem('eduvault_teacher_id');
        localStorage.removeItem('eduvault_excluded_subjects');
        setTimeout(() => window.location.href = '/', 400);
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
            badge: 'Pro',
            badgeClass: 'bg-badge-purple-bg text-badge-purple-text'
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
            "fixed left-0 top-0 h-full w-64 bg-surface-card border-r border-border-subtle z-50 flex flex-col transition-transform duration-300 md:translate-x-0",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
            {/* Brand */}
            <div className="h-16 px-6 flex items-center gap-3 border-b border-border-subtle/60">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
                    <span className="material-symbols-outlined text-[22px]">shield</span>
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-[17px] tracking-tight text-text-primary leading-tight">Campusaxis</span>
                    <span className="text-[11px] font-medium text-text-secondary leading-none">Academic OS</span>
                </div>
            </div>

            {/* Navigation */}
            <div className="px-4 py-4 flex-1 overflow-y-auto">
                <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-3 mb-2">Workspace</div>
                <nav className="space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            onClick={() => setMobileMenuOpen && setMobileMenuOpen(false)}
                            className={({ isActive }) => cn(
                                "flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all",
                                isActive
                                    ? "bg-surface-subtle-blue text-primary font-semibold shadow-xs"
                                    : "text-text-secondary hover:text-text-primary hover:bg-slate-50"
                            )}
                        >
                            {({ isActive }) => (
                                <>
                                    <div className="flex items-center gap-3">
                                        <span className={cn(
                                            "material-symbols-outlined text-[20px]",
                                            item.name === 'AI Assistant' && !isActive ? "text-badge-purple-text" : ""
                                        )}>
                                            {item.icon}
                                        </span>
                                        <span>{item.name}</span>
                                    </div>
                                    {item.badge && (
                                        <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold", item.badgeClass)}>
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
            <div className="p-4 border-t border-border-subtle/60 relative" ref={menuRef}>
                {showUserMenu && (
                    <div className="absolute bottom-full left-4 right-4 mb-2 p-1.5 bg-surface-card border border-border-subtle rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150 z-50">

                        <button
                            onClick={handleSync}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-text-primary hover:bg-surface-subtle-blue hover:text-primary rounded-lg transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px] text-primary">sync</span>
                            <span>Sync Vault</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-status-danger-text hover:bg-status-danger-bg rounded-lg transition-colors"
                        >
                            <span className="material-symbols-outlined text-[18px]">logout</span>
                            <span>Logout</span>
                        </button>
                    </div>
                )}

                <div 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="p-3 rounded-xl bg-slate-50 border border-border-subtle hover:border-border-hover transition-colors flex items-center justify-between cursor-pointer"
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        {profile?.image ? (
                            <img
                                src={profile.image}
                                alt={formatName(profile?.name)}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-border-subtle shadow-xs"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    if (e.currentTarget.nextElementSibling) {
                                        e.currentTarget.nextElementSibling.style.display = 'flex';
                                    }
                                }}
                            />
                        ) : null}
                        <div className={`w-8 h-8 rounded-full bg-surface-subtle-blue text-primary items-center justify-center shrink-0 ${profile?.image ? 'hidden' : 'flex'}`}>
                            <span className="material-symbols-outlined text-[18px]">verified_user</span>
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-text-primary truncate">{formatName(profile?.name)}</span>
                            <span className="text-[11px] text-text-secondary truncate">
                                {(localStorage.getItem('eduvault_user_role') === 'teacher' || profile?.dob === 'TEACHER') ? 'Faculty Account' : `PRN: ${profile?.prn || profile?.rollNo || '—'}`}
                            </span>
                        </div>
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full bg-status-success-text animate-pulse shrink-0 ml-2" title="Online"></div>
                </div>
            </div>
        </aside>
    );
};

export default SovereignSidebar;

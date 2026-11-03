import React, { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import {
    DashboardSquare02Icon,
    BookOpen01Icon,
    MapsLocation02Icon,
    Notification02Icon,
    CalendarCheckIn01Icon,
    Settings02Icon,
    Mortarboard02Icon,
    RefreshIcon,
    Logout01Icon,
    Cancel01Icon,
    ArrowUp01Icon,
    UserIcon
} from 'hugeicons-react';
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
        } catch {
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
        {
            name: 'Home',
            icon: DashboardSquare02Icon,
            path: '/'
        },
        {
            name: 'Notes & PYQs',
            icon: BookOpen01Icon,
            path: '/notes'
        },
        {
            name: 'Roadmaps',
            icon: MapsLocation02Icon,
            path: '/roadmaps'
        },
        {
            name: 'Announcements',
            icon: Notification02Icon,
            path: '/announcements'
        },
        {
            name: isTeacher ? 'Attendance & NC' : 'Attendance',
            icon: CalendarCheckIn01Icon,
            path: '/attendance',
            badge: attendance ? `${attendance}%` : null,
        },
        {
            name: 'Settings',
            icon: Settings02Icon,
            path: '/settings'
        },
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
            {/* Brand Header */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-[#E2E2E2] shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#0073E6] flex items-center justify-center text-white shadow-xs shrink-0">
                        <Mortarboard02Icon size={20} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 leading-none">
                            <span className="font-extrabold text-[15px] tracking-tight text-[#383838]">Campusaxis</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-[#DEEDFC] text-[#0073E6] text-[8px] font-bold uppercase tracking-wider shrink-0">
                                Portal
                            </span>
                        </div>
                        <span className="text-[11px] font-medium text-[#727272] mt-0.5 truncate">
                            Student Academic Vault
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => setMobileMenuOpen && setMobileMenuOpen(false)}
                    className="md:hidden ml-2 p-1.5 rounded-lg text-[#727272] hover:text-[#383838] hover:bg-[#F2F7FC] transition-colors cursor-pointer shrink-0"
                    aria-label="Close sidebar"
                >
                    <Cancel01Icon size={18} />
                </button>
            </div>

            {/* Navigation Body */}
            <div className="px-3.5 py-4 flex-1 overflow-y-auto">
                <div className="text-[11px] font-bold text-[#727272] uppercase tracking-wider px-2 mb-2">
                    Workspace
                </div>
                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/'}
                                onClick={() => setMobileMenuOpen && setMobileMenuOpen(false)}
                                className={({ isActive }) => cn(
                                    "group flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer",
                                    isActive
                                        ? "bg-[#DEEDFC] text-[#0073E6] font-semibold shadow-2xs"
                                        : "text-[#383838] hover:bg-[#F2F7FC] hover:text-[#0073E6]"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <div className="flex items-center gap-3 min-w-0">
                                            <Icon
                                                size={18}
                                                className={cn(
                                                    "shrink-0 transition-colors",
                                                    isActive
                                                        ? "text-[#0073E6]"
                                                        : "text-[#727272] group-hover:text-[#0073E6]"
                                                )}
                                            />
                                            <span className="truncate">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                                            {item.chip && (
                                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-[#6A5AF9]/10 text-[#6A5AF9] border border-[#6A5AF9]/20">
                                                    {item.chip}
                                                </span>
                                            )}
                                            {item.badge && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DEEDFC] text-[#174073] border border-[#D9ECFF]">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>
            </div>

            {/* Active Session User Dock */}
            <div className="p-3 border-t border-[#E2E2E2] relative shrink-0 bg-white" ref={menuRef}>
                {showUserMenu && (
                    <div className="absolute bottom-full left-3 right-3 mb-2 p-1.5 bg-white border border-[#E2E2E2] rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150 z-50">
                        <button
                            onClick={handleSync}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#383838] hover:bg-[#DEEDFC]/50 hover:text-[#0073E6] rounded-lg transition-colors cursor-pointer"
                        >
                            <RefreshIcon size={16} className="text-[#0073E6]" />
                            <span>Refresh Data</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                            <Logout01Icon size={16} />
                            <span>Logout</span>
                        </button>
                    </div>
                )}

                <div
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="p-2.5 rounded-xl bg-[#F2F7FC] hover:bg-[#DEEDFC]/50 border border-[#E2E2E2] transition-colors flex items-center justify-between cursor-pointer group"
                    title="User Session"
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        {profile?.image ? (
                            <img
                                src={profile.image}
                                alt={formatName(profile?.name)}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    if (e.currentTarget.nextElementSibling) {
                                        e.currentTarget.nextElementSibling.style.display = 'flex';
                                    }
                                }}
                            />
                        ) : null}
                        <div className={`w-8 h-8 rounded-full bg-[#0073E6] text-white items-center justify-center shrink-0 font-bold text-xs ring-2 ring-white ${profile?.image ? 'hidden' : 'flex'}`}>
                            {profile?.name ? profile.name.charAt(0).toUpperCase() : <UserIcon size={16} />}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-[#383838] group-hover:text-[#0073E6] transition-colors truncate">
                                {formatName(profile?.name)}
                            </span>
                            <span className="text-[10px] text-[#727272] truncate font-medium">
                                {(localStorage.getItem('eduvault_user_role') === 'teacher' || profile?.dob === 'TEACHER') ? 'Faculty Account' : (profile?.prn || profile?.rollNo || 'Student')}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pl-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white shrink-0" title="Active Session" />
                        <ArrowUp01Icon size={14} className={cn("text-[#727272] transition-transform duration-200", showUserMenu && "rotate-180")} />
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default SovereignSidebar;

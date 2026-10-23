import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
    const navItems = [
        { icon: 'home', label: 'Home', path: '/', filled: true },
        { icon: 'description', label: 'Notes & PYQs', path: '/notes' },
        { icon: 'map', label: 'Roadmaps', path: '/roadmaps' },
        { icon: 'smart_toy', label: 'AI Assistant', path: '/ai' },
        { icon: 'campaign', label: 'Announcements', path: '/announcements' },
        { icon: 'calendar_check', label: 'Attendance', path: '/attendance' },
    ];

    return (
        <aside className="flex flex-col sticky left-0 top-0 h-screen w-64 border-r border-outline-variant/15 bg-surface-container-low z-40 hidden md:flex">
            <div className="px-6 py-8">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#d0bcff] to-[#a078ff] flex items-center justify-center rounded">
                        <span className="material-symbols-outlined text-on-primary-container text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>terminal</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-bold text-on-surface tracking-tighter">Campusaxis</span>
                        <span className="text-[10px] font-medium tracking-tight uppercase text-on-surface-variant/60">Academic Center</span>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-3 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2 font-medium tracking-tight transition-colors duration-150 ease-in-out text-sm ${isActive
                                ? 'bg-surface-container-high text-primary'
                                : 'text-on-surface-variant/60 hover:bg-surface-container'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontVariationSettings: isActive || item.filled ? "'FILL' 1" : "'FILL' 0" }}
                                >
                                    {item.icon}
                                </span>
                                {item.label}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-3 mt-auto">
                <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 text-sm font-medium tracking-tight transition-colors ${isActive ? 'text-primary' : 'text-on-surface-variant/60 hover:bg-surface-container'
                        }`
                    }
                >
                    <span className="material-symbols-outlined">settings</span>
                    Settings
                </NavLink>

                <div className="mt-4 p-4 bg-surface-container-lowest rounded-lg border border-outline-variant/15">
                    <div className="flex items-center gap-3">
                        <img
                            alt="Sovereign Scholar User Avatar"
                            className="w-8 h-8 rounded-full bg-surface-container-high"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCM6xu9pfKEAgvrF0iuZkWYniw8HV2stddtffu76LwvfGClCiM1EJ9eD5Vg-WndlBdvBJZiqISF4VGjm4uOHuB-Dy_2EjjZoA8eRxBFTEvgvA4wiDp9hannNxnWLo4ERTYMG8NJxzYAMeNaNDx28wxVdcXrSx_dANcz-4-NRQ5p10NWzN52UxbddcF1G0wNUOSXpwk3uIxwPKG2PT3jeklfd40RlsdOwk0bNhRo_q_EMpMzlHb3-ij1JDwSsCuH29tnmfCz5TNULw"
                        />
                        <div className="overflow-hidden">
                            <p className="text-xs font-semibold truncate">Alex Sovereign</p>
                            <p className="text-[10px] text-on-surface-variant/60">PRN: 2024098234</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;

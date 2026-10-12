import React from 'react';

const TopNav = () => {
    return (
        <header className="flex justify-between items-center w-full px-6 py-3 sticky top-0 z-50 bg-surface/60 backdrop-blur-xl border-b border-outline-variant/15">
            <div className="flex items-center gap-4 flex-1">
                <div className="relative w-full max-w-md">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">search</span>
                    <input 
                        className="w-full bg-surface-container-lowest border border-outline-variant/15 rounded-sm pl-10 pr-4 py-1.5 text-sm focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all outline-none" 
                        placeholder="Search resources, notes, or topics..." 
                        type="text"
                    />
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary hover:bg-surface-container rounded-sm transition-all duration-200">
                    <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                    AI Assistant
                </button>
                
                <button className="px-3 py-1.5 bg-gradient-to-br from-primary to-primary-container text-on-primary font-semibold text-sm rounded-sm hover:opacity-90 transition-all active:scale-95">
                    Upload
                </button>
                
                <div className="h-6 w-[1px] bg-outline-variant/20 mx-2"></div>
                
                <button className="text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">notifications</span>
                </button>
                
                <img 
                    alt="User profile settings" 
                    className="w-8 h-8 rounded-full border border-outline-variant/30" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAjen2MgFo1QsLqnNegHqzcMsFpyMQ73RZoO6w6NrIXA0EOREvp2bgTluAHC_bQP9dao6Z4qjAnrqgmSYYWQ7pxlOIGAKB_h3Ijmx62OA3NI4KjMywM2FRECrV0ARJWkcY5qNa8eGuva5A7fPRqAFWxdzTq99P4gcQn-yHjL4PhfpgOTyVTtcExzlUU659GuvwPloTuipUZLq_FroACAqkRsSHIntMK4ONgCE9pUoMcizyDY7ddXGMsWjn4I0Lcn_sfAFBeBabsA" 
                />
            </div>
        </header>
    );
};

export default TopNav;

import React from 'react';
import { Search, UploadCloud, MessageSquare } from 'lucide-react';
import ProfilePanel from './ProfilePanel';
import { Input } from '@/components/ui/input';

const TopNav = ({ onUploadClick, onSearch, searchQuery }) => {
  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex-shrink-0">
      
      {/* Spacer for when logo is moved to sidebar */}
      <div></div>

      {/* Global Search */}
      <div className="flex-1 max-w-xl mx-8">
        <div className="relative group">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors" />
          <Input 
            type="text" 
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search notes, topics, or subjects..." 
            className="w-full h-9 bg-muted/40 border-transparent hover:border-border/80 focus-visible:ring-1 focus-visible:ring-ring focus:bg-background rounded-md pl-9 pr-3 text-sm transition-all"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onUploadClick}
          className="flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
        >
          <UploadCloud className="w-4 h-4" />
          Upload
        </button>
        
        <button className="flex items-center gap-2 h-9 px-4 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-all shadow-sm">
          <MessageSquare className="w-4 h-4" />
          Tutor
        </button>
        
        <div className="h-5 w-px bg-border mx-2"></div>

        <ProfilePanel />
      </div>
    </header>
  );
};

export default TopNav;

import React from 'react';
import { BookOpen, Hash } from 'lucide-react';
import clsx from 'clsx';

const SubjectExplorer = ({ subjects, selectedId, onSelect }) => {
  return (
    <div className="py-4 flex flex-col h-full">
      <div className="px-4 mb-2 text-xs font-semibold text-notion-textLight tracking-wider uppercase">
        Subjects
      </div>
      
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        
        <button
          onClick={() => onSelect(null)}
          className={clsx(
            "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors",
            selectedId === null 
              ? "bg-notion-border/40 font-medium" 
              : "text-notion-textLight hover:bg-notion-border/30"
          )}
        >
          <Hash className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">All Notes</span>
        </button>

        {subjects.map(subject => (
          <button
            key={subject.id}
            onClick={() => onSelect(subject.id)}
            className={clsx(
              "w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-left transition-colors group",
              selectedId === subject.id 
                ? "bg-notion-border/40 font-medium text-notion-text" 
                : "text-notion-textLight hover:bg-notion-border/30"
            )}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <BookOpen className={clsx("w-4 h-4 flex-shrink-0", selectedId === subject.id ? "text-notion-blue" : "")} />
              <span className="truncate">{subject.name}</span>
            </div>
            
            <span className="text-xs text-notion-textLight opacity-0 group-hover:opacity-100 transition-opacity">
              {subject.noteCount}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SubjectExplorer;

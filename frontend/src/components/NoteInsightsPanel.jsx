import React, { useState, useEffect } from 'react';
import { Sparkles, MessageCircle, HelpCircle, FileText, Download, Loader2, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import axios from 'axios';

const API_BASE = 'http://localhost:8081/api';

const NoteInsightsPanel = ({ noteId, onClose, onDelete }) => {
  const [note, setNote] = useState(null);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tempTags, setTempTags] = useState([]);

  // Poll for updates if note is processing
  useEffect(() => {
    if (!noteId) return;
    
    let interval;
    const fetchNote = async () => {
      try {
        const res = await axios.get(`${API_BASE}/notes/${noteId}`);
        setNote(res.data);
        
        // If status changed from processing to something else, stop polling
        if (res.data.status !== 'processing' && interval) {
            clearInterval(interval);
        }
      } catch (err) {
        console.error("Failed to fetch note details", err);
      }
    };

    fetchNote();
    interval = setInterval(fetchNote, 3000); 

    return () => clearInterval(interval);
  }, [noteId]);

  const handleDownload = () => {
    if (note) {
      window.open(`${API_BASE}/files/${note.id}`, '_blank');
    }
  };

  const handleDelete = async () => {
      if (window.confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
          try {
              await axios.delete(`${API_BASE}/notes/${note.id}`);
              toast.success("Note deleted successfully.");
              onDelete(); 
          } catch (err) {
              toast.error("Failed to delete note.");
          }
      }
  };

  const handleEditTags = () => {
      setTempTags(note?.tags || []);
      setIsEditingTags(true);
      setTagInput('');
  };

  const handleAddTag = (e) => {
      if (e.key === 'Enter' && tagInput.trim()) {
          e.preventDefault();
          const newTag = tagInput.trim();
          if (!tempTags.includes(newTag)) {
              setTempTags([...tempTags, newTag]);
          }
          setTagInput('');
      }
  };

  const removeTempTag = (tagToRemove) => {
      setTempTags(tempTags.filter(tag => tag !== tagToRemove));
  };

  const saveTags = async () => {
      try {
          const res = await axios.put(`${API_BASE}/notes/${note.id}/tags`, { tags: tempTags });
          setNote(res.data);
          setIsEditingTags(false);
          toast.success("Tags updated successfully.");
      } catch (err) {
          toast.error("Failed to update tags.");
      }
  };

  const cancelEditTags = () => {
      setIsEditingTags(false);
      setTempTags([]);
      setTagInput('');
  };

  const isProcessing = note?.status === 'processing';
  const hasAiTopics = note?.aiImportantTopics && note.aiImportantTopics.length > 0;
  const hasAiQuestions = note?.aiGeneratedQuestions && note.aiGeneratedQuestions.length > 0;

  return (
    <Sheet open={!!noteId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background border-l">
        <SheetHeader className="p-6 pb-2 border-b flex-shrink-0 flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-muted-foreground" />
            Note Insights
          </SheetTitle>
          {note && (
             <Button variant="ghost" size="icon" onClick={handleDelete} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Delete Note">
               <Trash2 className="w-4 h-4" />
             </Button>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto w-full">
          {!note ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-32 w-full mt-6" />
            </div>
          ) : (
            <div className="p-6 flex flex-col gap-6 relative pb-24">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-3 leading-tight tracking-tight">
                  {note.title}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{note.semester}</Badge>
                  <Badge variant="outline" className="capitalize">{note.examType}</Badge>
                  {note.department && <Badge variant="outline">{note.department}</Badge>}
                  <Badge variant="outline" className="text-muted-foreground border-transparent bg-muted/50">By {note.uploadedBy}</Badge>
                </div>

                {/* Tags Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">Tags</h4>
                    {!isEditingTags && (
                      <Button variant="ghost" size="sm" onClick={handleEditTags} className="text-xs h-6 px-2">
                        Edit Tags
                      </Button>
                    )}
                  </div>
                  
                  {isEditingTags ? (
                    <div className="space-y-2">
                      <Input 
                        value={tagInput} 
                        onChange={e => setTagInput(e.target.value)} 
                        placeholder="Add tags (press Enter)" 
                        onKeyDown={handleAddTag}
                        className="w-full"
                      />
                      {tempTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {tempTags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              {tag}
                              <button 
                                type="button" 
                                onClick={() => removeTempTag(tag)}
                                className="ml-1 text-xs hover:text-destructive"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveTags} className="text-xs h-6">
                          Save
                        </Button>
                        <Button variant="outline" size="sm" onClick={cancelEditTags} className="text-xs h-6">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {note.tags && note.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {note.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No tags added yet.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={handleDownload} className="w-full bg-primary/10 text-primary hover:bg-primary/20 shadow-none border border-primary/20">
                <Download className="w-4 h-4 mr-2" /> Download Original Document
              </Button>

              {isProcessing && (
                  <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm font-medium text-primary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AI is analyzing this document...
                  </div>
              )}

              {hasAiTopics && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Key Exam Topics</h3>
                    </div>
                    <ul className="space-y-2.5 bg-muted/30 p-4 rounded-xl border border-border/50">
                        {note.aiImportantTopics.map((topic, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                            <span className="text-foreground/90 leading-relaxed">{topic}</span>
                        </li>
                        ))}
                    </ul>
                  </div>
              )}

              {hasAiQuestions && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-blue-500" />
                        <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider">Practice Questions</h3>
                    </div>
                    <div className="space-y-3">
                        {note.aiGeneratedQuestions.map((q, idx) => (
                        <div key={idx} className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                            <p className="text-sm text-foreground/90 font-medium mb-3 leading-relaxed">
                              {q.q}
                            </p>
                            <div className="flex gap-2">
                              <Badge variant="secondary" className="text-[10px] text-blue-600 bg-blue-100/50 hover:bg-blue-100/50 border-transparent px-2 shadow-none">{q.type}</Badge>
                              <Badge variant="secondary" className="text-[10px] text-zinc-600 bg-zinc-100/50 hover:bg-zinc-100/50 border-transparent px-2 shadow-none">{q.difficulty}</Badge>
                            </div>
                        </div>
                        ))}
                    </div>
                  </div>
              )}

              {!isProcessing && !hasAiTopics && !hasAiQuestions && (
                  <div className="mt-4 text-center p-8 border border-dashed border-border rounded-xl text-sm text-muted-foreground bg-muted/20">
                      <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium text-foreground/70">No AI insights available.</p>
                      <p className="text-xs mt-1.5">Processing failed or no text could be extracted.</p>
                  </div>
              )}
            </div>
          )}
        </div>

        {note && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border/50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-10">
            <Button className="w-full shadow-sm text-sm" size="lg">
              <MessageCircle className="w-4 h-4 mr-2" />
              Ask Tutor about this note
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default NoteInsightsPanel;

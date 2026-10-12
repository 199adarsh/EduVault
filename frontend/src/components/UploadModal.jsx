import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import clsx from 'clsx';

const API_BASE = 'http://localhost:8081/api';

const UploadModal = ({ onClose, subjects, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examType, setExamType] = useState('mid-sem');
  const [unit, setUnit] = useState('Unit 1');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [uploaderName, setUploaderName] = useState('Anonymous');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');

  // Auto-fill from profile
  useEffect(() => {
    axios.get(`${API_BASE}/profile`)
      .then(res => {
         if (res.data) {
             if (res.data.name) setUploaderName(res.data.name);
         }
      })
      .catch(err => console.error(err));
  }, []);

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      if (!title) setTitle(acceptedFiles[0].name.replace(/\.[^/.]+$/, ""));
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-powerpoint': ['.ppt', '.pptx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1
  });

  const handleSubjectChange = (val) => {
    if (val === 'CREATE_NEW') {
        setIsCreatingSubject(true);
        setSubjectId('');
        return;
    }
    setSubjectId(val);
  };

  const handleCreateSubject = async () => {
      if (!newSubjectName.trim()) return;
      try {
          const res = await axios.post(`${API_BASE}/subjects`, {
              name: newSubjectName
          });
          onSuccess(); // Refresh subjects list
          setSubjectId(res.data.id);
          setIsCreatingSubject(false);
          setNewSubjectName('');
      } catch (err) {
          toast.error("Failed to create subject");
      }
  };

  const handleAddTag = (e) => {
      if (e.key === 'Enter' && tagInput.trim()) {
          e.preventDefault();
          const newTag = tagInput.trim();
          if (!tags.includes(newTag)) {
              setTags([...tags, newTag]);
          }
          setTagInput('');
      }
  };

  const removeTag = (tagToRemove) => {
      setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleUpload = async () => {
    if (!file || !title || !subjectId) {
        toast.error("Please fill in all required fields (file, title, subject)");
        return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('subjectId', subjectId);
    formData.append('unit', unit);
    formData.append('examType', examType);
    formData.append('tags', JSON.stringify(tags));
    formData.append('uploaderName', uploaderName);

    try {
      await axios.post(`${API_BASE}/notes/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      });
      toast.success("File uploaded successfully! AI is analyzing the document.");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Study Material</DialogTitle>
          <DialogDescription>
            Upload your PDF or PPT notes. The AI will automatically extract key topics and practice questions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-4">
            <div 
              {...getRootProps()} 
              className={clsx(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors outline-none",
                isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                isDragActive ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50",
                file ? "bg-muted/30 border-solid" : ""
              )}
            >
              <input {...getInputProps()} disabled={isUploading} />
              
              {file ? (
                <div className="flex flex-col items-center justify-center">
                  <File className="w-8 h-8 text-foreground mb-2" />
                  <p className="font-medium text-sm text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  {!isUploading && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-xs text-destructive hover:text-destructive/80 mt-3 font-medium">Remove File</button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground/50" />
                  <p className="text-sm font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs mt-1">PDF, DOCX, PPT, PPTX (max 50MB)</p>
                </div>
              )}
              {isUploading && (
                <div className="w-full mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-muted/50 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. CPU Scheduling Notes" disabled={isUploading} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between">
                    <span>Subject</span>
                    {isCreatingSubject && <button type="button" onClick={() => setIsCreatingSubject(false)} className="text-primary lowercase">Cancel</button>}
                </label>
                {isCreatingSubject ? (
                    <div className="flex gap-2">
                        <Input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="New Subject Name" autoFocus />
                        <Button type="button" onClick={handleCreateSubject}>Add</Button>
                    </div>
                ) : (
                    <Select value={subjectId || undefined} onValueChange={handleSubjectChange} disabled={isUploading}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a subject" />
                        </SelectTrigger>
                        <SelectContent>
                            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            <SelectItem value="CREATE_NEW" className="font-bold text-primary">+ Create New Subject</SelectItem>
                        </SelectContent>
                    </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit</label>
                <Select value={unit || undefined} onValueChange={setUnit} disabled={isUploading}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Unit" />
                    </SelectTrigger>
                    <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(unitNum => (
                            <SelectItem key={unitNum} value={`Unit ${unitNum}`}>Unit {unitNum}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</label>
                <div className="space-y-2">
                  <Input 
                    value={tagInput} 
                    onChange={e => setTagInput(e.target.value)} 
                    placeholder="Add tags (press Enter)" 
                    disabled={isUploading}
                    onKeyDown={handleAddTag}
                    className="w-full"
                  />
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <button 
                            type="button" 
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-xs hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type of Material</label>
                    <Select value={examType || undefined} onValueChange={setExamType} disabled={isUploading}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="mid-sem">Mid-Sem Notes</SelectItem>
                            <SelectItem value="end-sem">End-Sem Notes</SelectItem>
                            <SelectItem value="slides">Lecture Slides</SelectItem>
                            <SelectItem value="competitive">Competitive Exam</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Name</label>
                    <Input value={uploaderName} onChange={e => setUploaderName(e.target.value)} placeholder="Anonymous" disabled={isUploading} />
                  </div>
              </div>
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || !title || !subjectId || isUploading}>
             {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : 'Upload File'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UploadModal;

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  X,
  ChevronDown,
  Search,
  BookOpen,
  Layers,
  Sparkles,
  Loader2
} from 'lucide-react';

const API_BASE = 'http://localhost:8081/api';

/**
 * Custom High-Reliability Dropdown Component
 * Avoids Portal/Z-Index issues by rendering inline absolute lists
 */
const CustomSelect = ({ label, icon: Icon, value, options, onChange, placeholder, searchable = false, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = searchable
    ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="flex flex-col gap-1.5 relative w-full" ref={dropdownRef}>
      <label className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.1em] px-1 flex items-center gap-2">
        {Icon && <Icon size={12} className="opacity-50" />}
        {label}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm bg-surface-container-lowest border rounded transition-all duration-200 text-left outline-none ${isOpen ? 'border-primary ring-1 ring-primary/20 bg-surface-container-low' : 'border-outline-variant/10 hover:border-outline-variant/30'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`truncate flex-1 ${!selectedOption ? 'text-on-surface-variant/30' : 'text-on-surface'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} className={`text-on-surface-variant/40 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full z-[200] bg-surface-container-low border border-outline-variant/20 rounded shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-outline-variant/10 bg-surface-container">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Filter options..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant/10 text-[11px] py-1.5 pl-8 pr-3 rounded focus:ring-primary/40 outline-none text-on-surface"
                />
              </div>
            </div>
          )}
          <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors text-left group ${value === opt.value ? 'bg-primary/10 text-primary font-medium' : 'text-on-surface-variant hover:bg-surface-container-highest'
                    }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full transition-all ${value === opt.value ? 'bg-primary scale-125' : 'bg-transparent'}`} />
                  {opt.label}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-on-surface-variant/40 italic">No matches found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const UploadNotesView = ({ subjects, onSuccess, profile }) => {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [unit, setUnit] = useState('Unit 1');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Map subjects for CustomSelect
  const subjectOptions = subjects.map(s => ({ label: s.name, value: s.id }));
  const unitOptions = Array.from({ length: 10 }, (_, i) => ({ label: `Unit ${i + 1}`, value: `Unit ${i + 1}` }));

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: acceptedFiles => {
      if (acceptedFiles?.length > 0) {
        const selectedFile = acceptedFiles[0];
        if (selectedFile.size > 50 * 1024 * 1024) {
          toast.error('File size exceeds 50MB limit.');
          return;
        }
        setFile(selectedFile);
        // Default title to filename without extension
        if (!title) {
          setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
        }
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
    },
    maxFiles: 1
  });

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
      toast.error('Please complete all required fields.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('subjectId', subjectId);
    formData.append('unit', unit);
    formData.append('tags', JSON.stringify(tags));
    formData.append('uploaderName', profile?.name || 'Anonymous');

    try {
      await axios.post(`${API_BASE}/notes/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      });
      toast.success("Upload successful! Document sent to AI Vault.");
      setFile(null);
      setTitle('');
      onSuccess();
    } catch (err) {
      toast.error('Upload failed. Connection error.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Header Area */}
      <div className="flex flex-col gap-1 items-center text-center">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-1 shadow-2xl shadow-primary/10 border border-primary/20">
          <UploadCloud size={24} />
        </div>
        <h2 className="text-2xl font-medium tracking-tight text-on-surface">Data Vault Ingestion</h2>
        <p className="text-on-surface-variant/50 text-[10px] font-bold uppercase tracking-[0.2em]">Sovereign Academic Protocol</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Side: File Upload */}
        <div className="lg:col-span-3 space-y-4">
          <div
            {...getRootProps()}
            className={`relative h-full min-h-[320px] border-2 border-dashed rounded-[1.5rem] p-6 flex flex-col items-center justify-center transition-all duration-500 overflow-hidden ${isDragActive ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-outline-variant/20 bg-surface-container-lowest/30 hover:bg-surface-container-low/50 hover:border-outline-variant/40'
              } ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
          >
            <input {...getInputProps()} />

            {file ? (
              <div className="space-y-4 text-center animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-surface-container-highest rounded-2xl flex items-center justify-center mx-auto text-primary relative shadow-xl">
                  <FileText size={32} />
                  <div className="absolute -top-1 -right-1 bg-green-500 text-on-primary w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle2 size={12} />
                  </div>
                </div>
                <div>
                  <p className="font-medium text-base text-on-surface break-all max-w-sm px-4">{file.name}</p>
                  <p className="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-widest mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="px-5 py-1.5 rounded-full border border-outline-variant/20 text-[10px] font-bold uppercase tracking-widest hover:bg-surface-container-highest transition-colors">Replace File</button>
              </div>
            ) : (
              <div className="text-center space-y-4 max-w-xs">
                <div className="w-16 h-16 bg-surface-container-low rounded-[1.5rem] flex items-center justify-center mx-auto text-on-surface-variant/20 border border-outline-variant/10 group-hover:scale-110 transition-transform duration-500">
                  <UploadCloud size={32} />
                </div>
                <div>
                  <p className="text-base font-medium text-on-surface">Transmission Interface</p>
                  <p className="text-[10px] text-on-surface-variant/40 mt-1 leading-relaxed">Drop your study material here.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-4 opacity-40 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700">
                  <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-1 rounded font-black tracking-tighter">PDF</span>
                  <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-1 rounded font-black tracking-tighter">DOCX</span>
                  <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded font-black tracking-tighter">PPTX</span>
                </div>
              </div>
            )}

            {isUploading && (
              <div className="absolute bottom-0 left-0 w-full p-8 bg-surface/80 backdrop-blur-md border-t border-outline-variant/10 animate-in slide-in-from-bottom-full duration-500">
                <div className="flex justify-between items-end mb-3">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Synchronizing Vault</p>
                    <p className="text-sm font-medium text-on-surface truncate max-w-[200px]">{file?.name}</p>
                  </div>
                  <span className="text-2xl font-black text-primary">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
                  <div className="bg-primary h-full transition-all duration-300 rounded-full shadow-[0_0_10px_rgba(208,188,255,0.5)]" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Metadata Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-surface-container-lowest/30 p-5 rounded-[1.5rem] border border-outline-variant/15 space-y-4 h-full">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.1em] px-1">Title</label>
              <div className="relative">
                <Sparkles size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" />
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Descriptive Title..."
                  disabled={isUploading}
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 text-xs pl-9 pr-4 py-2 rounded focus:ring-1 focus:ring-primary/40 outline-none text-on-surface transition-all hover:border-outline-variant/30"
                />
              </div>
            </div>

            <CustomSelect
              label="Subject"
              icon={BookOpen}
              value={subjectId}
              options={subjectOptions}
              onChange={setSubjectId}
              placeholder="Select Subject..."
              searchable={true}
              disabled={isUploading}
            />

            <CustomSelect
              label="Unit"
              icon={Layers}
              value={unit}
              options={unitOptions}
              onChange={setUnit}
              placeholder="Select Unit..."
              disabled={isUploading}
            />

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.1em] px-1">Tags</label>
              <div className="space-y-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add tags (press Enter)"
                  disabled={isUploading}
                  onKeyDown={handleAddTag}
                  className="w-full bg-surface-container-lowest border border-outline-variant/10 text-xs px-3 py-2 rounded focus:ring-1 focus:ring-primary/40 outline-none text-on-surface transition-all hover:border-outline-variant/30"
                />
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-[10px] rounded-full border border-primary/20">
                        {tag}
                        <button 
                          type="button" 
                          onClick={() => removeTag(tag)}
                          className="text-xs hover:text-destructive ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/5 space-y-3">
              <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/10 text-[10px] text-on-surface-variant/60 leading-relaxed italic">
                <div className="flex gap-2 mb-1 not-italic font-bold text-primary uppercase tracking-widest text-[9px] items-center">
                  <Sparkles size={10} />
                  Post-Ingest Logic
                </div>
                Our high-fidelity LLM will autonomously synthesize this document.
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || !title || !subjectId || isUploading}
                className={`w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all duration-300 shadow-xl ${!file || !title || !subjectId || isUploading
                    ? 'bg-surface-container-highest text-on-surface-variant/30 cursor-not-allowed shadow-none grayscale'
                    : 'bg-gradient-to-br from-primary to-primary-container text-on-primary hover:brightness-110 active:scale-95 shadow-primary/20'
                  }`}
              >
                {isUploading ? (
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 size={14} className="animate-spin" />
                    Processing...
                  </div>
                ) : 'Initiate Secure Ingest'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadNotesView;

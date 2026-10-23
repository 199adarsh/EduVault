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

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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
    <div className="flex flex-col gap-1 relative w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-slate-700 dark:text-white px-0.5 flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-slate-400 dark:text-slate-300" />}
        {label}
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg transition-all text-left outline-none cursor-pointer ${
          isOpen ? 'ring-1 ring-blue-500 border-blue-500' : 'hover:border-slate-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`truncate flex-1 font-medium ${!selectedOption ? 'text-slate-400 dark:text-white' : 'text-slate-900 dark:text-white'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={14} className={`text-slate-400 dark:text-slate-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 w-full z-[200] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-1 duration-150 overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Filter options..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs py-1.5 pl-8 pr-3 rounded-md outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
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
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-colors text-left cursor-pointer ${
                    value === opt.value
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                      : 'text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${value === opt.value ? 'bg-blue-600' : 'bg-transparent'}`} />
                  {opt.label}
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">No matches found</div>
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
    <div className="w-full space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Side: File Upload Dropzone */}
        <div className="lg:col-span-3 space-y-4">
          <div
            {...getRootProps()}
            className={`relative h-full min-h-[300px] border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all overflow-hidden ${
              isDragActive
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100/70 hover:border-slate-400'
            } ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
          >
            <input {...getInputProps()} />

            {file ? (
              <div className="space-y-3 text-center">
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-xl flex items-center justify-center mx-auto relative border border-blue-200">
                  <FileText size={28} />
                  <div className="absolute -top-1 -right-1 bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={12} />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 break-all max-w-sm px-4">{file.name}</p>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready to upload</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Change File
                </button>
              </div>
            ) : (
              <div className="text-center space-y-3 max-w-xs">
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto text-slate-400 border border-slate-200 dark:border-slate-700">
                  <UploadCloud size={28} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Drag &amp; drop document</p>
                  <p className="text-xs text-slate-500 mt-0.5">or click to browse files from device</p>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                  <span className="text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded">PDF</span>
                  <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">DOCX</span>
                  <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">PPTX</span>
                </div>
              </div>
            )}            {isUploading && (
              <div className="absolute bottom-0 left-0 w-full p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Uploading note...</span>
                  <span className="text-xs font-bold text-blue-600 font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-full transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Metadata Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 h-full">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-white px-0.5">Note Title</label>
              <div className="relative">
                <Sparkles size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Unit 1 Introduction Notes"
                  disabled={isUploading}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs pl-9 pr-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
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
              <label className="text-xs font-bold text-slate-700 dark:text-white px-0.5">Tags</label>
              <div className="space-y-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add tags (press Enter)"
                  disabled={isUploading}
                  onKeyDown={handleAddTag}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white transition-all"
                />
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] rounded-md border border-blue-200 dark:border-blue-800">
                        {tag}
                        <button 
                          type="button" 
                          onClick={() => removeTag(tag)}
                          className="hover:text-rose-600 ml-0.5 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
              <button
                onClick={handleUpload}
                disabled={!file || !title || !subjectId || isUploading}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  !file || !title || !subjectId || isUploading
                    ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                }`}
              >
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Uploading...</span>
                  </div>
                ) : 'Upload Note'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadNotesView;

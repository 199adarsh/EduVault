"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { DropdownDisclosure } from "../dropdown-disclosure";
import { Book02Icon, BookOpen01Icon, Layers01Icon, ArrowUp02Icon, Loading01Icon, Cancel01Icon } from "hugeicons-react";
import { motion } from "framer-motion";
import {
  PiArrowUpBold,
  PiBrainFill,
  PiMicrophoneBold,
  PiMicrophoneFill,
  PiXBold,
} from "react-icons/pi";

export type RobotEmotion = "reading" | "thinking";

export function EyeLED({
  emotion,
  isBlinking,
  offsetX,
}: {
  emotion: RobotEmotion;
  isBlinking: boolean;
  offsetX: number;
}) {
  const isThinking = emotion === "thinking";

  if (isBlinking && !isThinking) {
    return <div className="w-2 h-1 rounded-xs bg-emerald-400 shadow-[0_0_6px_#10b981]" />;
  }

  if (isThinking) {
    return (
      <motion.div
        className="w-2 h-3.5 rounded-xs bg-amber-400 shadow-[0_0_8px_#facc15]"
        animate={{ y: [-1, -3, -1] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      />
    );
  }

  return (
    <motion.div
      className="w-2 h-4 rounded-xs bg-emerald-400 shadow-[0_0_8px_#34d399]"
      animate={{ x: offsetX }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    />
  );
}

export function RobotBeta({
  emotion = "reading",
  textLength = 0,
  isListening = false,
  className = "",
}: {
  emotion?: RobotEmotion;
  textLength?: number;
  isListening?: boolean;
  className?: string;
}) {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (emotion !== "thinking") {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 140);
      }
    }, 2800 + Math.random() * 2200);
    return () => clearInterval(interval);
  }, [emotion]);

  const eyeOffset = Math.sin(textLength * 0.45) * 5;

  const getEarStyle = () => {
    if (isListening) return "bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse";
    if (emotion === "thinking") return "bg-amber-400 shadow-[0_0_6px_#facc15]";
    return "bg-emerald-400 shadow-[0_0_6px_#10b981]";
  };

  return (
    <motion.div
      className={`relative flex items-center justify-center select-none ${className}`}
      animate={{
        y: emotion === "thinking" ? [0, -3, 0] : [0, -1.5, 0],
      }}
      transition={{
        y: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      <div className="relative flex items-center justify-center">
        <div className={`absolute -left-1.5 w-1 h-4 rounded-l-xs transition-all duration-300 ${getEarStyle()}`} />
        <div className={`absolute -right-1.5 w-1 h-4 rounded-r-xs transition-all duration-300 ${getEarStyle()}`} />

        <div className="w-16 h-11 rounded-xl bg-white dark:bg-zinc-800 border-2 border-black/10 dark:border-white/20 flex items-center justify-center p-1.5 shadow-md">
          <div className="relative w-full h-full bg-[#0a0a0c] rounded-lg flex items-center justify-center gap-2 overflow-hidden shadow-inner">
            <div className="relative z-10 flex items-center justify-center gap-2">
              <EyeLED emotion={emotion} isBlinking={isBlinking} offsetX={eyeOffset} />
              <EyeLED emotion={emotion} isBlinking={isBlinking} offsetX={eyeOffset} />
            </div>

            <div
              className="absolute inset-0 pointer-events-none z-20"
              style={{
                backgroundImage: "linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.6) 50%)",
                backgroundSize: "100% 3px",
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export interface AiMascotInputProps {
  onSubmit?: (data: { prompt: string }) => void;
  isProcessing?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  // Scope controls
  selectedSubject?: string;
  setSelectedSubject?: (val: string) => void;
  selectedUnit?: string;
  setSelectedUnit?: (val: string) => void;
  allKnownSubjects?: Array<{ id: string; name: string; code?: string }>;
  isInvalidSubject?: boolean;
  hasCompiledOkf?: boolean;
  compiledCount?: number;
  pendingCount?: number;
  subjectNotesCount?: number;
}

export function AiMascotInput({
  value,
  onChange,
  onSubmit,
  onSend,
  onClear,
  disabled = false,
  isProcessing = false,
  isLoading = false,
  emotion = "reading",
  placeholder = "Ask any academic question across your enrolled subjects...",
  className = "",
  selectedSubject = "all",
  setSelectedSubject,
  selectedUnit = "all",
  setSelectedUnit,
  allKnownSubjects = [],
  isInvalidSubject = false,
  showVoice = false,
  hasCompiledOkf = false,
  compiledCount = 0,
  pendingCount = 0,
  subjectNotesCount = 0,
}: AiMascotInputProps) {
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [isUnitOpen, setIsUnitOpen] = useState(false);
  const [internalPrompt, setInternalPrompt] = useState("");
  
  const subjectItems = useMemo(() => [
    {
      id: "all",
      name: "All Enrolled",
      description: "Search all course notes",
      icon: <BookOpen01Icon size={14} />,
    },
    ...(Array.isArray(allKnownSubjects) ? allKnownSubjects : []).filter(Boolean).map((s) => ({
      id: typeof s === "string" ? s : (s.id || s.code || s.name || "sub"),
      name: typeof s === "string" ? s : (s.name || s.code || "Subject"),
      description: typeof s === "string" ? "" : (s.code || "Course Subject"),
      icon: <Book02Icon size={14} />,
    })),
  ], [allKnownSubjects]);

  const unitItems = useMemo(() => [
    { id: "all", name: "All Units", description: "Entire syllabus", icon: <Layers01Icon size={14} /> },
    { id: "UNIT 01", name: "Unit 1", description: "Module 1", icon: <Layers01Icon size={14} /> },
    { id: "UNIT 02", name: "Unit 2", description: "Module 2", icon: <Layers01Icon size={14} /> },
    { id: "UNIT 03", name: "Unit 3", description: "Module 3", icon: <Layers01Icon size={14} /> },
    { id: "UNIT 04", name: "Unit 4", description: "Module 4", icon: <Layers01Icon size={14} /> },
    { id: "UNIT 05", name: "Unit 5", description: "Module 5", icon: <Layers01Icon size={14} /> },
  ], []);
const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const promptText = value !== undefined ? value : internalPrompt;

  const handlePromptChange = (val: string) => {
    if (onChange) onChange(val);
    if (value === undefined) setInternalPrompt(val);
  };

  const processing = isProcessing || isLoading;

  const handleSend = () => {
    if (disabled || !promptText.trim() || processing) return;
    if (onSubmit) {
      onSubmit({ prompt: promptText.trim() });
    } else if (onSend) {
      onSend();
    }
    if (value === undefined) setInternalPrompt("");
  };

  const toggleVoice = () => {
    if (disabled) return;
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { }
        recognitionRef.current = null;
      }
      setIsListening(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e: any) => {
        const transcript = Array.from(e.results)
          .map((r: any) => r[0]?.transcript || "")
          .join("");
        if (transcript) {
          handlePromptChange(promptText ? `${promptText.trim()} ${transcript}` : transcript);
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const canSend = Boolean(promptText.trim()) && !disabled && !processing;

  return (
    <div className={`relative w-full max-w-3xl mx-auto flex flex-col items-center ${className}`}>

      {/* ChatGPT-Style Chatbar */}
      <div className="w-full rounded-[24px] bg-white dark:bg-[#212121] border border-[#E2E2E2] dark:border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] focus-within:border-[#B4B4B4] dark:focus-within:border-white/20 transition-all p-3 sm:px-4 sm:py-3">

        {/* Textarea: Strictly No Blue Browser Outline */}
        <textarea
          ref={textareaRef}
          id="aiPromptInput"
          value={promptText}
          onChange={(e) => handlePromptChange(e.target.value)}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={placeholder}
          rows={2}
          style={{ outline: "none", border: "none", boxShadow: "none" }}
          className="w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus:border-0 shadow-none p-0 text-sm text-[#383838] dark:text-white placeholder-[#727272] leading-relaxed resize-none min-h-[44px] max-h-[140px]"
        />

        {/* Toolbar Row */}
        <div className="flex items-center justify-between pt-2 mt-1">
          {/* Left: Scope Selection Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {setSelectedSubject && (
              <>
                <DropdownDisclosure
                  compact
                  title="Choose Subject"
                  items={subjectItems}
                  isOpen={isSubjectOpen}
                  onOpenChange={setIsSubjectOpen}
                  selectedId={selectedSubject}
                  onChange={(item) => setSelectedSubject(item.id)}
                />

                {selectedSubject !== "all" && setSelectedUnit && (
                  <DropdownDisclosure
                    compact
                    title="Choose Unit"
                    items={unitItems}
                    isOpen={isUnitOpen}
                    onOpenChange={setIsUnitOpen}
                    selectedId={selectedUnit}
                    onChange={(item) => setSelectedUnit(item.id)}
                  />
                )}

                {selectedSubject !== "all" && (
                  <button
                    type="button"
                    onClick={() => setSelectedSubject("all")}
                    className="text-[#727272] hover:text-[#E11D48] p-1 transition-colors cursor-pointer"
                    title="Reset to all enrolled"
                  >
                    <Cancel01Icon size={12} />
                  </button>
                )}
              </>
            )}

            {/* Grounding Status Badges */}
            <div className="hidden sm:flex items-center">
              {selectedSubject === "all" ? (
                <span id="okfGeneralBadge" className="text-[10px] text-[#727272] ml-1">
                  General Scope
                </span>
              ) : hasCompiledOkf ? (
                <span id="okfReadyBadge" className="text-[10px] text-emerald-600 font-medium ml-1">
                  • Course Grounded
                </span>
              ) : null}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleVoice}
              disabled={disabled}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${isListening
                  ? "bg-red-500 text-white shadow-[0_0_10px_#ef4444] animate-pulse"
                  : "text-[#727272] hover:text-[#383838] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              title={isListening ? "Listening... click to stop" : "Voice dictation"}
            >
              {isListening ? <PiMicrophoneFill size={15} /> : <PiMicrophoneBold size={15} />}
            </button>

            {/* ChatGPT Circular Send Button */}
            <button
              id="sendPromptBtn"
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${canSend
                  ? "bg-[#0073E6] hover:bg-[#174073] text-white shadow-xs active:scale-95"
                  : "bg-[#E2E2E2] dark:bg-[#383838] text-[#727272] dark:text-zinc-500 cursor-not-allowed opacity-70"
                }`}
            >
              {processing ? (
                <Loading01Icon className="animate-spin text-white" size={16} />
              ) : (
                <ArrowUp02Icon size={16} />
              )}
            </button>
          </div>
        </div>

      </div>



    </div>
  );
}

export default AiMascotInput;

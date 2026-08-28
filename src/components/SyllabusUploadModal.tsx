import { useState, useRef } from 'react';
import type { FC, ChangeEvent, DragEvent } from 'react';
import type { ClassSession } from '../services/db';
import { parseWordDocxSyllabus, extractTopicsFromText } from '../utils/docxParser';
import { 
  X, 
  UploadCloud, 
  FileText, 
  Check, 
  Trash2, 
  Plus, 
  BookOpen
} from 'lucide-react';

interface SyllabusUploadModalProps {
  courses: ClassSession[];
  initialCourseId?: string;
  onClose: () => void;
  onUpdateSyllabus: (courseId: string, topics: string[]) => void;
}

export const SyllabusUploadModal: FC<SyllabusUploadModalProps> = ({
  courses,
  initialCourseId,
  onClose,
  onUpdateSyllabus,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourseId || (courses[0]?.id || '')
  );
  const [parsedTopics, setParsedTopics] = useState<string[]>([]);
  const [newTopicInput, setNewTopicInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [rawPastedText, setRawPastedText] = useState('');
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetCourse = courses.find(c => c.id === selectedCourseId) || courses[0];

  const handleProcessFile = async (file: File) => {
    setIsProcessing(true);
    try {
      let extracted: string[] = [];
      if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        extracted = await parseWordDocxSyllabus(file);
      } else {
        const text = await file.text();
        extracted = extractTopicsFromText(text);
      }

      if (extracted.length > 0) {
        setParsedTopics(extracted);
      } else {
        alert('Could not detect distinct syllabus topics from the file. You can paste the syllabus text below.');
      }
    } catch (err: any) {
      console.error('Failed to parse syllabus:', err);
      alert('Error parsing document: ' + (err.message || 'Please upload a valid .docx or text file.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleParsePastedText = () => {
    if (!rawPastedText.trim()) return;
    const extracted = extractTopicsFromText(rawPastedText);
    if (extracted.length > 0) {
      setParsedTopics(extracted);
    }
  };

  const handleAddCustomTopic = () => {
    if (!newTopicInput.trim()) return;
    setParsedTopics(prev => [...prev, newTopicInput.trim()]);
    setNewTopicInput('');
  };

  const handleRemoveTopic = (index: number) => {
    setParsedTopics(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!selectedCourseId || parsedTopics.length === 0) return;
    onUpdateSyllabus(selectedCourseId, parsedTopics);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="syllabus-modal-title"
    >
      <div className="bg-white text-zinc-950 rounded-xl border border-zinc-200 w-full max-w-2xl shadow-xl flex flex-col max-h-[92vh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 p-5 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950 text-white shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 id="syllabus-modal-title" className="text-base sm:text-lg font-bold text-zinc-950 tracking-tight">
                Upload & Edit Course Syllabus
              </h2>
              <p className="text-xs text-zinc-600">
                Import syllabus topics directly from a Word document (.docx) or text.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          
          {/* Target Course Selector */}
          <div className="space-y-1.5">
            <label htmlFor="courseSelect" className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
              Target Course to Update
            </label>
            <select
              id="courseSelect"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-2xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              {courses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.subjectCode} • {cls.section} — {cls.subjectTitle}
                </option>
              ))}
            </select>
          </div>

          {/* Input Method Tabs */}
          {parsedTopics.length === 0 && (
            <div className="flex border-b border-zinc-200 gap-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={`pb-2 border-b-2 cursor-pointer transition-colors ${
                  inputMode === 'upload' 
                    ? 'border-zinc-950 text-zinc-950 font-bold' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Upload Word Document (.docx)
              </button>
              <button
                type="button"
                onClick={() => setInputMode('paste')}
                className={`pb-2 border-b-2 cursor-pointer transition-colors ${
                  inputMode === 'paste' 
                    ? 'border-zinc-950 text-zinc-950 font-bold' 
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Paste Syllabus Text
              </button>
            </div>
          )}

          {/* Upload Drop Zone */}
          {parsedTopics.length === 0 && inputMode === 'upload' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                dragOver 
                  ? 'border-zinc-950 bg-zinc-50 scale-[0.99]' 
                  : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50/50 hover:bg-zinc-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.doc,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200/80 text-zinc-800">
                <UploadCloud className="h-7 w-7" />
              </div>

              <div>
                <p className="text-sm font-bold text-zinc-900">
                  Click to select Word syllabus (.docx), or drag and drop
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Supports Microsoft Word (.docx), plain text (.txt)
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 text-xs text-zinc-600 font-medium bg-white px-3 py-1 rounded-full border border-zinc-200">
                <FileText className="w-3.5 h-3.5 text-zinc-900" />
                Auto-extracts weekly modules, chapters, and topics
              </div>
            </div>
          )}

          {/* Paste Text Area */}
          {parsedTopics.length === 0 && inputMode === 'paste' && (
            <div className="space-y-3">
              <textarea
                value={rawPastedText}
                onChange={(e) => setRawPastedText(e.target.value)}
                rows={7}
                placeholder="Paste your course outline, modules, or week-by-week syllabus topics here..."
                className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-xs sm:text-sm text-zinc-900 font-mono shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
              />
              <button
                type="button"
                disabled={!rawPastedText.trim()}
                onClick={handleParsePastedText}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-950 px-4 text-xs sm:text-sm font-semibold text-white shadow-2xs hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
              >
                Extract Topics from Text
              </button>
            </div>
          )}

          {/* Loading Spinner */}
          {isProcessing && (
            <div className="py-8 flex flex-col items-center justify-center gap-2.5">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-zinc-300 border-t-zinc-950" />
              <p className="text-xs font-bold text-zinc-800">Parsing Word Document Syllabus...</p>
            </div>
          )}

          {/* Extracted Topics Preview & Editor */}
          {parsedTopics.length > 0 && !isProcessing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  {parsedTopics.length} Syllabus Topics Detected
                </span>
                <button
                  type="button"
                  onClick={() => setParsedTopics([])}
                  className="text-xs text-zinc-600 hover:text-zinc-900 font-semibold underline cursor-pointer"
                >
                  Upload Another File
                </button>
              </div>

              {/* Topics List */}
              <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                {parsedTopics.map((topic, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-white transition-colors group"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-200 text-[10px] font-bold text-zinc-700 shrink-0 font-mono">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => {
                        const newTopics = [...parsedTopics];
                        newTopics[index] = e.target.value;
                        setParsedTopics(newTopics);
                      }}
                      className="flex-1 bg-transparent text-xs font-medium text-zinc-900 border-b border-transparent focus:border-zinc-400 focus:outline-none px-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveTopic(index)}
                      className="text-zinc-400 hover:text-red-600 p-1 transition-colors cursor-pointer shrink-0 opacity-0 group-hover:opacity-100"
                      title="Remove topic"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Custom Topic Input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Add another syllabus topic..."
                  value={newTopicInput}
                  onChange={(e) => setNewTopicInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomTopic(); } }}
                  className="flex-1 h-9 rounded-lg border border-zinc-300 bg-white px-3 text-xs text-zinc-900 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTopic}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-zinc-200 p-4 shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-xs sm:text-sm font-semibold text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={parsedTopics.length === 0 || isProcessing}
            onClick={handleSave}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-950 px-5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Apply Syllabus to {targetCourse?.subjectCode || 'Course'}
          </button>
        </div>

      </div>
    </div>
  );
};

import { useState } from 'react';
import type { FC } from 'react';
import type { ClassSession, ClassSchedule, ScheduleType } from '../services/db';
import { 
  X, 
  Check, 
  FlaskConical, 
  GraduationCap
} from 'lucide-react';

interface LogData {
  sessionType?: ScheduleType;
  topicsCovered: string[];
  nextActions: string;
  engagementLevel: string;
}

interface PostClassUpdateModalProps {
  classSession: ClassSession;
  activeSchedule?: ClassSchedule;
  onClose: () => void;
  onSuccess: (data: LogData) => void;
}

export const PostClassUpdateModal: FC<PostClassUpdateModalProps> = ({ 
  classSession, 
  activeSchedule,
  onClose, 
  onSuccess 
}) => {
  const [sessionType, setSessionType] = useState<ScheduleType>(
    activeSchedule?.type || 'Lecture'
  );
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [nextActions, setNextActions] = useState('');
  const [engagement, setEngagement] = useState<string>('Medium');

  const toggleTopic = (topic: string) => {
    const newSet = new Set(selectedTopics);
    if (newSet.has(topic)) {
      newSet.delete(topic);
    } else {
      newSet.add(topic);
    }
    setSelectedTopics(newSet);
  };

  const selectAllTopics = () => {
    if (selectedTopics.size === classSession.masterSyllabus.length) {
      setSelectedTopics(new Set());
    } else {
      setSelectedTopics(new Set(classSession.masterSyllabus));
    }
  };

  const handlePromptChipClick = (text: string) => {
    if (nextActions.trim()) {
      setNextActions((prev) => `${prev}, ${text}`);
    } else {
      setNextActions(text);
    }
  };

  const handleSubmit = () => {
    const logPayload: LogData = {
      sessionType,
      topicsCovered: Array.from(selectedTopics),
      nextActions: nextActions.trim(),
      engagementLevel: engagement,
    };

    onSuccess(logPayload);
  };

  const isLab = sessionType === 'Laboratory';

  const quickPrompts = [
    'Prepare Chapter Quiz',
    'Follow up on Lab Activity',
    'Review Problem Set #2',
    'Post Lecture Slides'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="log-session-title">
      <div className="bg-white text-zinc-950 rounded-xl border border-zinc-200 w-full max-w-lg shadow-xl flex flex-col max-h-[90vh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Dialog Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 p-5 shrink-0 bg-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 id="log-session-title" className="text-xl font-bold tracking-tight text-zinc-950">
                Log Session — {classSession.subjectCode}
              </h2>
              <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                {classSession.section}
              </span>
            </div>
            <p className="text-sm text-zinc-600">
              {classSession.subjectTitle || 'Record covered topics, student participation, and next actions.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Dialog Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-white">
          
          {/* Session Type Toggle */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Session Format
            </label>
            <div className="inline-flex h-10 w-full items-center rounded-lg bg-zinc-100 p-1 text-zinc-700">
              <button
                type="button"
                onClick={() => setSessionType('Lecture')}
                className={`flex-1 h-8 inline-flex items-center justify-center gap-1.5 rounded-md px-3 text-xs font-bold transition-all ${
                  !isLab
                    ? 'bg-white text-zinc-950 shadow-2xs'
                    : 'hover:text-zinc-950'
                }`}
              >
                <GraduationCap className="h-4 w-4" aria-hidden="true" />
                <span>Lecture Session</span>
              </button>
              <button
                type="button"
                onClick={() => setSessionType('Laboratory')}
                className={`flex-1 h-8 inline-flex items-center justify-center gap-1.5 rounded-md px-3 text-xs font-bold transition-all ${
                  isLab
                    ? 'bg-white text-zinc-950 shadow-2xs'
                    : 'hover:text-zinc-950'
                }`}
              >
                <FlaskConical className="h-4 w-4" aria-hidden="true" />
                <span>Laboratory Session</span>
              </button>
            </div>
          </div>

          {/* Syllabus Items Covered */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-zinc-950">
                Topics Covered Today ({selectedTopics.size}/{classSession.masterSyllabus.length})
              </label>
              <button
                type="button"
                onClick={selectAllTopics}
                className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 transition-colors cursor-pointer"
              >
                {selectedTopics.size === classSession.masterSyllabus.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-2">
              {classSession.masterSyllabus.map((topic, index) => {
                const isSelected = selectedTopics.has(topic);
                return (
                  <div
                    key={topic}
                    onClick={() => toggleTopic(topic)}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        toggleTopic(topic);
                      }
                    }}
                    className={`flex items-start gap-3.5 rounded-lg border p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-zinc-950 bg-zinc-50 text-zinc-950 shadow-2xs'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                      isSelected
                        ? 'bg-zinc-950 border-zinc-950 text-white'
                        : 'border-zinc-300 bg-white'
                    }`}>
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" aria-hidden="true" />}
                    </div>
                    <span className="text-sm font-medium leading-normal">
                      {index + 1}. {topic}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engagement Level */}
          <div className="space-y-2.5">
            <label className="text-sm font-bold text-zinc-950">
              Class Engagement Rating
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'Low', label: 'Low', desc: 'Passive participation' },
                { value: 'Medium', label: 'Medium', desc: 'Average engagement' },
                { value: 'High', label: 'High', desc: 'High interaction' }
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setEngagement(item.value)}
                  className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all cursor-pointer ${
                    engagement === item.value
                      ? 'border-zinc-950 bg-zinc-950 text-white font-bold shadow-2xs'
                      : 'border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800'
                  }`}
                >
                  <span className="text-sm font-bold">{item.label}</span>
                  <span className={`text-xs mt-0.5 ${engagement === item.value ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-2.5">
            <label htmlFor="next-actions" className="text-sm font-bold text-zinc-950">
              Reminders & Next Steps
            </label>
            
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handlePromptChipClick(prompt)}
                  className="inline-flex items-center rounded-md border border-zinc-300 bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-200 transition-colors cursor-pointer"
                >
                  + {prompt}
                </button>
              ))}
            </div>

            <textarea
              id="next-actions"
              rows={3}
              placeholder="E.g., Review problem set #2, start Chapter 3 recursion..."
              value={nextActions}
              onChange={(e) => setNextActions(e.target.value)}
              className="flex w-full rounded-lg border border-zinc-300 bg-white p-3 text-sm text-zinc-900 shadow-2xs placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            />
          </div>

        </div>

        {/* Dialog Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 p-4 shrink-0 bg-zinc-50">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Save {sessionType} Log
          </button>
        </div>

      </div>
    </div>
  );
};

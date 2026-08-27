import { useState, useRef } from 'react';
import type { FC, FormEvent, ChangeEvent } from 'react';
import type { ClassSession, ClassSchedule, ScheduleType } from '../services/db';
import { parseDocxSyllabus } from '../utils/docxParser';
import { 
  X, 
  Plus, 
  Trash2, 
  Clock, 
  MapPin,
  FlaskConical,
  GraduationCap,
  FileUp,
  FileText,
  CheckCircle2,
  Loader2
} from 'lucide-react';

interface AddClassModalProps {
  initialClass?: ClassSession | null;
  onClose: () => void;
  onSave: (classData: Omit<ClassSession, 'id'>, existingId?: string) => Promise<void> | void;
}

interface ScheduleSlotDraft {
  id: string;
  type: ScheduleType;
  selectedDays: number[];
  startTime: string;
  endTime: string;
  room: string;
}

const DAYS_OF_WEEK = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export const AddClassModal: FC<AddClassModalProps> = ({ initialClass, onClose, onSave }) => {
  const isEditing = Boolean(initialClass);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [subjectCode, setSubjectCode] = useState(initialClass?.subjectCode || '');
  const [subjectTitle, setSubjectTitle] = useState(initialClass?.subjectTitle || '');
  const [section, setSection] = useState(initialClass?.section || '');
  const [year, setYear] = useState(initialClass?.year || '1st Year');
  const [defaultRoom, setDefaultRoom] = useState(initialClass?.room || '');

  // Course structure format preset
  const [courseFormat, setCourseFormat] = useState<'lecture_only' | 'lecture_lab'>('lecture_only');

  // Convert initial schedule or default
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlotDraft[]>(() => {
    if (initialClass && initialClass.schedule.length > 0) {
      const grouped: ScheduleSlotDraft[] = [];
      initialClass.schedule.forEach((sch, idx) => {
        const existing = grouped.find(
          g => g.type === sch.type && g.startTime === sch.startTime && g.endTime === sch.endTime && g.room === (sch.room || '')
        );
        if (existing) {
          if (!existing.selectedDays.includes(sch.dayOfWeek)) {
            existing.selectedDays.push(sch.dayOfWeek);
            existing.selectedDays.sort((a, b) => a - b);
          }
        } else {
          grouped.push({
            id: `slot_${idx}_${Date.now()}`,
            type: sch.type || 'Lecture',
            selectedDays: [sch.dayOfWeek],
            startTime: sch.startTime,
            endTime: sch.endTime,
            room: sch.room || '',
          });
        }
      });
      return grouped.length > 0 ? grouped : [
        {
          id: 'slot_1',
          type: 'Lecture',
          selectedDays: [1, 3],
          startTime: '09:00',
          endTime: '10:30',
          room: '',
        }
      ];
    }
    return [
      {
        id: 'slot_1',
        type: 'Lecture',
        selectedDays: [1, 3], // Mon & Wed
        startTime: '09:00',
        endTime: '10:30',
        room: '',
      },
    ];
  });

  // Master Syllabus / Topics
  const [topicInput, setTopicInput] = useState('');
  const [topics, setTopics] = useState<string[]>(
    initialClass?.masterSyllabus || [
      'Course Overview & Learning Outcomes',
      'Unit 1: Core Theoretical Foundations',
      'Unit 2: Practical Applications & Problem Sets'
    ]
  );

  // Docx import state
  const [isParsingDocx, setIsParsingDocx] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);

  const applyPreset = (preset: 'lecture_only' | 'lecture_lab') => {
    setCourseFormat(preset);
    if (preset === 'lecture_only') {
      setScheduleSlots([
        {
          id: 'slot_1',
          type: 'Lecture',
          selectedDays: [1, 3],
          startTime: '09:00',
          endTime: '10:30',
          room: defaultRoom || '',
        },
      ]);
    } else {
      setScheduleSlots([
        {
          id: 'slot_1',
          type: 'Lecture',
          selectedDays: [1, 4],
          startTime: '11:00',
          endTime: '12:00',
          room: defaultRoom || 'Lecture Hall',
        },
        {
          id: 'slot_2',
          type: 'Laboratory',
          selectedDays: [3],
          startTime: '13:00',
          endTime: '16:00',
          room: 'Computer Lab 3',
        },
      ]);
    }
  };

  const handleAddSlot = (type: ScheduleType = 'Lecture') => {
    const newSlot: ScheduleSlotDraft = {
      id: 'slot_' + Date.now(),
      type,
      selectedDays: [5],
      startTime: '13:00',
      endTime: '15:00',
      room: defaultRoom || '',
    };
    setScheduleSlots([...scheduleSlots, newSlot]);
  };

  const handleRemoveSlot = (id: string) => {
    if (scheduleSlots.length === 1) {
      alert('Your course must have at least one scheduled slot.');
      return;
    }
    setScheduleSlots(scheduleSlots.filter((s) => s.id !== id));
  };

  const handleUpdateSlot = (
    id: string,
    field: keyof ScheduleSlotDraft,
    value: any
  ) => {
    setScheduleSlots(
      scheduleSlots.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleToggleDay = (slotId: string, dayValue: number) => {
    const slot = scheduleSlots.find((s) => s.id === slotId);
    if (!slot) return;

    const newDays = slot.selectedDays.includes(dayValue)
      ? slot.selectedDays.filter((d) => d !== dayValue)
      : [...slot.selectedDays, dayValue].sort((a, b) => a - b);

    handleUpdateSlot(slotId, 'selectedDays', newDays);
  };

  const handleAddTopic = () => {
    const trimmed = topicInput.trim();
    if (trimmed && !topics.includes(trimmed)) {
      setTopics([...topics, trimmed]);
      setTopicInput('');
    }
  };

  const handleRemoveTopic = (indexToRemove: number) => {
    setTopics(topics.filter((_, i) => i !== indexToRemove));
  };

  // Docx File Import Handler
  const handleDocxFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingDocx(true);
    setImportNotification(null);

    try {
      const extractedTopics = await parseDocxSyllabus(file);

      if (extractedTopics.length > 0) {
        setTopics(extractedTopics);
        setImportNotification(`Successfully imported ${extractedTopics.length} syllabus topics from "${file.name}"`);
      } else {
        alert('Could not detect syllabus tables or topics in this document. Please check the format.');
      }
    } catch (err) {
      console.error('Failed to parse docx file:', err);
      alert('Error reading DOCX file. Please make sure it is a valid Word document.');
    } finally {
      setIsParsingDocx(false);
      // Reset input value so same file can be chosen again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!subjectCode.trim()) {
      alert('Please enter a Course Code (e.g. CS 315 or GE104).');
      return;
    }

    const flattenedSchedule: ClassSchedule[] = [];
    for (const slot of scheduleSlots) {
      if (slot.selectedDays.length === 0) {
        alert(`Please select at least one day for your ${slot.type} schedule.`);
        return;
      }
      for (const dayOfWeek of slot.selectedDays) {
        flattenedSchedule.push({
          dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          type: slot.type,
          room: slot.room.trim() || defaultRoom.trim() || undefined,
        });
      }
    }

    try {
      onSave(
        {
          instructorId: 'inst1',
          subjectCode: subjectCode.trim().toUpperCase(),
          subjectTitle: subjectTitle.trim() || undefined,
          section: section.trim() || 'Section A',
          year: year.trim() || '1st Year',
          room: defaultRoom.trim() || undefined,
          schedule: flattenedSchedule,
          masterSyllabus: topics.length > 0 ? topics : ['Course Introduction & Lectures'],
        },
        initialClass?.id
      );
      onClose();
    } catch (err) {
      console.error('Failed to save course:', err);
      alert('Failed to save course. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="add-course-title">
      <div className="bg-white text-zinc-950 rounded-xl border border-zinc-200 w-full max-w-lg shadow-xl flex flex-col max-h-[90vh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Dialog Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 p-5 shrink-0 bg-white">
          <div className="space-y-1">
            <h2 id="add-course-title" className="text-xl font-bold tracking-tight text-zinc-950">
              {isEditing ? `Edit Course — ${initialClass?.subjectCode}` : 'Add New Course'}
            </h2>
            <p className="text-sm text-zinc-600">
              Configure course schedules, lecture/laboratory splits, and syllabus topics.
            </p>
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

        {/* Dialog Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 bg-white">
          
          {/* Quick Docx Import Banner */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-zinc-700" />
                <div>
                  <p className="text-sm font-bold text-zinc-950">Import Word (.docx) Syllabus</p>
                  <p className="text-xs text-zinc-600">Extracts course code, title, and topic tables automatically.</p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleDocxFileUpload}
                className="hidden"
                id="syllabus-docx-file-input"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsingDocx}
                className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-950 px-3.5 text-xs font-bold text-white shadow-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isParsingDocx ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <FileUp className="h-3.5 w-3.5 mr-1.5" />
                    Upload .docx
                  </>
                )}
              </button>
            </div>

            {importNotification && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{importNotification}</span>
              </div>
            )}
          </div>

          {/* Structure Selector */}
          {!isEditing && (
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Course Structure Preset
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => applyPreset('lecture_only')}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-xs font-bold transition-all cursor-pointer ${
                    courseFormat === 'lecture_only'
                      ? 'border-zinc-950 bg-zinc-950 text-white shadow-2xs'
                      : 'border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800'
                  }`}
                >
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  <span>Lecture Only (GE)</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('lecture_lab')}
                  className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-xs font-bold transition-all cursor-pointer ${
                    courseFormat === 'lecture_lab'
                      ? 'border-zinc-950 bg-zinc-950 text-white shadow-2xs'
                      : 'border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-800'
                  }`}
                >
                  <FlaskConical className="h-4 w-4" aria-hidden="true" />
                  <span>Lecture + Lab (MAJOR)</span>
                </button>
              </div>
            </div>
          )}

          {/* General Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="course-code" className="text-sm font-semibold text-zinc-900">
                Course Code *
              </label>
              <input
                id="course-code"
                type="text"
                required
                placeholder="e.g. CS 315 or GE104"
                value={subjectCode}
                onChange={(e) => setSubjectCode(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-2xs placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 uppercase font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="course-section" className="text-sm font-semibold text-zinc-900">
                Section *
              </label>
              <input
                id="course-section"
                type="text"
                required
                placeholder="e.g. BSCS 3-A"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-2xs placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="course-title" className="text-sm font-semibold text-zinc-900">
              Course Title
            </label>
            <input
              id="course-title"
              type="text"
              placeholder="e.g. Application Development and Emerging Technologies"
              value={subjectTitle}
              onChange={(e) => setSubjectTitle(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-2xs placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="year-level" className="text-sm font-semibold text-zinc-900">
                Year Level
              </label>
              <select
                id="year-level"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 font-medium"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="Graduate">Graduate</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="default-room" className="text-sm font-semibold text-zinc-900">
                Default Room / Venue
              </label>
              <input
                id="default-room"
                type="text"
                placeholder="e.g. ComLab 3"
                value={defaultRoom}
                onChange={(e) => setDefaultRoom(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-2xs placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
              />
            </div>
          </div>

          {/* Schedule Slots */}
          <div className="space-y-3.5 pt-2 border-t border-zinc-200">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-zinc-950">
                Timetable Slots ({scheduleSlots.length})
              </label>
              <button
                type="button"
                onClick={() => handleAddSlot('Lecture')}
                className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-bold text-zinc-800 shadow-2xs hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Add Slot
              </button>
            </div>

            <div className="space-y-3">
              {scheduleSlots.map((slot, index) => {
                const isLecture = slot.type === 'Lecture';
                return (
                  <div
                    key={slot.id}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="inline-flex h-8 items-center rounded-md bg-zinc-200 p-0.5 text-xs text-zinc-700">
                        <button
                          type="button"
                          onClick={() => handleUpdateSlot(slot.id, 'type', 'Lecture')}
                          className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                            isLecture
                              ? 'bg-white text-zinc-950 shadow-2xs'
                              : 'hover:text-zinc-950'
                          }`}
                        >
                          <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                          Lecture
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateSlot(slot.id, 'type', 'Laboratory')}
                          className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                            !isLecture
                              ? 'bg-white text-zinc-950 shadow-2xs'
                              : 'hover:text-zinc-950'
                          }`}
                        >
                          <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
                          Laboratory
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-zinc-600">Slot #{index + 1}</span>
                        {scheduleSlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(slot.id)}
                            aria-label={`Remove slot ${index + 1}`}
                            className="rounded-md p-1 text-zinc-500 hover:text-red-700 hover:bg-zinc-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Day Selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-700">
                        Scheduled Days
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {DAYS_OF_WEEK.map((day) => {
                          const isSelected = slot.selectedDays.includes(day.value);
                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => handleToggleDay(slot.id, day.value)}
                              className={`h-8 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-zinc-950 text-white shadow-2xs'
                                  : 'bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-800'
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Times & Room */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" /> Start
                        </label>
                        <input
                          type="time"
                          required
                          value={slot.startTime}
                          onChange={(e) => handleUpdateSlot(slot.id, 'startTime', e.target.value)}
                          className="flex h-9 w-full rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-mono font-bold text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" /> End
                        </label>
                        <input
                          type="time"
                          required
                          value={slot.endTime}
                          onChange={(e) => handleUpdateSlot(slot.id, 'endTime', e.target.value)}
                          className="flex h-9 w-full rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-mono font-bold text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" /> Room
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Rm 302"
                          value={slot.room}
                          onChange={(e) => handleUpdateSlot(slot.id, 'room', e.target.value)}
                          className="flex h-9 w-full rounded-md border border-zinc-300 bg-white px-2.5 text-xs text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Master Syllabus */}
          <div className="space-y-3 pt-2 border-t border-zinc-200">
            <div className="flex items-center justify-between">
              <label htmlFor="syllabus-topic-input" className="text-sm font-bold text-zinc-950">
                Master Syllabus Topics ({topics.length})
              </label>
              {topics.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTopics([])}
                  className="text-xs font-semibold text-zinc-500 hover:text-red-700 transition-colors cursor-pointer"
                >
                  Clear All Topics
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <input
                id="syllabus-topic-input"
                type="text"
                placeholder="Add syllabus topic manually..."
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTopic();
                  }
                }}
                className="flex h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-2xs placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
              />
              <button
                type="button"
                onClick={handleAddTopic}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-xs font-bold text-zinc-800 shadow-2xs hover:bg-zinc-100 transition-colors shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
                Add
              </button>
            </div>

            {topics.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {topics.map((topic, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-medium text-zinc-800 group"
                  >
                    <span className="truncate flex-1 mr-2">
                      {index + 1}. {topic}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTopic(index)}
                      aria-label={`Remove topic ${index + 1}`}
                      className="text-zinc-500 hover:text-red-700 p-1 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

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
            disabled={!subjectCode.trim() || scheduleSlots.length === 0}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isEditing ? 'Save Changes' : 'Create Course'}
          </button>
        </div>

      </div>
    </div>
  );
};

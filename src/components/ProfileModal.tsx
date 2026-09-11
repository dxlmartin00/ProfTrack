import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { InstructorProfile } from '../services/db';
import { 
  X, 
  User, 
  Briefcase, 
  Building2, 
  GraduationCap, 
  Mail, 
  CreditCard, 
  Check, 
  Save, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface ProfileModalProps {
  profile: InstructorProfile;
  onClose: () => void;
  onSaveProfile: (profile: InstructorProfile) => void;
  onResetData: () => void;
  hasCourses: boolean;
}

export const getInitials = (name: string): string => {
  if (!name) return 'PD';
  const cleanName = name.replace(/^(Prof\.|Dr\.|Mr\.|Ms\.|Mrs\.|Engr\.)\s+/i, '').trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PD';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const ProfileModal: FC<ProfileModalProps> = ({
  profile,
  onClose,
  onSaveProfile,
  onResetData,
  hasCourses,
}) => {
  const [formData, setFormData] = useState<InstructorProfile>({ ...profile });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const initials = getInitials(formData.fullName);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="profile-modal-title"
    >
      <div className="bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg shadow-xl flex flex-col max-h-[92vh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 dark:border-zinc-800 p-5 shrink-0 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-950 dark:bg-zinc-800 text-white dark:text-zinc-100 font-bold text-base shadow-sm border border-zinc-800 dark:border-zinc-700 shrink-0">
              {initials}
            </div>
            <div>
              <h2 id="profile-modal-title" className="text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-100">
                Instructor Profile
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Manage your academic credentials for reports & schedules.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-white dark:bg-zinc-900">
          
          {/* Full Name */}
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              Full Name & Title
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. Prof. Dan Martin or Dr. Juan Dela Cruz"
              className="flex h-10 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 shadow-2xs placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-400 font-medium"
            />
          </div>

          {/* Academic Position / Rank */}
          <div className="space-y-1.5">
            <label htmlFor="position" className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              Academic Position / Rank
            </label>
            <input
              id="position"
              type="text"
              required
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              placeholder="e.g. Assistant Professor IV, Instructor I, Lecturer"
              className="flex h-10 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 shadow-2xs placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-400 font-medium"
            />
          </div>

          {/* Department / College */}
          <div className="space-y-1.5">
            <label htmlFor="department" className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              Department / College
            </label>
            <input
              id="department"
              type="text"
              required
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="e.g. College of Computer Studies / Department of IT"
              className="flex h-10 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 shadow-2xs placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-400 font-medium"
            />
          </div>

          {/* Institution / University */}
          <div className="space-y-1.5">
            <label htmlFor="institution" className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              Institution / University
            </label>
            <input
              id="institution"
              type="text"
              required
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              placeholder="e.g. University of Makati, Pamantasan ng Lungsod..."
              className="flex h-10 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 shadow-2xs placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-400 font-medium"
            />
          </div>

          {/* Employee ID & Email Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label htmlFor="employeeId" className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                Employee ID (Optional)
              </label>
              <input
                id="employeeId"
                type="text"
                value={formData.employeeId || ''}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="e.g. EMP-2026-089"
                className="flex h-10 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 shadow-2xs placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-400 font-medium font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                Academic Email (Optional)
              </label>
              <input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. faculty@university.edu"
                className="flex h-10 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 shadow-2xs placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-400 font-medium"
              />
            </div>
          </div>

          {/* Report Preview Note */}
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 p-3 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
            <span className="font-bold text-zinc-900 dark:text-zinc-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
              Automated Report Integration
            </span>
            <p>
              Your name, academic title, and college will appear automatically in the header and signature line of all exported Monthly Accomplishment PDF Reports.
            </p>
          </div>

          {/* Dataset Management Area */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Dataset Management</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {hasCourses ? 'Clear all course records to start fresh' : 'Load sample demonstration courses'}
                </p>
              </div>

              <button
                type="button"
                onClick={onResetData}
                className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                {hasCourses ? 'Reset Schedule' : 'Load Demo'}
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 text-sm font-semibold text-zinc-800 dark:text-zinc-200 shadow-2xs hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 dark:bg-zinc-100 px-5 text-sm font-semibold text-white dark:text-zinc-950 shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-emerald-400" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" />
                  Save Profile
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

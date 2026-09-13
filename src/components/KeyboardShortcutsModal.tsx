import type { FC } from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: FC<KeyboardShortcutsModalProps> = ({ isOpen = true, onClose }) => {
  if (!isOpen) return null;
  const shortcuts = [
    { key: 'T', description: 'Jump to Today in schedule' },
    { key: '1', description: 'Switch to Daily Timetable' },
    { key: '2', description: 'Switch to Weekly Time-Grid' },
    { key: 'N', description: 'Add New Course & Syllabus' },
    { key: 'R', description: 'Open Accomplishment Report & Analytics' },
    { key: '?', description: 'View Keyboard Shortcuts cheatsheet' },
    { key: 'Esc', description: 'Close any active dialog or modal' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div className="bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              <Keyboard className="h-4 w-4" />
            </div>
            <div>
              <h2 id="shortcuts-title" className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
                Keyboard Shortcuts
              </h2>
              <p className="text-2xs text-zinc-500 dark:text-zinc-400">
                Speed up your schedule navigation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shortcuts dialog"
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-4 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {shortcuts.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                {item.description}
              </span>
              <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 shadow-2xs">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 p-3 bg-zinc-50 dark:bg-zinc-900/80 text-center">
          <p className="text-2xs text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-1">
            <Command className="h-3 w-3" /> Shortcuts are disabled while typing inside inputs
          </p>
        </div>
      </div>
    </div>
  );
};

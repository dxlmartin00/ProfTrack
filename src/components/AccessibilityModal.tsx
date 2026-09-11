import type { FC } from 'react';
import type { ThemeMode, AccessibilitySettings } from '../services/theme';
import { 
  X, 
  Sun, 
  Moon, 
  Eye, 
  Sliders, 
  Check, 
  Type, 
  Sparkles,
  ZapOff
} from 'lucide-react';

interface AccessibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  a11ySettings: AccessibilitySettings;
  onA11yChange: (settings: AccessibilitySettings) => void;
}

export const AccessibilityModal: FC<AccessibilityModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onThemeChange,
  a11ySettings,
  onA11yChange,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-modal-title"
    >
      <div 
        className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-950 dark:bg-zinc-800 text-white shadow-2xs">
              <Sliders className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 id="a11y-modal-title" className="text-base font-black text-zinc-950 dark:text-zinc-100 tracking-tight">
                Display & Accessibility
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Eye-care themes, font scaling, and visual accessibility options.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Theme Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Color Theme (Eye Care)
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Light Mode */}
              <button
                type="button"
                onClick={() => onThemeChange('light')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  currentTheme === 'light'
                    ? 'border-zinc-950 dark:border-white ring-2 ring-zinc-950 dark:ring-white bg-zinc-100/80 dark:bg-zinc-800'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-600">
                    <Sun className="w-4 h-4" />
                  </div>
                  {currentTheme === 'light' && <Check className="w-4 h-4 text-zinc-950 dark:text-white" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Light</div>
                  <div className="text-[10px] text-zinc-500">Daytime clarity</div>
                </div>
              </button>

              {/* Dark Mode */}
              <button
                type="button"
                onClick={() => onThemeChange('dark')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  currentTheme === 'dark'
                    ? 'border-zinc-950 dark:border-white ring-2 ring-zinc-950 dark:ring-white bg-zinc-100/80 dark:bg-zinc-800'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200">
                    <Moon className="w-4 h-4" />
                  </div>
                  {currentTheme === 'dark' && <Check className="w-4 h-4 text-zinc-950 dark:text-white" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Dark Mode</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Easy on eyes</div>
                </div>
              </button>

              {/* Night Mode */}
              <button
                type="button"
                onClick={() => onThemeChange('night')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  currentTheme === 'night'
                    ? 'border-amber-500 ring-2 ring-amber-500/50 bg-amber-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-1.5 rounded-lg bg-zinc-950 border border-amber-900/60 text-amber-400">
                    <Eye className="w-4 h-4" />
                  </div>
                  {currentTheme === 'night' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Night Mode</div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400/80">Low-blue OLED</div>
                </div>
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Dark Mode uses desaturated matte tones to avoid eye strain. Night Mode features deep midnight black with low blue light for comfortable nighttime scheduling.
            </p>
          </div>

          {/* Text Size / Scaling */}
          <div className="space-y-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" />
                Text Scaling
              </label>
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                {a11ySettings.fontSize === 'normal' ? '100% (Default)' : a11ySettings.fontSize === 'large' ? '108% (Large)' : '120% (Extra Large)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['normal', 'large', 'xlarge'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onA11yChange({ ...a11ySettings, fontSize: size })}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    a11ySettings.fontSize === size
                      ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-2xs'
                      : 'bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {size === 'normal' ? 'Default' : size === 'large' ? 'Large' : 'Extra Large'}
                </button>
              ))}
            </div>
          </div>

          {/* Accessibility Toggles */}
          <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Visual & Motion Controls
            </label>

            {/* High Contrast */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
              <div className="space-y-0.5 pr-3">
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  High Contrast Mode
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Increases border definitions and sharpens text ratios for maximum readability.
                </div>
              </div>
              <button
                type="button"
                onClick={() => onA11yChange({ ...a11ySettings, highContrast: !a11ySettings.highContrast })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  a11ySettings.highContrast ? 'bg-zinc-950 dark:bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
                role="switch"
                aria-checked={a11ySettings.highContrast}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    a11ySettings.highContrast ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Reduce Motion */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40">
              <div className="space-y-0.5 pr-3">
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <ZapOff className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  Reduce Motion
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Disables transitions and pulsing indicators for users sensitive to movement.
                </div>
              </div>
              <button
                type="button"
                onClick={() => onA11yChange({ ...a11ySettings, reducedMotion: !a11ySettings.reducedMotion })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  a11ySettings.reducedMotion ? 'bg-zinc-950 dark:bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
                role="switch"
                aria-checked={a11ySettings.reducedMotion}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    a11ySettings.reducedMotion ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-6 bg-zinc-50 dark:bg-zinc-950/70 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

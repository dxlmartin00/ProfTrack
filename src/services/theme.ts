export type ThemeMode = 'light' | 'dark' | 'night';

export interface AccessibilitySettings {
  fontSize: 'normal' | 'large' | 'xlarge';
  highContrast: boolean;
  reducedMotion: boolean;
}

export const THEME_STORAGE_KEY = 'proftrack_theme_mode';
export const A11Y_STORAGE_KEY = 'proftrack_a11y_settings';

export const DEFAULT_A11Y_SETTINGS: AccessibilitySettings = {
  fontSize: 'normal',
  highContrast: false,
  reducedMotion: false,
};

export function getStoredTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'night' || saved === 'light') {
      return saved;
    }
  } catch {}
  return 'light';
}

export function setStoredTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
  applyThemeAndA11y(theme, getStoredA11y());
}

export function getStoredA11y(): AccessibilitySettings {
  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_A11Y_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_A11Y_SETTINGS;
}

export function setStoredA11y(settings: AccessibilitySettings): void {
  try {
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
  applyThemeAndA11y(getStoredTheme(), settings);
}

/**
 * Applies theme and accessibility classes directly to document root
 */
export function applyThemeAndA11y(theme: ThemeMode, a11y: AccessibilitySettings): void {
  const root = document.documentElement;
  
  // 1. Theme Classes
  root.classList.remove('dark', 'night-theme');
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'night') {
    root.classList.add('dark', 'night-theme');
  }

  // 2. Font Size Classes
  root.classList.remove('a11y-font-normal', 'a11y-font-large', 'a11y-font-xlarge');
  if (a11y.fontSize === 'large') {
    root.classList.add('a11y-font-large');
  } else if (a11y.fontSize === 'xlarge') {
    root.classList.add('a11y-font-xlarge');
  } else {
    root.classList.add('a11y-font-normal');
  }

  // 3. High Contrast
  if (a11y.highContrast) {
    root.classList.add('a11y-high-contrast');
  } else {
    root.classList.remove('a11y-high-contrast');
  }

  // 4. Reduced Motion
  if (a11y.reducedMotion) {
    root.classList.add('a11y-reduce-motion');
  } else {
    root.classList.remove('a11y-reduce-motion');
  }
}

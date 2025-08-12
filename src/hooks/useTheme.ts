import { useCallback, useEffect, useState } from 'react';

export type AppTheme = 'light' | 'dark' | 'feminine';

const THEME_KEY = 'bingo_theme';

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  // Remove all theme classes first
  root.classList.remove('dark');
  root.classList.remove('theme-feminine');
  if (theme === 'dark') root.classList.add('dark');
  if (theme === 'feminine') root.classList.add('theme-feminine');
}

export function useTheme() {
  const [theme, setTheme] = useState<AppTheme>('light');

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as AppTheme | null) ?? 'light';
    setTheme(stored);
    applyTheme(stored);
  }, []);

  const setAppTheme = useCallback((t: AppTheme) => {
    setTheme(t);
    localStorage.setItem(THEME_KEY, t);
    applyTheme(t);
  }, []);

  const toggleDark = useCallback(() => {
    setAppTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setAppTheme]);

  return { theme, setTheme: setAppTheme, toggleDark };
}



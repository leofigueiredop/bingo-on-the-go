import { useCallback, useEffect, useState } from 'react';

const KEY = 'bingo_accessibility_large_text';

export function useAccessibility() {
  const [largeText, setLargeText] = useState<boolean>(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    const enabled = stored === '1';
    setLargeText(enabled);
    const root = document.documentElement;
    root.classList.toggle('senior', enabled);
  }, []);

  const toggleLargeText = useCallback(() => {
    setLargeText((prev) => {
      const next = !prev;
      localStorage.setItem(KEY, next ? '1' : '0');
      const root = document.documentElement;
      root.classList.toggle('senior', next);
      return next;
    });
  }, []);

  return { largeText, toggleLargeText };
}



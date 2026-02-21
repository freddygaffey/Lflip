import React, { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'lplate-theme';

function getStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored === 'dark';
    return true; // default dark
  } catch {
    return true;
  }
}

const ThemeContext = createContext({ isDark: true, setIsDark: () => {} });

export function ThemeProvider({ children }) {
  const [isDark, setIsDarkState] = useState(getStoredTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {}
  }, [isDark]);

  const setIsDark = (value) => setIsDarkState((prev) => (typeof value === 'function' ? value(prev) : value));

  return (
    <ThemeContext.Provider value={{ isDark, setIsDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext) ?? { isDark: true, setIsDark: () => {} };
}

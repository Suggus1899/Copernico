import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);
const storedTheme = (): Theme | null => {
  try {
    const value = localStorage.getItem('copernico-theme');
    return value === 'light' || value === 'dark' ? value : null;
  } catch { return null; }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => storedTheme() ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const change = () => { if (!storedTheme()) setTheme(media.matches ? 'dark' : 'light'); };
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('copernico-theme', next); } catch { /* La preferencia sigue activa durante esta sesión. */ }
    setTheme(next);
  };
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle() {
  const context = useContext(ThemeContext);
  if (!context) return null;
  return <button type="button" className="theme-toggle" onClick={context.toggle}>{context.theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}</button>;
}

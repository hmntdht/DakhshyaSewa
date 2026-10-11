'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Bi } from './Bi';
import type { Msg } from '@/lib/config/types';

type Lang = 'en' | 'ne';
const CopyCtx = createContext<Record<string, Msg>>({});
const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; theme: 'dark' | 'light'; toggleTheme: () => void }>({ lang: 'en', setLang: () => {}, theme: 'dark', toggleTheme: () => {} });

export function AppProviders({ copy, children }: { copy: Record<string, Msg>; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const d = document.documentElement;
    setLangState(d.dataset.lang === 'ne' ? 'ne' : 'en');
    setTheme(d.dataset.theme === 'light' ? 'light' : 'dark');
  }, []);

  const setLang = useCallback((l: Lang) => {
    const d = document.documentElement; d.dataset.lang = l; d.lang = l;
    try { localStorage.setItem('ds-lang', l); } catch { /* private mode */ }
    setLangState(l);
  }, []);
  const toggleTheme = useCallback(() => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('ds-theme', next); } catch { /* private mode */ }
    setTheme(next);
  }, []);

  const value = useMemo(() => ({ lang, setLang, theme, toggleTheme }), [lang, setLang, theme, toggleTheme]);
  return <CopyCtx.Provider value={copy}><LangCtx.Provider value={value}>{children}</LangCtx.Provider></CopyCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);

/** t(k) returns a both-language node for visible text. */
export function useT() {
  const copy = useContext(CopyCtx);
  return useCallback((k: string) => <Bi v={copy[k] ?? { en: k, ne: k }} />, [copy]);
}
/** ts(k) returns a plain string in the ACTIVE language, for placeholders, aria-labels and confirm() dialogs. */
export function useTs() {
  const copy = useContext(CopyCtx); const { lang } = useLang();
  return useCallback((k: string) => copy[k]?.[lang] || copy[k]?.en || k, [copy, lang]);
}

'use client';
import { Moon, Sun } from 'lucide-react';
import { useLang } from '../providers';
import { cn } from '@/lib/utils';

export function LangThemeToggle({ className }: { className?: string }) {
  const { lang, setLang, theme, toggleTheme } = useLang();
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div role="group" aria-label="Language" className="flex rounded-full border border-line p-0.5 text-xs">
        {(['en', 'ne'] as const).map((l) => (
          <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
            className={cn('rounded-full px-2.5 py-1 font-medium transition', l === 'ne' && 'font-ne', lang === l ? 'bg-fg text-bg' : 'text-muted hover:text-fg')}>
            {l === 'en' ? 'EN' : 'नेपाली'}
          </button>
        ))}
      </div>
      <button type="button" onClick={toggleTheme} className="btn btn-ghost !p-2" aria-label="Toggle light / dark theme">
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </div>
  );
}

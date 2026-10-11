'use client';
import { useState, useTransition } from 'react';
import { RotateCcw } from 'lucide-react';
import { saveThemeAction } from '@/lib/admin/actions';
import { DEFAULT_CONFIG } from '@/lib/config/defaults';
import { Notice, Spinner } from '../ui';
import { Bi } from '../Bi';
import { hexToTriplet, isHex } from '@/lib/utils';
import type { Palette, SiteConfig } from '@/lib/config/types';
import type { Msg } from '@/lib/config/types';

type Theme = SiteConfig['theme'];
const NAMES: [keyof Palette, string][] = [['background', 'Page background'], ['surface', 'Cards'], ['elevated', 'Raised / menus'], ['foreground', 'Text'], ['muted', 'Soft text'], ['line', 'Borders'], ['primary', 'Brand / buttons'], ['primary_foreground', 'Text on brand'], ['accent', 'Accent (gold)'], ['success', 'Success'], ['danger', 'Danger'], ['warning', 'Warning']];
const KEYS: [keyof Palette, string][] = [['background', 'bg'], ['surface', 'surface'], ['elevated', 'elev'], ['foreground', 'fg'], ['muted', 'muted'], ['line', 'line'], ['primary', 'primary'], ['primary_foreground', 'primary-fg'], ['accent', 'accent'], ['success', 'ok'], ['danger', 'bad'], ['warning', 'warn']];

function Preview({ p, radius, label }: { p: Palette; radius: number; label: string }) {
  const vars = Object.fromEntries(KEYS.map(([k, v]) => [`--c-${v}`, hexToTriplet(isHex(p[k]) ? p[k] : '#000000')])) as React.CSSProperties;
  return (
    <div style={{ ...vars, borderRadius: radius + 6 }} className="overflow-hidden border border-line bg-bg p-5 text-fg">
      <p className="mb-3 text-xs text-muted">{label}</p>
      <div style={{ borderRadius: radius }} className="border border-line bg-surface p-4">
        <p className="text-lg font-light">Skilled hands for your home</p><p className="mt-1 text-sm text-muted">Cleaning, kitchen help and more.</p>
        <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-fg">Book a service</span><span className="rounded-full border border-line px-4 py-1.5 text-sm">Learn more</span><span className="rounded-full bg-ok/15 px-3 py-1.5 text-xs text-ok">Paid</span><span className="rounded-full bg-bad/15 px-3 py-1.5 text-xs text-bad">Cancelled</span><span className="rounded-full bg-accent/20 px-3 py-1.5 text-xs text-accent">Accent</span></div>
      </div>
    </div>
  );
}

function PaletteEditor({ title, value, onChange }: { title: string; value: Palette; onChange: (p: Palette) => void }) {
  return (
    <fieldset className="card p-5"><legend className="px-2 text-sm font-medium">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">{NAMES.map(([k, label]) => (
        <label key={k} className="flex items-center gap-3 text-sm"><input type="color" value={isHex(value[k]) ? value[k] : '#000000'} onChange={(e) => onChange({ ...value, [k]: e.target.value.toUpperCase() })} className="h-9 w-12 shrink-0 cursor-pointer rounded border border-line bg-surface p-0.5" aria-label={label} />
          <span className="flex-1 text-muted">{label}</span><input value={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.value.toUpperCase() })} maxLength={7} className="field !w-24 !px-2 !py-1 font-mono text-xs" aria-label={`${label} hex`} /></label>))}</div>
    </fieldset>
  );
}

export function ThemeEditor({ initial }: { initial: Theme }) {
  const [t, setT] = useState<Theme>(initial); const [pending, start] = useTransition(); const [res, setRes] = useState<{ ok: boolean; msg: Msg } | null>(null);
  const save = () => start(async () => { const r = await saveThemeAction(JSON.stringify(t)); setRes(r.ok ? { ok: true, msg: r.message ?? { en: 'Saved', ne: 'सुरक्षित' } } : { ok: false, msg: r.error }); });
  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-2"><Preview p={t.dark} radius={t.radius} label="Dark preview" /><Preview p={t.light} radius={t.radius} label="Light preview" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="label">Default mode for new visitors</span><select value={t.default_mode} onChange={(e) => setT({ ...t, default_mode: e.target.value as Theme['default_mode'] })} className="field"><option value="dark">Dark (like the poster)</option><option value="light">Light</option></select></label>
        <label className="block"><span className="label">Corner roundness: {t.radius}px</span><input type="range" min={0} max={32} value={t.radius} onChange={(e) => setT({ ...t, radius: Number(e.target.value) })} className="w-full accent-[rgb(var(--c-primary))]" /></label>
      </div>
      <div className="grid gap-6 xl:grid-cols-2"><PaletteEditor title="Dark palette" value={t.dark} onChange={(dark) => setT({ ...t, dark })} /><PaletteEditor title="Light palette" value={t.light} onChange={(light) => setT({ ...t, light })} /></div>
      <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={save} disabled={pending} className="btn btn-primary btn-lg">{pending && <Spinner />}Save theme</button>
        <button type="button" onClick={() => { if (window.confirm('Reset all colours to the Daksha Sewa defaults?')) setT(DEFAULT_CONFIG.theme); }} className="btn btn-ghost"><RotateCcw className="h-4 w-4" />Reset to defaults</button></div>
      {res && <Notice tone={res.ok ? 'success' : 'error'}><Bi v={res.msg} /></Notice>}
    </div>
  );
}

'use client';
import { ImageField } from './ImageField';
import { cn, isoToNpt } from '@/lib/utils';
import { ICON_OPTIONS, type FieldDef } from '@/lib/admin/resources';

/** Renders one FieldDef. Uncontrolled inputs (FormData is the source of truth on submit). */
export function FieldInput({ f, value, editing, lookups }: { f: FieldDef; value: unknown; editing?: boolean; lookups?: Record<string, { value: string; label: string }[]> }) {
  const v = value ?? '';
  const common = { name: f.name, id: `f-${f.name}`, className: cn('field', f.ne && 'font-ne') } as const;
  let control: React.ReactNode;
  switch (f.type) {
    case 'textarea': control = <textarea {...common} rows={f.name.startsWith('body') ? 12 : 3} defaultValue={String(v)} maxLength={f.maxLength ?? 12000} className={cn(common.className, 'resize-y')} />; break;
    case 'number': control = <input {...common} type="number" step={f.step ?? 'any'} min={f.min} max={f.max} defaultValue={v === '' ? '' : Number(v)} required={f.required} />; break;
    case 'boolean': return <label className="flex items-center gap-3 self-end rounded-app border border-line bg-surface px-4 py-3 text-sm"><input type="checkbox" name={f.name} defaultChecked={!!value} className="h-4 w-4 accent-[rgb(var(--c-primary))]" />{f.label}{f.help && <span className="text-xs text-muted">— {f.help}</span>}</label>;
    case 'select': control = <select {...common} defaultValue={String(v)}>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>; break;
    case 'category': control = <select {...common} defaultValue={String(v)}><option value="">— none —</option>{lookups?.categories?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>; break;
    case 'icon': control = <select {...common} defaultValue={String(v) || 'Sparkles'}>{ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>; break;
    case 'color': control = <input {...common} type="color" defaultValue={String(v) || '#000000'} className="h-10 w-full cursor-pointer rounded-app border border-line bg-surface p-1" />; break;
    case 'image': control = <ImageField name={f.name} defaultValue={String(v)} />; break;
    case 'datetime': { const p = v ? isoToNpt(String(v)) : null; control = <input {...common} type="datetime-local" defaultValue={p ? `${p.date}T${p.time}` : ''} />; break; }
    default: control = <input {...common} type="text" defaultValue={String(v)} required={f.required} maxLength={f.maxLength ?? 500} placeholder={f.placeholder} readOnly={editing && f.readOnlyOnEdit} className={cn(common.className, editing && f.readOnlyOnEdit && 'opacity-60', f.upper && 'uppercase')} />;
  }
  return <div className={f.wide ? 'sm:col-span-2' : ''}><label htmlFor={`f-${f.name}`} className="label">{f.label}{f.required && <span className="text-bad"> *</span>}</label>{control}{f.help && <p className="mt-1 text-xs text-muted">{f.help}</p>}</div>;
}

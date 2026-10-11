'use client';
import { useT } from '../providers';
import { Field } from '../ui';

const LANGS = ['Nepali', 'English', 'Hindi', 'Tharu', 'Doteli'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface ProfileDefaults { display_name?: string; display_name_ne?: string; headline_en?: string; bio_en?: string; experience_years?: number; languages?: string[]; available_days?: number[]; work_start?: string; work_end?: string; phone?: string; address?: string }

/** Shared by the application form and the profile editor so both stay in sync. */
export function ProfileFields({ d = {} }: { d?: ProfileDefaults }) {
  const t = useT(); const chip = 'flex cursor-pointer items-center gap-2 rounded-full border border-line px-3.5 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/15';
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label={t('apply.name')}><input name="display_name" required minLength={2} maxLength={60} defaultValue={d.display_name} className="field" /></Field>
      <Field label={t('apply.name_ne')}><input name="display_name_ne" maxLength={60} lang="ne" defaultValue={d.display_name_ne} className="field font-ne" /></Field>
      <Field label={t('apply.headline')} className="sm:col-span-2"><input name="headline_en" maxLength={120} defaultValue={d.headline_en} className="field" placeholder="e.g. Careful, fast and honest" /></Field>
      <Field label={t('apply.bio')} className="sm:col-span-2"><textarea name="bio_en" rows={4} maxLength={1200} defaultValue={d.bio_en} className="field resize-none" /></Field>
      <Field label={t('apply.experience')}><input name="experience_years" type="number" min={0} max={60} required defaultValue={d.experience_years ?? 0} className="field" /></Field>
      <Field label={t('book.phone')}><input name="phone" required inputMode="tel" defaultValue={d.phone} className="field" placeholder="98XXXXXXXX" /></Field>
      <div className="sm:col-span-2"><p className="label">{t('apply.languages')}</p><div className="flex flex-wrap gap-2">{LANGS.map((l) => <label key={l} className={chip}><input type="checkbox" name="languages" value={l} defaultChecked={(d.languages ?? ['Nepali']).includes(l)} className="sr-only" />{l}</label>)}</div></div>
      <div className="sm:col-span-2"><p className="label">{t('apply.days')}</p><div className="flex flex-wrap gap-2">{DAYS.map((l, i) => <label key={l} className={chip}><input type="checkbox" name="days" value={i} defaultChecked={(d.available_days ?? [0, 1, 2, 3, 4, 5]).includes(i)} className="sr-only" />{l}</label>)}</div></div>
      <Field label={t('apply.from')}><input name="work_start" type="time" required defaultValue={(d.work_start ?? '07:00').slice(0, 5)} className="field" /></Field>
      <Field label={t('apply.to')}><input name="work_end" type="time" required defaultValue={(d.work_end ?? '19:00').slice(0, 5)} className="field" /></Field>
      <Field label={t('apply.address')} className="sm:col-span-2"><input name="address" maxLength={300} defaultValue={d.address} className="field" /></Field>
    </div>
  );
}

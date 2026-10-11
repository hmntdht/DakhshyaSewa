'use client';
import { ActionForm, SubmitButton } from '../form';
import { FieldInput } from './FieldInput';
import { saveSettingsAction } from '@/lib/admin/actions';
import type { SettingsGroup } from '@/lib/admin/settings-schema';

const get = (o: unknown, path: string) => path.split('.').reduce<unknown>((a, k) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[k] : undefined), o);

export function SettingsForm({ group, value }: { group: SettingsGroup; value: Record<string, unknown> }) {
  return (
    <ActionForm action={(fd) => saveSettingsAction(group.key, fd)} className="max-w-3xl">
      <div className="grid gap-5 sm:grid-cols-2">{group.fields.map((f) => <FieldInput key={f.name} f={f} value={get(value, f.name)} />)}</div>
      <div className="mt-8"><SubmitButton className="btn-lg">Save changes</SubmitButton></div>
    </ActionForm>
  );
}

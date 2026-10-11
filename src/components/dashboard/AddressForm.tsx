'use client';
import { useState } from 'react';
import { MapPicker } from '../map';
import { ActionForm, SubmitButton } from '../form';
import { Field } from '../ui';
import { useT, useTs } from '../providers';
import { addAddressAction } from '@/lib/account/actions';
import type { ServiceArea } from '@/types/db';

export function AddressForm({ areas }: { areas: ServiceArea[] }) {
  const t = useT(); const ts = useTs();
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null); const [addr, setAddr] = useState('');
  return (
    <ActionForm action={addAddressAction} resetOnSuccess className="space-y-5">
      <MapPicker areas={areas} value={pos} height={320} onChange={(p) => { setPos({ lat: p.lat, lng: p.lng }); if (p.address) setAddr(p.address); }} />
      <input type="hidden" name="lat" value={pos?.lat ?? ''} /><input type="hidden" name="lng" value={pos?.lng ?? ''} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('book.save_as')}><input name="label" required maxLength={40} placeholder={ts('book.save_as_ph')} className="field" /></Field>
        <Field label={t('book.landmark')}><input name="landmark" maxLength={200} className="field" /></Field>
        <Field label={t('book.address')} className="sm:col-span-2"><input name="address_text" required minLength={3} maxLength={300} value={addr} onChange={(e) => setAddr(e.target.value)} className="field" /></Field>
      </div>
      <label className="flex items-center gap-2.5 text-sm text-muted"><input type="checkbox" name="is_default" className="h-4 w-4 accent-[rgb(var(--c-primary))]" />{t('dash.make_default')}</label>
      <SubmitButton>{t('common.save')}</SubmitButton>
    </ActionForm>
  );
}

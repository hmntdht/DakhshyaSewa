import { Banknote, CreditCard, ShieldCheck, Smartphone } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ActionForm, SubmitButton } from '@/components/form';
import { RowAction } from '@/components/RowAction';
import { T } from '@/components/T';
import { EmptyState, Field, Notice, PageTitle } from '@/components/ui';
import { addPaymentPrefAction, deletePaymentPrefAction } from '@/lib/account/actions';
import type { PaymentPref } from '@/types/db';

const ICON = { cash: Banknote, esewa: Smartphone, khalti: Smartphone, stripe: CreditCard } as const;

export default async function PaymentsPage() {
  const { data } = await (await createClient()).from('payment_methods').select('*').order('is_default', { ascending: false }).order('created_at');
  const list = (data ?? []) as PaymentPref[];
  return (
    <>
      <PageTitle title={<T k="dash.payments" />} sub={<T k="dash.payments_sub" />} />
      <Notice className="mb-8 flex items-start gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><T k="dash.payments_safe" /></span></Notice>
      <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
        <div>
          {list.length ? <ul className="space-y-3">{list.map((m) => { const I = ICON[m.provider]; return (
            <li key={m.id} className="card flex items-center gap-4 p-5"><span className="grid h-11 w-11 place-items-center rounded-full bg-primary/15 text-primary"><I className="h-5 w-5" /></span>
              <div className="flex-1"><p className="font-medium">{m.label}{m.is_default && <span className="ml-2 chip border-primary/40 text-primary"><T k="dash.default" /></span>}</p><p className="text-sm capitalize text-muted">{m.provider}{m.account_hint ? ` · ${m.account_hint}` : ''}</p></div>
              <RowAction action={deletePaymentPrefAction.bind(null, m.id)} className="btn-danger" confirm="Remove this?"><T k="common.delete" /></RowAction></li>); })}</ul> : <EmptyState title={<T k="dash.no_payments" />} />}
        </div>
        <ActionForm action={addPaymentPrefAction} resetOnSuccess className="card space-y-4 p-6">
          <h2 className="text-lg font-medium"><T k="dash.add_payment" /></h2>
          <Field label={<T k="dash.pay_provider" />}><select name="provider" className="field"><option value="cash">Cash</option><option value="esewa">eSewa</option><option value="khalti">Khalti</option><option value="stripe">Card (Stripe)</option></select></Field>
          <Field label={<T k="dash.pay_label" />}><input name="label" required maxLength={40} className="field" placeholder="My eSewa" /></Field>
          <Field label={<T k="dash.pay_account" />} hint={<T k="dash.pay_account_hint" />}><input name="account" maxLength={20} inputMode="tel" className="field" placeholder="98XXXXXXXX" /></Field>
          <label className="flex items-center gap-2.5 text-sm text-muted"><input type="checkbox" name="is_default" className="h-4 w-4 accent-[rgb(var(--c-primary))]" /><T k="dash.make_default" /></label>
          <SubmitButton><T k="common.save" /></SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}

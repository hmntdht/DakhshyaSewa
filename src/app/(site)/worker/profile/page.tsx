import { requireWorker } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { getCategories } from '@/lib/queries';
import { AvatarUpload } from '@/components/AvatarUpload';
import { ActionForm, SubmitButton } from '@/components/form';
import { ProfileFields } from '@/components/worker/ProfileFields';
import { ServicePicker } from '@/components/worker/ServicePicker';
import { Badge, Field, PageTitle } from '@/components/ui';
import { T } from '@/components/T';
import { updateWorkerProfileAction } from '@/lib/worker/actions';

export default async function WorkerProfilePage() {
  const { profile, worker } = await requireWorker('/worker/profile');
  const sb = await createClient();
  const [cats, priv, svcs] = await Promise.all([getCategories(), sb.from('worker_private').select('*').eq('worker_id', worker.id).maybeSingle(), sb.from('worker_services').select('category_id,rate').eq('worker_id', worker.id)]);
  const p = (priv.data ?? {}) as { phone?: string; whatsapp?: string; address?: string; payout_method?: string; payout_account?: string };
  const initial = Object.fromEntries(((svcs.data ?? []) as { category_id: string; rate: number | null }[]).map((s) => [s.category_id, s.rate]));
  return (
    <>
      <PageTitle title={<T k="worker.nav.profile" />} action={<Badge tone={worker.status}>{worker.status}</Badge>} />
      <ActionForm action={updateWorkerProfileAction} className="max-w-3xl space-y-12">
        <section className="space-y-6"><AvatarUpload userId={profile.id} name={worker.display_name} initial={worker.avatar_url ?? ''} />
          <ProfileFields d={{ ...worker, phone: p.phone ?? profile.phone ?? '', address: p.address ?? '', display_name_ne: worker.display_name_ne ?? '', headline_en: worker.headline_en ?? '', bio_en: worker.bio_en ?? '' }} />
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="is_listed" defaultChecked={worker.is_listed} className="h-4 w-4 accent-[rgb(var(--c-primary))]" /><T k="worker.listed" /></label></section>
        <section><h2 className="mb-5 text-2xl font-light tracking-tight"><T k="apply.s2" /></h2><ServicePicker categories={cats.filter((c) => !c.id.startsWith('fallback'))} initial={initial} /></section>
        <section className="grid gap-5 sm:grid-cols-2"><h2 className="text-2xl font-light tracking-tight sm:col-span-2"><T k="worker.payout" /></h2>
          <Field label="WhatsApp"><input name="whatsapp" defaultValue={p.whatsapp ?? ''} maxLength={20} className="field" /></Field><Field label={<T k="worker.payout_method" />}><input name="payout_method" defaultValue={p.payout_method ?? ''} maxLength={40} className="field" placeholder="eSewa / Khalti / Bank" /></Field>
          <Field label={<T k="worker.payout_account" />} className="sm:col-span-2"><input name="payout_account" defaultValue={p.payout_account ?? ''} maxLength={60} className="field" /></Field></section>
        <SubmitButton className="btn-lg"><T k="common.save" /></SubmitButton>
      </ActionForm>
    </>
  );
}

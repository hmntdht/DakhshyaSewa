import { ProfileForm, PasswordForm } from '@/components/dashboard/ProfileForms';
import { T } from '@/components/T';
import { PageTitle } from '@/components/ui';
import { requireUser } from '@/lib/auth/session';

export default async function SettingsPage() {
  const p = await requireUser('/dashboard/settings');
  return (
    <>
      <PageTitle title={<T k="dash.settings" />} />
      <div className="grid max-w-4xl gap-8 lg:grid-cols-2"><ProfileForm userId={p.id} name={p.full_name ?? ''} phone={p.phone ?? ''} avatar={p.avatar_url ?? ''} email={p.email ?? ''} /><PasswordForm /></div>
    </>
  );
}

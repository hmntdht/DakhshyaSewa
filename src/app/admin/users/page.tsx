import Link from 'next/link';
import { Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { setUserRoleAction, setUserStatusAction } from '@/lib/admin/actions';
import { RowAction } from '@/components/RowAction';
import { Avatar, Badge, PageTitle } from '@/components/ui';
import { cn, fmtDate } from '@/lib/utils';

interface P { id: string; full_name: string | null; email: string | null; phone: string | null; avatar_url: string | null; role: string; status: string; created_at: string }

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const sp = await searchParams; const q = (sp.q ?? '').replace(/[%,()*]/g, '').trim().slice(0, 40);
  const sb = await createClient();
  let query = sb.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(60);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  if (['customer', 'worker', 'admin'].includes(sp.role ?? '')) query = query.eq('role', sp.role!);
  const { data, count } = await query; const rows = (data ?? []) as P[];
  const { data: me } = await sb.auth.getUser();
  return (
    <>
      <PageTitle title="Users" sub={`${count ?? 0} accounts`} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form className="relative min-w-60 flex-1 sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input name="q" defaultValue={q} placeholder="Name, email or phone" className="field pl-9" /></form>
        <div className="flex gap-1.5 text-xs">{[undefined, 'customer', 'worker', 'admin'].map((r) => <Link key={r ?? 'all'} href={r ? `?role=${r}` : '?'} className={cn('rounded-full border px-3 py-1.5 capitalize transition', sp.role === r || (!sp.role && !r) ? 'border-primary bg-primary/15 text-primary' : 'border-line text-muted hover:text-fg')}>{r ?? 'all'}</Link>)}</div>
      </div>
      <div className="overflow-x-auto rounded-app border border-line"><table className="w-full min-w-[44rem] text-sm"><thead className="border-b border-line bg-surface"><tr>{['User', 'Contact', 'Role', 'Joined', 'Status', ''].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{rows.map((u) => (
          <tr key={u.id} className="hover:bg-fg/[.03]"><td className="td"><span className="flex items-center gap-3"><Avatar name={u.full_name} url={u.avatar_url} size={32} />{u.full_name ?? '—'}</span></td><td className="td text-muted">{u.email}{u.phone && <span className="block">{u.phone}</span>}</td><td className="td"><Badge tone={u.role === 'admin' ? 'confirmed' : undefined}>{u.role}</Badge></td><td className="td text-muted">{fmtDate(u.created_at)}</td><td className="td"><Badge tone={u.status === 'active' ? 'approved' : 'suspended'}>{u.status}</Badge></td>
            <td className="td"><div className="flex justify-end gap-2">{u.id !== me.user?.id && <>
              <RowAction action={setUserStatusAction.bind(null, u.id, u.status === 'active' ? 'suspended' : 'active')} className={u.status === 'active' ? 'btn-danger' : 'btn-outline'} confirm={u.status === 'active' ? 'Suspend this account?' : undefined}>{u.status === 'active' ? 'Suspend' : 'Reactivate'}</RowAction>
              {u.role !== 'worker' && <RowAction action={setUserRoleAction.bind(null, u.id, u.role === 'admin' ? 'customer' : 'admin')} confirm={u.role === 'admin' ? undefined : 'Give this person full admin access?'}>{u.role === 'admin' ? 'Remove admin' : 'Make admin'}</RowAction>}</>}</div></td></tr>))}
          {rows.length === 0 && <tr><td colSpan={6} className="td py-12 text-center text-muted">No users match.</td></tr>}</tbody></table></div>
    </>
  );
}

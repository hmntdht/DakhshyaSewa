import { createClient } from '@/lib/supabase/server';
import { PageTitle } from '@/components/ui';
import { fmtDateTime } from '@/lib/utils';

export default async function AuditPage() {
  const { data } = await (await createClient()).from('audit_logs').select('id,action,entity,entity_id,details,created_at,profiles:actor_id(full_name,email)').order('created_at', { ascending: false }).limit(150);
  const rows = (data ?? []) as unknown as { id: number; action: string; entity: string; entity_id: string | null; details: unknown; created_at: string; profiles: { full_name: string | null; email: string | null } | null }[];
  return (
    <>
      <PageTitle title="Audit log" sub="Every admin change: who, what, when. Read-only." />
      <div className="overflow-x-auto rounded-app border border-line"><table className="w-full min-w-[46rem] text-sm"><thead className="border-b border-line bg-surface"><tr>{['When', 'Who', 'Action', 'Target', 'Details'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{rows.map((r) => <tr key={r.id} className="align-top"><td className="td whitespace-nowrap text-muted">{fmtDateTime(r.created_at)}</td><td className="td">{r.profiles?.full_name ?? r.profiles?.email ?? 'system'}</td><td className="td font-medium">{r.action}</td><td className="td text-muted">{r.entity}{r.entity_id && <span className="block max-w-40 truncate font-mono text-[10px]">{r.entity_id}</span>}</td><td className="td"><code className="line-clamp-2 max-w-md break-all text-[11px] text-muted">{r.details ? JSON.stringify(r.details) : ''}</code></td></tr>)}
          {rows.length === 0 && <tr><td colSpan={5} className="td py-12 text-center text-muted">Nothing logged yet.</td></tr>}</tbody></table></div>
    </>
  );
}

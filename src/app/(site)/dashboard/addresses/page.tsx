import { MapPin, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getServiceAreas } from '@/lib/queries';
import { AddressForm } from '@/components/dashboard/AddressForm';
import { RowAction } from '@/components/RowAction';
import { T } from '@/components/T';
import { EmptyState, PageTitle } from '@/components/ui';
import { defaultAddressAction, deleteAddressAction } from '@/lib/account/actions';
import type { SavedAddress } from '@/types/db';

export default async function AddressesPage() {
  const sb = await createClient();
  const [{ data }, areas] = await Promise.all([sb.from('saved_addresses').select('*').order('is_default', { ascending: false }).order('created_at', { ascending: false }), getServiceAreas()]);
  const list = (data ?? []) as SavedAddress[];
  return (
    <>
      <PageTitle title={<T k="dash.addresses" />} sub={<T k="dash.addresses_sub" />} />
      <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
        <div>
          {list.length ? <ul className="space-y-3">{list.map((a) => (
            <li key={a.id} className="card flex items-start gap-4 p-5">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1"><p className="flex items-center gap-2 font-medium">{a.label}{a.is_default && <span className="chip border-primary/40 text-primary"><Star className="h-3 w-3" /><T k="dash.default" /></span>}</p><p className="mt-1 text-sm text-muted">{a.address_text}</p>{a.landmark && <p className="text-xs text-muted">{a.landmark}</p>}
                <div className="mt-3 flex gap-2">{!a.is_default && <RowAction action={defaultAddressAction.bind(null, a.id)} className="btn-ghost"><T k="dash.make_default" /></RowAction>}<RowAction action={deleteAddressAction.bind(null, a.id)} className="btn-danger" confirm="Delete this address?"><T k="common.delete" /></RowAction></div></div>
            </li>))}</ul> : <EmptyState title={<T k="dash.no_addresses" />} />}
        </div>
        <div className="card p-6"><h2 className="mb-5 text-lg font-medium"><T k="dash.add_address" /></h2><AddressForm areas={areas} /></div>
      </div>
    </>
  );
}

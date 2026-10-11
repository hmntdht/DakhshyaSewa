import { BadgeCheck, CreditCard, MapPinned, ReceiptText } from 'lucide-react';
import { T } from '../T';

const ITEMS = [[BadgeCheck, 'trust.1'], [ReceiptText, 'trust.2'], [MapPinned, 'trust.3'], [CreditCard, 'trust.4']] as const;

export function TrustStrip() {
  return (
    <div className="border-y border-line bg-surface/50">
      <ul className="container-x grid grid-cols-2 gap-y-5 py-6 lg:grid-cols-4 lg:divide-x lg:divide-line">
        {ITEMS.map(([I, k]) => (
          <li key={k} className="flex items-center gap-3 lg:px-6 lg:first:pl-0">
            <I className="h-5 w-5 shrink-0 text-primary" aria-hidden /><span className="text-sm text-muted"><T k={k} /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

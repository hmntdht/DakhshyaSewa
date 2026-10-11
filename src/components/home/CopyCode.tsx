'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useT } from '../providers';

export function CopyCode({ code }: { code: string }) {
  const t = useT(); const [ok, setOk] = useState(false);
  return (
    <button type="button" className="btn btn-outline gap-3 font-mono tracking-widest" aria-label={`Copy code ${code}`}
      onClick={async () => { try { await navigator.clipboard.writeText(code); setOk(true); setTimeout(() => setOk(false), 1800); } catch { /* clipboard blocked */ } }}>
      {code}{ok ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}<span className="sr-only">{ok ? t('home.offers.copied') : t('home.offers.copy')}</span>
    </button>
  );
}

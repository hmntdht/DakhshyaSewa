import Link from 'next/link';
import { T } from '@/components/T';

export default function Suspended() {
  return (
    <div className="container-x grid min-h-dvh place-items-center text-center">
      <div className="max-w-md"><h1 className="text-3xl font-light"><T k="suspended.title" /></h1><p className="mt-4 text-muted"><T k="suspended.sub" /></p><Link href="/" className="btn btn-outline mt-8"><T k="common.home" /></Link></div>
    </div>
  );
}

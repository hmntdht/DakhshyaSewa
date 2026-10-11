import Link from 'next/link';
import { T } from '@/components/T';

export default function NotFound() {
  return (
    <div className="hero-lines grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="text-8xl font-extralight tracking-tighter text-primary">404</p>
        <h1 className="mt-4 text-2xl font-light"><T k="notfound.title" /></h1>
        <Link href="/" className="btn btn-primary mt-8"><T k="common.home" /></Link>
      </div>
    </div>
  );
}

import { Check, KeyRound, Navigation, ShieldCheck } from 'lucide-react';
import { T } from '../T';
import { SectionHead } from './SectionHead';

const ROUTE = 'M60 330 C 130 322, 150 252, 232 246 S 372 222, 410 150 S 452 92, 470 66';
const POINTS = ['home.tracking.b1', 'home.tracking.b2', 'home.tracking.b3', 'home.tracking.b4'] as const;

/** Pure SVG/SMIL illustration (no map tiles, no JS): a dot follows the route to the pinned door. */
export function TrackingDemo() {
  return (
    <section id="tracking" className="container-x py-20 sm:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <div className="d-shape relative overflow-hidden border border-line bg-surface">
          <svg viewBox="0 0 560 400" className="block h-auto w-full" role="img" aria-label="Illustration: a worker travelling along a route to a pinned home">
            <defs><radialGradient id="glow" cx="84%" cy="16%" r="55%"><stop offset="0" stopColor="rgb(var(--c-primary))" stopOpacity=".16" /><stop offset="1" stopColor="rgb(var(--c-primary))" stopOpacity="0" /></radialGradient></defs>
            <rect width="560" height="400" fill="url(#glow)" />
            <g stroke="rgb(var(--c-line))" strokeWidth="1.2" fill="none" strokeLinecap="round">
              <path d="M0 90 H560 M0 180 H560 M0 270 H560 M0 360 H560" /><path d="M80 0 V400 M190 0 V400 M300 0 V400 M410 0 V400 M520 0 V400" />
              <path d="M0 330 L560 40" strokeWidth="2.4" /><path d="M120 400 L330 0" strokeWidth="1.6" />
            </g>
            <path d={ROUTE} fill="none" stroke="rgb(var(--c-primary))" strokeWidth="3.5" strokeLinecap="round" className="route-dash" />
            <circle cx="60" cy="330" r="5" fill="rgb(var(--c-muted))" />
            <g transform="translate(470 66)">
              <circle r="22" fill="rgb(var(--c-primary))" opacity=".18"><animate attributeName="r" values="10;30" dur="2s" repeatCount="indefinite" /><animate attributeName="opacity" values=".4;0" dur="2s" repeatCount="indefinite" /></circle>
              <path d="M0 -26 c-11 0 -18 8 -18 18 c0 13 18 28 18 28 s18 -15 18 -28 c0 -10 -7 -18 -18 -18z" fill="rgb(var(--c-primary))" /><circle cy="-8" r="6" fill="rgb(var(--c-bg))" />
            </g>
            <g><circle r="9" fill="rgb(var(--c-fg))" stroke="rgb(var(--c-bg))" strokeWidth="3"><animateMotion dur="11s" repeatCount="indefinite" path={ROUTE} /></circle></g>
          </svg>
          <div className="absolute left-4 top-4 flex items-center gap-3 rounded-2xl border border-line bg-elev px-4 py-3 sm:left-8 sm:top-8">
            <Navigation className="h-4 w-4 text-primary" aria-hidden />
            <div className="text-sm leading-tight"><p className="font-medium"><T k="home.tracking.chip1" /></p><p className="text-xs text-muted"><T k="home.tracking.chip2" /></p></div>
          </div>
          <div className="absolute bottom-4 right-4 flex items-center gap-3 rounded-2xl border border-line bg-elev px-4 py-3 sm:bottom-8 sm:right-10">
            <KeyRound className="h-4 w-4 text-accent" aria-hidden />
            <div className="text-sm leading-tight"><p className="text-xs text-muted"><T k="home.tracking.pin" /></p><p className="font-mono text-lg font-semibold tracking-[0.35em]">4821</p></div>
          </div>
        </div>
        <div>
          <SectionHead title={<T k="home.tracking.title" />} sub={<T k="home.tracking.sub" />} />
          <ul className="-mt-4 space-y-4">
            {POINTS.map((k, i) => (
              <li key={k} className="flex gap-3.5 text-muted">
                {i === 3 ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden /> : <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />}
                <span><T k={k} /></span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-muted"><T k="home.tracking.caption" /></p>
        </div>
      </div>
    </section>
  );
}

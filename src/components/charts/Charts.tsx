import { cn } from '@/lib/utils';

/** Dependency-free SVG charts (server-renderable, theme-aware via CSS variables). */
type Datum = { label: string; value: number };
const compact = (n: number) => (n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n)));

export function BarChart({ data, height = 170, format = compact, className }: { data: Datum[]; height?: number; format?: (n: number) => string; className?: string }) {
  const W = 600, pad = { t: 22, b: 26, l: 8, r: 8 }, max = Math.max(1, ...data.map((d) => d.value));
  const bw = (W - pad.l - pad.r) / Math.max(1, data.length), h = height - pad.t - pad.b;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className={cn('h-auto w-full', className)} role="img" aria-label="Bar chart">
      <line x1={pad.l} x2={W - pad.r} y1={height - pad.b} y2={height - pad.b} className="stroke-line" />
      {data.map((d, i) => {
        const bh = (d.value / max) * h, x = pad.l + i * bw + bw * 0.2;
        return (
          <g key={i}>
            <rect x={x} y={height - pad.b - bh} width={bw * 0.6} height={Math.max(bh, d.value > 0 ? 2 : 0)} rx={4} className="fill-primary"><title>{`${d.label}: ${format(d.value)}`}</title></rect>
            {d.value > 0 && <text x={x + bw * 0.3} y={height - pad.b - bh - 6} textAnchor="middle" className="fill-muted text-[11px]">{format(d.value)}</text>}
            <text x={x + bw * 0.3} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({ data, height = 190, format = compact, className }: { data: Datum[]; height?: number; format?: (n: number) => string; className?: string }) {
  const W = 700, pad = { t: 16, b: 26, l: 8, r: 8 }, max = Math.max(1, ...data.map((d) => d.value)), n = Math.max(1, data.length - 1);
  const x = (i: number) => pad.l + (i / n) * (W - pad.l - pad.r), y = (v: number) => pad.t + (1 - v / max) * (height - pad.t - pad.b);
  const pts = data.map((d, i) => `${x(i).toFixed(1)},${y(d.value).toFixed(1)}`);
  const step = Math.ceil(data.length / 8);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className={cn('h-auto w-full', className)} role="img" aria-label="Line chart">
      <defs><linearGradient id="lg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="rgb(var(--c-primary))" stopOpacity=".35" /><stop offset="1" stopColor="rgb(var(--c-primary))" stopOpacity="0" /></linearGradient></defs>
      {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={pad.l} x2={W - pad.r} y1={y(max * f)} y2={y(max * f)} className="stroke-line" strokeDasharray="3 5" />)}
      {data.length > 1 && <polygon points={`${x(0)},${height - pad.b} ${pts.join(' ')} ${x(data.length - 1)},${height - pad.b}`} fill="url(#lg)" />}
      <polyline points={pts.join(' ')} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => <g key={i}><circle cx={x(i)} cy={y(d.value)} r={d.value > 0 ? 3.5 : 0} className="fill-primary"><title>{`${d.label}: ${format(d.value)}`}</title></circle>{i % step === 0 && <text x={x(i)} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">{d.label}</text>}</g>)}
      <text x={W - pad.r} y={pad.t - 4} textAnchor="end" className="fill-muted text-[11px]">max {format(max)}</text>
    </svg>
  );
}

export function HBars({ data, format = compact }: { data: (Datum & { hint?: string })[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3.5">
      {data.map((d) => (
        <li key={d.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm"><span className="truncate">{d.label}</span><span className="shrink-0 text-muted">{d.hint ? `${d.hint} · ` : ''}<b className="font-medium text-fg">{format(d.value)}</b></span></div>
          <div className="h-1.5 rounded-full bg-fg/10"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, (d.value / max) * 100)}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

const TONES = ['fill-primary', 'fill-accent', 'fill-ok', 'fill-warn', 'fill-bad', 'fill-muted'];
const SWATCH = ['bg-primary', 'bg-accent', 'bg-ok', 'bg-warn', 'bg-bad', 'bg-muted'];
export function Donut({ data, center }: { data: Datum[]; center?: string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1; let acc = 0; const R = 54, C = 2 * Math.PI * R;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0 -rotate-90" role="img" aria-label="Donut chart">
        <circle cx="70" cy="70" r={R} fill="none" className="stroke-fg/10" strokeWidth="16" />
        {data.map((d, i) => { const len = (d.value / total) * C, off = -acc; acc += len; return <circle key={i} cx="70" cy="70" r={R} fill="none" strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={off} className={cn(TONES[i % 6].replace('fill-', 'stroke-'))}><title>{`${d.label}: ${d.value}`}</title></circle>; })}
        {center && <text x="70" y="70" textAnchor="middle" dominantBaseline="central" transform="rotate(90 70 70)" className="fill-fg text-xl font-semibold">{center}</text>}
      </svg>
      <ul className="space-y-2 text-sm">{data.map((d, i) => <li key={i} className="flex items-center gap-2.5"><span className={cn('h-2.5 w-2.5 rounded-full', SWATCH[i % 6])} /><span className="text-muted">{d.label}</span><b className="font-medium">{d.value}</b></li>)}</ul>
    </div>
  );
}

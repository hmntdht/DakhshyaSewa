import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/** Nepal time is a fixed UTC+05:45 (no DST), so we can do date maths without a tz library. */
export const TZ = 'Asia/Kathmandu';
const NPT = '+05:45';

export const rs = (n: number | string | null | undefined) =>
  `Rs ${Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const fmt = (opts: Intl.DateTimeFormatOptions, locale = 'en-GB') => new Intl.DateTimeFormat(locale, { timeZone: TZ, ...opts });
export const fmtDate = (d: string | Date) => fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d));
export const fmtDateLong = (d: string | Date) => fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
export const fmtTime = (d: string | Date) => fmt({ hour: 'numeric', minute: '2-digit', hour12: true }, 'en-US').format(new Date(d));
export const fmtDateTime = (d: string | Date) => `${fmtDate(d)}, ${fmtTime(d)}`;

/** 'YYYY-MM-DD' + 'HH:MM' (Nepal wall-clock) -> ISO instant */
export const nptToIso = (date: string, time: string) => new Date(`${date}T${time}:00${NPT}`).toISOString();
/** ISO instant -> Nepal wall-clock parts */
export function isoToNpt(iso: string) {
  const d = new Date(new Date(iso).getTime() + (5 * 60 + 45) * 60_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return { date: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`, time: `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`, dow: d.getUTCDay() };
}
export const todayNpt = () => isoToNpt(new Date().toISOString()).date;
export const addDays = (date: string, n: number) => {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
};
export const dowOf = (date: string) => { const [y, m, d] = date.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
export const hhmmToMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const minToHhmm = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
export const to12h = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };

export const initials = (name?: string | null) =>
  (name ?? '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || '?';

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371.0088, rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
export const hexToTriplet = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

export const safeNextPath = (next: string | null | undefined, fallback = '/dashboard') =>
  next && /^\/(?![/\\])/.test(next) && !next.includes('\n') && !next.includes('\r') ? next : fallback;

export const maskPhone = (p?: string | null) => (p && p.length >= 7 ? `${p.slice(0, 2)}•••••${p.slice(-3)}` : p ?? '');
export const digitsOnly = (s: string) => s.replace(/\D/g, '');
export const telHref = (p: string) => `tel:+977${digitsOnly(p).replace(/^977/, '')}`;
export const waHref = (p: string, text?: string) => `https://wa.me/${digitsOnly(p).startsWith('977') ? digitsOnly(p) : `977${digitsOnly(p)}`}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

export const deepMerge = <T,>(base: T, over: unknown): T => {
  if (!over || typeof over !== 'object' || Array.isArray(over) || typeof base !== 'object' || base === null || Array.isArray(base)) return (over ?? base) as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) out[k] = k in out ? deepMerge(out[k], v) : v;
  return out as T;
};

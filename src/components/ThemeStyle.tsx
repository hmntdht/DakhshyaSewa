import { getSiteConfig } from '@/lib/config';
import { DEFAULT_CONFIG } from '@/lib/config/defaults';
import { hexToTriplet, isHex } from '@/lib/utils';
import type { Palette } from '@/lib/config/types';

const MAP: [keyof Palette, string][] = [
  ['background', 'bg'], ['surface', 'surface'], ['elevated', 'elev'], ['foreground', 'fg'], ['muted', 'muted'], ['line', 'line'],
  ['primary', 'primary'], ['primary_foreground', 'primary-fg'], ['accent', 'accent'], ['success', 'ok'], ['danger', 'bad'], ['warning', 'warn'],
];

function block(selector: string, p: Partial<Palette> | undefined, fallback: Palette, radius: number, scheme: string) {
  const vars = MAP.map(([k, v]) => `--c-${v}:${hexToTriplet(isHex(p?.[k]) ? (p?.[k] as string) : fallback[k])}`).join(';');
  return `${selector}{${vars};--radius:${radius}px;color-scheme:${scheme}}`;
}

/**
 * Turns the admin's theme settings into CSS variables. Every value is validated (#RRGGBB / clamped number)
 * before it is written into the <style> tag, so a malicious or malformed setting cannot inject CSS or script.
 */
export async function ThemeStyle() {
  const { theme } = await getSiteConfig();
  const radius = Math.min(32, Math.max(0, Number(theme.radius) || 14));
  const css = block('html[data-theme="dark"],[data-theme="dark"]', theme.dark, DEFAULT_CONFIG.theme.dark, radius, 'dark')
            + block('html[data-theme="light"],[data-theme="light"]', theme.light, DEFAULT_CONFIG.theme.light, radius, 'light');
  return <style id="ds-theme" dangerouslySetInnerHTML={{ __html: css }} />;
}

/** Runs before first paint: restores the visitor's language + theme choice (no flash). Static string, no user input. */
export const THEME_BOOT = `(function(){try{var d=document.documentElement,l=localStorage.getItem('ds-lang'),t=localStorage.getItem('ds-theme');d.dataset.lang=l==='ne'?'ne':'en';d.lang=d.dataset.lang;if(t==='light'||t==='dark')d.dataset.theme=t}catch(e){}})()`;

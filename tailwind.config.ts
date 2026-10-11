import type { Config } from 'tailwindcss';

// Every colour is a CSS variable (rgb triplet) so the admin panel can re-theme
// the whole product at runtime. See src/components/ThemeStyle.tsx.
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'), surface: token('surface'), elev: token('elev'), fg: token('fg'), muted: token('muted'),
        line: token('line'), primary: token('primary'), 'primary-fg': token('primary-fg'), accent: token('accent'),
        ok: token('ok'), bad: token('bad'), warn: token('warn'),
      },
      fontFamily: {
        sans: ['"Outfit Variable"', 'Mukta', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        ne: ['Mukta', '"Outfit Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { app: 'var(--radius)' },
      maxWidth: { page: '76rem' },
      keyframes: {
        pulseRing: { '0%': { transform: 'scale(.6)', opacity: '.7' }, '100%': { transform: 'scale(2.4)', opacity: '0' } },
        rise: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { 'pulse-ring': 'pulseRing 2s ease-out infinite', rise: 'rise .5s ease-out both' },
    },
  },
  plugins: [],
} satisfies Config;

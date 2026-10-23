// Security headers + CSP live here so every response (pages, API, static) gets them.
const isProd = process.env.NODE_ENV === 'production';
// HSTS / upgrade-insecure-requests only make sense (and only work in every browser) when the site is really served over HTTPS.
const isHttps = isProd && (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://');

const hostOf = (u) => { try { return u ? new URL(u).origin : null; } catch { return null; } };
const supabase = hostOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseWs = supabase ? supabase.replace(/^http/, 'ws') : null;
const mapHosts = [process.env.NEXT_PUBLIC_MAP_STYLE_URL, process.env.NEXT_PUBLIC_MAP_TILES].map(hostOf).filter(Boolean);

const csp = [
  "default-src 'self'",
  // Next injects small inline bootstrap scripts. A nonce-based strict CSP is the upgrade path (see docs/SECURITY.md).
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  ['connect-src', "'self'", supabase, supabaseWs, 'https://*.supabase.co', 'wss://*.supabase.co',
    'https://*.basemaps.cartocdn.com', 'https://tile.openstreetmap.org', ...mapHosts].filter(Boolean).join(' '),
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  // payment gateways are reached by top-level form POST / redirect
  "form-action 'self' https://rc-epay.esewa.com.np https://epay.esewa.com.np https://checkout.stripe.com",
  ...(isHttps ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  ...(isHttps ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  devIndicators: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: supabase ? [{ protocol: 'https', hostname: new URL(supabase).hostname, pathname: '/storage/v1/object/public/**' }] : [],
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    serverActions: { bodySizeLimit: '2mb', allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean) }
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/brand/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ];
  },
};
export default nextConfig;

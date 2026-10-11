import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/outfit/index.css';
import '@fontsource/mukta/400.css';
import '@fontsource/mukta/500.css';
import '@fontsource/mukta/600.css';
import '@fontsource/mukta/700.css';
import '@fontsource/mukta/800.css';
import './globals.css';
import { getCopy, getSiteConfig } from '@/lib/config';
import { ThemeStyle, THEME_BOOT } from '@/components/ThemeStyle';
import { AppProviders } from '@/components/providers';
import { env } from '@/lib/env';

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  return {
    metadataBase: new URL(env.siteUrl),
    title: { default: cfg.seo.title, template: `%s | ${cfg.brand.name_en}` },
    description: cfg.seo.description,
    applicationName: cfg.brand.name_en,
    manifest: '/manifest.webmanifest',
    icons: { icon: '/favicon.ico', apple: '/brand/apple-touch-icon.png' },
    openGraph: { title: cfg.seo.title, description: cfg.seo.description, siteName: cfg.brand.name_en, locale: 'en_NP', type: 'website', images: [{ url: '/og.jpg', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title: cfg.seo.title, description: cfg.seo.description, images: ['/og.jpg'] },
  };
}
export const viewport: Viewport = { themeColor: '#111216', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [cfg, copy] = await Promise.all([getSiteConfig(), getCopy()]);
  return (
    <html lang="en" data-lang="en" data-theme={cfg.theme.default_mode} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <ThemeStyle />
      </head>
      <body className="min-h-dvh antialiased">
        <AppProviders copy={copy}>{children}</AppProviders>
      </body>
    </html>
  );
}

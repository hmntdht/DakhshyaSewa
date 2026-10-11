import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Daksha Sewa | दक्ष सेवा', short_name: 'Daksha Sewa', description: 'Home services in Dhangadhi, with live arrival tracking.',
    start_url: '/', display: 'standalone', background_color: '#111216', theme_color: '#111216', lang: 'en',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

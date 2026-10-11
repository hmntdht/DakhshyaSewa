import { Fragment } from 'react';
import { getSiteConfig } from '@/lib/config';
import { env } from '@/lib/env';
import { Hero } from '@/components/home/Hero';
import { TrustStrip } from '@/components/home/TrustStrip';
import { ServicesList } from '@/components/home/ServicesList';
import { HowItWorks } from '@/components/home/HowItWorks';
import { TrackingDemo } from '@/components/home/TrackingDemo';
import { WorkersRail } from '@/components/home/WorkersRail';
import { Offers } from '@/components/home/Offers';
import { Testimonials } from '@/components/home/Testimonials';
import { FaqList } from '@/components/home/FaqList';
import { Areas } from '@/components/home/Areas';
import { ContactSection } from '@/components/home/ContactSection';
import { CtaBand } from '@/components/home/CtaBand';
import type { HomeSectionId } from '@/lib/config/types';

export const revalidate = 300; // ISR; admin saves also call revalidateTag() for instant updates

const SECTIONS: Record<HomeSectionId, React.ReactNode> = {
  services: <ServicesList />, how: <HowItWorks />, tracking: <TrackingDemo />, workers: <WorkersRail />, offers: <Offers />,
  testimonials: <Testimonials />, faq: <FaqList />, areas: <Areas />, contact: <ContactSection />,
};

export default async function HomePage() {
  const cfg = await getSiteConfig();
  const order = cfg.home_layout.sections.filter((s) => s.enabled && s.id in SECTIONS);
  const ld = {
    '@context': 'https://schema.org', '@type': 'LocalBusiness', name: cfg.brand.name_en, alternateName: cfg.brand.name_ne, url: env.siteUrl,
    telephone: cfg.contact.phone_primary ? `+977${cfg.contact.phone_primary}` : undefined, image: `${env.siteUrl}/og.jpg`,
    address: { '@type': 'PostalAddress', addressLocality: 'Dhangadhi', addressRegion: 'Sudurpaschim Province', addressCountry: 'NP' }, areaServed: 'Kailali',
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <Hero />
      <TrustStrip />
      {order.map((s) => <Fragment key={s.id}>{SECTIONS[s.id]}</Fragment>)}
      <CtaBand />
    </>
  );
}

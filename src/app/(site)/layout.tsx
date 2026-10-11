import { AnnouncementBar } from '@/components/site/AnnouncementBar';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}

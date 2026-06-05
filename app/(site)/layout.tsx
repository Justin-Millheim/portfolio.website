import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ContactProvider from "@/components/ContactContext";
import PageEngagement from "@/components/PageEngagement";

// Chrome for the public portfolio. The workout tool at /train deliberately
// lives in a separate route group and never renders this nav/footer.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ContactProvider>
      <Nav />
      <main>{children}</main>
      <Footer />
      <PageEngagement />
    </ContactProvider>
  );
}

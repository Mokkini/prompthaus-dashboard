// app/page.js

// ======= Imports =======
import { createClient } from '@/lib/supabase/server';
import Navigation from '@/components/Navigation'; // Dein Navigations-Import
import { ProductCard } from '@/components/store/ProductCard';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Search, CreditCard, LayoutDashboard } from 'lucide-react';
import Image from 'next/image';
import { FaqSection } from '@/components/FaqSection';
// *** NEUER IMPORT HINZUGEFÜGT ***
import { CategoryShowcase } from '@/components/CategoryShowcase';

// ======= Hauptfunktion der Seite =======
export default async function LandingPage() {
  // Nutzerstatus & Datenabruf
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: promptPackages, error: packagesError } = await supabase
    .from('prompt_packages')
    .select('*')
    .order('name', { ascending: true });

  if (packagesError) {
    console.error('Fehler beim Laden der Textpakete für die Startseite:', packagesError.message);
    // Eventuell eine bessere Fehlermeldung für den Nutzer hier?
  }

  // Seitenstruktur (JSX)
  return (
    <>
      {/* ======= Navigation ======= */}
      <Navigation user={user} />

      {/* ======= Hauptinhalt ======= */}
      <main className="flex-grow">

        {/* === Hero Section === */}
<section id="hero" className="relative py-24 md:py-32 lg:py-40 text-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-background">
  <div className="container mx-auto px-4 z-10 relative">
    <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 leading-tight">
      Entfessle dein Potenzial mit den richtigen Worten
    </h1>
    <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
      Spare Zeit und finde passende Textvorlagen für jede Lebenslage – professionell erstellt, sofort nutzbar und individuell anpassbar.
    </p>
    <div className="flex justify-center gap-4">
      <Button size="lg" asChild>
        <Link href="#pakete">Jetzt entdecken</Link>
      </Button>
    </div>
  </div>
</section>

 {/* === Bild-Text Section === */}
<section className="py-16 md:py-24 bg-background">
  <div className="container mx-auto px-4">
    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 lg:gap-16">
      <div className="w-full md:w-1/2">
        <Image
          src="/images/prompt-user.jpg" // Stelle sicher, dass dieses Bild existiert und im public Ordner liegt
          alt="Nutzerin verwendet PromptHaus am Laptop"
          width={600}
          height={400}
          className="rounded-lg shadow-lg object-cover w-full h-auto"
        />
      </div>
      <div className="w-full md:w-1/2 text-center md:text-left">
        <h2 className="text-3xl font-bold mb-4">
          Intelligente Textvorlagen, die dir Arbeit abnehmen
        </h2>
        <p className="text-lg text-muted-foreground mb-6">
          Spare Zeit, Energie und Grübelei. Unsere smarten Textvorlagen helfen dir in jeder Alltagssituation – schnell, empathisch & professionell.
        </p>
        <ul className="text-left text-muted-foreground space-y-2 mb-6 text-base">
          <li>✓ Sofort passende Texte für jede Lebenslage</li>
          <li>✓ Für WhatsApp, Briefe, Kommunikation & mehr</li>
          <li>✓ Einfach auswählen, anpassen & verwenden</li>
        </ul>
        <Button size="lg" asChild>
          <Link href="/test">Jetzt kostenlosen Textvorschlag holen</Link>
        </Button>
      </div>
    </div>
  </div>
</section>


        {/* === So funktioniert's Abschnitt === */}
<section id="how" className="py-12 md:py-20 bg-gray-50 dark:bg-gray-900">
  <div className="container mx-auto px-4">
    <h2 className="text-3xl font-bold text-center mb-10 md:mb-16">
      In 3 Schritten zu deiner perfekten Formulierung
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center">
      <div className="flex flex-col items-center">
        <Search size={48} className="mb-4 text-primary" />
        <h3 className="text-xl font-semibold mb-2">1. Themenpaket finden</h3>
        <p className="text-muted-foreground">
          Stöbere durch unsere Themenpakete und finde genau das, was zu deinem Anlass passt – ob privat, beruflich oder emotional.
        </p>
      </div>
      <div className="flex flex-col items-center">
        <CreditCard size={48} className="mb-4 text-primary" />
        <h3 className="text-xl font-semibold mb-2">2. Einmal kaufen, dauerhaft nutzen</h3>
        <p className="text-muted-foreground">
          Sichere dir dein Wunschpaket ohne Abo. Du erhältst sofort Zugriff auf alle enthaltenen Vorlagen.
        </p>
      </div>
      <div className="flex flex-col items-center">
        <LayoutDashboard size={48} className="mb-4 text-primary" />
        <h3 className="text-xl font-semibold mb-2">3. Ausfüllen & Text erhalten</h3>
        <p className="text-muted-foreground">
          Wähle den passenden Stil, gib ein paar Stichworte ein – und erhalte sofort deine fertige Formulierung zum Kopieren.
        </p>
      </div>
    </div>
    <p className="mt-10 mx-auto max-w-2xl px-6 py-4 border-l-4 border-primary/60 bg-muted/30 italic text-muted-foreground text-center text-base rounded-md">
  Kein Fachwissen nötig. Du füllst nur wenige Felder aus – PromptHaus schreibt den Rest. So leicht war Formulieren noch nie.
</p>

  </div>
</section>



        {/* *** HIER WURDE DIE CATEGORY SHOWCASE SECTION EINGEFÜGT *** */}
        <CategoryShowcase />
		
{/* === PromptHaus Vorteilskommunikation === */}
<section className="py-16 md:py-24 bg-muted/20 border-t border-border">
  <div className="container mx-auto px-4 max-w-4xl text-center">
    <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-primary">
      Was PromptHaus besonders macht
    </h2>
    <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-2xl mx-auto">
      Du brauchst keinen ChatGPT-Account, kein Abo und kein Fachwissen. 
      Du bekommst sofort einsetzbare Textvorlagen für echte Alltagssituationen – verständlich, empathisch & klar strukturiert.
    </p>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-muted-foreground">
      <div className="bg-background rounded-md p-6 border border-border shadow-sm space-y-3">
        <p>✓ Kein Abo – du kaufst nur, was du brauchst</p>
        <p>✓ Kein Zugang zu KI-Diensten nötig – alles läuft direkt über PromptHaus</p>
        <p>✓ Alltagstauglich – für Privatpersonen, Familien, Selbstständige & mehr</p>
        <p>✓ Kein Rumprobieren – du bekommst sofort funktionierende Texte</p>
      </div>
      <div className="bg-background rounded-md p-6 border border-border shadow-sm space-y-3">
        <p>✓ Zugriff über dein persönliches Dashboard</p>
        <p>✓ Klar strukturierte Vorlagen mit wenigen Klicks angepasst</p>
        <p>✓ Sofort startklar – ohne Fachbegriffe oder Prompt-Wissen</p>
        <p>✓ Persönlich, verständlich & praxisnah</p>
      </div>
    </div>
  </div>
</section>


        {/* === Pakete Section === */}
        <section id="pakete" className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Unsere Themenpakete
            </h2>
            {packagesError ? (
              <p className="text-center text-red-500">
                Ups! Es gab ein Problem beim Laden der Inhalte. Bitte versuche es später erneut.
              </p>
            ) : !promptPackages || promptPackages.length === 0 ? (
              <p className="text-center text-muted-foreground">
                Momentan sind keine Textpakete verfügbar. Schau bald wieder vorbei!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {promptPackages.map((prompt) => (
                  <ProductCard key={prompt.id} prompt={prompt} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* === FAQ Section === */}
        <FaqSection />

      </main>

      {/* ======= Footer ======= */}
      <footer className="border-t py-8 bg-muted/40">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} PromptHaus. Alle Rechte vorbehalten.</p>
          <div className="mt-2">
            <Link href="/impressum" className="hover:text-primary mx-2">Impressum</Link>
            |
            <Link href="/datenschutz" className="hover:text-primary mx-2">Datenschutz</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
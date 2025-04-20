// app/page.js

// ======= Imports =======
import { createClient } from '@/lib/supabase/server';
import Navigation from '@/components/Navigation';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
// Icons für Features und NEU für Kategorie-Karten
import { Search, CreditCard, LayoutDashboard, ShieldCheck, FolderKanban } from 'lucide-react';
import Image from 'next/image';
import { FaqSection } from '@/components/FaqSection';
// CategoryShowcase entfernt
// import { CategoryShowcase } from '@/components/CategoryShowcase';
import RevealOnScroll from '@/components/ui/RevealOnScroll';

// --- NEU: Kategorien-Liste (wie in app/kategorien/page.js) ---
const allCategories = [
  "Familienkommunikation", "Elternbriefe für Kita & Schule", "Behördenschreiben stressfrei",
  "Nachbarschaft & Zusammenleben", "E-Mail-Vorlagen für Profis", "Bewerbungsboost & Jobstart",
  "Konflikte klären im Job", "Mahnungen & Zahlungserinnerungen", "Souverän emotional schreiben",
  "Nein sagen mit Klarheit", "Wertschätzend Danke sagen", "Professionell Entschuldigen",
  "Erfolgreich auf Social Media", "Messenger-Texte mit Wirkung", "Kreative Grußtexte & Glückwünsche",
  "Vorlagen für Umzug & Wohnen", "Gesundheit & Arztgespräche", "Texte für Hochzeit & Feiern",
  "Reklamationen souverän lösen", "Vereinskommunikation leicht gemacht"
];
// Optional: Nur eine Auswahl anzeigen
const categoriesToShow = allCategories.slice(0, 10); // Zeigt die ersten 10 Kategorien
// --- ENDE NEU ---


// ======= Hauptfunktion der Seite =======
export default async function LandingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = user && user.email === process.env.ADMIN_EMAIL;

  return (
    <>
      <Navigation user={user} />

      {isAdmin && (
        <div className="container mx-auto px-4 pt-4 flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/prompts">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Admin Panel
            </Link>
          </Button>
        </div>
      )}

      <main className="flex-grow">

        {/* === Hero Section (bleibt gleich) === */}
        <section id="hero" className="relative py-24 md:py-32 lg:py-40 text-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-background">
          {/* ... Inhalt ... */}
           <div className="container mx-auto px-4 z-10 relative">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 leading-tight">
              Entfessle dein Potenzial mit den richtigen Worten
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Spare Zeit und finde passende Textvorlagen für jede Lebenslage – professionell erstellt, sofort nutzbar und individuell anpassbar.
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/kategorien">Jetzt entdecken</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* === Bild-Text Section (bleibt gleich) === */}
        <RevealOnScroll>
          <section className="py-16 md:py-24 bg-background">
            {/* ... Inhalt ... */}
             <div className="container mx-auto px-4">
              <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 lg:gap-16">
                <div className="w-full md:w-1/2">
                  <Image
                    src="/images/prompt-user.jpg"
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
                  <Link href="/kostenlos-testen">Jetzt kostenlosen Textvorschlag holen</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </RevealOnScroll>

        {/* === So funktioniert's Abschnitt (bleibt gleich) === */}
        <RevealOnScroll>
          <section id="how" className="py-12 md:py-20 bg-gray-50 dark:bg-gray-900">
            {/* ... Inhalt ... */}
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
        </RevealOnScroll>

        {/* === NEU: Kategorie-Karten Section === */}
        <RevealOnScroll>
          <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-center mb-12">
                Entdecke unsere Themenwelten
              </h2>
              {/* Grid für die Kategorien-Karten */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {/* Verwende categoriesToShow (oder allCategories, wenn du alle willst) */}
                {categoriesToShow.map((category) => (
                   <Link
                     href={`/pakete?kategorie=${encodeURIComponent(category)}`}
                     key={category}
                     // Styling von app/kategorien/page.js übernommen
                     className="flex flex-col justify-between p-4 bg-muted dark:bg-gray-800 rounded-lg shadow-sm transition-colors duration-200 ease-in-out hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground hover:shadow-md"
                   >
                     {/* Oberer Teil: Icon und Titel */}
                     <div className="flex items-center gap-3 mb-2">
                        <FolderKanban className="h-5 w-5 text-current flex-shrink-0" />
                        <span className="text-sm font-medium text-current line-clamp-2">
                          {category}
                        </span>
                     </div>
                     {/* Unterer Teil: "Pakete ansehen" */}
                     <div className="mt-auto pt-2 text-right opacity-0 hover:opacity-100 transition-opacity duration-200">
                        <span className="text-xs text-current">
                            Pakete ansehen &rarr;
                        </span>
                     </div>
                  </Link>
                ))}
              </div>
              {/* Button, um alle Kategorien anzuzeigen */}
              <div className="text-center mt-12">
                <Button size="lg" variant="outline" asChild>
                  <Link href="/kategorien">Alle Kategorien anzeigen</Link>
                </Button>
              </div>
            </div>
          </section>
        </RevealOnScroll>
        {/* === ENDE NEU === */}

        {/* === PromptHaus Vorteilskommunikation (bleibt gleich) === */}
        <RevealOnScroll>
          <section className="py-16 md:py-24 bg-muted/20 border-t border-border">
            {/* ... Inhalt ... */}
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
        </RevealOnScroll>

        {/* === FAQ Section (bleibt gleich) === */}
        <RevealOnScroll>
          <FaqSection />
        </RevealOnScroll>

      </main>

      {/* ======= Footer (bleibt gleich) ======= */}
      <footer className="border-t py-8 bg-muted/40">
        {/* ... Inhalt ... */}
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

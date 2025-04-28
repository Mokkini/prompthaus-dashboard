// ======= Imports =======
import { createClient } from '@/lib/supabase/server';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Search, CreditCard, LayoutDashboard, ShieldCheck, FolderKanban } from 'lucide-react';
import Image from 'next/image';
import { FaqSection } from '@/components/FaqSection';
import RevealOnScroll from '@/components/ui/RevealOnScroll';

// --- NEU: Angepasste Datenstruktur mit Name und Beschreibung ---
// (Beispielbeschreibungen hinzugefügt, bitte ggf. anpassen)
const allCategories = [
  { name: "Briefe & Anträge", description: "Kündigungen, Widerrufe und wichtige Schreiben schnell erledigen" },
  { name: "Entschuldigungen", description: "Schnelle Entschuldigungen für Schule, Kita oder Arbeit erstellen" },
  { name: "Beschwerden & Reklamationen", description: "Lieferprobleme und Reklamationen freundlich und klar ansprechen" },
  { name: "Nachbarschaft", description: "Höfliche Mitteilungen und Bitten rund ums Zusammenleben" },
  { name: "Schule & Kita", description: "Briefe und Mitteilungen an Lehrer:innen, Schulen und Betreuungseinrichtungen" },
  { name: "Einladungen & Feste", description: "Persönliche Einladungstexte für Feiern, Hochzeiten und Geburtstage" },
  { name: "Wohnen & Miete", description: "Kommunikation mit Vermieter:innen, Nachbarn und Hausverwaltungen leicht gemacht" },
  { name: "Nachrichten & Social Media", description: "Kurze Texte für WhatsApp, Instagram, Facebook & Co. – freundlich, klar und schnell verschickt" },
];
// --- ENDE NEU ---

// Wähle die ersten 10 Kategorien für die Startseite aus
const categoriesToShow = allCategories.slice(0, 4);

export default async function LandingPage() {
  const supabase = createClient();
  // User-Daten werden weiterhin benötigt für den Admin-Check
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = user && user.email === process.env.ADMIN_EMAIL;

  return (
    <>
      {/* Admin Panel Button bleibt */}
      {isAdmin && (
        <div className="container mx-auto px-4 pt-4 flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Admin Panel
            </Link>
          </Button>
        </div>
      )}

      {/* Der Hauptinhalt der Seite */}
      <main className="flex-grow">

        {/* === Hero Section === */}
        <section id="hero" className="relative py-24 md:py-32 lg:py-40 text-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-background">
           <div className="container mx-auto px-4 z-10 relative">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 leading-tight">
              Die richtigen Worte, genau dann, wenn du sie brauchst
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Ob Nachricht, Brief oder E-Mail – unsere smarten Vorlagen helfen dir in Alltag, Familie und Job. Ohne Grübeln, ohne Abo, sofort einsatzbereit.
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/kategorien">Jetzt entdecken</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* === Bild-Text Section === */}
        <RevealOnScroll>
          <section className="py-16 md:py-24 bg-background">
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
                    Texte, die dir den Kopf frei machen
                  </h2>
                  <p className="text-lg text-muted-foreground mb-6">
                    Schluss mit stundenlangem Nachdenken. Unsere Vorlagen helfen dir in jeder Situation – klar, wertschätzend und auf den Punkt gebracht.
                  </p>
                  <ul className="text-left text-muted-foreground space-y-2 mb-6 text-base">
                    <li>✓ Für Nachrichten, Briefe, Mails & Co.</li>
                    <li>✓ Alltagstauglich – von Familie bis Büro</li>
                    <li>✓ Einfach ausfüllen und direkt verwenden</li>
                  </ul>
                  <Button size="lg" asChild>
                    <Link href="/prompt/testprompt">Jetzt kostenlosen Textvorschlag holen</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </RevealOnScroll>

        {/* === So funktioniert's Abschnitt === */}
        <RevealOnScroll>
          <section id="how" className="py-12 md:py-20 bg-gray-50 dark:bg-gray-900">
             <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-center mb-10 md:mb-16">
                In 3 einfachen Schritten zu deinem perfekten Text
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center">
                <div className="flex flex-col items-center">
                  <Search size={48} className="mb-4 text-primary" />
                  <h3 className="text-xl font-semibold mb-2">1. Thema wählen</h3>
                  <p className="text-muted-foreground">
                    Finde die passende Vorlage für deinen Anlass – privat, beruflich oder emotional.
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <CreditCard size={48} className="mb-4 text-primary" />
                  <h3 className="text-xl font-semibold mb-2">2. Einmal kaufen, immer nutzen</h3>
                  <p className="text-muted-foreground">
                    Keine Abo-Falle. Du bekommst sofort Zugriff auf alle Texte.
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <LayoutDashboard size={48} className="mb-4 text-primary" />
                  <h3 className="text-xl font-semibold mb-2">3. Ausfüllen & loslegen</h3>
                  <p className="text-muted-foreground">
                    Wenige Klicks, dein Ton, dein Anlass – fertig ist dein persönlicher Text.
                  </p>
                </div>
              </div>
              <p className="mt-10 mx-auto max-w-2xl px-6 py-4 border-l-4 border-primary/60 bg-muted/30 italic text-muted-foreground text-center text-base rounded-md">
                Du musst kein Profi sein. PromptHaus schreibt für dich – verständlich, persönlich und sofort bereit.
              </p>
            </div>
          </section>
        </RevealOnScroll>

        {/* === Kategorie-Karten Section === */}
        <RevealOnScroll>
                  <section className="py-16 md:py-24 bg-background">
                     <div className="container mx-auto px-4">
                      <h2 className="text-3xl font-bold text-center mb-12">
                        Entdecke unsere Themenwelten
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 justify-center">
                        {categoriesToShow.map((category) => (
                          <Link
                            href={`/pakete?kategorie=${encodeURIComponent(category.name)}`}
                            key={category.name}
                            // --- KORREKTUR: group hinzugefügt für Hover-Effekte ---
                            className="group flex flex-col justify-between p-4 bg-muted dark:bg-gray-800 rounded-lg shadow-sm transition-colors duration-200 ease-in-out hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground hover:shadow-md"
                          >
                            <div> {/* Wrapper für oberen Inhalt */}
                              <div className="flex items-center gap-3 mb-2">
                                <FolderKanban className="h-5 w-5 text-current flex-shrink-0" />
                                <span className="text-sm font-medium text-current line-clamp-2">
                                  {category.name}
                                </span>
                              </div>
                              {/* --- KORREKTUR: Kommentar entfernt --- */}
                              <p className="text-xs text-muted-foreground group-hover:text-primary-foreground/80 mt-1 line-clamp-2 mb-2"> {/* Styling leicht angepasst */}
                                {category.description}
                              </p>
                              {/* --- ENDE KORREKTUR --- */}
                            </div>
                            <div className="mt-auto pt-1 text-right opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <span className="text-xs text-current">
                                Pakete ansehen &rarr;
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <div className="text-center mt-12">
                        <Button size="lg" variant="outline" asChild>
                          <Link href="/kategorien">Alle Kategorien anzeigen</Link>
                        </Button>
                      </div>
                    </div>
                  </section>
                </RevealOnScroll>

        {/* === PromptHaus Vorteilskommunikation === */}
        <RevealOnScroll>
          <section className="py-16 md:py-24 bg-muted/20 border-t border-border">
             <div className="container mx-auto px-4 max-w-4xl text-center">
              <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-primary">
                Deshalb lieben Menschen PromptHaus
              </h2>
              <p className="text-muted-foreground text-base md:text-lg mb-8 max-w-2xl mx-auto">
                Keine Anmeldung bei ChatGPT, kein Technik-Kram. Einfach passende Worte finden – für Nachrichten, Briefe, E-Mails und mehr.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left text-muted-foreground">
                <div className="bg-background rounded-md p-6 border border-border shadow-sm space-y-3">
                  <p>✓ Keine Abo-Falle – du zahlst nur, was du brauchst</p>
                  <p>✓ Ideal für Eltern, Nachbarn, Berufstätige & Co.</p>
                  <p>✓ Alltagssprache statt Fachsprache</p>
                  <p>✓ Spart Zeit, Nerven und unangenehmes Grübeln</p>
                </div>
                <div className="bg-background rounded-md p-6 border border-border shadow-sm space-y-3">
                  <p>✓ Persönliches Dashboard mit deinen Vorlagen</p>
                  <p>✓ In wenigen Minuten einsatzbereit</p>
                  <p>✓ Auch für schwierige Themen die passenden Worte</p>
                  <p>✓ Du tippst ein – PromptHaus antwortet</p>
                </div>
              </div>
            </div>
          </section>
        </RevealOnScroll>

        {/* === FAQ Section === */}
        <RevealOnScroll>
          <FaqSection />
        </RevealOnScroll>

      </main>
    </>
  );
}

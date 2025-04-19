// app/kategorien/page.js
import React from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation'; // Pfad zu deiner Navigationskomponente prüfen!
// Ggf. Footer importieren, falls du einen separaten Footer hast
// import Footer from '@/components/Footer';

// Deine Liste aller Kategorien
const allCategories = [
  "Familienkommunikation", "Elternbriefe für Kita & Schule", "Behördenschreiben stressfrei",
  "Nachbarschaft & Zusammenleben", "E-Mail-Vorlagen für Profis", "Bewerbungsboost & Jobstart",
  "Konflikte klären im Job", "Mahnungen & Zahlungserinnerungen", "Souverän emotional schreiben",
  "Nein sagen mit Klarheit", "Wertschätzend Danke sagen", "Professionell Entschuldigen",
  "Erfolgreich auf Social Media", "Messenger-Texte mit Wirkung", "Kreative Grußtexte & Glückwünsche",
  "Vorlagen für Umzug & Wohnen", "Gesundheit & Arztgespräche", "Texte für Hochzeit & Feiern",
  "Reklamationen souverän lösen", "Vereinskommunikation leicht gemacht"
];

export default function KategorienPage() {
  // HINWEIS: Wir holen hier keine User-Daten, da die Seite öffentlich ist.
  // Die Navigation bekommt ggf. keinen 'user'-Prop oder einen leeren. Prüfe deine Navigation Komponente!
  // Wenn deine Navigation den User braucht, müssten wir ihn hier auch laden (wie in app/page.js)
  // oder die Navigation so anpassen, dass sie auch ohne User funktioniert.

  return (
    <>
      {/* Falls deine Navigation den User erwartet/braucht, musst du ihn hier laden und übergeben */}
      <Navigation user={null} /> {/* Annahme: Navigation funktioniert auch mit user=null */}

      <main className="flex-grow py-12 md:py-16 lg:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-10 md:mb-16">
            Alle Themenwelten entdecken
          </h1>

          {/* Grid für die Kategorien */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {allCategories.map((category, index) => (
               <Link
               // *** GEÄNDERTER href: Zeigt auf die neue Paketseite ***
               href={`/pakete?kategorie=${encodeURIComponent(category)}`}
               key={index}
               className="block p-4 bg-muted dark:bg-gray-800 rounded-lg text-center text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground transition-colors duration-200 ease-in-out shadow-sm hover:shadow-md"
             >
                {category}
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* Füge hier deinen Footer ein, wenn er nicht im Hauptlayout ist */}
      {/* <Footer /> */}
      {/* Beispielhafter einfacher Footer, falls keiner importiert wird */}
       <footer className="border-t py-8 bg-muted/40 mt-16">
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
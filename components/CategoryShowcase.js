// components/CategoryShowcase.js
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Import Button für den Link

// Beispielhafte Auswahl von Kategorien für die Startseite
// Wähle hier die aus, die du hervorheben möchtest!
const featuredCategories = [
  "Familienkommunikation",
  "Behördenschreiben stressfrei",
  "E-Mail-Vorlagen für Profis",
  "Bewerbungsboost & Jobstart",
  "Wertschätzend Danke sagen",
  "Kreative Grußtexte & Glückwünsche"
];

export function CategoryShowcase() {
  return (
    <section className="w-full py-12 md:py-16 lg:py-20 bg-muted/40 dark:bg-muted/60"> {/* Hintergrund wie bei FAQ */}
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12">
          Entdecke unsere Themenwelten
        </h2>

        {/* Grid für die ausgewählten Kategorien (weniger Spalten als auf /kategorien) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto"> {/* max-w-4xl und mx-auto für Zentrierung des Grids */}
          {featuredCategories.map((category, index) => (
            <Link
              // Links könnten hier auch schon zur Kategorieseite führen und dort filtern?
              // Oder zur Produktliste mit Filter? Fürs Erste: #pakete
              href="#pakete" // Oder "#"
              key={index}
              className="block p-4 bg-background dark:bg-gray-800 rounded-lg text-center text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground transition-colors duration-200 ease-in-out shadow-sm hover:shadow-md"
            >
              {category}
            </Link>
          ))}
        </div>

        {/* Button, der zur vollständigen Kategorieseite führt */}
        <div className="text-center mt-10 md:mt-14">
          <Button size="lg" asChild>
            <Link href="/kategorien">Alle Kategorien anzeigen</Link>
          </Button>
        </div>

      </div>
    </section>
  );
}
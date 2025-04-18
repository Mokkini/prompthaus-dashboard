// components/FaqSection.js
import React from 'react';
import Image from 'next/image'; // Importieren für die Grafik
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Mail, MessageCircle } from 'lucide-react'; // Beispiel-Icons, falls du sie brauchst

// Die Fragen und Antworten bleiben gleich
const faqData = [
  {
    id: "item-1",
    question: "Was genau ist PromptHaus?",
    answer:
      "PromptHaus ist eine Plattform für hochwertige Textvorlagen. Du findest hier professionelle Formulierungshilfen für viele Lebensbereiche – schnell, einfach und direkt einsetzbar."
  },
  {
    id: "item-2",
    question: "Wie funktionieren die gekauften Prompts?",
    answer:
      "Nach dem Kauf stehen dir deine Textvorlagen in einem persönlichen Bereich zur Verfügung. Dort kannst du sie jederzeit anpassen, ausfüllen und direkt verwenden."
  },
  {
    id: "item-3",
    question: "Welche Zahlungsmethoden werden akzeptiert?",
    answer:
      "Du kannst bequem und sicher mit den gängigen Zahlungsmethoden zahlen – zum Beispiel per Kreditkarte. Die Abwicklung erfolgt verschlüsselt und zuverlässig."
  },
  {
    id: "item-4",
    question: "Benötige ich einen Account, um Prompts zu kaufen?",
    answer:
      "Nein, der Kauf ist ohne Account möglich. Für die Nutzung deiner Vorlagen benötigst du jedoch ein kostenloses Benutzerkonto, damit du auf dein persönliches Dashboard zugreifen kannst."
  }
];


export function FaqSection() {
  return (
    // Section mit etwas mehr vertikalem Abstand und anderem Hintergrund
    <section className="w-full py-16 md:py-24 lg:py-32 bg-white dark:bg-black">
      <div className="container px-4 md:px-6 mx-auto text-center">

        {/* Zweispaltiges Grid-Layout, wird auf Mobilgeräten einspaltig */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">

          {/* Linke Spalte: Titel, Text und Grafik */}
          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              Noch Fragen?
            </h2>
            <p className="text-muted-foreground text-lg">
              Hast du noch weitere Fragen oder benötigst du Hilfe?
              Wir sind für dich da!
              {/* Optional: Hier könntest du noch Kontakt-Infos oder einen Button einfügen */}
              {/* z.B. <Button variant="outline" className="mt-4"><Mail className="mr-2 h-4 w-4"/> Kontaktiere uns</Button> */}
            </p>
            {/* Grafik - Du musst hier den Pfad zu deiner Grafik einsetzen! */}
            <div className="mt-6 flex justify-center md:justify-start">
               {/* WICHTIG: Ersetze src durch den Pfad zu deinem Bild oder entferne diesen Block, wenn du keine Grafik hast */}
              <Image
                src="/Images/faq-questionmark.png" // Beispielpfad - BITTE ANPASSEN!
                alt="Dekoratives Fragezeichen"
                width={200} // Beispielbreite
                height={200} // Beispielhöhe
                className="max-w-[150px] md:max-w-[200px]" // Größe steuern
              />
              {/* Falls du kein Bild hast, kannst du den Image-Block oben löschen */}
            </div>
          </div>

          {/* Rechte Spalte: Akkordeon */}
          <div className="w-full">
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqData.map((item) => (
                // Styling für jedes einzelne Akkordeon-Element
                <AccordionItem
                  value={item.id}
                  key={item.id}
                  className="bg-gray-100/80 dark:bg-gray-900/80 rounded-lg border border-gray-200 dark:border-gray-800 px-5 shadow-sm transition-colors hover:bg-gray-200/80 dark:hover:bg-gray-800/80"
                >
                  {/* Trigger (Frage) - nimmt volle Breite, Icon rechts (Standard bei shadcn) */}
                  <AccordionTrigger className="text-base sm:text-lg font-medium text-left hover:no-underline py-4">
                    {item.question}
                  </AccordionTrigger>
                  {/* Content (Antwort) - Etwas heller und mit Abstand oben */}
                  <AccordionContent className="pt-1 pb-4 text-sm sm:text-base text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

        </div>
      </div>
    </section>
  );
}
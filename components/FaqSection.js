// components/FaqSection.js
import React from 'react';
import Image from 'next/image';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqData = [
  {
    id: "item-1",
    question: "Was ist PromptHaus genau?",
    answer:
      "PromptHaus ist deine persönliche Hilfe beim Formulieren. Ob Nachricht, Brief oder E-Mail – hier findest du Vorlagen, die dir Zeit sparen und dir das Schreiben abnehmen."
  },
  {
    id: "item-2",
    question: "Wie nutze ich die Textvorlagen?",
    answer:
      "Ganz einfach: Themenpaket auswählen, kaufen, anpassen – fertig ist dein persönlicher Text. Du brauchst kein Vorwissen, nur ein paar Stichworte."
  },
  {
    id: "item-3",
    question: "Wie bezahle ich bei PromptHaus?",
    answer:
      "Du kannst bequem mit den gängigen Zahlungsmethoden zahlen, zum Beispiel mit Kreditkarte. Alles läuft sicher und ohne versteckte Kosten."
  },
  {
    id: "item-4",
    question: "Muss ich ein Konto anlegen?",
    answer:
      "Nein, für den Kauf nicht. Aber wenn du deine Vorlagen später nutzen willst, brauchst du ein kostenloses Benutzerkonto – damit dein Zugang sicher gespeichert wird."
  }
];

export function FaqSection() {
  return (
    <section className="w-full py-16 md:py-24 lg:py-32 bg-white dark:bg-black">
      <div className="container px-4 md:px-6 mx-auto text-center">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">

          <div className="space-y-4 text-center md:text-left">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
              Noch Fragen?
            </h2>
            <p className="text-muted-foreground text-lg">
              Du bist dir noch unsicher oder brauchst mehr Infos? Hier findest du die wichtigsten Antworten rund um PromptHaus.
            </p>
            <div className="mt-6 flex justify-center md:justify-start">
              <Image
                src="/images/faq-questionmark.png"
                alt="Dekoratives Fragezeichen"
                width={200}
                height={200}
                className="max-w-[150px] md:max-w-[200px]"
              />
            </div>
          </div>

          <div className="w-full">
            <Accordion type="single" collapsible className="w-full space-y-3">
              {faqData.map((item) => (
                <AccordionItem
                  value={item.id}
                  key={item.id}
                  className="bg-gray-100/80 dark:bg-gray-900/80 rounded-lg border border-gray-200 dark:border-gray-800 px-5 shadow-sm transition-colors hover:bg-gray-200/80 dark:hover:bg-gray-800/80"
                >
                  <AccordionTrigger className="text-base sm:text-lg font-medium text-left hover:no-underline py-4">
                    {item.question}
                  </AccordionTrigger>
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

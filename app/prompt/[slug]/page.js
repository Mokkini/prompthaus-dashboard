// app/prompt/[slug]/page.js - Angepasst mit Zurück-Button (basierend auf deinem Code)

import { createClient } from '@/lib/supabase/server'; // Pfad ggf. anpassen
import { notFound, redirect } from 'next/navigation';
import PromptInteraction from '@/components/PromptInteraction'; // Pfad ggf. anpassen
import React from 'react'; // Import React
// ***** NEUE IMPORTS HINZUGEFÜGT *****
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
// ************************************

export default async function PromptDetailPage({ params }) {
  const supabase = createClient();

  // 1. Benutzerprüfung (unverändert)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Paket laden (unverändert)
  console.log(`Lade Prompt-Paket für Slug: ${params.slug}`);
  const { data: promptPackage, error } = await supabase
    .from('prompt_packages')
    // WICHTIG: Stelle sicher, dass 'prompt_variants' die Datenstruktur hat,
    // die PromptInteraction erwartet
    .select('name, description, prompt_variants')
    .eq('slug', params.slug)
    .single();

  // Fehlerbehandlung (unverändert)
  if (error || !promptPackage) {
    console.error("Fehler beim Laden des Pakets oder Paket nicht gefunden:", error);
    notFound();
  }

  const { name, description, prompt_variants } = promptPackage;

  // --- Angepasster Rendering-Teil ---
  return (
    // Container und Tailwind Padding, mit space-y für vertikale Abstände
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-6">

      {/* ***** NEUER ZURÜCK-BUTTON EINGEFÜGT ***** */}
      <div> {/* Optionaler div-Wrapper */}
        <Button variant="outline" size="sm" asChild>
          <Link href="/meine-prompts"> {/* Korrektes Link-Ziel */}
            <ArrowLeft className="mr-2 h-4 w-4" /> {/* Icon */}
            Zurück zur Übersicht
          </Link>
        </Button>
      </div>
      {/* ***************************************** */}

      {/* Titel und Beschreibung jetzt in einem div mit Abstand dazwischen */}
      <div className="space-y-2">
        {/* Style den Paketnamen (mb-2 entfernt, da space-y-2 greift) */}
        <h1 className="text-3xl font-semibold">{name}</h1>
        {/* Style die Paketbeschreibung (mb-6 entfernt, da space-y-6 außen greift) */}
        <p className="text-muted-foreground">{description}</p>
      </div>

      {/* Die Client Component für die eigentliche Interaktion (unverändert) */}
      <PromptInteraction variants={prompt_variants || []} slug={params.slug} />

    </div>
  );
}
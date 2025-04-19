// app/(dashboard)/prompt/[slug]/page.js - Padding für Mobile angepasst

import { createClient } from '@/lib/supabase/server'; // Dein Pfad
import { notFound, redirect } from 'next/navigation';
import PromptInteraction from '@/components/PromptInteraction';
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";

export default async function PromptDetailPage({ params }) {
  const slug = params.slug;
  const supabase = createClient();

  // 1. Benutzerprüfung
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Paket laden
  console.log(`Lade Prompt-Paket für Slug: ${slug}`);
  const { data: promptPackage, error } = await supabase
    .from('prompt_packages')
    .select('name, description, prompt_variants')
    .eq('slug', slug)
    .single();

  // Fehlerbehandlung
  if (error || !promptPackage) {
    console.error(`Fehler beim Laden des Pakets für Slug '${slug}' oder Paket nicht gefunden:`, error);
    notFound();
  }

  const { name, description, prompt_variants } = promptPackage;

  // --- Rendering-Teil ---
  return (
    // *** HIER WURDE DAS PADDING ANGEPASST ***
    <div className="container mx-auto py-8 px-2 sm:px-4 md:px-6 lg:px-8"> {/* px-2 für mobile, sm:px-4 für etwas größere */}
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/meine-prompts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Übersicht
          </Link>
        </Button>
      </div>
      {/* Die Card selbst hat normalerweise kein horizontales Padding,
          aber falls doch, könnte man es hier auch anpassen.
          Aktuell sollte die Anpassung des äußeren Divs ausreichen. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{name}</CardTitle>
          {description && (
             <CardDescription>{description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0 sm:pt-2 md:pt-4">
          <PromptInteraction variants={prompt_variants || []} slug={slug} />
        </CardContent>
      </Card>
    </div>
  );
}

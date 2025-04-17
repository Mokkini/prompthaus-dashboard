// app/prompt/[slug]/page.js - Reihenfolge angepasst

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
  // *** NEU: Slug direkt am Anfang auslesen ***
  const slug = params.slug;
  // Frühes console.log entfernt, das params.slug direkt nutzte

  // Supabase Client erstellen (kann hier bleiben)
  const supabase = createClient();

  // 1. Benutzerprüfung (unverändert)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Paket laden (jetzt mit der 'slug'-Variable)
  console.log(`Lade Prompt-Paket für Slug: ${slug}`); // Nutzt jetzt die Variable
  const { data: promptPackage, error } = await supabase
    .from('prompt_packages')
    .select('name, description, prompt_variants')
    .eq('slug', slug) // Nutzt jetzt die Variable
    .single();

  // Fehlerbehandlung (unverändert)
  if (error || !promptPackage) {
    console.error(`Fehler beim Laden des Pakets für Slug '${slug}' oder Paket nicht gefunden:`, error);
    notFound();
  }

  // Destructuring bleibt gleich
  const { name, description, prompt_variants } = promptPackage;

  // --- Rendering-Teil (unverändert zur Card-Version, aber übergibt 'slug' Variable) ---
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/meine-prompts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Übersicht
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{name}</CardTitle>
          {description && (
             <CardDescription>{description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0 sm:pt-2 md:pt-4">
           {/* Übergibt jetzt die 'slug'-Variable statt params.slug */}
          <PromptInteraction variants={prompt_variants || []} slug={slug} />
        </CardContent>
      </Card>
    </div>
  );
}
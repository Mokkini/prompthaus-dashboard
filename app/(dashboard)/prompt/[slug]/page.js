// app/(dashboard)/prompt/[slug]/page.js

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

// Option 1: Standard-Zugriff (wie dein aktueller Code)
export default async function PromptDetailPage({ params }) {
  const slug = params.slug; // Standard-Zugriff, sollte korrekt sein
  const supabase = createClient();

  // 1. Benutzerprüfung
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // 2. Paket laden
  console.log(`Lade Prompt-Paket für Slug: ${slug}`); // Log zur Diagnose
  const { data: promptPackage, error } = await supabase
    .from('prompt_packages')
    .select('name, description, prompt_variants')
    .eq('slug', slug)
    .single();

  // Fehlerbehandlung
  if (error || !promptPackage) {
    console.error(`Fehler beim Laden des Pakets für Slug '${slug}' oder Paket nicht gefunden:`, error);
    notFound(); // Zeigt die 404-Seite an
  }

  const { name, description, prompt_variants } = promptPackage;

  // --- Rendering-Teil ---
  return (
    <div className="container mx-auto py-8 px-0 sm:px-4 md:px-6 lg:px-8">
      <div className="mb-6 px-4 sm:px-0">
        <Button variant="outline" size="sm" asChild>
          <Link href="/meine-prompts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Übersicht
          </Link>
        </Button>
      </div>

      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-2xl">{name}</CardTitle>
          {description && (
             <CardDescription>{description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0 sm:pt-2 md:pt-4 px-0 sm:px-6">
          <PromptInteraction variants={prompt_variants || []} slug={slug} />
        </CardContent>
      </Card>
    </div>
  );
}

/*
// Option 2: Alternative Destrukturierung (unwahrscheinlich, dass es die Fehler behebt, aber ein Versuch)
export default async function PromptDetailPage({ params: { slug } }) {
  // const slug = params.slug; // Nicht mehr nötig
  const supabase = createClient();

  // ... Rest des Codes wie oben, aber 'slug' direkt verwenden ...

  // 2. Paket laden
  console.log(`Lade Prompt-Paket für Slug: ${slug}`); // slug direkt verwenden
  const { data: promptPackage, error } = await supabase
    .from('prompt_packages')
    .select('name, description, prompt_variants')
    .eq('slug', slug) // slug direkt verwenden
    .single();

  // ... Rest des Codes ...

  return (
     // ... JSX ...
       <PromptInteraction variants={prompt_variants || []} slug={slug} /> // slug direkt verwenden
     // ... JSX ...
  );
}
*/


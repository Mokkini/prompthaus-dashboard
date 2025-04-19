// app/(dashboard)/prompt/[slug]/page.js - Padding für Mobile entfernt

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
    // *** HIER WURDE DAS PADDING FÜR MOBILE ENTFERNT ***
    <div className="container mx-auto py-8 px-0 sm:px-4 md:px-6 lg:px-8"> {/* px-0 für mobile, sm:px-4 für größere */}
      <div className="mb-6 px-4 sm:px-0"> {/* Füge hier Padding hinzu, wenn der Button nicht ganz am Rand kleben soll */}
        <Button variant="outline" size="sm" asChild>
          <Link href="/meine-prompts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Übersicht
          </Link>
        </Button>
      </div>
      {/* Die Card selbst sollte jetzt auf Mobilgeräten die volle Breite nutzen.
          Wir geben der Card explizit kein horizontales Padding,
          damit der Inhalt (PromptInteraction) den Platz nutzen kann. */}
      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x"> {/* Entferne Rundung und Rand auf Mobile */}
        <CardHeader className="px-4 sm:px-6"> {/* Padding für Header beibehalten */}
          <CardTitle className="text-2xl">{name}</CardTitle>
          {description && (
             <CardDescription>{description}</CardDescription>
          )}
        </CardHeader>
        {/* WICHTIG: Das Padding für CardContent wird jetzt entfernt,
            damit PromptInteraction die volle Breite nutzen kann.
            PromptInteraction muss ggf. internes Padding haben. */}
        <CardContent className="pt-0 sm:pt-2 md:pt-4 px-0 sm:px-6"> {/* Padding für Content auf Mobile entfernt */}
          <PromptInteraction variants={prompt_variants || []} slug={slug} />
        </CardContent>
      </Card>
    </div>
  );
}

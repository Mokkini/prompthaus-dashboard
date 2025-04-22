// app/(dashboard)/prompt/[slug]/page.js

import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import PromptInteraction from '@/components/PromptInteraction';
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";

// --- Definiere den Slug für den kostenlosen Prompt ---
const FREE_PROMPT_SLUG = 'testprompt';

export default async function PromptDetailPage({ params }) {
  const slug = params.slug;
  const supabase = createClient();

  // --- Benutzerprüfung mit Ausnahme für den kostenlosen Prompt ---
  const { data: { user } } = await supabase.auth.getUser();
  // Nur umleiten, wenn der User NICHT eingeloggt ist UND es NICHT der kostenlose Prompt ist
  if (!user && slug !== FREE_PROMPT_SLUG) {
    console.log(`User nicht eingeloggt und Slug ist nicht '${FREE_PROMPT_SLUG}'. Leite zu /login um.`);
    redirect('/login');
  } else if (!user && slug === FREE_PROMPT_SLUG) {
    console.log(`User nicht eingeloggt, aber Slug ist '${FREE_PROMPT_SLUG}'. Zugriff erlaubt.`); // <-- Hier wird der Zugriff erlaubt
  } else if (user) {
    console.log(`User ${user.email} ist eingeloggt. Zugriff erlaubt.`);
  }
  // --- ENDE ANPASSUNG ---

  // ... (Rest des Codes zum Laden der Paket- und Variantendaten bleibt gleich) ...

  // 2. Paket-Hauptdaten laden
  console.log(`Lade Prompt-Paket für Slug: ${slug}`);
  const { data: promptPackage, error: packageError } = await supabase
    .from('prompt_packages')
    .select('id, name, description')
    .eq('slug', slug)
    .single();

  if (packageError || !promptPackage) {
    console.error(`Fehler beim Laden des Pakets für Slug '${slug}' oder Paket nicht gefunden:`, packageError);
    notFound();
  }

  const { id: packageId, name, description } = promptPackage;

  // 3. Zugehörige Varianten laden
  console.log(`Lade Varianten für Paket-ID: ${packageId}`);
  const { data: variantsFromDb, error: variantsError } = await supabase
    .from('prompt_variants')
    .select(`
      id,
      variant_id,
      title,
      description,
      context,
      semantic_data,
      writing_instructions
    `)
    .eq('package_id', packageId)
    .order('title', { ascending: true });

  if (variantsError) {
      console.error(`Fehler beim Laden der Varianten für Paket-ID ${packageId}:`, variantsError);
      notFound();
  }

  // 4. Mappen der DB-Daten für das Frontend
  const frontendVariants = (variantsFromDb || []).map(variant => ({
      ...variant,
      id: variant.variant_id
  }));
  console.log(`Anzahl geladener und gemappter Varianten: ${frontendVariants.length}`);

  // --- Rendering-Teil ---
  return (
    <div className="container mx-auto py-8 px-0 sm:px-4 md:px-6 lg:px-8">
      <div className="mb-6 px-4 sm:px-0">
        <Button variant="outline" size="sm" asChild>
          <Link href={user ? "/meine-prompts" : "/"}> {/* Zurück-Link angepasst */}
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück {user ? 'zur Übersicht' : 'zur Startseite'}
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
          <PromptInteraction variants={frontendVariants} slug={slug} />
        </CardContent>
      </Card>
    </div>
  );
}

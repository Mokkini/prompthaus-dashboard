// app/admin/prompts/edit/[id]/page.js

import { createClient as createServerComponentClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import React from 'react';
import EditPromptForm from '@/components/EditPromptForm'; // Importiere das refactorte Formular
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react"; // Icon für Zurück-Button

export default async function EditPromptPage({ params }) {
  const { id } = params; // Hole die ID aus den URL-Parametern
  const supabaseUserClient = createServerComponentClient();

  // 1. User holen & prüfen (unverändert)
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user) { redirect('/login'); }

  // 2. Admin prüfen (unverändert)
  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  if (!isAdmin) { redirect('/'); }

  // 3. Lade das spezifische Prompt-Paket anhand der ID
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  console.log(`Lade Prompt-Paket mit ID: ${id} zum Bearbeiten`);
  const { data: promptPackage, error } = await supabaseAdmin
    .from('prompt_packages')
    // Wähle alle Felder aus, die EditPromptForm braucht
    .select('id, name, slug, description, category, prompt_variants')
    .eq('id', id) // Suche nach der ID
    .single(); // Erwarte genau ein Ergebnis

  // Fehlerbehandlung: Wenn Paket nicht gefunden oder DB-Fehler
  if (error || !promptPackage) {
    console.error("Fehler beim Laden des Pakets zum Bearbeiten:", error);
    notFound(); // Zeige 404-Seite
  }

  // --- Rendering der Seite ---
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-8">

      {/* Zurück-Button und Seitentitel */}
      <div>
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/admin/prompts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück zur Übersicht
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold">
          Paket bearbeiten: <span className="text-muted-foreground">{promptPackage.name}</span>
        </h1>
         {/* Optional: ID anzeigen */}
         <p className="text-xs text-muted-foreground mt-1">ID: {promptPackage.id}</p>
      </div>

      {/* Card als Wrapper für das Formular */}
      <Card>
        <CardHeader>
           {/* Titel im Header ist optional, da schon oben */}
          {/* <CardTitle>Details bearbeiten</CardTitle> */}
          <CardDescription>
            Passe die Details und Varianten für dieses Prompt-Paket an. Der Slug kann nicht geändert werden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Rendere das Edit-Formular und übergebe die Daten */}
          <EditPromptForm promptPackage={promptPackage} />
        </CardContent>
      </Card>

    </div>
  );
}
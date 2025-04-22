// app/admin/prompts/edit/[id]/page.js - KORRIGIERT

// Importiere die Server Action zum Laden der Daten
// Alternativ: Relativer Pfad
// Korrekter Importpfad (angenommen '@/' zeigt auf das 'app'-Verzeichnis oder Projekt-Root)
// Alternativ: Relativer Pfad
// Correct relative path
import { getEditPageData } from '../../actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import React from 'react';
import EditPromptForm from '@/components/EditPromptForm'; // Das Formular
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertCircle } from "lucide-react"; // Icons
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Alert für Fehler

// WICHTIG: Die createClient-Importe sind hier nicht mehr nötig, da die Action das macht.

export default async function EditPromptPage({ params }) {
  const packageId = params.id; // Hole die ID aus den URL-Parametern

  // --- NEU: Daten über die Server Action laden ---
  console.log(`Rufe getEditPageData für Paket-ID: ${packageId} auf...`);
  const result = await getEditPageData(packageId);

  // --- WICHTIGE PRÜFUNG: War das Laden erfolgreich? ---
  // Prüfen, ob die Action erfolgreich war UND ob promptPackage vorhanden ist
  if (!result.success || !result.promptPackage) {
    console.error(`Fehler von getEditPageData für ID ${packageId}:`, result.error);
    // Fehlermeldung auf der Seite anzeigen
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-8">
         <div className="mb-6">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/prompts">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück zur Admin-Übersicht
              </Link>
            </Button>
          </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler beim Laden</AlertTitle>
          <AlertDescription>
            {result.error || 'Die Daten für dieses Paket konnten nicht geladen werden. Bitte versuche es erneut oder prüfe die Paket-ID.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  // --- ENDE PRÜFUNG ---

  // Wenn erfolgreich, extrahiere die Daten für die Übergabe
  const initialData = {
      promptPackage: result.promptPackage,
      variants: result.variants
  };

  // --- Rendering der Seite (angepasst für initialData) ---
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
          Paket bearbeiten: <span className="text-muted-foreground">{initialData.promptPackage.name}</span>
        </h1>
         {/* Optional: ID anzeigen */}
         <p className="text-xs text-muted-foreground mt-1">ID: {initialData.promptPackage.id}</p>
      </div>

      {/* Card als Wrapper für das Formular */}
      <Card>
        <CardHeader>
          <CardDescription>
            Passe die Details und Varianten für dieses Prompt-Paket an. Der Slug kann nicht geändert werden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* --- KORREKTE ÜBERGABE: Das initialData Objekt übergeben --- */}
          <EditPromptForm initialData={initialData} />
        </CardContent>
      </Card>

    </div>
  );
}

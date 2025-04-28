// app/(dashboard)/admin/page.js
"use client"; // Vorerst als Client Component, falls später Interaktivität benötigt wird

import React from 'react';
import Link from 'next/link'; // Importiere Link
// Importiere ggf. weitere UI-Komponenten, wenn benötigt
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Edit } from 'lucide-react'; // Users Icon entfernt

export default function AdminHomePage() {
  // WICHTIG: Hier sollte noch eine Prüfung erfolgen, ob der eingeloggte Benutzer
  // tatsächlich Admin-Rechte hat. Dies könnte über die Benutzerdaten aus dem Layout
  // oder eine separate Server Action geschehen.
  // Beispiel (vereinfacht):
  // const { user } = useUser(); // Annahme: Es gibt einen Hook oder Context für User-Daten
  // if (user?.email !== 'deine-admin-email@example.com') {
  //   // Zeige Fehler oder leite um
  //   return <p>Zugriff verweigert.</p>;
  // }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin-Bereich</h1>

      <p className="text-muted-foreground">
        Willkommen im Admin-Bereich. Hier kannst du die Anwendung verwalten.
      </p>

      {/* Kacheln für Admin-Funktionen */}
      {/* Das Grid wird jetzt nur 2 Spalten breit sein, wenn nur 2 Karten da sind */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Kachel: Prompt-Verwaltung */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Prompt-Pakete
            </CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">Verwalten</div>
            <p className="text-xs text-muted-foreground mb-4">
              Bestehende Prompt-Pakete bearbeiten oder neue hinzufügen.
            </p>
            {/* Korrekte Verwendung von asChild */}
            <Button size="sm" asChild variant="outline">
              <Link href="/admin/prompts">Zu den Prompts</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Kachel: LLM-Einstellungen */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              LLM-Einstellungen
            </CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">Konfigurieren</div>
            <p className="text-xs text-muted-foreground mb-4">
              Modelle, System-Prompts, Temperatur, Max Tokens etc. anpassen.
            </p>
            {/* Korrekte Verwendung von asChild */}
            <Button size="sm" asChild variant="outline">
               <Link href="/admin/llm-settings">Zu den Einstellungen</Link>
            </Button>
          </CardContent>
        </Card>

        {/* --- Die Kachel für "Benutzerverwaltung" wurde entfernt --- */}

      </div>
    </div>
  );
}

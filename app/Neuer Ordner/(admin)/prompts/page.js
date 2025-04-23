// app/admin/prompts/page.js
'use client'; // WICHTIG: Bleibt Client Component

import { useState, useEffect, useMemo } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import React from 'react';

// Importiere die Server Actions
// WICHTIG: Stelle sicher, dass der Pfad zu deiner Haupt-actions.js korrekt ist!
// Wenn actions.js direkt unter app/ liegt:
import { getAdminPageData, logout } from '@/app/actions';
// Wenn actions.js unter app/admin/ liegt (wie vorher):
// import { getAdminPageData, logout } from '../actions'; // Beispiel für relativen Pfad
// import { getAdminPageData, logout } from '@/app/admin/actions'; // Beispiel für Alias

// Importiere UI Komponenten
import AddPromptForm from '@/components/AddPromptForm';
import DeletePromptButton from '@/components/DeletePromptButton';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
// Icons
import { AlertCircle, ExternalLink, Pencil, PlusCircle, Loader2, LogOut } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Hilfsfunktion zum Gruppieren (bleibt gleich)
function groupPromptsByCategory(prompts) {
  if (!prompts) return {};
  return prompts.reduce((acc, prompt) => {
    const category = prompt.category || 'Ohne Kategorie';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(prompt);
    acc[category].sort((a, b) => a.name.localeCompare(b.name));
    return acc;
  }, {});
}


export default function AdminPromptsPage() {
  // === State Variablen (bleiben gleich) ===
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [allPrompts, setAllPrompts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // === Daten laden beim ersten Rendern (bleibt gleich) ===
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      const result = await getAdminPageData(); // Ruft die importierte Action auf

      if (!result.success) {
        setError(result.error || 'Ein unbekannter Fehler ist aufgetreten.');
        // Weiterleitungen basierend auf dem Fehler aus der Action
        if (result.error === 'Nicht eingeloggt.') redirect('/login');
        if (result.error === 'Nicht autorisiert.') redirect('/');
      } else {
        setUserEmail(result.user?.email || '');
        setAllPrompts(result.prompts);
      }
      setIsLoading(false);
    }
    loadData();
  }, []);

  // === Abgeleitete Werte (bleiben gleich) ===
  const availableCategories = useMemo(() => {
    const categories = new Set(allPrompts.map(p => p.category || 'Ohne Kategorie'));
    return ['all', ...Array.from(categories).sort()];
  }, [allPrompts]);

  const filteredAndGroupedPrompts = useMemo(() => {
    let filtered = allPrompts;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => (p.category || 'Ohne Kategorie') === selectedCategory);
    }
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(lowerSearchTerm) ||
        p.slug.toLowerCase().includes(lowerSearchTerm)
      );
    }
    return groupPromptsByCategory(filtered);
  }, [allPrompts, selectedCategory, searchTerm]);

  const displayCategories = useMemo(() => {
    return Object.keys(filteredAndGroupedPrompts).sort();
  }, [filteredAndGroupedPrompts]);


  // === Rendern (Lade- und Fehlerzustände bleiben gleich) ===
  if (isLoading) {
     return (
      <div className="container mx-auto py-8 px-4 flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Lade Daten...</span>
      </div>
    );
  }

  if (error) {
     return (
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        {/* Optional: Admin-Header hier anzeigen, falls er nicht im Layout ist */}
        {/* <h1 className="text-3xl font-semibold mb-6">Admin: Prompt Verwaltung</h1> */}
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // === Haupt-JSX der Seite ===
  return (
    // Das äußere div ist jetzt nicht mehr nötig, da das Layout den Container bereitstellt
    // <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-8">

      // Der space-y-8 kann auf das Fragment oder ein inneres div angewendet werden
      <div className="space-y-8">

        {/* Kopfbereich - BEREINIGT */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            {/* Titel wird jetzt vom Layout bereitgestellt, kann hier weg oder kleiner sein */}
            {/* <h1 className="text-3xl font-semibold">Admin: Prompt Verwaltung</h1> */}
            {userEmail && <p className="text-muted-foreground">Angemeldet als: {userEmail}.</p>}
          </div>
          {/* --- Button-Gruppe (bereinigt) --- */}
          <div className="flex flex-wrap gap-2">
            {/* Link zur Hauptseite ENTFERNT (ist im Layout) */}
            {/* Logout Button ENTFERNT (ist im Layout) */}

            {/* Dialog für neues Paket (bleibt) */}
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Neues Paket hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                 <DialogHeader>
                  <DialogTitle>Neues Prompt-Paket hinzufügen</DialogTitle>
                  <DialogDescription>
                    Fülle die Felder aus, um ein neues Paket inklusive Varianten zu erstellen.
                    Das Formular schließt sich nach Erfolg nicht automatisch.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  {/* Stelle sicher, dass AddPromptForm korrekt importiert wird */}
                  <AddPromptForm />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filter- und Suchleiste (bleibt gleich) */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
           <Input
            type="search"
            placeholder="Suche nach Name oder Slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Kategorie filtern..." />
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat === 'all' ? 'Alle Kategorien' : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Gruppierte & Gefilterte Prompt-Pakete (bleibt gleich) */}
        <div className="space-y-6">
           {displayCategories.length > 0 ? (
            displayCategories.map((category, index) => (
              <div key={category}>
                {index > 0 && <Separator className="my-6" />}
                <h2 className="text-2xl font-semibold mb-4">{category}</h2>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead className="text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndGroupedPrompts[category].map((prompt) => (
                        <TableRow key={prompt.id}>
                          <TableCell className="font-medium">{prompt.name}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {prompt.slug}
                          </TableCell>
                          <TableCell className="text-right space-x-1 md:space-x-2">
                            {/* Action Buttons */}
                            <Button variant="outline" size="icon" asChild title="Preview">
                              <Link href={`/prompt/${prompt.slug}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" /> <span className="sr-only">Preview</span>
                              </Link>
                            </Button>
                            <Button variant="outline" size="icon" asChild title="Bearbeiten">
                              <Link href={`/admin/prompts/edit/${prompt.id}`}>
                                <Pencil className="h-4 w-4" /> <span className="sr-only">Bearbeiten</span>
                              </Link>
                            </Button>
                            {/* Stelle sicher, dass DeletePromptButton korrekt importiert wird */}
                            <DeletePromptButton
                              packageId={prompt.id}
                              packageName={prompt.name}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          ) : (
            // Nachricht, wenn keine Prompts gefunden wurden
            <div className="text-center py-10 border border-dashed rounded-md">
              <p className="text-muted-foreground">
                {allPrompts.length === 0 ? 'Noch keine Prompt-Pakete in der Datenbank gefunden.' : 'Keine Prompts entsprechen den aktuellen Filtern.'}
              </p>
            </div>
          )}
        </div>
      </div> // Ende des inneren div mit space-y-8
    // </div> // Ende des äußeren Container-div (nicht mehr nötig)
  );
}

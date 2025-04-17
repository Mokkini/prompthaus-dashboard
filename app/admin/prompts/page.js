// app/admin/prompts/page.js
import { createClient as createServerComponentClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import React from 'react';
import AddPromptForm from '@/components/AddPromptForm';
import DeletePromptButton from '@/components/DeletePromptButton';
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// Importiere Dialog Komponenten
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertCircle, ExternalLink, Pencil, PlusCircle } from "lucide-react"; // PlusCircle Icon hinzugefügt

export default async function AdminPromptsPage() {
  const supabaseUserClient = createServerComponentClient();

  // 1. User holen & prüfen (unverändert)
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user) { redirect('/login'); }

  // 2. Admin prüfen (unverändert)
  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  if (!isAdmin) { redirect('/'); }
  console.log(`Admin ${user.email} hat /admin/prompts aufgerufen.`);

  // 3. Lade alle Prompt-Pakete (unverändert)
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: prompts, error } = await supabaseAdmin
    .from('prompt_packages')
    .select('id, slug, name, category')
    .order('name', { ascending: true });

  // Verbesserte Fehlerbehandlung (unverändert)
  if (error) {
    console.error("Fehler beim Laden der Prompt-Pakete für Admin:", error);
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold mb-6">Admin: Prompt Verwaltung</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>Fehler beim Laden der Prompt-Pakete: {error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // --- NEUER RENDER-TEIL mit Dialog ---
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-8"> {/* Etwas mehr Abstand */}

      {/* Kopfbereich mit Titel und Button zum Hinzufügen */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
            <h1 className="text-3xl font-semibold">Admin: Prompt Verwaltung</h1>
            <p className="text-muted-foreground">Willkommen im Admin-Bereich, {user.email}.</p>
        </div>

        {/* ***** NEU: Dialog für AddPromptForm ***** */}
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Neues Paket hinzufügen
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"> {/* Breite und Höhe angepasst */}
            <DialogHeader>
              <DialogTitle>Neues Prompt-Paket hinzufügen</DialogTitle>
              <DialogDescription>
                Fülle die Felder aus, um ein neues Paket inklusive Varianten zu erstellen. Das Formular schließt sich nach Erfolg nicht automatisch.
              </DialogDescription>
            </DialogHeader>
            {/* Das Formular wird jetzt im Dialog gerendert */}
            <div className="py-4"> {/* Etwas Innenabstand für das Formular im Dialog */}
               <AddPromptForm />
               {/* Hinweis: AddPromptForm sollte idealerweise Feedback geben */}
            </div>
             {/* Optional: DialogFooter für Schließen-Button, falls benötigt */}
             {/* <DialogFooter><Button variant="outline" onClick={() => {}}>Schließen</Button></DialogFooter> */}
          </DialogContent>
        </Dialog>
        {/* *************************************** */}
      </div>


      {/* Bereich für vorhandene Pakete (Layout leicht angepasst für Konsistenz) */}
      <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Vorhandene Prompt-Pakete</h2>
          {prompts && prompts.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Name</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prompts.map((prompt) => (
                    <TableRow key={prompt.id}>
                      <TableCell className="font-medium">{prompt.name}</TableCell>
                      <TableCell>{prompt.category || '-'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{prompt.slug}</TableCell>
                      <TableCell className="text-right space-x-1 md:space-x-2">
                        {/* Action Buttons unverändert */}
                         <Button variant="outline" size="icon" asChild title="Preview">
                           <Link href={`/prompt/${prompt.slug}`} target="_blank" rel="noopener noreferrer">
                             <ExternalLink className="h-4 w-4" />
                             <span className="sr-only">Preview</span>
                           </Link>
                         </Button>
                        <Button variant="outline" size="icon" asChild title="Bearbeiten">
                          <Link href={`/admin/prompts/edit/${prompt.id}`}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Bearbeiten</span>
                          </Link>
                        </Button>
                        <DeletePromptButton packageId={prompt.id} packageName={prompt.name} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
          ) : (
            <div className="text-center py-10 border border-dashed rounded-md">
                <p className="text-muted-foreground">Noch keine Prompt-Pakete in der Datenbank gefunden.</p>
            </div>
          )}
      </div>
    </div>
  );
}
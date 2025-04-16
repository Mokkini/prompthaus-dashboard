// app/admin/prompts/page.js - MIT Card Wrapper für AddPromptForm

import { createClient as createServerComponentClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import React from 'react';
import AddPromptForm from '@/components/AddPromptForm'; // Needs refactoring INSIDE
import DeletePromptButton from '@/components/DeletePromptButton'; // Needs refactoring INSIDE
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// Importiere Card Komponenten
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ExternalLink, Pencil } from "lucide-react";

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
    process.env.NEXT_PUBLIC_SUPABASE_URL, // Bei reinem JS kannst du '!' entfernen
    process.env.SUPABASE_SERVICE_ROLE_KEY // Bei reinem JS kannst du '!' entfernen
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

  // --- NEUER RENDER-TEIL mit shadcn/ui ---
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 space-y-12">

      {/* Kopfbereich (unverändert) */}
      <div className="space-y-2">
         <h1 className="text-3xl font-semibold">Admin: Prompt Verwaltung</h1>
         <p className="text-muted-foreground">Willkommen im Admin-Bereich, {user.email}.</p>
      </div>

      {/* ***** Änderung: AddPromptForm in eine Card gewrapped ***** */}
      {/* Dies gibt dem Formular einen visuellen Rahmen, löst aber nicht das */}
      {/* Problem der ungestylten Felder IM Formular selbst. */}
      <Card>
        <CardHeader>
          <CardTitle>Neues Prompt-Paket hinzufügen</CardTitle>
          <CardDescription>
            Fülle die Felder aus, um ein neues Paket inklusive Varianten zu erstellen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Die AddPromptForm Komponente selbst braucht noch internes Refactoring */}
          <AddPromptForm />
        </CardContent>
      </Card>
      {/* ********************************************************* */}


      {/* Bereich für vorhandene Pakete (unverändert zur letzten Version) */}
      <div>
         <h2 className="text-2xl font-semibold mb-4">Vorhandene Prompt-Pakete</h2>
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
                       {/* Delete Button braucht Refactoring */}
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
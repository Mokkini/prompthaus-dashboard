// app/meine-prompts/page.js - VOLLSTÄNDIG KORRIGIERT

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";


export default async function MeinePromptsPage() {
  const supabase = createClient();

  // --- Daten abrufen (unverändert) ---
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect('/login'); }
  const { data: customerData, error: customerError } = await supabase
    .from('customers').select('id').eq('auth_user_id', user.id).maybeSingle();

  if (customerError) {
     console.error("Fehler beim Suchen der Customer ID:", customerError);
     return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold mb-6">Meine Prompts</h1>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Fehler</AlertTitle>
            <AlertDescription>Fehler beim Laden Ihrer Kundendaten: {customerError.message}</AlertDescription>
          </Alert>
        </div>
     );
  }

  let prompts = [];
  if (customerData) {
    const { data: customerPromptsData, error: promptsError } = await supabase
      .from('customer_prompts')
      .select(`prompt_packages ( slug, name, description )`)
      .eq('customer_id', customerData.id);
    if (promptsError) {
        console.error("Fehler beim Laden der gekauften Prompts:", promptsError);
       return (
         <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
           <h1 className="text-3xl font-semibold mb-6">Meine Prompts</h1>
           <Alert variant="destructive">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Fehler</AlertTitle>
             <AlertDescription>Fehler beim Laden Ihrer Prompts: {promptsError.message}</AlertDescription>
           </Alert>
         </div>
        );
    }
    prompts = customerPromptsData ? customerPromptsData.map(item => item.prompt_packages).filter(Boolean) : [];
  }
  // --- Ende Daten abrufen ---


  // --- Rendering ---

  // Fallback: Keine Prompts gefunden - JETZT MIT KORREKTEM CODE
  if (prompts.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold mb-6">Meine Prompts</h1>
        <Card> {/* Verwende auch hier die Card */}
          <CardHeader>
            <CardTitle>Keine Prompt-Pakete gefunden</CardTitle>
            <CardDescription>
              {customerData
                ? 'Sie haben bisher keine Prompt-Pakete erworben.'
                : 'Ihr Konto ist noch nicht vollständig mit einem Kundenprofil verknüpft oder Sie haben noch keine Pakete erworben.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Sobald Sie Pakete im Shop erwerben und die Verknüpfung erfolgreich ist, erscheinen sie hier.
            </p>
          </CardContent>
           {/* Optional: Footer mit Link zum Shop */}
           {/*
           <CardFooter>
             <Button asChild> <Link href="/shop">Zum Shop</Link> </Button>
           </CardFooter>
           */}
        </Card>
      </div>
    );
  }

  // Hauptansicht: Prompts vorhanden
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold mb-6">Meine Prompts</h1>

      {/* Grid Container: justify-center ist hier drin */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto justify-center">
        {prompts.map((prompt) => (
          <Card key={prompt.slug} className="flex flex-col justify-between w-full">
            <CardHeader>
              <CardTitle>{prompt.name}</CardTitle>
              <CardDescription>{prompt.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/prompt/${prompt.slug}`}>Paket öffnen</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
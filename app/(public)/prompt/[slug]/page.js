// app/(public)/prompt/[slug]/page.js
"use client"; // Bleibt Client Component

import { createClient } from '@/lib/supabase/client'; // Client-Import
import { notFound, useRouter, useParams } from 'next/navigation'; // useParams
import PromptInteraction from '@/components/PromptInteraction';
import React, { useState, useEffect } from 'react'; // useState, useEffect
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'; // Icons
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Alert

const FREE_PROMPT_SLUG = process.env.NEXT_PUBLIC_FREE_PROMPT_SLUG || 'testprompt'; // Verwende NEXT_PUBLIC_

export default function PromptDetailPage() {
  const params = useParams();
  const slug = params.slug;
  const isTestPrompt = slug === FREE_PROMPT_SLUG;
  const router = useRouter();

  // --- States angepasst ---
  const [promptPackage, setPromptPackage] = useState(null); // Hält das gesamte Paket inkl. Prompt-Daten
  // const [frontendVariants, setFrontendVariants] = useState([]); // Entfernt
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // --- Datenabfrage im useEffect (ANGEPASST) ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      setPromptPackage(null); // Zurücksetzen für neuen Ladevorgang
      const supabase = createClient();

      // 1. User holen (bleibt gleich)
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      setUser(userData);

      if (userError) {
        console.error("User fetch error:", userError);
      }

      // Redirect, falls nicht eingeloggt und nicht Testprompt (bleibt gleich)
      if (!userData && !isTestPrompt) {
        router.replace(
          `/login?message=Bitte melde dich an, um diesen Prompt zu nutzen.&next=/prompt/${slug}`
        );
        return;
      }

      try {
        // 2. Paket holen (inkl. Prompt-Daten)
        const { data: pkgData, error: pkgError } = await supabase
          .from('prompt_packages')
          // --- NEU: Lade alle benötigten Spalten ---
          .select(`
              id, name, slug, description, category, price,
              context, semantic_data, writing_instructions
          `)
          .eq('slug', slug)
          .single();

        if (pkgError || !pkgData) {
          // Spezifischer Fehler für "nicht gefunden"
          if (pkgError?.code === 'PGRST116') {
              throw new Error('Prompt-Paket nicht gefunden.');
          }
          throw new Error(pkgError?.message || 'Fehler beim Laden des Pakets.');
        }

        // --- NEU: Prüfen, ob die essentiellen Prompt-Daten vorhanden sind ---
        if (!pkgData.context || !pkgData.semantic_data || !pkgData.writing_instructions) {
            console.error("Unvollständige Prompt-Daten im Paket:", pkgData.id);
            throw new Error("Die Konfiguration für dieses Prompt-Paket ist unvollständig.");
        }

        setPromptPackage(pkgData); // Speichere das gesamte Paket

        // 3. KEIN LADEN VON VARIANTEN MEHR!

      } catch (fetchError) {
        console.error("Data fetching error:", fetchError);
        setError(fetchError.message);
        // Wenn Paket nicht gefunden wurde, löse notFound aus
        if (fetchError.message === 'Prompt-Paket nicht gefunden.') {
            notFound(); // Zeigt die 404-Seite
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
       fetchData();
    } else {
       console.warn("Slug ist noch nicht verfügbar im useEffect.");
       setIsLoading(false); // Ladezustand beenden
       notFound(); // Slug fehlt, also nicht gefunden
    }

  }, [slug, isTestPrompt, router]); // Abhängigkeiten

  // --- Ladezustand (bleibt gleich) ---
  if (isLoading) {
    return (
      <div className="container mx-auto py-20 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-3" />
        <span>Lade Prompt-Details...</span>
      </div>
    );
  }

  // --- Fehlerzustand (wenn Paket nicht geladen werden konnte, aber nicht 404) ---
  if (error && !promptPackage) {
     return (
       <div className="container mx-auto py-20 px-4">
          <Alert variant="destructive">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Fehler</AlertTitle>
             <AlertDescription>
               {error}. Bitte versuche es später erneut oder kontaktiere den Support.
               <div className="mt-4">
                  <Button variant="outline" size="sm" asChild>
                     <Link href="/">Zur Startseite</Link>
                  </Button>
               </div>
             </AlertDescription>
          </Alert>
       </div>
     );
  }

   // --- Fallback für "Nicht gefunden" (sollte durch notFound() im useEffect abgedeckt sein) ---
   if (!promptPackage) {
     notFound();
   }

  // --- Erfolgreiches Rendering ---
  const { name, description } = promptPackage; // Daten sind jetzt sicher vorhanden

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href={isTestPrompt ? '/' : user ? '/meine-prompts' : '/'}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück{' '}
            {isTestPrompt
              ? 'zur Startseite'
              : user
              ? 'zu meinen Prompts'
              : 'zur Startseite'}
          </Link>
        </Button>
      </div>

      <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-2xl">{name}</CardTitle>
        </CardHeader>

        {description && (
          <CardDescription className="text-center px-4 sm:px-6">
            {description}
          </CardDescription>
        )}

        <CardContent className="pt-4 px-4 sm:px-6">
          {/* Fehleranzeige (falls z.B. Prompt-Daten unvollständig wären, wird jetzt im fetch abgefangen) */}
          {error && (
             <Alert variant="destructive" className="mb-4">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>Fehler</AlertTitle>
               <AlertDescription>{error}</AlertDescription>
             </Alert>
          )}

          {/* --- PromptInteraction mit promptData aufrufen --- */}
          {promptPackage ? (
            <PromptInteraction
              promptData={promptPackage} // <-- Das gesamte Paket übergeben
              slug={slug}
              // isTestPrompt wird nicht mehr benötigt, da die Logik im Hook ist
            />
          ) : (
            // Wird nur angezeigt, wenn kein Fehler, nicht geladen wird, aber Paket trotzdem null ist (sollte nicht passieren)
            !isLoading && !error && (
              <p className="text-center text-muted-foreground py-4">
                Prompt-Daten konnten nicht geladen werden.
              </p>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- generateMetadata (optional, falls benötigt) ---
// Diese Funktion muss angepasst werden, um die Daten serverseitig zu laden,
// da sie vor dem Rendern der Client Component ausgeführt wird.
// export async function generateMetadata({ params }) {
//   const slug = params.slug;
//   const supabase = createServerClient(); // Server-Client verwenden!
//   const { data: pkgData } = await supabase
//     .from('prompt_packages')
//     .select('name, description')
//     .eq('slug', slug)
//     .single();

//   if (!pkgData) {
//     return {
//       title: 'Prompt nicht gefunden',
//     };
//   }

//   return {
//     title: `${pkgData.name} | PromptHaus`,
//     description: pkgData.description || `Nutze den Prompt ${pkgData.name} auf PromptHaus.`,
//     // Weitere Metadaten...
//   };
// }

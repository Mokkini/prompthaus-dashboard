// app/(public)/prompt/[slug]/page.js
"use client"; // <-- WICHTIG: Als Client Component markieren

import { createClient } from '@/lib/supabase/client'; // <-- Client-Import verwenden
// --- NEU: useParams importieren ---
import { notFound, useRouter, useParams } from 'next/navigation'; // useParams hinzugefügt
// --- ENDE NEU ---
import PromptInteraction from '@/components/PromptInteraction';
import React, { useState, useEffect } from 'react'; // useState, useEffect importieren
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info, Loader2, AlertCircle } from 'lucide-react'; // Loader/Error Icons
// --- Tooltip Import entfernt ---
// import * as Tooltip from '@radix-ui/react-tooltip';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Alert für Fehler

const FREE_PROMPT_SLUG = 'testprompt';

// --- KORREKTUR: params Prop entfernen, da wir useParams verwenden ---
// export default function PromptDetailPage({ params }) {
export default function PromptDetailPage() {
  // --- NEU: useParams Hook verwenden ---
  const params = useParams(); // Gibt ein Objekt zurück, z.B. { slug: 'testprompt' }
  const slug = params.slug; // Jetzt sicher auf den Slug zugreifen
  // --- ENDE NEU ---

  const isTestPrompt = slug === FREE_PROMPT_SLUG;
  const router = useRouter();

  // --- Client-seitige States ---
  const [promptPackage, setPromptPackage] = useState(null);
  const [frontendVariants, setFrontendVariants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // --- Datenabfrage im useEffect ---
  useEffect(() => {
    // Der Rest des useEffect bleibt gleich...
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      const supabase = createClient(); // Client-Instanz

      // 1. User holen
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      setUser(userData);

      if (userError) {
        console.error("User fetch error:", userError);
        // Fehlerbehandlung für User, falls nötig
      }

      // Redirect, falls nicht eingeloggt und nicht Testprompt
      if (!userData && !isTestPrompt) {
        router.replace( // Client-seitiger Redirect
          `/login?message=Bitte melde dich an, um diesen Prompt zu nutzen.&next=/prompt/${slug}`
        );
        return; // Fetch abbrechen
      }

      try {
        // 2. Paket holen
        const { data: pkgData, error: pkgError } = await supabase
          .from('prompt_packages')
          .select('id, name, description, category')
          .eq('slug', slug) // slug aus useParams verwenden
          .single();

        if (pkgError || !pkgData) {
          throw new Error(pkgError?.message || 'Paket nicht gefunden.');
        }
        setPromptPackage(pkgData);
        const packageId = pkgData.id;

        // 3. Varianten holen
        const { data: variantsData, error: variantsError } = await supabase
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
          throw new Error(variantsError.message || 'Fehler beim Laden der Varianten.');
        }

        const mappedVariants = (variantsData || []).map((v) => ({
          ...v,
          id: v.variant_id,
        }));
        setFrontendVariants(mappedVariants);

      } catch (fetchError) {
        console.error("Data fetching error:", fetchError);
        setError(fetchError.message);
        // Optional: notFound() hier aufrufen, wenn ein 404 gewünscht ist
        // notFound();
      } finally {
        setIsLoading(false);
      }
    };

    // Sicherstellen, dass slug vorhanden ist, bevor fetchData aufgerufen wird
    if (slug) {
       fetchData();
    } else {
       // Optional: Behandeln, wenn slug noch nicht verfügbar ist (sollte selten sein)
       console.warn("Slug ist noch nicht verfügbar im useEffect.");
       // setIsLoading(false); // Oder einen Fehler setzen
    }

  }, [slug, isTestPrompt, router]); // Abhängigkeiten (slug kommt jetzt aus useParams)

  // --- Ladezustand ---
  if (isLoading) {
    return (
      <div className="container mx-auto py-20 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-3" />
        <span>Lade Prompt-Details...</span>
      </div>
    );
  }

  // --- Fehlerzustand (wenn Paket nicht geladen werden konnte) ---
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

   // --- Fallback für "Nicht gefunden" ---
   // Prüfen, ob slug überhaupt existiert, bevor promptPackage geprüft wird
   if (!slug || (!isLoading && !error && !promptPackage)) {
     notFound();
   }

  // --- Erfolgreiches Rendering ---
  // Sicherstellen, dass promptPackage existiert, bevor auf name/description zugegriffen wird
  const { name, description } = promptPackage || {};

  return (
    // --- Tooltip.Provider entfernt ---
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
          {/* Sicherstellen, dass name existiert */}
          <CardTitle className="text-2xl">{name || 'Lade...'}</CardTitle>
        </CardHeader>

        {description && (
          <CardDescription className="text-center px-4 sm:px-6">
            {description}
          </CardDescription>
        )}

        <CardContent className="pt-4 px-4 sm:px-6">
          {/* Fehler beim Laden der Varianten anzeigen */}
          {error && frontendVariants.length === 0 && (
             <Alert variant="destructive" className="mb-4">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>Fehler beim Laden der Varianten</AlertTitle>
               <AlertDescription>{error}</AlertDescription>
             </Alert>
          )}

          {frontendVariants.length > 0 ? (
            <PromptInteraction
              variants={frontendVariants}
              slug={slug} // slug aus useParams übergeben
              isTestPrompt={isTestPrompt}
            />
          ) : (
            // Nur anzeigen, wenn kein Fehler aufgetreten ist und nicht geladen wird
            !isLoading && !error && (
              <p className="text-center text-muted-foreground py-4">
                Für dieses Paket sind aktuell keine Prompt-Varianten verfügbar.
              </p>
            )
          )}
        </CardContent>
      </Card>
    </div>
    // --- Tooltip.Provider entfernt ---
  );
}

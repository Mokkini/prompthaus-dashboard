// app/(public)/prompt/[slug]/page.js - Mit Joyride, ohne Radix Tooltip für Kurzanleitung

"use client";

import { createClient } from '@/lib/supabase/client';
import { notFound, useRouter, useParams } from 'next/navigation';
import PromptInteraction from '@/components/PromptInteraction';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info, Loader2, AlertCircle } from 'lucide-react'; // Info Icon wird evtl. nicht mehr gebraucht, wenn Tooltip weg ist
// --- Radix Tooltip Import entfernen ---
// import * as Tooltip from '@radix-ui/react-tooltip';
// --- Ende Entfernung ---
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// --- react-joyride Imports ---
import Joyride, { STATUS, EVENTS, ACTIONS, Step } from 'react-joyride';
// --- ENDE ---

const FREE_PROMPT_SLUG = 'testprompt';

// --- Tour-Schritte (bleiben gleich) ---
const onboardingSteps = [
  {
    target: '.variant-selector-area',
    title: '1. Stil auswählen',
    content: 'Wähle eine der fünf Varianten – jede hat ihren eigenen Ton und passt zu einer anderen Situation.',
    placement: 'bottom',
    disableBeacon: true
  },
  {
    target: '.input-fields-area',
    title: '2. Situation beschreiben',
    content: 'Erzähl kurz, worum es geht – was dich bewegt und was du sagen möchtest. Einfach hier in die Felder schreiben.',
    placement: 'right'
  },
  {
    target: '.output-area',
    title: '3. Text erhalten & verfeinern',
    content: 'Hier erscheint dein fertiger Text. Du kannst ihn noch anpassen, neu formulieren oder mit Zusatzinfos verfeinern.',
    placement: 'left'
  }
]

// --- ENDE ---

export default function PromptDetailPage() {
  const params = useParams();
  const slug = params.slug;
  const isTestPrompt = slug === FREE_PROMPT_SLUG;
  const router = useRouter();

  // States für Daten
  const [promptPackage, setPromptPackage] = useState(null);
  const [frontendVariants, setFrontendVariants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  // States für react-joyride
  const [runTour, setRunTour] = useState(false);

  // useEffect für Datenabfrage (bleibt gleich)
  useEffect(() => {
    // ... (fetchData Logik) ...
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      const supabase = createClient();

      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      setUser(userData);

      if (userError) console.error("User fetch error:", userError);

      if (!userData && !isTestPrompt) {
        router.replace(`/login?message=Bitte melde dich an, um diesen Prompt zu nutzen.&next=/prompt/${slug}`);
        return;
      }

      try {
        const { data: pkgData, error: pkgError } = await supabase
          .from('prompt_packages')
          .select('id, name, description, category')
          .eq('slug', slug)
          .single();

        if (pkgError || !pkgData) throw new Error(pkgError?.message || 'Paket nicht gefunden.');
        setPromptPackage(pkgData);
        const packageId = pkgData.id;

        const { data: variantsData, error: variantsError } = await supabase
          .from('prompt_variants')
          .select(`id, variant_id, title, description, context, semantic_data, writing_instructions`)
          .eq('package_id', packageId)
          .order('title', { ascending: true });

        if (variantsError) throw new Error(variantsError.message || 'Fehler beim Laden der Varianten.');

        const mappedVariants = (variantsData || []).map((v) => ({ ...v, id: v.variant_id }));
        setFrontendVariants(mappedVariants);

      } catch (fetchError) {
        console.error("Data fetching error:", fetchError);
        setError(fetchError.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) fetchData();
    else console.warn("Slug ist noch nicht verfügbar im useEffect.");

  }, [slug, isTestPrompt, router]);

  // useEffect zum Starten der Tour (bleibt gleich)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenTour = localStorage.getItem('has_seen_prompt_interaction_tour');
      if (!hasSeenTour && !isLoading) {
        const timer = setTimeout(() => {
          console.log("Starte Onboarding Tour...");
          setRunTour(true);
        }, 500);
        return () => clearTimeout(timer);
      } else {
        console.log("Onboarding Tour wird nicht gestartet (schon gesehen oder lädt noch).");
      }
    }
  }, [isLoading]);

  // Callback für Joyride Events (bleibt gleich)
  const handleJoyrideCallback = (data) => {
    const { status, type } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
      if (typeof window !== 'undefined') {
        localStorage.setItem('has_seen_prompt_interaction_tour', 'true');
        console.log("Onboarding Tour beendet/übersprungen. Flag gesetzt.");
      }
    } else if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type)) {
      // console.log("Joyride Step/Event:", data);
    }
  };

  // Lade- und Fehlerzustände (bleiben gleich)
  if (isLoading) { /* ... Ladeanzeige ... */ }
  if (error && !promptPackage) { /* ... Fehleranzeige ... */ }
  if (!slug || (!isLoading && !error && !promptPackage)) { notFound(); }

  const { name, description } = promptPackage || {};

  return (
    // --- Tooltip.Provider entfernen, wenn kein anderer Tooltip auf der Seite ist ---
    // <Tooltip.Provider delayDuration={100}>
       <> {/* Oder ein anderes Wrapper-Element, falls nötig */}
         {/* Joyride Komponente (bleibt gleich) */}
         <Joyride
           steps={onboardingSteps}
           run={runTour}
           callback={handleJoyrideCallback}
           continuous
           showProgress
           showSkipButton
           scrollToFirstStep
           styles={{ /* ... styles ... */
             options: { zIndex: 10000, primaryColor: '#DE1A1A', arrowColor: '#ffffff', backgroundColor: '#ffffff', textColor: '#333333' },
             tooltipContainer: { textAlign: 'left' },
             buttonNext: { backgroundColor: '#DE1A1A', borderRadius: '4px' },
             buttonBack: { marginRight: 10, color: '#666666' },
             buttonSkip: { color: '#666666' }
           }}
           locale={{ back: 'Zurück', close: 'Schließen', last: 'Fertig', next: 'Weiter', skip: 'Überspringen' }}
         />

        <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Zurück-Button (bleibt gleich) */}
          <div className="mb-6">
            <Button variant="outline" size="sm" asChild>
              <Link href={isTestPrompt ? '/' : user ? '/meine-prompts' : '/'}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück{' '}
                {isTestPrompt ? 'zur Startseite' : user ? 'zu meinen Prompts' : 'zur Startseite'}
              </Link>
            </Button>
          </div>

          <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-2xl">{name || 'Lade...'}</CardTitle>
            </CardHeader>

            {description && (
              <CardDescription className="text-center px-4 sm:px-6">
                {description}
              </CardDescription>
            )}

            {/* --- Tooltip für Testprompt ENTFERNT --- */}
            {/* {isTestPrompt && (
              <div className="flex justify-center mt-2">
                 ... Tooltip Code war hier ...
              </div>
            )} */}
            {/* --- ENDE ENTFERNUNG --- */}

            <CardContent className="pt-4 px-4 sm:px-6">
              {/* Fehleranzeige Varianten (bleibt gleich) */}
              {error && frontendVariants.length === 0 && (
                 <Alert variant="destructive" className="mb-4">
                   <AlertCircle className="h-4 w-4" />
                   <AlertTitle>Fehler beim Laden der Varianten</AlertTitle>
                   <AlertDescription>{error}</AlertDescription>
                 </Alert>
              )}

              {/* PromptInteraction (bleibt gleich) */}
              {frontendVariants.length > 0 ? (
                <PromptInteraction
                  variants={frontendVariants}
                  slug={slug}
                  isTestPrompt={isTestPrompt}
                />
              ) : (
                !isLoading && !error && (
                  <p className="text-center text-muted-foreground py-4">
                    Für dieses Paket sind aktuell keine Prompt-Varianten verfügbar.
                  </p>
                )
              )}
            </CardContent>
          </Card>
        </div>
       </>
    // </Tooltip.Provider> // --- Ende Entfernung Tooltip.Provider ---
  );
}

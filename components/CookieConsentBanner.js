// components/CookieConsentBanner.js
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Cookie } from 'lucide-react';
import Link from 'next/link'; // Importiere Link für den Datenschutzhinweis

const LOCAL_STORAGE_KEY = 'cookie_consent';

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Prüfe beim Laden der Seite, ob schon eine Zustimmung existiert
    const consent = localStorage.getItem(LOCAL_STORAGE_KEY);
    // Zeige Banner nur an, wenn noch keine Entscheidung getroffen wurde (consent ist null)
    if (consent === null) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, 'accepted');
    setIsVisible(false);
    // Hier könntest du Logik hinzufügen, um z.B. Tracking-Skripte zu laden
    console.log("Cookies akzeptiert.");
  };

  const handleDecline = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, 'declined');
    setIsVisible(false);
    // Hier könntest du Logik hinzufügen, falls nötig (z.B. bestimmte Funktionen deaktivieren)
    console.log("Cookies abgelehnt.");
  };

  if (!isVisible) {
    return null; // Zeige nichts an, wenn Zustimmung gegeben oder abgelehnt wurde
  }

  return (
    // Positioniert den Banner am unteren Rand
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <Card className="w-full max-w-3xl mx-auto shadow-lg border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
           <div className="flex-shrink-0 pt-1">
             <Cookie className="h-6 w-6 text-primary" />
           </div>
           <div className="flex-grow">
             <CardTitle className="text-lg">Cookie-Einstellungen</CardTitle>
             <CardDescription className="mt-1 text-sm">
             Diese Website verwendet nur technisch notwendige Cookies, um grundlegende Funktionen wie das Merken deiner Cookie-Einstellungen zu ermöglichen
               Weitere Informationen findest du in unserer{' '}
               <Link href="/datenschutz" className="underline hover:text-primary"> {/* Passe den Link an */}
                 Datenschutzerklärung
               </Link>.
             </CardDescription>
           </div>
        </CardHeader>
        <CardFooter className="flex flex-col sm:flex-row sm:justify-end gap-3">
          <Button variant="outline" onClick={handleDecline} className="w-full sm:w-auto">
            Ablehnen
          </Button>
          <Button onClick={handleAccept} className="w-full sm:w-auto">
            Akzeptieren
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

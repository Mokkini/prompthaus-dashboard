// app/passwort-festlegen/page.js
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Shadcn UI Komponenten
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'; // CheckCircle2 hinzugefügt

export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [initializing, setInitializing] = useState(true); // Startet als true
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Entfernt: useEffect zum Parsen des Hash ---

  // --- NEU: useEffect zur Prüfung des Auth-Status und Flags ---
  useEffect(() => {
    async function checkAuthAndFlag() {
      // Kurze Verzögerung, um Supabase Zeit zu geben, die Session nach dem Hash-Parsing im Wrapper zu aktualisieren
      // Dies ist ein Workaround und kann ggf. angepasst oder entfernt werden, wenn router.refresh() im Wrapper ausreicht.
      await new Promise(resolve => setTimeout(resolve, 100));

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('[SetPasswordPage] Check Auth: Session vorhanden?', !!session);

      if (sessionError) {
          console.error('[SetPasswordPage] Fehler beim Holen der Session:', sessionError.message);
          // Leite zu Login, wenn Session nicht geholt werden kann
          router.replace('/login');
          return;
      }

      if (!session) {
        console.log('[SetPasswordPage] Keine Session gefunden, leite zu /login');
        router.replace('/login');
        return; // Frühzeitiger Ausstieg
      }

      // Session ist vorhanden, prüfe Metadaten
      const needsSetup = session.user?.user_metadata?.needs_password_setup;
      console.log('[SetPasswordPage] Check Auth: needs_password_setup Flag:', needsSetup);

      if (needsSetup !== true) {
        console.log('[SetPasswordPage] Flag nicht gesetzt oder falsch, leite zu /meine-prompts');
        // Leite zu einer Standardseite nach dem Login weiter, wenn das Flag nicht (mehr) gesetzt ist.
        router.replace('/meine-prompts');
        return; // Frühzeitiger Ausstieg
      }

      // Alles ok, Initialisierung abschließen
      console.log('[SetPasswordPage] Session und Flag korrekt, zeige Seite an.');
      setInitializing(false);
    }

    checkAuthAndFlag();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, router]); // Führe dies nur einmal beim Mount aus (und bei Supabase/Router-Änderung)
  // --- Ende NEU ---


  const handleSetPassword = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Die eingegebenen Passwörter stimmen nicht überein.');
      return;
    }
    // Mindestlänge prüfen (Supabase Standard ist 6)
    if (!password || password.length < 6) {
      setErrorMsg('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    setLoading(true);
    try {
      // Passwort aktualisieren
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) {
        console.error('Fehler beim Setzen des Passworts:', passwordError);
        // Gib eine benutzerfreundlichere Fehlermeldung aus
        let displayError = `Passwort konnte nicht gesetzt werden.`;
        if (passwordError.message.includes("Password should be at least 6 characters")) {
            displayError = "Das Passwort muss mindestens 6 Zeichen lang sein.";
        } else if (passwordError.message.includes("Password validation failed")) {
             displayError = `Passwort-Validierung fehlgeschlagen: ${passwordError.message}`;
        } else {
             displayError = `Fehler: ${passwordError.message}`;
        }
        setErrorMsg(displayError);
        setLoading(false);
        return;
      }

      // Metadaten-Flag zurücksetzen (wichtig!)
      const { error: metaError } = await supabase.auth.updateUser({
        data: { needs_password_setup: false } // Setze es explizit auf false
      });
      if (metaError) {
        // Das ist nicht kritisch für den User, aber logge es
        console.error('Fehler beim Zurücksetzen des Flags "needs_password_setup":', metaError);
        // Optional: Sende diesen Fehler an ein Monitoring-Tool
      } else {
         console.log('[SetPasswordPage] Flag "needs_password_setup" erfolgreich auf false gesetzt.');
      }

      setSuccessMsg('Dein Passwort wurde erfolgreich festgelegt! Du wirst in Kürze weitergeleitet...');
      setLoading(false);
      // Gib dem User kurz Zeit, die Nachricht zu lesen
      setTimeout(() => router.push('/meine-prompts'), 2500);
    } catch (err) {
      console.error('Unerwarteter Fehler beim Passwortsetzen:', err);
      setErrorMsg('Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.');
      setLoading(false);
    }
  };

  // Ladeanzeige, während die Auth-Prüfung läuft
  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-6 w-6" />
        <span className="ml-2">Prüfe Berechtigung…</span>
      </div>
    );
  }

  // Das eigentliche Formular
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Passwort festlegen</CardTitle>
          <CardDescription>
            Willkommen bei PromptHaus! Bitte lege dein Passwort fest, um dein Konto zu aktivieren.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSetPassword}>
          <CardContent className="space-y-4">
            {errorMsg && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Fehler</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}
            {successMsg && (
              <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700">
                 <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                 <AlertTitle className="text-green-800 dark:text-green-200">Erfolg!</AlertTitle>
                 <AlertDescription className="text-green-700 dark:text-green-300">{successMsg}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Neues Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mindestens 6 Zeichen"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || !!successMsg}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Passwort bestätigen</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Passwort wiederholen"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading || !!successMsg}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading || !!successMsg}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Speichern...
                </>
              ) : (
                'Passwort festlegen & Weiter'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

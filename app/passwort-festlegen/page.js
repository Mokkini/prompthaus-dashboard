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
import { AlertCircle, Loader2 } from 'lucide-react';

export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [initializing, setInitializing] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Invite-Token aus URL-Hash parsen und Session setzen
  useEffect(() => {
    async function init() {
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            console.error('Fehler beim Setzen der Session:', error.message);
            setErrorMsg('Ungültiger oder abgelaufener Einladungslink.');
          } else {
            // URL-Hash entfernen
            window.history.replaceState(null, '', window.location.pathname);
          }
        } else {
          setErrorMsg('Einladungslink enthält keine gültigen Token.');
        }
      } else {
        setErrorMsg('Kein Einladungs-Token in der URL gefunden.');
      }
      setInitializing(false);
    }
    init();
  }, [supabase]);

  const handleSetPassword = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Die eingegebenen Passwörter stimmen nicht überein.');
      return;
    }
    if (!password) {
      setErrorMsg('Bitte gib ein Passwort ein.');
      return;
    }

    setLoading(true);
    try {
      // Passwort aktualisieren
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) {
        console.error('Fehler beim Setzen des Passworts:', passwordError);
        setErrorMsg(`Passwort konnte nicht gesetzt werden: ${passwordError.message}`);
        setLoading(false);
        return;
      }

      // Metadaten-Flag zurücksetzen
      const { error: metaError } = await supabase.auth.updateUser({
        data: { needs_password_setup: false }
      });
      if (metaError) {
        console.error('Fehler beim Zurücksetzen des Flags:', metaError);
      }

      setSuccessMsg('Dein Passwort wurde erfolgreich festgelegt! Weiterleitung...');
      setLoading(false);
      setTimeout(() => router.push('/meine-prompts'), 2000);
    } catch (err) {
      console.error('Unerwarteter Fehler:', err);
      setErrorMsg('Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.');
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-6 w-6" />
        <span className="ml-2">Lade Session…</span>
      </div>
    );
  }

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
              <Alert variant="default">
                <AlertTitle>Erfolg</AlertTitle>
                <AlertDescription>{successMsg}</AlertDescription>
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

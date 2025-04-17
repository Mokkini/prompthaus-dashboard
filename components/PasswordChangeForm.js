// components/PasswordChangeForm.js
'use client'; // Diese Komponente läuft im Browser

import { useState, useTransition } from 'react';
import { updatePassword } from '@/app/actions'; // Importiere die Server Action
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'; // Icons

export default function PasswordChangeForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition(); // Für Ladezustand

  const handleSubmit = async (event) => {
    event.preventDefault(); // Standard-Formularabsendung verhindern
    setError(null);       // Alte Nachrichten zurücksetzen
    setSuccess(false);

    // Client-seitige Prüfung: Stimmen Passwörter überein?
    if (newPassword !== confirmPassword) {
      setError('Die eingegebenen Passwörter stimmen nicht überein.');
      return;
    }

    // Client-seitige Prüfung: Passwort nicht leer? (Mindestlänge etc. optional)
    if (!newPassword) {
        setError('Das neue Passwort darf nicht leer sein.');
        return;
    }
    // Hier könntest du weitere Passwort-Komplexitätsregeln einbauen

    // Server Action aufrufen
    startTransition(async () => {
      const result = await updatePassword(newPassword);

      if (result.success) {
        setSuccess(true);
        // Formularfelder leeren nach Erfolg
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(result.error || 'Ein unbekannter Fehler ist aufgetreten.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      {/* Erfolgsmeldung */}
      {success && (
        <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-200">Erfolg!</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            Dein Passwort wurde erfolgreich geändert.
          </AlertDescription>
        </Alert>
      )}

       {/* Fehlermeldung */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Eingabefelder */}
      <div className="space-y-1">
        <Label htmlFor="newPassword">Neues Passwort</Label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          disabled={isPending}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isPending}
        />
        {/* Optional: Hinweis auf Passwort-Anforderungen */}
         <p className="text-xs text-gray-500 pt-1">Mindestens 6 Zeichen.</p>
      </div>

      {/* Absende-Button mit Ladeanzeige */}
      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Ändere...
          </>
        ) : (
          'Passwort ändern'
        )}
      </Button>
    </form>
  );
}
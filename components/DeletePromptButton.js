// components/DeletePromptButton.js - REFACTORED with AlertDialog & shadcn/ui Button & router.refresh()
"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation'; // <-- Importiere useRouter
// Die Server Action importieren
import { deletePromptPackage } from '@/app/admin/prompts/actions'; // <-- Pfad ist korrekt
// shadcn/ui Komponenten importieren
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
// Icons importieren
import { Trash2, Loader2 } from "lucide-react";

export default function DeletePromptButton({ packageId, packageName }) {
  const router = useRouter(); // <-- Initialisiere den Router
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  // Funktion, die beim Klick auf "Endgültig löschen" im Dialog aufgerufen wird
  const performDelete = () => {
    setError(null); // Fehler zurücksetzen
    startTransition(async () => { // Startet die Server Action mit Pending State
      try {
        // Wir rufen die Server Action direkt als Funktion auf
        const result = await deletePromptPackage(packageId);

        if (result?.error) { // Prüft, ob die Action ein Fehlerobjekt zurückgibt
          throw new Error(result.error);
        }

        // --- NEU: Bei Erfolg den Router zum Aktualisieren der Daten anweisen ---
        router.refresh();
        // --- ENDE NEU ---

        // Optional: Erfolgsmeldung (z.B. mit einem Toast-System)
        // import { toast } from 'sonner'; // Beispiel mit Sonner
        // toast.success(`Paket "${packageName}" erfolgreich gelöscht.`);

        // Der Dialog schließt sich automatisch, da keine manuelle Steuerung (z.B. über einen `open` State) erfolgt.

      } catch (e) {
        console.error("Fehler beim Löschen:", e);
        setError(e.message || "Paket konnte nicht gelöscht werden.");
        // Der Dialog schließt sich standardmäßig trotzdem.
        // Um den Fehler im Dialog anzuzeigen, müsste man den Dialog-State manuell steuern (`open`, `onOpenChange`).
        // Alternativ: Fehlermeldung via Toast anzeigen.
        // import { toast } from 'sonner'; // Beispiel mit Sonner
        // toast.error(`Fehler: ${e.message || "Paket konnte nicht gelöscht werden."}`);
      }
      // isPending wird automatisch von startTransition zurückgesetzt
    });
  };

  return (
    // Der AlertDialog umschließt alles
    <AlertDialog>
      {/* Der Trigger ist der Button, der in der Tabelle sichtbar ist */}
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="icon" title="Löschen" disabled={isPending}>
          {/* Zeige entweder Icon oder Spinner */}
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          <span className="sr-only">Löschen</span>
        </Button>
      </AlertDialogTrigger>

      {/* Der Inhalt des Dialogfensters */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bist du absolut sicher?</AlertDialogTitle>
          <AlertDialogDescription>
            Diese Aktion kann nicht rückgängig gemacht werden. Das Prompt-Paket
            &quot;{packageName}&quot; wird dauerhaft gelöscht.
            {/* --- NEU: Fehlermeldung im Dialog anzeigen --- */}
            {error && (
              <p className="text-sm text-red-600 dark:text-red-500 mt-3 font-medium">
                Fehler: {error}
              </p>
            )}
            {/* --- ENDE NEU --- */}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Der Abbrechen-Button */}
          <AlertDialogCancel disabled={isPending}>Abbrechen</AlertDialogCancel>
          {/* Der Bestätigen-Button, der die Löschfunktion aufruft */}
          <AlertDialogAction
            onClick={performDelete}
            disabled={isPending}
            // Stelle sicher, dass der Button auch im Dialog rot ist
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {/* Zeige Spinner auch im Bestätigen-Button */}
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Wird gelöscht...' : 'Endgültig löschen'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

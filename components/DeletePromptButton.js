// components/DeletePromptButton.js - REFACTORED with AlertDialog & shadcn/ui Button
"use client";

import { useState, useTransition } from 'react';
// Die Server Action importieren
import { deletePromptPackage } from '@/app/admin/prompts/actions'; // <-- Dieser Pfad ist bereits korrekt!
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
  // useTransition für den Pending-State der Server Action
  const [isPending, startTransition] = useTransition();
  // Optional: State für Fehlermeldungen aus der Action
  const [error, setError] = useState(null);
  // State, um den Dialog nach Fehler ggf. offen zu halten (optional, hier nicht implementiert)
  // const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Funktion, die beim Klick auf "Endgültig löschen" im Dialog aufgerufen wird
  const performDelete = () => {
    setError(null); // Fehler zurücksetzen
    startTransition(async () => { // Startet die Server Action mit Pending State
      try {
        // Wir rufen die Server Action direkt als Funktion auf
        // WICHTIG: Die Action 'deletePromptPackage' muss packageId als Argument akzeptieren!
        const result = await deletePromptPackage(packageId);

        if (result?.error) { // Prüft, ob die Action ein Fehlerobjekt zurückgibt
          throw new Error(result.error);
        }
        // Bei Erfolg schließt sich der Dialog automatisch und die Seite sollte
        // durch die Server Action neu validiert werden (kein expliziter Code hier nötig).
        // setIsDialogOpen(false); // Falls man den Dialog manuell steuern würde

      } catch (e) {
        console.error("Fehler beim Löschen:", e);
        setError(e.message || "Paket konnte nicht gelöscht werden.");
        // Hier könnte man entscheiden, den Dialog offen zu lassen, um den Fehler anzuzeigen
        // Aktuell schließt er sich trotzdem. Eine Fehleranzeige via Toast wäre eine Alternative.
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
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* Optional: Hier könnte man den Fehler anzeigen, falls state management komplexer wäre */}
        {/* {error && <p className="text-sm text-destructive mt-2">{error}</p>} */}
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

// Wichtiger Hinweis für die Server Action (z.B. in app/admin/prompts/actions.js):
// Damit dieser Code funktioniert, muss die Funktion `deletePromptPackage` so angepasst werden,
// dass sie die packageId direkt als Argument akzeptiert (statt nur über FormData).
// Beispiel Signatur: export async function deletePromptPackage(packageId: string) { ... }
// Wenn die Action zwingend FormData braucht, müssten wir den <form>-Ansatz beibehalten
// und ihn programmatisch aus performDelete heraus absenden (weniger elegant).

// components/AuthListenerWrapper.js
"use client";

import React, { useEffect, useRef } from 'react'; // useRef hinzugefügt
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const AuthListenerWrapper = ({ children }) => {
  const supabase = createClient();
  const router = useRouter();
  const initialized = useRef(false); // Verhindert mehrfache Ausführung

  useEffect(() => {
    // --- NEU: Hash-Verarbeitung beim ersten Laden ---
    if (!initialized.current && typeof window !== 'undefined') {
      const hash = window.location.hash;
      // Prüfe auf Invite-spezifische Parameter im Hash
      if (hash && hash.includes('access_token') && (hash.includes('type=invite') || hash.includes('type=recovery'))) { // Recovery auch abfangen?
        console.log('[AuthListener] Invite/Recovery-Hash erkannt:', hash);
        const params = new URLSearchParams(hash.substring(1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const type = params.get('type'); // Typ auslesen

        if (access_token && refresh_token) {
          // Versuche die Session zu setzen
          supabase.auth.setSession({ access_token, refresh_token })
            .then(({ data: { session }, error }) => { // Session-Daten aus der Antwort holen
              if (error) {
                console.error(`[AuthListener] Fehler beim Setzen der ${type}-Session:`, error.message);
                // Optional: Fehler anzeigen oder zu Fehlerseite leiten
                // Wichtig: Hash trotzdem entfernen, um Loops zu vermeiden
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
              } else {
                console.log(`[AuthListener] ${type}-Session erfolgreich gesetzt.`);
                // Hash entfernen, damit er nicht erneut verarbeitet wird
                window.history.replaceState(null, '', window.location.pathname + window.location.search);

                // Prüfe, ob es ein Invite war und das Flag gesetzt werden muss
                // (Normalerweise setzt Supabase das Flag bei Invites automatisch, aber sicher ist sicher)
                if (type === 'invite' && session?.user && !session.user.user_metadata?.needs_password_setup) {
                   console.log('[AuthListener] Invite erkannt, setze Flag manuell (Fallback)...');
                   supabase.auth.updateUser({ data: { needs_password_setup: true } })
                     .then(({ error: updateError }) => {
                       if (updateError) console.error('[AuthListener] Fehler beim manuellen Setzen des Flags:', updateError.message);
                       // Unabhängig vom Flag-Update, lade neu, damit der Listener den neuen State erkennt
                       router.refresh();
                     });
                } else {
                  // Bei Recovery oder wenn Flag schon da ist, einfach neu laden
                  router.refresh(); // Wichtig, um AuthStateChange sofort zu triggern
                }
              }
            });
        } else {
           console.warn(`[AuthListener] ${type}-Hash gefunden, aber Tokens fehlen.`);
           // Hash trotzdem entfernen
           window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
      initialized.current = true; // Markieren, dass die Initialisierung lief
    }
    // --- Ende NEU ---

    console.log('[AuthListener] Listener wird eingerichtet...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const timestamp = new Date().toISOString();
      console.log(`[AuthListener ${timestamp}] Event: ${event}`);
      console.log(`[AuthListener ${timestamp}] Session vorhanden: ${!!session}`);
      const currentPath = window.location.pathname;
      console.log(`[AuthListener ${timestamp}] Aktueller Pfad: ${currentPath}`);

      if (session?.user?.user_metadata) {
        console.log(
          `[AuthListener ${timestamp}] Session User Metadata:`,
          JSON.stringify(session.user.user_metadata, null, 2)
        );
      } else if (session?.user) {
        console.log(
          `[AuthListener ${timestamp}] Session User vorhanden, aber user_metadata ist leer/nicht vorhanden.`
        );
      }

      const needsPasswordSetup = session?.user?.user_metadata?.needs_password_setup;

      // Leite nur weiter, wenn das Flag gesetzt ist UND wir NICHT schon auf der Zielseite sind
      // Wichtig: Prüfe auf Session, da INITIAL_SESSION auch ohne Session feuern kann
      if (
        session &&
        needsPasswordSetup === true &&
        currentPath !== '/passwort-festlegen'
      ) {
        console.log(
          `[AuthListener ${timestamp}] --> needs_password_setup=true (Event: ${event}), leite zu /passwort-festlegen um...`
        );
        router.replace('/passwort-festlegen'); // replace statt push
      }
      // Optional: Schutz, falls man ohne Flag auf der Seite landet
      else if (session && needsPasswordSetup !== true && currentPath === '/passwort-festlegen') {
         console.log(
           `[AuthListener ${timestamp}] --> Flag nicht gesetzt, aber auf /passwort-festlegen. Leite zu /meine-prompts um...`
         );
         router.replace('/meine-prompts');
      }
      // Optional: Schutz, falls man ohne Session auf der Seite landet
      else if (!session && currentPath === '/passwort-festlegen') {
          console.log(
            `[AuthListener ${timestamp}] --> Nicht eingeloggt, aber auf /passwort-festlegen. Leite zu /login um...`
          );
          router.replace('/login');
      }
       else if (event === 'SIGNED_OUT') {
         console.log(`[AuthListener ${timestamp}] --> SIGNED_OUT erkannt.`);
         // Optional: Explizite Weiterleitung zu Login, falls nicht schon durch andere Mechanismen abgedeckt
         // if (currentPath !== '/login') {
         //   router.replace('/login');
         // }
       }
       else {
           console.log(`[AuthListener ${timestamp}] --> Keine spezielle Weiterleitung nötig. (Event: ${event}, Flag: ${needsPasswordSetup}, Path: ${currentPath})`);
       }
    });

    return () => {
      console.log('[AuthListener] Listener wird entfernt...');
      subscription.unsubscribe();
    };
  }, [supabase, router]); // Abhängigkeiten bleiben gleich

  return <>{children}</>;
};

export default AuthListenerWrapper;

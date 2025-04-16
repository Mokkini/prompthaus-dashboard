// components/AuthListenerWrapper.js (oder .js)
'use client'; // Diese Komponente MUSS ein Client Component sein

import React, { useEffect } from 'react'; // Import React für TSX/JSX
import { createClient } from '@/lib/supabase/client'; // Pfad zu Ihrem Client-Supabase prüfen!
import { useRouter } from 'next/navigation';

// Keine TypeScript Props-Definition nötig
const AuthListenerWrapper = ({ children }) => { // Keine Typisierung
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    console.log('[AuthListener] Listener wird eingerichtet...'); // Log: Listener Start

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const timestamp = new Date().toISOString(); // Zeitstempel für Reihenfolge
      console.log(`[AuthListener ${timestamp}] Event: ${event}`); // Log: Welches Event?
      console.log(`[AuthListener ${timestamp}] Session vorhanden: ${!!session}`); // Log: Session da (true/false)?

      if (event === 'PASSWORD_RECOVERY') {
        console.log(`[AuthListener ${timestamp}] --> PASSWORD_RECOVERY erkannt! Session vorhanden: ${!!session}`);
        if (session) {
            console.log(`[AuthListener ${timestamp}] --> Session gültig, versuche Weiterleitung zu /set-password...`);
            router.push('/set-password');
        } else {
            // Dieser Fall sollte eigentlich nicht eintreten, wenn das Event kommt
            console.error(`[AuthListener ${timestamp}] --> KRITISCH: PASSWORD_RECOVERY Event OHNE Session! Redirect URLs etc. prüfen!`);
        }
      } else if (event === 'SIGNED_IN') {
          console.log(`[AuthListener ${timestamp}] --> SIGNED_IN erkannt.`);
          // Hier könnten Sie prüfen, ob der Nutzer vielleicht schon auf set-password ist o.ä.
      } else if (event === 'INITIAL_SESSION' && !session) { // Speziell auf INITIAL_SESSION OHNE Session prüfen
          console.log(`[AuthListener ${timestamp}] --> INITIAL_SESSION mit null session erkannt. Prüfe Session erneut nach 1 Sekunde...`);
          // --- START: setTimeout Check für Diagnose ---
          setTimeout(async () => {
              const { data: delayedData, error: delayedError } = await supabase.auth.getSession(); // Session explizit abrufen
              const delayedTimestamp = new Date().toISOString();
              // Logge das Ergebnis des verzögerten Abrufs
              console.log(`[AuthListener ${delayedTimestamp}] Verzögertes getSession Ergebnis:`, { session: delayedData?.session, error: delayedError });
              // Wenn hier eine Session gefunden wird, ist das ein Hinweis auf ein Timing-Problem mit onAuthStateChange
              if (delayedData?.session && window.location.hash.includes('type=invite')) { // Nur relevant, wenn der Invite-Hash noch da ist (optional)
                 console.warn(`[AuthListener ${delayedTimestamp}] --> Session wurde nach Verzögerung gefunden! onAuthStateChange scheint unzuverlässig für Invite-Token mit SSR-Client.`);
                 // Hier KEINEN automatischen Redirect einbauen, dient nur der Diagnose!
              }
          }, 1000); // Warte 1 Sekunde
          // --- END: setTimeout Check ---
      } else if (event === 'INITIAL_SESSION' && session) {
          // Falls INITIAL_SESSION doch mal direkt mit Session kommt
          console.log(`[AuthListener ${timestamp}] --> INITIAL_SESSION erkannt (mit Session).`);
      } else if (event === 'SIGNED_OUT') {
           console.log(`[AuthListener ${timestamp}] --> SIGNED_OUT erkannt.`);
      } else {
           console.log(`[AuthListener ${timestamp}] --> Anderes Event: ${event}`);
      }
    });

    return () => {
      console.log('[AuthListener] Listener wird entfernt...'); // Log: Listener Ende
      subscription.unsubscribe();
    };
  }, [supabase, router]); // Abhängigkeiten für useEffect

  // Gebe einfach die Kinder (den Rest der App) zurück
  return <>{children}</>;
};

export default AuthListenerWrapper;
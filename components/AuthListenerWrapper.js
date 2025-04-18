// components/AuthListenerWrapper.js
"use client";

import React, { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const AuthListenerWrapper = ({ children }) => {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    console.log('[AuthListener] Listener wird eingerichtet...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const timestamp = new Date().toISOString();
      console.log(`[AuthListener ${timestamp}] Event: ${event}`);
      console.log(`[AuthListener ${timestamp}] Session vorhanden: ${!!session}`);
      const currentPath = window.location.pathname;
      console.log(`[AuthListener ${timestamp}] Aktueller Pfad: ${currentPath}`);

      // Logge Metadaten, wenn vorhanden
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

      // Nur bei echtem Sign-In oder INITIAL_SESSION weiterleiten
      const needsPasswordSetup = session?.user?.user_metadata?.needs_password_setup;
      if (
        (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) &&
        needsPasswordSetup === true &&
        currentPath !== '/passwort-festlegen'
      ) {
        console.log(
          `[AuthListener ${timestamp}] --> needs_password_setup=true (Event: ${event}), leite zu /passwort-festlegen um...`
        );
        router.replace('/passwort-festlegen');
      }
      // Wenn wir bereits auf der richtigen Seite sind
      else if (
        (event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session)) &&
        needsPasswordSetup === true &&
        currentPath === '/passwort-festlegen'
      ) {
        console.log(
          `[AuthListener ${timestamp}] --> Flag ist true, aber wir sind bereits auf /passwort-festlegen. (Event: ${event})`
        );
      }
      // Session ohne gesetztes Flag
      else if (session && !needsPasswordSetup) {
        console.log(
          `[AuthListener ${timestamp}] --> Session vorhanden, aber Flag nicht gesetzt/false. (Event: ${event})`
        );
      }
      // Sign‑Out
      else if (event === 'SIGNED_OUT') {
        console.log(`[AuthListener ${timestamp}] --> SIGNED_OUT erkannt.`);
      }
    });

    // Aufräumen bei Unmount
    return () => {
      console.log('[AuthListener] Listener wird entfernt...');
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  return <>{children}</>;
};

export default AuthListenerWrapper;

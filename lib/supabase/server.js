// lib/supabase/server.js
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        // Die get-Methode IST async und verwendet await
        async get(name) {
          // await verwenden, um auf das Cookie zu warten
          const cookie = await cookieStore.get(name); // <-- Hier zeigt der Fehler hin
          return cookie?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Fehler beim Setzen ignorieren
          }
        },
        remove(name, options) {
          try {
            cookieStore.delete({ name, ...options });
          } catch (error) {
            // Fehler beim Löschen ignorieren
          }
        },
      },
    }
  );
}

// lib/supabase/server.js
import { createServerClient } from '@supabase/ssr' // Korrigierter Import
import { cookies } from 'next/headers'

export function createClient() { // Funktion zum Erstellen des Clients
  const cookieStore = cookies()

  // Erstellt einen Supabase Client für Server Components.
  // Verwendet den Anon Key, damit Row Level Security angewendet werden kann,
  // basierend auf der Session des Nutzers (die über Cookies erkannt wird).
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,  // OHNE !
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, // OHNE ! - ANON KEY hier!
    {
      cookies: {
        get(name) { // OHNE Typen
          return cookieStore.get(name)?.value
        },
        set(name, value, options) { // OHNE Typen
           try { cookieStore.set({ name, value, ...options }) } catch (error) {}
        },
        remove(name, options) { // OHNE Typen
           try { cookieStore.delete({ name, ...options }) } catch (error) {}
        },
      },
    }
  )
}
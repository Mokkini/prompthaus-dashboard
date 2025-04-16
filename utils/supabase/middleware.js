// utils/supabase/middleware.js
// WICHTIG: Diese Datei enthält die Logik, die von middleware.js aufgerufen wird.
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Diese Funktion MUSS updateSession heißen, da sie so in middleware.js importiert wird
export async function updateSession(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Erstellt einen Supabase Client speziell für Middleware/Server-Kontext, der Cookies nutzt
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, // Ihre Supabase URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, // Ihr Supabase Anon Key
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          // Wenn Cookie gesetzt wird, Request und Response aktualisieren
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name, options) {
          // Wenn Cookie entfernt wird, Request und Response aktualisieren
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // WICHTIG: Session erneuern, falls sie abgelaufen ist.
  // Notwendig für Server Components und um die Session aktuell zu halten.
  // getUser() löst das Session-Refresh aus, falls erforderlich.
  await supabase.auth.getUser()

  // Gibt die (potenziell modifizierte) Response zurück
  return response
}
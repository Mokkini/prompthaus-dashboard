// lib/supabase/client.js
import { createBrowserClient } from '@supabase/ssr'

// Erstellt einen Supabase Client für die Verwendung in Browser/Client-Komponenten
// Wichtig: Verwendet die öffentlichen Umgebungsvariablen

export function createClient() {
    // Diese Funktion stellt sicher, dass wir immer die aktuellen Env-Vars nutzen,
    // falls sie sich z.B. dynamisch ändern könnten (weniger relevant hier, aber gute Praxis)
    // und ermöglicht das Erstellen des Clients bei Bedarf.
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Optional: Erstelle eine Singleton-Instanz, wenn du sie direkt importieren willst
// const supabase = createClient()
// export default supabase
// Für den Anfang ist es oft klarer, die createClient Funktion zu exportieren und bei Bedarf aufzurufen.
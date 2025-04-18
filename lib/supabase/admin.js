// lib/supabase/admin.js
import { createClient } from '@supabase/supabase-js';

// Erstellt einen Admin-Client, der RLS umgeht. NUR SERVERSEITIG VERWENDEN!
// Dieser Client benötigt die Service Role Key Environment Variable.
export function createAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase URL oder Service Role Key nicht in Umgebungsvariablen gefunden.');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        // Wichtig für Admin-Client:
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
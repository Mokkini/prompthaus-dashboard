// app/admin/llm-settings/actions.js
'use server';

import { createClient } from '@/lib/supabase/server'; // User-Client für Auth-Check
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'; // Admin-Client für DB-Zugriff
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// --- HILFSFUNKTION für Admin Client ---
function getSupabaseAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error("[AdminClient] Supabase URL oder Service Key fehlt in Umgebungsvariablen!");
        throw new Error('Server-Konfigurationsfehler für Admin-Operationen.');
    }
    return createSupabaseAdminClient(supabaseUrl, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
// --- ENDE HILFSFUNKTION ---

// --- Schema für die Validierung der Einstellungen ---
const LlmSettingsSchema = z.object({
  model: z.string().min(1, "Modell darf nicht leer sein."),
  system_prompt: z.string().min(1, "System-Prompt darf nicht leer sein."),
  temperature: z.coerce.number().min(0).max(2),
  top_p: z.coerce.number().min(0).max(1),
  presence_penalty: z.coerce.number().min(-2).max(2),
  frequency_penalty: z.coerce.number().min(-2).max(2),
  max_tokens: z.coerce.number().int().positive("Max Tokens muss eine positive ganze Zahl sein."),
  // Stop-Sequenzen: String mit Komma getrennt -> Array
  stop_sequences: z.string().optional().transform(val =>
    val ? val.split(',').map(s => s.trim()).filter(s => s !== '') : []
  ),
  seed: z.coerce.number().int().optional().nullable(), // Kann leer oder eine Zahl sein
});

// --- FUNKTION: getLlmSettings ---
export async function getLlmSettings() { // <-- Export für getLlmSettings
  // Auth Check (User Client)
  const supabaseUserClient = createClient();
  const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
  if (userError || !user) {
    console.error("getLlmSettings: Fehler beim Holen des Benutzers oder nicht eingeloggt:", userError?.message);
    return { success: false, error: 'Nicht eingeloggt oder autorisiert.', settings: null };
  }
  // Hier optionalen Admin-Check einfügen, falls RLS nicht ausreicht
  // if (user.email !== process.env.ADMIN_EMAIL) { ... }

  // Daten holen (Admin Client, um RLS zu umgehen, falls nötig, oder User Client wenn RLS passt)
  const supabaseAdmin = getSupabaseAdminClient();
  try {
    const { data, error } = await supabaseAdmin
      .from('llm_settings')
      .select('*')
      .eq('setting_key', 'global') // Den globalen Datensatz holen
      .maybeSingle(); // Gibt null zurück, wenn nicht gefunden, statt Fehler

    if (error) {
      console.error("getLlmSettings: Fehler beim Laden der Einstellungen:", error.message);
      throw new Error(`Datenbankfehler: ${error.message}`);
    }

    if (!data) {
        console.warn("getLlmSettings: Keine globalen Einstellungen gefunden. Fallback auf Standardwerte.");
        // Fallback auf Standardwerte, falls der Datensatz fehlt
        return {
            success: true,
            settings: {
                model: 'gpt-4o-mini',
                system_prompt: 'Du bist ein hilfreicher Assistent.',
                temperature: 0.7,
                top_p: 0.95,
                presence_penalty: 0.3,
                frequency_penalty: 0.2,
                max_tokens: 1500,
                stop_sequences: ['User:', 'System:'], // Als Array für den Fallback
                seed: null,
            }
        };
    }

    // Konvertiere stop_sequences (Array) zurück in einen String für das Formular
    const settingsForForm = {
        ...data,
        stop_sequences: Array.isArray(data.stop_sequences) ? data.stop_sequences.join(', ') : ''
    };

    return { success: true, settings: settingsForForm };

  } catch (e) {
    console.error("getLlmSettings: Unerwarteter Fehler:", e.message);
    return { success: false, error: `Serverfehler: ${e.message}`, settings: null };
  }
}

// --- FUNKTION: updateLlmSettings ---
export async function updateLlmSettings(prevState, formData) { // <-- Stelle sicher, dass 'export' hier steht! prevState hinzugefügt für useActionState
   // Auth Check (User Client)
  const supabaseUserClient = createClient();
  const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
  if (userError || !user) {
    return { success: false, message: 'Nicht eingeloggt oder autorisiert.' };
  }
   // Hier optionalen Admin-Check einfügen

  // Daten aus FormData extrahieren
  const rawFormData = {
    model: formData.get('model'),
    system_prompt: formData.get('system_prompt'),
    temperature: formData.get('temperature'),
    top_p: formData.get('top_p'),
    presence_penalty: formData.get('presence_penalty'),
    frequency_penalty: formData.get('frequency_penalty'),
    max_tokens: formData.get('max_tokens'),
    stop_sequences: formData.get('stop_sequences'), // Kommt als String
    seed: formData.get('seed') || null, // Wenn leer, dann null
  };

  // Validieren mit Zod
  const validatedFields = LlmSettingsSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    console.error("Validierungsfehler (LLM Settings):", validatedFields.error.flatten().fieldErrors);
    // Nimm die erste Fehlermeldung für die Anzeige
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
    return {
      success: false,
      message: `Validierungsfehler: ${firstError || 'Unbekannter Validierungsfehler.'}`,
    };
  }

  // Validierte Daten für DB vorbereiten (stop_sequences ist jetzt ein Array)
  const dataToUpdate = validatedFields.data;

  // Update in DB (Admin Client)
  const supabaseAdmin = getSupabaseAdminClient();
  try {
    const { error } = await supabaseAdmin
      .from('llm_settings')
      .update(dataToUpdate)
      .eq('setting_key', 'global'); // Den globalen Datensatz aktualisieren

    if (error) {
      console.error("updateLlmSettings: Fehler beim Aktualisieren:", error.message);
      throw new Error(`Datenbankfehler: ${error.message}`);
    }

    revalidatePath('/admin/llm-settings'); // Cache für die Einstellungsseite invalidieren
    // WICHTIG: Auch Pfade invalidieren, wo die Einstellungen verwendet werden (z.B. die Prompt-Seite)
    // revalidatePath('/prompt/[slug]'); // Beispiel

    return { success: true, message: 'Einstellungen erfolgreich gespeichert.' };

  } catch (e) {
    console.error("updateLlmSettings: Unerwarteter Fehler:", e.message);
    return { success: false, message: `Serverfehler: ${e.message}` };
  }
}

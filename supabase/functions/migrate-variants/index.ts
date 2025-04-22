// supabase/functions/migrate-variants/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'; // Use esm.sh for Deno

// CORS Header für lokale Tests (optional, aber nützlich)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Oder spezifischer für lokale Entwicklung
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Admin Client erstellen (Umgebungsvariablen werden von Supabase bereitgestellt)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Service Role Key verwenden!
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } } // Auth weiterleiten (optional, falls geschützt)
    );

    console.log('Migration Function gestartet...');

    // 2. Alle Pakete mit prompt_variants laden
    const { data: packages, error: fetchError } = await supabaseAdmin
      .from('prompt_packages')
      .select('id, prompt_variants'); // Nur ID und Varianten laden

    if (fetchError) {
      console.error('Fehler beim Laden der Pakete:', fetchError);
      throw new Error(`Fehler beim Laden der Pakete: ${fetchError.message}`);
    }

    if (!packages || packages.length === 0) {
      console.log('Keine Pakete zum Migrieren gefunden.');
      return new Response(JSON.stringify({ message: 'Keine Pakete zum Migrieren gefunden.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Gefundene Pakete: ${packages.length}`);
    let migratedCount = 0;
    const errors = [];

    // 3. Jedes Paket durchgehen und migrieren
    for (const pkg of packages) {
      const currentVariants = pkg.prompt_variants;

      // Prüfen, ob Migration nötig ist (ist es ein Array? -> alte Struktur)
      if (Array.isArray(currentVariants)) {
        console.log(`Migriere Paket ID: ${pkg.id}...`);
        try {
          const migratedVariants = currentVariants.map((variant) => {
            // Erstelle eine Kopie, um das Original nicht zu ändern (wichtig!)
            const newVariant = { ...variant };
            // Entferne das 'template'-Feld, falls vorhanden
            delete newVariant.template;
            return newVariant;
          });

          // Erstelle die neue Struktur mit Wrapper
          const newStructure = { generation_variants: migratedVariants };

          // 4. Update in der Datenbank durchführen
          const { error: updateError } = await supabaseAdmin
            .from('prompt_packages')
            .update({ prompt_variants: newStructure }) // Speichere die neue Struktur
            .eq('id', pkg.id);

          if (updateError) {
            console.error(`Fehler beim Update von Paket ID ${pkg.id}:`, updateError);
            errors.push(`Paket ${pkg.id}: ${updateError.message}`);
          } else {
            migratedCount++;
            console.log(`Paket ID ${pkg.id} erfolgreich migriert.`);
          }
        } catch (processError) {
           console.error(`Fehler bei der Verarbeitung von Paket ID ${pkg.id}:`, processError);
           errors.push(`Paket ${pkg.id}: ${processError.message}`);
        }
      } else {
        // Bereits neue Struktur oder ungültiges Format -> überspringen
        console.log(`Paket ID ${pkg.id} wird übersprungen (kein Array oder bereits migriert).`);
      }
    } // Ende der Schleife

    // 5. Ergebnis zurückgeben
    const responseMessage = `Migration abgeschlossen. ${migratedCount} Pakete migriert. ${errors.length} Fehler aufgetreten.`;
    console.log(responseMessage);
    if (errors.length > 0) console.error('Fehlerdetails:', errors);

    return new Response(JSON.stringify({ message: responseMessage, errors: errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: errors.length > 0 ? 500 : 200, // Status 500, wenn Fehler auftraten
    });

  } catch (error) {
    console.error('Unerwarteter Fehler in der Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

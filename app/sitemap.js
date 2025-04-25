// app/sitemap.js

import { createClient } from '@/lib/supabase/server'; // Server-Client für DB-Zugriff

// Basis-URL deiner Website (ersetzen!)
const BASE_URL = 'https://www.prompthaus.de'; // z.B. https://www.prompthaus.de

export default async function sitemap() {
  const supabase = createClient();

  // 1. Statische Routen definieren
  const staticRoutes = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'monthly', priority: 1.0 },
    { url: `${BASE_URL}/pakete`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/kategorien`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 }, // Falls vorhanden
    // Impressum & Datenschutz werden oft niedriger priorisiert und seltener geändert
    // Sie sind auch auf noindex, aber schadet nicht, sie hier aufzuführen
    { url: `${BASE_URL}/impressum`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/datenschutz`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  // 2. Dynamische Routen für Prompt-Pakete holen
  let dynamicRoutes = [];
  try {
    const { data: packages, error } = await supabase
      .from('prompt_packages')
      .select('slug, updated_at') // Slug und optional updated_at für lastModified
      .filter('slug', 'neq', null); // Nur Pakete mit Slug

    if (error) {
      console.error("Fehler beim Laden der Paket-Slugs für Sitemap:", error);
    } else if (packages) {
      dynamicRoutes = packages.map((pkg) => ({
        url: `${BASE_URL}/prompt/${pkg.slug}`,
        // Verwende updated_at, falls vorhanden, sonst aktuelles Datum
        lastModified: pkg.updated_at ? new Date(pkg.updated_at) : new Date(),
        changeFrequency: 'monthly', // Wie oft ändern sich die Paketdetails?
        priority: 0.6, // Etwas niedriger als die Hauptseiten
      }));
    }
  } catch (e) {
    console.error("Fehler bei der Sitemap-Generierung für Pakete:", e);
  }


  // 3. Alle Routen zusammenführen
  return [...staticRoutes, ...dynamicRoutes];
}


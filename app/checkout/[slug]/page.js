// app/checkout/[slug]/page.jsx
import { createClient } from '@/lib/supabase/server'; // Dein Server-Supabase-Client
import { notFound } from 'next/navigation';
import CheckoutForm from '@/components/CheckoutForm'; // Wir erstellen diese Komponente gleich

// Funktion zum Abrufen der Paketdetails
async function getPackageDetails(slug) {
  const supabase = createClient();
  const { data: packageData, error } = await supabase
    .from('prompt_packages') // Deine Tabelle mit den Paketen
    .select('id, name, description, price, slug, stripe_price_id') // Wähle die benötigten Felder aus
    .eq('slug', slug)
    .single(); // Wir erwarten nur ein Paket pro Slug

  if (error || !packageData) {
    console.error(`Fehler beim Laden des Pakets für Slug "${slug}":`, error?.message);
    return null; // Gib null zurück, wenn nicht gefunden oder Fehler
  }
  return packageData;
}

// Die eigentliche Seitenkomponente
export default async function CheckoutPage({ params }) {
  const slug = params.slug; // Der Slug aus der URL (z.B. 'basis-paket')

  if (!slug) {
    notFound(); // Zeigt eine 404-Seite, wenn kein Slug vorhanden ist
  }

  const packageDetails = await getPackageDetails(slug);

  if (!packageDetails) {
    notFound(); // Zeigt eine 404-Seite, wenn das Paket nicht gefunden wurde
  }

  // Hier könntest du auch den eingeloggten User prüfen, falls nötig
  // const supabaseAuth = createClient();
  // const { data: { user } } = await supabaseAuth.auth.getUser();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Checkout</h1>
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Dein ausgewähltes Paket:</h2>
        <p className="text-xl font-medium mb-2">{packageDetails.name}</p>
        <p className="text-gray-600 mb-2">{packageDetails.description}</p>
        <p className="text-lg font-bold mb-6">
          Preis: {packageDetails.price ? `${packageDetails.price.toFixed(2)} €` : 'Kostenlos'}
        </p>

        {/* Hier kommt die Client-Komponente für die Zahlungsabwicklung hin */}
        <CheckoutForm packageDetails={packageDetails} />

      </div>
    </div>
  );
}

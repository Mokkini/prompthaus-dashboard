// app/checkout/[slug]/page.jsx
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import CheckoutForm from '@/components/CheckoutForm';
import Image from 'next/image';
import Link from 'next/link';

async function getPackageDetails(slug) {
  const supabase = createClient();
  const { data: packageData, error } = await supabase
    .from('prompt_packages')
    .select('id, name, description, price, slug, stripe_price_id')
    .eq('slug', slug)
    .single();

  if (error || !packageData) {
    console.error(`Fehler beim Laden des Pakets für Slug "${slug}":`, error?.message);
    return null;
  }
  return packageData;
}

export default async function CheckoutPage({ params }) {
  const slug = params.slug;

  if (!slug) {
    notFound();
  }

  const packageDetails = await getPackageDetails(slug);

  if (!packageDetails) {
    notFound();
  }

  return (
    <>
      {/* Minimalistischer Header mit Logo und Rücklink */}
      <header className="w-full flex flex-col items-center py-4 border-b bg-white">
        
        <Link
          href="/"
          className="mt-2 text-sm text-muted-foreground hover:underline"
        >
          ← Zahlung abbrechen und zurück zur Startseite
        </Link>
      </header>

      <div className="py-10">
        <CheckoutForm packageDetails={packageDetails} />
      </div>
    </>
  );
}

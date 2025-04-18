// components/store/ProductCard.js

"use client";

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useTransition } from 'react';
import { createCheckoutSession } from '@/app/actions'; // Unsere Server Action
import { loadStripe } from '@stripe/stripe-js';     // Stripe Client-Bibliothek

// Hilfsfunktion zum Formatieren des Preises
function formatPrice(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '';
  }
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// Komponente ProductCard
export function ProductCard({ prompt }) {
  const [isPending, startTransition] = useTransition();

  if (!prompt) {
    return null;
  }

  const displayPrice = formatPrice(prompt.price);

  // Checkout Funktion
  const handleCheckout = async () => {
    console.log("Checkout gestartet für Preis-ID:", prompt.stripe_price_id, "Paket-ID:", prompt.id);

    if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      console.error("FEHLER: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ist nicht in .env.local gesetzt!");
      alert("Ein Konfigurationsfehler ist aufgetreten.");
      return;
    }
    if (!prompt.stripe_price_id || !prompt.id) {
      alert("Fehler: Produktinformationen unvollständig.");
      return;
    }

    startTransition(async () => {
      try {
        // Server Action aufrufen
        const resultString = await createCheckoutSession(prompt.stripe_price_id, prompt.id);
        const result = JSON.parse(resultString);

        if (result.error) {
          console.error("Fehler von Server Action erhalten:", result.error);
          alert(`Fehler: ${result.error}`);
          return;
        }

        if (result.sessionId) {
          console.log("Stripe Session ID erhalten:", result.sessionId);
          const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

          if (!stripe) {
            throw new Error("Stripe.js konnte nicht initialisiert werden.");
          }

          console.log("Leite zu Stripe Checkout weiter...");
          const { error: stripeRedirectError } = await stripe.redirectToCheckout({
            sessionId: result.sessionId
          });

          if (stripeRedirectError) {
            console.error("Stripe Redirect Fehler:", stripeRedirectError);
            alert(`Fehler bei der Weiterleitung zu Stripe: ${stripeRedirectError.message}`);
          }
        } else {
          console.error("Unerwartete Antwort von Server Action:", result);
          alert("Ein unerwarteter Fehler ist aufgetreten.");
        }
      } catch (error) {
        console.error("Fehler im handleCheckout Prozess:", error);
        alert(`Ein Fehler ist aufgetreten: ${error.message || 'Bitte versuchen Sie es erneut.'}`);
      }
    });
  };
  // Ende Checkout Funktion

  // JSX für die Karte mit Hover-Effekten
  return (
    <Card className="group flex flex-col h-full transition-transform duration-300 hover:-translate-y-2 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="transition-colors group-hover:text-primary">
          {prompt.name || 'Unbenanntes Paket'}
        </CardTitle>
        <CardDescription className="line-clamp-3 min-h-[3rem]">
          {prompt.description || 'Keine Beschreibung verfügbar.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pt-2 pb-4">
        {displayPrice && (
          <p className="text-2xl font-bold text-primary mb-4">{displayPrice}</p>
        )}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleCheckout}
          disabled={isPending || !prompt.stripe_price_id}
        >
          {isPending ? 'Bitte warten...' : 'Jetzt Kaufen'}
        </Button>
      </CardFooter>
    </Card>
  );
} // Ende Komponente

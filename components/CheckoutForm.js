"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, PackageCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { loadStripe } from '@stripe/stripe-js';
import { createCheckoutSession } from '@/app/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
// Checkbox und Label importieren
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
// Alert Komponenten importieren
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function CheckoutForm({ packageDetails }) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  // --- NEU: Nur noch ein State für die kombinierte Zustimmung ---
  const [consentCombined, setConsentCombined] = useState(false);
  const router = useRouter();

  // --- Prüfen, ob die kombinierte Zustimmung gegeben wurde ---
  const canProceed = consentCombined;

  const handleStripeCheckout = async () => {
    // --- Prüfung angepasst ---
    if (!canProceed) {
        setError("Bitte bestätige den Hinweis zum Widerrufsrecht, um fortzufahren.");
        return;
    }
    // --- Ende Prüfung ---

    setIsLoading(true);
    setSelectedMethod('stripe');
    setError(null);
    setPaymentStatus('processing');

    const priceId = packageDetails.stripe_price_id;
    const packageId = packageDetails.id;

    if (!priceId || !packageId) {
      const errorMsg = !priceId ? "Fehler: Stripe Preis-ID fehlt." : "Fehler: Paket-ID fehlt.";
      setError(errorMsg);
      setIsLoading(false);
      setSelectedMethod(null);
      setPaymentStatus('error');
      return;
    }

    try {
      const sessionDataString = await createCheckoutSession(priceId, packageId);
      const sessionData = JSON.parse(sessionDataString);

      if (sessionData.error) throw new Error(sessionData.error);
      if (!sessionData.sessionId) throw new Error("Keine Stripe Session ID erhalten.");

      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe konnte nicht initialisiert werden.");

      const { error: stripeRedirectError } = await stripe.redirectToCheckout({ sessionId: sessionData.sessionId });
      if (stripeRedirectError) throw new Error(`Weiterleitung zu Stripe fehlgeschlagen: ${stripeRedirectError.message}`);

    } catch (err) {
      setError(err.message || 'Ein Fehler ist beim Verbinden mit Stripe aufgetreten.');
      setIsLoading(false);
      setSelectedMethod(null);
      setPaymentStatus('error');
    }
  };

  // --- PayPal createOrder: Prüfung angepasst ---
  const createPayPalOrder = async (data, actions) => {
    if (!canProceed) {
        setError("Bitte bestätige den Hinweis zum Widerrufsrecht, um die PayPal-Zahlung zu starten.");
        throw new Error("Zustimmung fehlt.");
    }
    setError(null); // Fehler zurücksetzen

    // Rest der Funktion bleibt gleich
    const response = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageId: packageDetails.id,
        packageName: packageDetails.name,
        packagePrice: packageDetails.price,
        packageSlug: packageDetails.slug,
      }),
    });
    const orderData = await response.json();
    if (!response.ok) throw new Error(orderData.error || 'Fehler beim Erstellen der PayPal Order über API.');
    if (orderData.orderID) return orderData.orderID;
    throw new Error('Keine PayPal Order ID von API erhalten.');
  };
  // --- Ende PayPal createOrder Anpassung ---

  const onPayPalApprove = async () => {
    setPaymentStatus('processing');
    setIsLoading(true);
    setError(null);
    setSelectedMethod('paypal');
    await new Promise(resolve => setTimeout(resolve, 500));
    setPaymentStatus('success');
    setIsLoading(false);
  };

  const onPayPalError = (err) => {
    if (err.message !== "Zustimmung fehlt.") {
        setError("Ein Fehler ist während des PayPal-Bezahlvorgangs aufgetreten. Bitte versuche es erneut oder wähle eine andere Methode.");
    }
    setPaymentStatus('error');
    setIsLoading(false);
    setSelectedMethod(null);
  };

  const onPayPalCancel = () => {
    setError("Der Bezahlvorgang wurde abgebrochen.");
    setPaymentStatus(null);
    setIsLoading(false);
    setSelectedMethod(null);
  };

  const initialOptions = {
    "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
    currency: "EUR",
    intent: "capture",
  };

  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col md:flex-row gap-8 items-start justify-center px-4 py-10 bg-gray-50">
      {/* Link: Paketdetails */}
      <div className="w-full md:w-1/2 max-w-md bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <PackageCheck className="h-5 w-5 text-primary" />
          Dein gewähltes Paket
        </h2>
        <p className="text-muted-foreground mb-1 text-sm">{packageDetails.name}</p>
        <p className="text-primary text-xl font-bold">{packageDetails.price} €</p>
        <Separator className="my-4" />
        <div className="flex items-center text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 mr-2 text-green-600" />
          Sichere SSL-verschlüsselte Zahlung
        </div>
      </div>

      {/* Rechts: Zahlung */}
      <Card className="w-full md:w-1/2 max-w-md bg-white shadow-sm">
        <CardHeader className="items-center text-center pb-4">
          <Image src="/prompthaus-logo.png" alt="PromptHaus Logo" width={150} height={38} priority />
          <CardTitle className="text-2xl pt-2">Zahlung starten</CardTitle>
          <CardDescription>
            Wähle deine bevorzugte Methode für „{packageDetails.name}“.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {/* Statusmeldungen */}
          {paymentStatus === 'processing' && !error && (
            <div className="flex items-center justify-center text-sm text-muted-foreground p-4 bg-blue-50 border border-blue-200 rounded-md">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
              <span>Zahlung wird verarbeitet... Bitte warte.</span>
            </div>
          )}
          {paymentStatus === 'success' && (
            <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-200">Zahlung erfolgreich!</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                Vielen Dank für deinen Kauf! Du wirst in Kürze zu deinen Prompts weitergeleitet oder kannst sie jetzt in deinem Bereich finden.
                <Button variant="link" size="sm" className="pl-1 h-auto py-0 text-green-700 dark:text-green-300" asChild>
                  <Link href="/meine-prompts">Zu meinen Prompts <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Zahlungsfehler</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Nur anzeigen, wenn Zahlung noch nicht läuft oder erfolgreich war */}
          {paymentStatus !== 'processing' && paymentStatus !== 'success' && (
            <div className="space-y-4">

              {/* --- NEU: Kombinierte Checkbox --- */}
              <div className="p-4 border rounded-md bg-muted/50">
                 <div className="flex items-start space-x-2">
                   <Checkbox
                     id="consent-combined"
                     checked={consentCombined}
                     onCheckedChange={setConsentCombined}
                     disabled={isLoading}
                     aria-labelledby="consent-combined-label"
                     // required // 'required' wird nicht direkt von Shadcn Checkbox unterstützt, Logik über Button-Deaktivierung
                   />
                   <Label
                     htmlFor="consent-combined"
                     id="consent-combined-label"
                     className="text-xs leading-normal cursor-pointer"
                   >
                     Ich stimme ausdrücklich zu, dass PromptHaus vor Ablauf der Widerrufsfrist mit der Ausführung des Vertrags beginnt und mir bekannt ist, dass ich dadurch mein Widerrufsrecht verliere.
                   </Label>
                 </div>
                 {/* Optional: Link zu den AGB hinzufügen */}
                 <p className="text-xs text-muted-foreground pt-2 pl-6"> {/* Einrückung für Konsistenz */}
                   Mit dem Kauf akzeptierst du unsere <Link href="/agb" target="_blank" className="underline hover:text-primary">AGB</Link>.
                 </p>
              </div>
              {/* --- ENDE NEU --- */}

              {/* Stripe Button (disabled-Logik angepasst) */}
              {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
                <Button
                  onClick={handleStripeCheckout}
                  // --- Angepasst: Hängt nur noch von consentCombined ab ---
                  disabled={isLoading || !canProceed}
                  size="lg"
                  className="w-full"
                >
                  {isLoading && selectedMethod === 'stripe' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verbinde...
                    </>
                  ) : (
                    'Mit Karte bezahlen (Stripe)'
                  )}
                </Button>
              )}

              {/* Trenner */}
              {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && (
                 <div className="relative my-4">
                   <div className="absolute inset-0 flex items-center">
                     <span className="w-full border-t" />
                   </div>
                   <div className="relative flex justify-center text-xs uppercase">
                     <span className="bg-white px-2 text-muted-foreground">
                       Oder
                     </span>
                   </div>
                 </div>
              )}

              {/* PayPal Buttons (disabled-Logik angepasst) */}
              {process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && (
                <PayPalScriptProvider options={initialOptions}>
                  {/* --- Angepasst: Hängt nur noch von consentCombined ab --- */}
                  <div className={(isLoading || !canProceed) ? 'opacity-50 pointer-events-none' : ''}>
                    <PayPalButtons
                      style={{ layout: "vertical", color: "blue", shape: "rect", label: "pay" }}
                      // --- Angepasst: Hängt nur noch von consentCombined ab ---
                      disabled={isLoading || !canProceed}
                      createOrder={createPayPalOrder}
                      onApprove={onPayPalApprove}
                      onError={onPayPalError}
                      onCancel={onPayPalCancel}
                      title={!canProceed ? "Bitte bestätige zuerst den Hinweis zum Widerrufsrecht." : ""}
                    />
                  </div>
                </PayPalScriptProvider>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="text-xs text-muted-foreground text-center pt-4">
          Sichere Abwicklung durch Stripe & PayPal. Deine Daten sind geschützt.
        </CardFooter>
      </Card>
    </div>
  );
}

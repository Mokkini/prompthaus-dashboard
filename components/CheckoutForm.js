"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, PackageCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { loadStripe } from '@stripe/stripe-js';
import { createCheckoutSession } from '@/app/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function CheckoutForm({ packageDetails }) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const router = useRouter();

  const handleStripeCheckout = async () => {
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

  const createPayPalOrder = async (data, actions) => {
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
    setError("Ein Fehler ist während des PayPal-Bezahlvorgangs aufgetreten. Bitte versuche es erneut oder wähle eine andere Methode.");
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
          {paymentStatus === 'processing' && !error && (
            <div className="flex items-center justify-center p-3 text-blue-700 bg-blue-100 rounded-md border border-blue-200">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              <span>Zahlung wird verarbeitet...</span>
            </div>
          )}

          {paymentStatus === 'success' && (
            <div className="p-4 text-green-800 bg-green-100 rounded-lg border border-green-200 space-y-3">
              <div className="flex items-center">
                <CheckCircle2 className="mr-2 h-5 w-5 flex-shrink-0" />
                <span className="font-semibold">Zahlung erfolgreich!</span>
              </div>
              <p className="text-sm">Du wirst in Kürze freigeschaltet.</p>
              <p className="text-sm">Falls du neu bist, prüfe dein E-Mail-Postfach (auch den Spam-Ordner).</p>
              <Button onClick={() => router.push('/meine-prompts')} className="w-full">
                Zu meinen Prompts <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-start p-3 text-red-700 bg-red-100 rounded-md border border-red-200">
              <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {paymentStatus !== 'processing' && paymentStatus !== 'success' && (
            <div className="space-y-4">
              {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
                <Button onClick={handleStripeCheckout} disabled={isLoading} size="lg" className="w-full">
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

              {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Oder</span>
                  </div>
                </div>
              )}

              {process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && (
                <PayPalScriptProvider options={initialOptions}>
                  <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
                    <PayPalButtons
                      style={{ layout: "vertical", color: "blue", shape: "rect", label: "pay" }}
                      disabled={isLoading}
                      createOrder={createPayPalOrder}
                      onApprove={onPayPalApprove}
                      onError={onPayPalError}
                      onCancel={onPayPalCancel}
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
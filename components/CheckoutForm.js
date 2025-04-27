"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, PackageCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { loadStripe } from '@stripe/stripe-js';
import { createCheckoutSession } from '@/app/(public)/checkout/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function CheckoutForm({ packageDetails }) {
  const [consentCombined, setConsentCombined] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const router = useRouter();

  const handleStripeCheckout = async () => {
    if (!consentCombined) {
      setError("Bitte bestätige den Hinweis zum Widerrufsrecht.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPaymentStatus('processing');

    try {
      const sessionDataString = await createCheckoutSession(packageDetails.stripe_price_id, packageDetails.id);
      const sessionData = JSON.parse(sessionDataString);

      if (sessionData.error) throw new Error(sessionData.error);
      if (!sessionData.sessionId) throw new Error("Keine Stripe Session ID erhalten.");

      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe konnte nicht initialisiert werden.");

      const { error: stripeRedirectError } = await stripe.redirectToCheckout({ sessionId: sessionData.sessionId });
      if (stripeRedirectError) throw new Error(`Weiterleitung zu Stripe fehlgeschlagen: ${stripeRedirectError.message}`);
    } catch (err) {
      setError(err.message || 'Fehler beim Verbinden mit Stripe.');
      setIsLoading(false);
      setPaymentStatus('error');
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col md:flex-row gap-8 items-start justify-center px-4 py-10 bg-gray-50">
      {/* Paket-Details */}
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

      {/* Zahlungsbereich */}
      <Card className="w-full md:w-1/2 max-w-md bg-white shadow-sm">
        <CardHeader className="items-center text-center pb-4">
          <Image src="/prompthaus-logo.png" alt="PromptHaus Logo" width={150} height={38} priority />
          <CardTitle className="text-2xl pt-2">Zahlung starten</CardTitle>
          <CardDescription>
            Sichere deine Bestellung für „{packageDetails.name}“.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {paymentStatus === 'processing' && !error && (
            <div className="flex items-center justify-center text-sm text-muted-foreground p-4 bg-blue-50 border border-blue-200 rounded-md">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600" />
              <span>Zahlung wird verarbeitet...</span>
            </div>
          )}
          {paymentStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Zahlungsfehler</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {paymentStatus === 'success' && (
            <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-800 dark:text-green-200">Zahlung erfolgreich!</AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                Du kannst deine Prompts jetzt abrufen.
                <Button variant="link" size="sm" className="pl-1 h-auto py-0 text-green-700 dark:text-green-300" asChild>
                  <Link href="/meine-prompts">Zu meinen Prompts <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {paymentStatus !== 'processing' && paymentStatus !== 'success' && (
            <div className="space-y-4">
              <div className="p-4 border rounded-md bg-muted/50">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="consent-combined"
                    checked={consentCombined}
                    onCheckedChange={setConsentCombined}
                    disabled={isLoading}
                    aria-labelledby="consent-combined-label"
                  />
                  <Label
                    htmlFor="consent-combined"
                    id="consent-combined-label"
                    className="text-xs leading-normal cursor-pointer"
                  >
                    Ich stimme ausdrücklich zu, dass PromptHaus vor Ablauf der Widerrufsfrist mit der Ausführung des Vertrags beginnt und ich dadurch mein Widerrufsrecht verliere.
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground pt-2 pl-6">
                  Mit dem Kauf akzeptierst du unsere <Link href="/agb" target="_blank" className="underline hover:text-primary">AGB</Link>.
                </p>
              </div>

              <Button
                onClick={handleStripeCheckout}
                disabled={isLoading || !consentCombined}
                size="lg"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verbinde...
                  </>
                ) : (
                  'Zur Kasse gehen'
                )}
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="text-xs text-muted-foreground text-center pt-4">
          Sichere Abwicklung durch Stripe. Deine Daten sind geschützt.
        </CardFooter>
      </Card>
    </div>
  );
}

// components/CheckoutForm.jsx
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // Import für das Logo
// --- Icons importieren ---
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
// -----------------------
import { Button } from "@/components/ui/button";
import { loadStripe } from '@stripe/stripe-js';
import { createCheckoutSession } from '@/app/actions';
// --- Shadcn UI Card Komponenten ---
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator"; // Für Trennlinien
// --------------------------------

// PayPal Imports
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function CheckoutForm({ packageDetails }) {
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState(null); // 'processing', 'success', 'error'
    const router = useRouter();

    // --- Stripe Handler (Logik unverändert) ---
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
            console.error(errorMsg, "Paketdetails:", packageDetails);
            return;
        }

        try {
            const sessionDataString = await createCheckoutSession(priceId, packageId);
            const sessionData = JSON.parse(sessionDataString);

            if (sessionData.error) throw new Error(sessionData.error);
            if (!sessionData.sessionId) throw new Error("Keine Stripe Session ID erhalten.");

            const stripe = await stripePromise;
            if (!stripe) throw new Error("Stripe konnte nicht initialisiert werden.");

            const { error: stripeRedirectError } = await stripe.redirectToCheckout({
                sessionId: sessionData.sessionId,
            });

            if (stripeRedirectError) {
                throw new Error(`Weiterleitung zu Stripe fehlgeschlagen: ${stripeRedirectError.message}`);
            }
            // Bei Erfolg wird weitergeleitet

        } catch (err) {
            console.error("Fehler beim Starten der Stripe Session:", err);
            setError(err.message || 'Ein Fehler ist beim Verbinden mit Stripe aufgetreten.');
            setIsLoading(false);
            setSelectedMethod(null);
            setPaymentStatus('error');
        }
    };

    // --- PayPal createOrder Funktion (Logik unverändert) ---
    const createPayPalOrder = async (data, actions) => {
        try {
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
        } catch (err) {
            console.error("Fehler in createPayPalOrder:", err);
            throw err; // Fehler weiterwerfen für PayPal SDK
        }
    };

    // --- PayPal onApprove Funktion (Logik unverändert) ---
    const onPayPalApprove = async (data, actions) => {
        setPaymentStatus('processing');
        setIsLoading(true);
        setError(null);
        setSelectedMethod('paypal');
        await new Promise(resolve => setTimeout(resolve, 500)); // Kurze UI-Pause
        setPaymentStatus('success');
        setIsLoading(false);
    };

    // --- PayPal onError Funktion (Logik unverändert) ---
    const onPayPalError = (err) => {
        console.error("PayPal SDK Fehler (onError):", err);
        setError("Ein Fehler ist während des PayPal-Bezahlvorgangs aufgetreten. Bitte versuche es erneut oder wähle eine andere Methode.");
        setPaymentStatus('error');
        setIsLoading(false);
        setSelectedMethod(null);
    };

    // --- PayPal onCancel Funktion (Logik unverändert) ---
    const onPayPalCancel = (data) => {
        setError("Der Bezahlvorgang wurde abgebrochen.");
        setPaymentStatus(null);
        setIsLoading(false);
        setSelectedMethod(null);
    }

    // --- PayPal Optionen (Logik unverändert) ---
    const initialOptions = {
        "client-id": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "",
        currency: "EUR",
        intent: "capture",
    };

    // --- Rendern der Komponente ---
    return (
        // Card als Hauptcontainer für einen professionellen Look
        <Card className="w-full max-w-md mx-auto shadow-lg"> {/* Zentriert und begrenzt Breite */}
            <CardHeader className="items-center text-center pb-4"> {/* Zentriert Header-Inhalt */}
                {/* Logo einfügen */}
                <Image
                    src="/prompthaus-logo.png" // Pfad anpassen!
                    alt="PromptHaus Logo"
                    width={150} // Breite anpassen
                    height={38} // Höhe anpassen (Seitenverhältnis beachten)
                    priority
                />
                <CardTitle className="text-2xl pt-2">Sicher bezahlen</CardTitle>
                <CardDescription>
                    Wähle deine bevorzugte Zahlungsmethode für "{packageDetails.name}".
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-4"> {/* Mehr Platz für Inhalt */}

                {/* --- Statusanzeige --- */}
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
                            <span className="font-semibold">Zahlung erfolgreich initiiert!</span>
                        </div>
                        <p className="text-sm">
                            Dein Paket wird in Kürze freigeschaltet, sobald die Zahlung bestätigt wurde.
                        </p>
                        <p className="text-sm">
                            Falls dies dein erster Kauf ist, prüfe bitte dein E-Mail-Postfach (auch den Spam-Ordner) für Anweisungen zur Passwortfestlegung.
                        </p>
                        <Button onClick={() => router.push('/meine-prompts')} className="mt-3 w-full"> {/* Button volle Breite */}
                            Zu meinen Prompts
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                )}
                {error && (
                     <div className="flex items-start p-3 text-red-700 bg-red-100 rounded-md border border-red-200">
                        <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {/* Nur Buttons anzeigen, wenn keine Zahlung läuft oder erfolgreich war */}
                {paymentStatus !== 'processing' && paymentStatus !== 'success' && (
                    <div className="space-y-4">
                        {/* Stripe Button */}
                        {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? (
                            <Button // Verwende den shadcn Button für konsistentes Styling
                                onClick={handleStripeCheckout}
                                disabled={isLoading}
                                size="lg" // Größerer Button
                                className="w-full" // Volle Breite für Konsistenz mit PayPal
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
                        ) : (
                             <p className="text-yellow-600 text-sm p-3 bg-yellow-50 border border-yellow-200 rounded-md text-center">Stripe ist momentan nicht verfügbar.</p>
                        )}

                        {/* Trennlinie (optional, für visuelle Trennung) */}
                        {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && (
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-2 text-muted-foreground">
                                        Oder
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* PayPal Buttons */}
                        {process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? (
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
                        ) : (
                             <p className="text-yellow-600 text-sm p-3 bg-yellow-50 border border-yellow-200 rounded-md text-center">PayPal ist momentan nicht verfügbar.</p>
                        )}

                    </div>
                )}
            </CardContent>

            {/* Optional: Footer für zusätzliche Infos oder Links */}
            {/* <CardFooter className="text-xs text-muted-foreground text-center pt-4">
                Sichere Zahlungsabwicklung durch unsere Partner.
            </CardFooter> */}
        </Card>
    );
}

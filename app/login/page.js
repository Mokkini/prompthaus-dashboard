// app/login/page.js
"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image'; // <-- NEU: Image importieren
import { login } from '../actions';

// Shadcn UI Komponenten
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from 'lucide-react';
// Ggf. Icons für OAuth Buttons (optional)
// import { Icons } from "@/components/icons"

export default function LoginPage() {
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await login(formData);
      if (result.success) {
        // console.log("Action success, redirecting to:", result.redirectTo); // Für Live-Betrieb entfernt
        router.push(result.redirectTo);
        // router.refresh(); // Optional
      } else {
        console.error("Action error:", result.message);
        setErrorMsg(result.message || 'Ein unbekannter Fehler ist aufgetreten.');
      }
    });
  };

  return (
    // Hauptcontainer - nimmt volle Höhe/Breite, Grid-Layout auf lg-Screens
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* Linke Spalte (nur auf lg+ sichtbar) - Branding/Bild etc. */}
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        {/* Hintergrundbild oder Farbe */}
        <div className="absolute inset-0 bg-zinc-900" />

        {/* --- Logo oder Branding mit Link zur Startseite --- */}
        <Link href="/" className="relative z-20 flex items-center text-lg font-medium hover:opacity-80 transition-opacity">
          {/* --- SVG ERSETZT DURCH IMAGE --- */}
          <Image
            src="/prompthaus-logo.png" // Pfad zum Logo im public-Ordner
            alt="PromptHaus Logo"
            width={150} // Breite anpassen nach Bedarf
            height={38} // Höhe anpassen nach Bedarf (Seitenverhältnis beachten)
            priority // Wichtig für LCP (Largest Contentful Paint)
            className="mr-2" // Optional: Abstand zum Text
          />
          {/* --- ENDE ERSETZUNG --- */}
          {/* Der Text "PromptHaus" kann bleiben oder entfernt werden, je nach Design */}
          {/* PromptHaus */}
        </Link>
        {/* --- Ende Logo/Branding mit Link --- */}

        {/* Optional: Zitat oder Slogan unten */}
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;Die besten Prompts für deine Kreativität und Produktivität.&rdquo;
            </p>
            <footer className="text-sm">Das PromptHaus Team</footer>
          </blockquote>
        </div>
      </div>

      {/* Rechte Spalte (Login Formular) */}
      <div className="lg:p-8 flex items-center justify-center h-full">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          {/* Titel und Beschreibung */}
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Willkommen zurück
            </h1>
            <p className="text-sm text-muted-foreground">
              Gib deine E-Mail und dein Passwort ein, um dich anzumelden.
            </p>
          </div>

          {/* Formular */}
          <div className="grid gap-6">
            <form onSubmit={handleLogin}>
              <div className="grid gap-4"> {/* Gap für Elemente im Formular */}
                 {/* Fehlermeldung (oben im Formular platziert) */}
                {errorMsg && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Fehler</AlertTitle>
                    <AlertDescription>{errorMsg}</AlertDescription>
                  </Alert>
                )}
                {/* E-Mail Feld */}
                <div className="grid gap-1">
                  <Label className="sr-only" htmlFor="email"> {/* sr-only versteckt Label visuell */}
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    placeholder="name@beispiel.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={isPending}
                    required
                  />
                </div>
                {/* Passwort Feld */}
                <div className="grid gap-1">
                  <Label className="sr-only" htmlFor="password">
                    Passwort
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Dein Passwort"
                    disabled={isPending}
                    required
                  />
                </div>
                {/* Login Button */}
                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logge ein...
                    </>
                  ) : (
                    'Login'
                  )}
                </Button>
              </div>
            </form>

            {/* Trenner (Optional, falls OAuth-Buttons folgen) */}
            {/* ... */}

            {/* OAuth Buttons (Optional) */}
            {/* ... */}
          </div>

          {/* Link zur Registrierung */}
          <p className="px-8 text-center text-sm text-muted-foreground">
            Noch kein Konto?{" "}
            <Link
              href="/signup" // oder /registrieren
              className="underline underline-offset-4 hover:text-primary"
            >
              Registrieren
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

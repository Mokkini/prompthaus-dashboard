// app/login/page.js
"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Import für "Registrieren"-Link hinzugefügt
import { login } from '../actions';

// Shadcn UI Komponenten
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Card wird im neuen Layout nicht mehr als Hauptcontainer verwendet, aber Alert schon
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from 'lucide-react';
// Ggf. Icons für OAuth Buttons (optional)
// import { Icons } from "@/components/icons" // Beispiel: Falls du Icons für Google/GitHub hast

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
        console.log("Action success, redirecting to:", result.redirectTo);
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
        {/* Logo oder Branding */}
        <div className="relative z-20 flex items-center text-lg font-medium">
          <svg /* Optional: Dein Logo SVG */ xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-6 w-6"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" /></svg>
          PromptHaus
        </div>
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
            {/*
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Oder weiter mit
                </span>
              </div>
            </div>
            */}

            {/* OAuth Buttons (Optional) */}
            {/*
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" type="button" disabled={isPending}>
                {isPending ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <Icons.gitHub className="mr-2 h-4 w-4" />)}{" "} GitHub
              </Button>
              <Button variant="outline" type="button" disabled={isPending}>
                 {isPending ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <Icons.google className="mr-2 h-4 w-4" />)}{" "} Google
              </Button>
            </div>
             */}
          </div>

          {/* Link zur Registrierung */}
          <p className="px-8 text-center text-sm text-muted-foreground">
            Noch kein Konto?{" "}
            {/* Passe den Link zur Registrierungsseite an! */}
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
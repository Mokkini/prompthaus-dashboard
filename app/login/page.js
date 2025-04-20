// app/login/page.js
"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { login } from '../actions';

// Shadcn UI Komponenten
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"; // Card importieren
import { AlertCircle, Loader2 } from 'lucide-react';

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
        router.push(result.redirectTo);
      } else {
        console.error("Action error:", result.message);
        setErrorMsg(result.message || 'Ein unbekannter Fehler ist aufgetreten.');
      }
    });
  };

  return (
    // --- NEUES LAYOUT: Zentrierter Container ---
    // Flexbox, zentriert Inhalt, minimale Höhe = Bildschirmhöhe, leichter Hintergrund
    <div className="flex items-center justify-center min-h-screen bg-muted/40 px-4 py-12">
      {/* Card als Rahmen, begrenzt die maximale Breite */}
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="space-y-1 text-center">
          {/* Logo über dem Titel */}
          <Link href="/" className="inline-block mb-4">
            <Image
              src="/prompthaus-logo.png" // Pfad zum Logo
              alt="PromptHaus Logo"
              width={150} // Breite anpassen
              height={38} // Höhe anpassen
              priority
            />
          </Link>
          <CardTitle className="text-2xl">Willkommen zurück</CardTitle>
          <CardDescription>
            Melde dich bei deinem PromptHaus Konto an.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {/* Fehlermeldung */}
          {errorMsg && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fehler</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}
          {/* Formular */}
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@beispiel.com"
                required
                disabled={isPending}
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Dein Passwort"
                required
                disabled={isPending}
              />
            </div>
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
          </form>
          {/* Optional: Trenner und OAuth könnten hier auch platziert werden */}
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
          {/* Link zur Registrierung */}
          <p className="text-center text-sm text-muted-foreground">
            Noch kein Konto?{" "}
            <Link
              href="/signup" // oder /registrieren
              className="underline underline-offset-4 hover:text-primary"
            >
              Registrieren
            </Link>
          </p>
          {/* Optional: Passwort vergessen Link */}
          {/* <Link href="/passwort-vergessen" className="text-sm underline underline-offset-4 text-muted-foreground hover:text-primary">
            Passwort vergessen?
          </Link> */}
        </CardFooter>
      </Card>
    </div>
    // --- ENDE NEUES LAYOUT ---
  );
}

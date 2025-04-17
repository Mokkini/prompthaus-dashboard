// app/login/page.js
"use client"; // Wichtig: Diese Komponente interagiert mit dem Nutzer -> Client Component

import { useState, useTransition } from 'react'; // useTransition hinzugefügt
import { useRouter } from 'next/navigation';
import { login } from '../actions'; // *** KORRIGIERTER IMPORT-PFAD ***

// Shadcn UI Komponenten für ein schöneres Formular (optional, aber empfohlen)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from 'lucide-react';


export default function LoginPage() {
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition(); // Für Ladezustand
  const router = useRouter();

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorMsg(''); // Fehler zurücksetzen

    const formData = new FormData(event.currentTarget); // Formulardaten holen

    startTransition(async () => {
      const result = await login(formData); // Rufe die Server Action auf

      if (result.success) {
        console.log("Action success, redirecting to:", result.redirectTo);
        router.push(result.redirectTo); // Leite zum Ziel aus der Action weiter
        // Optional: router.refresh(); // Um Server Components neu zu laden
      } else {
        console.error("Action error:", result.message);
        setErrorMsg(result.message || 'Ein unbekannter Fehler ist aufgetreten.');
      }
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Melde dich bei deinem PromptHaus Konto an.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
             {/* Fehlermeldung */}
            {errorMsg && (
                <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Fehler</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email" // Wichtig für FormData
                type="email"
                placeholder="m@beispiel.de"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                 id="password"
                 name="password" // Wichtig für FormData
                 type="password"
                 required
                 disabled={isPending}
               />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logge ein...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
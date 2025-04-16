// src/app/page.js - REFACTORED with Card and Logo (Double Check)

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import React from 'react';

export default async function DashboardStartPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin = user?.email === adminEmail;

  const logoUrl = "https://cdn.shopify.com/s/files/1/0891/4498/3817/files/Prompt_Haus__1920_x_500_px__fd-removebg-preview.png?v=1740509721";
  const logoWidth = 180;
  const logoHeight = Math.round(logoWidth * (500 / 1920));

  return (
    <div className="flex flex-col justify-center min-h-[calc(100vh-100px)] p-4">
       <Card className="w-full max-w-md mx-auto shadow-lg">
         <CardHeader className="items-center text-center pt-8">
            {/* Das Image-Tag ist ein einzelnes Kind hier */}
            <Image
              src={logoUrl}
              alt="PromptHaus Logo"
              width={logoWidth}
              height={logoHeight}
              priority
              className="mb-6"
            />
            {/* Das CardTitle-Tag ist ein weiteres einzelnes Kind */}
           <CardTitle className="text-2xl">
             Willkommen bei PromptHaus!
           </CardTitle>
           {/* Optional: <CardDescription>...</CardDescription> */}
         </CardHeader>
         <CardContent className="text-center space-y-4 pb-6">
            {/* Bedingtes p-Tag */}
           {user && (
             <p className="text-base">
               Hallo {user.email}!
             </p>
           )}
            {/* Weiteres p-Tag */}
           <p className="text-muted-foreground text-sm">
             Hier findest du deine erworbenen Prompt-Pakete und kannst neue generieren.
           </p>
         </CardContent>
         <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 pb-8">
            {/* Button 1: asChild erfordert genau ein Element-Kind (hier: Link) */}
           <Button asChild size="lg">
             <Link href="/meine-prompts">Zu meinen Prompts</Link>
           </Button>

            {/* Button 2 (Bedingt): Die Bedingung umschließt den gesamten Button */}
           {isAdmin && (
              // asChild hier erfordert auch genau ein Element-Kind (hier: Link)
             <Button variant="outline" asChild size="lg">
               <Link href="/admin/prompts">Zum Admin-Bereich</Link>
             </Button>
             // Kein Text oder anderes Element neben dem Button innerhalb von {isAdmin && (...)}
           )}
           {/* Kein Text oder anderes Element innerhalb von CardFooter */}
         </CardFooter>
       </Card>
     </div>
  );
}
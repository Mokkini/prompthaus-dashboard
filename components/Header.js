// components/Header.js - Mit Logo, verstecktem Titel und Image-Fix

import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { User, LogOut, Menu, Home } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardNav from './DashboardNav';
import { cn } from '@/lib/utils';

// Die Komponente akzeptiert jetzt den 'user' als Prop
export default function Header({ user }) {

  // Die Logout Server Action (unverändert)
  const handleLogout = async () => {
    'use server';
    const supabase = createClient();
    await supabase.auth.signOut();
    return redirect('/login');
  };

  return (
    <header className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-900 h-16">
      <div className="flex items-center gap-4">
        {/* Mobiler Menü-Button (Sheet Trigger) */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menü öffnen</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 flex flex-col bg-background">
             {/* --- SheetHeader mit Logo und verstecktem Titel --- */}
             <SheetHeader className="p-4 border-b">
                <SheetTitle className="sr-only">Hauptmenü</SheetTitle>
                <Link href="/" aria-label="Zur PromptHaus Startseite">
                    <Image
                        src="/prompthaus-logo.png"
                        alt="PromptHaus Logo"
                        width={128}
                        height={32}
                        priority
                        className="h-auto" // <-- Hinzugefügt für korrekte Skalierung
                    />
                </Link>
             </SheetHeader>
             {/* --- Ende Anpassung --- */}

             {/* Link zur Startseite (unverändert) */}
             <div className="p-2 border-b">
                <SheetClose asChild>
                    <Link
                        href="/"
                        className={cn(
                            "flex items-center w-full justify-start rounded-md px-3 py-2 text-sm font-medium",
                            "hover:bg-accent hover:text-accent-foreground",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        )}
                    >
                        <Home className="mr-2 h-4 w-4" />
                        Zur Startseite
                    </Link>
                </SheetClose>
             </div>

             {/* Hauptnavigation (unverändert) */}
             <div className="flex-grow overflow-y-auto">
                 <DashboardNav />
             </div>
          </SheetContent>
        </Sheet>

        {/* Titel (Desktop) */}
        <div className="text-lg font-semibold hidden md:block">
          PromptHaus Dashboard
        </div>
        {/* Logo (Mobile Header) */}
        <Link href="/" className="md:hidden">
             <Image
                 src="/prompthaus-logo.png"
                 alt="PromptHaus Logo"
                 width={120}
                 height={30}
                 className="h-auto" // <-- Hinzugefügt für korrekte Skalierung
             />
         </Link>

      </div>

      {/* User Dropdown (unverändert) */}
      {user && (
        <DropdownMenu>
           <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
              <span className="sr-only">Benutzermenü öffnen</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <span className="block text-sm font-medium">Mein Konto</span>
              <span className="block text-xs text-muted-foreground truncate">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/profil">Profil</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/einstellungen">Einstellungen</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={handleLogout}>
              <Button type="submit" variant="ghost" className="w-full text-left justify-start font-normal px-2 py-1.5 text-sm relative flex cursor-default select-none items-center rounded-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}

// components/Header.js
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { User, LogOut, Menu } from 'lucide-react';
import { createClient } from '@/lib/supabase/server'; // Wird nur für Server Action benötigt
import { redirect } from 'next/navigation';
import DashboardNav from './DashboardNav';

// Die Komponente akzeptiert jetzt den 'user' als Prop
export default function Header({ user }) {

  // Die Logout Server Action (unverändert)
  const handleLogout = async () => {
    'use server';
    const supabase = createClient();
    await supabase.auth.signOut();
    // Wichtig: return redirect leitet um NACHDEM die Action erfolgreich war
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
          <SheetContent side="left" className="p-0 flex flex-col">
             <div className="p-4 border-b">
               <h2 className="text-lg font-semibold">PromptHaus Menü</h2>
             </div>
             <div className="flex-grow overflow-y-auto">
                 <DashboardNav />
             </div>
          </SheetContent>
        </Sheet>

        {/* Titel */}
        <div className="text-lg font-semibold">
          PromptHaus Dashboard
        </div>
      </div>

      {/* User Dropdown - Nur rendern, wenn User vorhanden ist */}
      {user && ( // <-- RENDERT NUR WENN USER DA IST
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
              <span className="sr-only">Benutzermenü öffnen</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* Angepasstes Label mit E-Mail */}
            <DropdownMenuLabel>
              <span className="block text-sm font-medium">Mein Konto</span>
              {/* ZEIGT DIE E-MAIL AN */}
              <span className="block text-xs text-muted-foreground truncate">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/profil">Profil</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link href="/einstellungen">Einstellungen</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Logout Form */}
            <form action={handleLogout}>
              <Button type="submit" variant="ghost" className="w-full text-left justify-start font-normal px-2 py-1.5 text-sm relative flex cursor-default select-none items-center rounded-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-accent">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      )} {/* <-- ENDE BEDINGTES RENDERN */}
    </header>
  );
}
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // Sheet importiert
import { User, LogOut, Menu } from 'lucide-react'; // Menu Icon importiert
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardNav from './DashboardNav'; // Nav importiert

export default function Header() {

  // Die Logout Server Action (unverändert)
  const handleLogout = async () => {
    'use server';
    const supabase = createClient();
    await supabase.auth.signOut();
    return redirect('/login');
  };

  return (
    <header className="flex items-center justify-between p-4 border-b bg-white dark:bg-gray-900 h-16"> {/* Feste Höhe für Header */}
      <div className="flex items-center gap-4">
        {/* Mobiler Menü-Button (Sheet Trigger) - Nur auf kleinen Screens sichtbar */}
        <Sheet>
          <SheetTrigger asChild>
            {/* 'md:hidden' blendet den Button auf mittleren und größeren Screens aus */}
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menü öffnen</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 flex flex-col"> {/* Padding entfernt & flex für Nav */}
             {/* Hier die gleiche Navigation wie in der Sidebar */}
             {/* Ggf. Logo/Titel auch hier hinzufügen */}
             <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">PromptHaus Menü</h2>
             </div>
             <div className="flex-grow overflow-y-auto">
                 <DashboardNav />
             </div>
          </SheetContent>
        </Sheet>

        {/* Titel - auf allen Screens sichtbar */}
        <div className="text-lg font-semibold">
          PromptHaus Dashboard
        </div>
      </div>

      {/* User Dropdown (unverändert) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
            <span className="sr-only">Benutzermenü öffnen</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Inhalt des Dropdowns (unverändert) */}
          <DropdownMenuLabel>Mein Konto</DropdownMenuLabel>
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
    </header>
  );
}
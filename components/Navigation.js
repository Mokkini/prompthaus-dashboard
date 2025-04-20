// components/Navigation.js
'use client';

import Link from 'next/link';
import Image from 'next/image';
// SheetHeader und SheetTitle importieren
import { Sheet, SheetTrigger, SheetContent, SheetClose, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';

export default function Navigation({ user }) {
  const pathname = usePathname();

  // Scroll-Links für Homepage (OHNE Themenpakete)
  const scrollLinks = [
    { href: '#hero', label: 'Start' },
    { href: '#how', label: "So funktioniert's" },
  ];

  // Separate Links für dedizierte Seiten
  const pageLinks = [
    { href: '/pakete', label: 'Themenpakete' },
    { href: '/kategorien', label: 'Kategorien' },
  ];

  // Hilfsfunktion für Scroll-Links (bleibt gleich)
  const getScrollLinkHref = (hash) => {
    return pathname === '/' ? hash : `/${hash}`;
  };

  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <nav className="container mx-auto flex justify-between px-4">
        {/* Logo */}
        <Link href="/" className="py-2">
          <Image
            src="/prompthaus-logo.png"
            alt="PromptHaus Logo"
            width={120}
            height={40}
            className="object-contain"
            priority
          />
        </Link>

        {/* Desktop‑Links */}
        <nav className="hidden md:flex gap-6 text-sm font-medium py-2">
          {/* Scroll Links */}
          {scrollLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={getScrollLinkHref(href)}
              className="hover:text-primary transition-colors self-center"
            >
              {label}
            </Link>
          ))}
          {/* Page Links */}
          {pageLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hover:text-primary transition-colors self-center"
            >
              {label}
            </Link>
          ))}
          {/* User/Login Button */}
          <div className="self-center">
            {user ? (
              <Link href="/meine-prompts">
                <Button size="sm" variant="default">Mein Bereich</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="sm" variant="ghost">Login</Button>
              </Link>
            )}
          </div>
        </nav>

        {/* Mobile‑Hamburger + Drawer */}
        <div className="md:hidden flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <button>
                <Menu className="w-6 h-6" />
              </button>
            </SheetTrigger>
             <SheetContent side="right" className="p-6 w-[280px] sm:w-[320px]">
                 {/* --- NEU: SheetHeader und SheetTitle für Zugänglichkeit --- */}
                 <SheetHeader className="sr-only"> {/* Versteckt den Header visuell */}
                   <SheetTitle>Hauptmenü</SheetTitle>
                   {/* Optional: <SheetDescription>Navigation für die Webseite</SheetDescription> */}
                 </SheetHeader>
                 {/* --- ENDE NEU --- */}

                 {/* Der Standard-Schließen-Button von SheetContent wird angezeigt */}

                 {/* Navigation im Drawer */}
                 {/* mt-6 entfernt, da der Standard-Schließen-Button oben ist */}
                 <nav className="flex flex-col space-y-4">
                   {/* Scroll Links */}
                   {scrollLinks.map(({ href, label }) => (
                     <SheetClose asChild key={href}>
                       <Link
                         href={getScrollLinkHref(href)}
                         className="text-lg hover:text-primary transition-colors block py-1"
                       >
                         {label}
                       </Link>
                     </SheetClose>
                   ))}
                   {/* Page Links */}
                   {pageLinks.map(({ href, label }) => (
                     <SheetClose asChild key={href}>
                       <Link
                         href={href}
                         className="text-lg hover:text-primary transition-colors block py-1"
                       >
                         {label}
                       </Link>
                     </SheetClose>
                   ))}

                   {/* User/Login Button */}
                   <div className="pt-6 border-t mt-4">
                     {user ? (
                       <SheetClose asChild>
                         <Link href="/meine-prompts" className="block w-full">
                           <Button size="sm" variant="default" className="w-full">Mein Bereich</Button>
                         </Link>
                       </SheetClose>
                     ) : (
                       <SheetClose asChild>
                         <Link href="/login" className="block w-full">
                           <Button size="sm" variant="ghost" className="w-full">Login</Button>
                         </Link>
                       </SheetClose>
                     )}
                   </div>
                 </nav>
             </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

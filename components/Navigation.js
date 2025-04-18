// components/Navigation.js
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Sheet, SheetTrigger, SheetContent, SheetClose } from '@/components/ui/sheet';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
// *** NEUER IMPORT ***
import { usePathname } from 'next/navigation';

export default function Navigation({ user }) {
  // *** AKTUELLEN PFAD ERMITTELN ***
  const pathname = usePathname();

  // Bestehende Links für Homepage-Scrolling
  const scrollLinks = [
    { href: '#hero', label: 'Start' },
    { href: '#how', label: "So funktioniert's" },
    { href: '#pakete', label: 'Themenpakete' },
  ];

  // Neuer Link für die Kategorieseite
  const categoryLink = { href: '/kategorien', label: 'Kategorien' }; // Oder 'Themen'

  // Hilfsfunktion, um den korrekten Href für Scroll-Links zu generieren
  const getScrollLinkHref = (hash) => {
    // Wenn wir auf der Homepage sind ('/'), nur den Hash verwenden.
    // Sonst den Pfad zur Homepage + Hash verwenden.
    return pathname === '/' ? hash : `/${hash}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto h-14 flex justify-between items-center px-4">
        {/* Logo oben links */}
        <Link href="/">
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
        <div className="hidden md:flex items-center space-x-6">
          {scrollLinks.map(({ href, label }) => (
            <Link
              key={href}
              // *** ANGEPASSTER HREF ***
              href={getScrollLinkHref(href)}
              className="hover:text-primary transition-colors"
            >
              {label}
            </Link>
          ))}
          <Link
             key={categoryLink.href}
             href={categoryLink.href}
             className="hover:text-primary transition-colors"
          >
            {categoryLink.label}
          </Link>

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

        {/* Mobile‑Hamburger + Drawer */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="md:hidden">
              <Menu className="w-6 h-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="p-6 w-[280px] sm:w-[320px]">
            <div className="flex justify-end mb-6">
              <SheetClose asChild>
                <button>
                  <X className="w-6 h-6" />
                </button>
              </SheetClose>
            </div>
            <nav className="flex flex-col space-y-4">
              {scrollLinks.map(({ href, label }) => (
                <SheetClose asChild key={href}>
                  <Link
                    // *** ANGEPASSTER HREF ***
                    href={getScrollLinkHref(href)}
                    className="text-lg hover:text-primary transition-colors block py-1"
                  >
                    {label}
                  </Link>
                </SheetClose>
              ))}
              <SheetClose asChild key={categoryLink.href}>
                <Link
                   href={categoryLink.href}
                   className="text-lg hover:text-primary transition-colors block py-1"
                >
                  {categoryLink.label}
                </Link>
              </SheetClose>

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
      </nav>
    </header>
  );
}
// components/ThemeProvider.js
"use client"; // Diese Komponente MUSS eine Client Component sein

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children, ...props }) {
  return (
    <NextThemesProvider
      attribute="class" // Wichtig für Tailwind: Theme wird über class (<html> oder <body>) gesteuert
      defaultTheme="system" // Standard-Theme ist das System-Theme
      enableSystem // Erlaube die Nutzung des System-Themes
      disableTransitionOnChange // Verhindert Flackern beim Theme-Wechsel mit bestimmten Komponenten
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
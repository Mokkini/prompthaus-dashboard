// components/ui/scroll-area.js - ANGEPASST
"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

// Destrukturiere viewportRef aus den Props
const ScrollArea = React.forwardRef(({ className, children, viewportRef, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref} // Dieser Ref ist für das Root-Element
    className={cn("relative overflow-hidden", className)}
    {...props} // Übergib die restlichen Props (ohne viewportRef) an Root
  >
    {/* Übergib viewportRef spezifisch an die Viewport-Komponente */}
    <ScrollAreaPrimitive.Viewport
      ref={viewportRef}
      className="h-full w-full rounded-[inherit]"
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollAreaPrimitive.Scrollbar
      className="flex touch-none select-none transition-colors h-full w-2.5 border-l border-l-transparent p-[1px]"
      orientation="vertical" // Explizite Orientierung ist guter Stil
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border" />
    </ScrollAreaPrimitive.Scrollbar>
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

// Der Export bleibt gleich
export { ScrollArea }

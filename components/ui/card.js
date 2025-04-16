// components/ui/card.js - KORRIGIERTE JAVASCRIPT VERSION

import * as React from "react"

import { cn } from "@/lib/utils"

// Diese Funktion war bereits korrekt
function Card({ className, ...props }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        className
      )}
      {...props}
    />
  )
}

// Korrigiert: ': React.ComponentProps<"div">' entfernt
function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

// Korrigiert: ': React.ComponentProps<"div">' entfernt
function CardTitle({ className, ...props }) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

// Korrigiert: ': React.ComponentProps<"div">' entfernt
function CardDescription({ className, ...props }) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

// Korrigiert: ': React.ComponentProps<"div">' entfernt
// Hinweis: CardAction ist manchmal nicht Teil der Standard-Card von shadcn/ui,
// aber wir korrigieren es, da es in deinem Code war.
function CardAction({ className, ...props }) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

// Korrigiert: ': React.ComponentProps<"div">' entfernt
function CardContent({ className, ...props }) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

// Korrigiert: ': React.ComponentProps<"div">' entfernt
function CardFooter({ className, ...props }) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

// Die Exporte bleiben unverändert
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction, // Beibehalten, da es in deinem Code war
  CardDescription,
  CardContent,
}
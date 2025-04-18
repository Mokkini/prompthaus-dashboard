'use client'

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AnimatedHero() {
  return (
    <section className="relative py-24 md:py-32 lg:py-40 text-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-background">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        viewport={{ once: true }}
        className="container mx-auto px-4 z-10 relative"
      >
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 leading-tight">
          Texte, die für dich sprechen – ganz ohne KI-Wissen
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Fertige Textvorlagen für jede Lebenslage. Sofort einsatzbereit, individuell anpassbar – ganz ohne ChatGPT oder Abo.
        </p>
        <div className="flex justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="#demo" title="Teste einen echten Text – ohne Registrierung">Kostenlos testen</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#pakete">Alle Pakete ansehen</Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* eventuell vorhandene config options hier bleiben erhalten */

  // HIER WIRD DIE KONFIGURATION FÜR next/image EINGEFÜGT:
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com', // Der Hostname deines Logos
        port: '', // Standardports (leer lassen)
        pathname: '/s/files/**', // Erlaubt alle Bildpfade unter /s/files/
      },
      // Hier kannst du weitere Hostnames hinzufügen, falls nötig
    ],
  },

  // Andere Konfigurationen hier können bleiben
};

export default nextConfig;
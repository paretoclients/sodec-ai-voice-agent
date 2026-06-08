import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SODEC - Employé numérique bancaire",
  description: "Tableau de bord exécutif pour les agents vocaux IA SODEC Gabon"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

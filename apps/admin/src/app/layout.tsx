import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SODEC AI Voice Agent",
  description: "Admin dashboard for the SODEC Gabon AI voice agent demo"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}


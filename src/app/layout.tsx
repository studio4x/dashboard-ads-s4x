import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Dashboard ADS S4X",
    template: "%s | Dashboard ADS S4X",
  },
  description:
    "Plataforma de dashboards executivos para tráfego pago — Google Ads, Meta Ads, GA4 e Search Console.",
  keywords: ["dashboard", "tráfego pago", "google ads", "meta ads", "analytics"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}

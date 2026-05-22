import type { Metadata } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";

import { AuthProvider } from "@/context/AuthContext";
import { FirebaseBootstrap } from "@/components/shared/firebase-bootstrap";

import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://affiliates.cree.eco"),
  title: {
    default: "GreWeCo Affiliates",
    template: "%s · GreWeCo Affiliates",
  },
  description:
    "GreWeCo affiliate platform — track performance, share your referral link, and grow with cree.eco.",
  openGraph: {
    title: "GreWeCo Affiliates",
    description: "Cyber-Noir affiliate workspace for cree.eco partners.",
    url: "https://affiliates.cree.eco",
    siteName: "GreWeCo Affiliates",
    locale: "en_US",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="noir-grid min-h-full font-sans">
        <AuthProvider>
          <FirebaseBootstrap>{children}</FirebaseBootstrap>
        </AuthProvider>
      </body>
    </html>
  );
}

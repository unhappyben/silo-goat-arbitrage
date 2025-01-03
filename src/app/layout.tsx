// layout.tsx
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const dmSans = DM_Sans({ 
  subsets: ["latin"],
  weight: ['400', '500', '700'],
  variable: '--font-dm-sans',
});

export const metadata: Metadata = {
  title: "Silo x Goat Arbitrage Calculator",
  description: "Calculate yield opportunities between Silo Finance and Goat Fi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} font-sans`}>
        <main className="min-h-screen bg-shale-900 py-12 px-4">
          <div className="container mx-auto">
            {children}
          </div>
        </main>
        <Analytics />
      </body>
    </html>
  );
}
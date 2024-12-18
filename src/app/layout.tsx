import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        <main className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="container mx-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}

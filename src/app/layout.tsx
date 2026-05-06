import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AccountProvider } from "@/context/AccountContext";
import { PeriodProvider } from "@/context/PeriodContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "InstaMetrics — Dashboard Analytics",
  description: "Dashboard de analytics premium para criadores de conteúdo do Instagram",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased bg-bg`}>
        <AccountProvider>
          <PeriodProvider>
            {children}
          </PeriodProvider>
        </AccountProvider>
      </body>
    </html>
  );
}

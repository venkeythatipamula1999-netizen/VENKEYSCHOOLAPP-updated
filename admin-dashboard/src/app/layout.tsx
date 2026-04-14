// src/app/layout.tsx
import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { AdminProvider } from "@/context/AdminContext";
import ErrorBoundary     from "@/components/ErrorBoundary";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300","400","500","600","700","800"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400","600"],
});

export const metadata: Metadata = {
  title: "Vidhaya Layam — Super Admin",
  description: `Super Admin Dashboard · ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`,
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrains.variable}`}>
      <body className="font-sans bg-slate-100 text-navy antialiased">
        <ErrorBoundary>
          <AdminProvider>
            {children}
          </AdminProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

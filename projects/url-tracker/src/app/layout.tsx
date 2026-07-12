import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TRPCReactProvider } from "@/trpc/client";
import { ToastProvider } from "@/lib/toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "URL Tracker",
  description: "Track any data from any web page with custom CSS selectors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} style={{ backgroundColor: 'var(--background)' }}>
      <body className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)' }}>
        <TRPCReactProvider>
          <ToastProvider>
            <div style={{ minHeight: '100dvh', backgroundColor: 'var(--background)' }}>
              {children}
            </div>
          </ToastProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}

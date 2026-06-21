import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
// @ts-ignore
import "./globals.css";
import Header from "@/components/layout/Header";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const headingFont = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Compass LMS - Premium Student Management",
  description: "Advanced learning management system for university admissions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="ja">
        <body className={`${inter.variable} ${headingFont.variable} font-sans antialiased bg-slate-50 min-h-screen flex flex-col`}>
          <Header />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}

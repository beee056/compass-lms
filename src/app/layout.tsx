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
  title: "Scholor Compass | 総合型選抜指導管理システム",
  description: "生徒の志望校、提出書類、面談タスクを統合管理する伴走型指導プラットフォーム",
  openGraph: {
    title: "Scholor Compass | 総合型選抜指導管理システム",
    description: "生徒の志望校、提出書類、面談タスクを統合管理する伴走型指導プラットフォーム",
    url: "https://compass-lms-5wkf.vercel.app",
    siteName: "Scholor Compass",
    images: [
      {
        url: "https://compass-lms-5wkf.vercel.app/ogp-image.png",
        width: 1200,
        height: 630,
        alt: "Scholor Compass - 総合型選抜指導管理システム"
      }
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Scholor Compass | 総合型選抜指導管理システム",
    description: "生徒の志望校、提出書類、面談タスクを統合管理する伴走型指導プラットフォーム",
    images: ["https://compass-lms-5wkf.vercel.app/ogp-image.png"],
  }
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

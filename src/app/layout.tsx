import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Compass LMS",
  description: "統合学習支援LMS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-slate-50/50 text-slate-900 min-h-screen`}>
        <Header />
        <main className="mx-auto max-w-[1400px] p-6">
          {children}
        </main>
      </body>
    </html>
  );
}

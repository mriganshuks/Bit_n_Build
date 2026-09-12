import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "PRAMAAN",
  description: "Skill verification and trusted hackathon team discovery",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="flex min-h-full flex-col">
          <header className="border-b border-stone-300">
            <div className="mx-auto flex h-14 w-full max-w-2xl items-center px-6">
              <Link
                href="/"
                className="text-sm font-semibold tracking-[0.14em] text-stone-900"
              >
                PRAMAAN
              </Link>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

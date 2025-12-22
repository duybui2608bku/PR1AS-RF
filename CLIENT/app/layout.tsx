import type { Metadata } from "next";
import { Outfit, Work_Sans } from "next/font/google";
import "./globals.scss";
import { Providers } from "@/lib/providers";
import "@/i18n/config";

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PR1AS Application",
  description: "PR1AS Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${workSans.variable} ${outfit.variable} antialiased`}
        style={{ fontFamily: "var(--font-work-sans)" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

export const metadata: Metadata = {
  title: "MultiSocial AutoTool — Кросс-постинг и автоворонки комментариев",
  description:
    "SaaS-платформа для автоматизации кросс-платформенного постинга и Comment-to-DM воронок в Instagram и YouTube.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark">
      <body className="antialiased bg-[#090d16] text-slate-100 min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

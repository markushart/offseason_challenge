import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Offseason Challenge",
  description: "Team-Wettkampf-Dashboard fuer Trainingspunkte in der Offseason.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

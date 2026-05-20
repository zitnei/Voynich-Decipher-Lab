import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voynich Decipher Lab",
  description: "AI-assisted Voynich manuscript analysis and reproducible hypothesis testing."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

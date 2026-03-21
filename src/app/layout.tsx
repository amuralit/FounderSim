import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FounderSim — From idea to investor-ready",
  description: "5 AI agents research your market, design your product, write the code, and deploy it — while you watch and steer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

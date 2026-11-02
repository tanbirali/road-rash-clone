import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Throttle Brawl",
  description: "A tiny pseudo-3D motorcycle combat racer built with Phaser + Next.js",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

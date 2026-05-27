import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitStar - GitHub Project Discovery",
  description: "Discover trending and interesting GitHub projects",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Video Research Study",
  description: "A participant flow for evaluating AI versus real video content.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

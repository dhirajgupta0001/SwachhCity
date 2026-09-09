import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "SwachhCity | Smart Waste Management",
  description: "A modern civic-tech platform for cleaner cities. Report waste, schedule pickups, and improve urban cleanliness.",
  keywords: ["waste management", "municipal", "civic tech", "complaints", "swachh", "smart city"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

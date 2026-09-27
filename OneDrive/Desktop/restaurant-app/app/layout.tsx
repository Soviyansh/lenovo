import type { Metadata } from "next";
import "./globals.css";
import CustomerNavigation from "@/components/CustomerNavigation";
import TrackOrderPopup from "@/components/TrackOrderPopup";

export const metadata: Metadata = {
  title: "Your Restaurant | Fresh Chinese & More",
  description:
    "Fresh Chinese food and more, prepared with bold flavours and delivered hot to your door.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <CustomerNavigation />
        <TrackOrderPopup />
      </body>
    </html>
  );
}
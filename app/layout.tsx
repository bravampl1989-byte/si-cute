import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "SI CUTE",
  description:
    "Sistem Cuti Elektronik Pengadilan Agama Sampang sesuai ketentuan cuti yang berlaku.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

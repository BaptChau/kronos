// frontend-owner/app/layout.tsx
import type { Metadata } from "next";
import { ReactNode } from "react";

import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Kronos · Owner console",
  description: "Manage companies and admins.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/components/shared/query-provider";

export const metadata: Metadata = {
  title: "CRM Exponencial",
  description: "CRM Exponencial",
  // Declarado aqui (e não por src/app/favicon.ico, que entra em toda página) para a
  // vitrine da loja poder trocar pelo ícone da própria loja (B16-08).
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

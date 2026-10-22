import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/shared/query-provider";
import { COOKIE_TEMA, temaValido } from "@/lib/tema";

// B36-01: fontes da linguagem Caderno, servidas pelo próprio app.
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

export const metadata: Metadata = {
  // QA baixos (06/10): cada tela põe o próprio nome na aba.
  title: { default: "crmatacado exp", template: "%s · crmatacado exp" },
  description: "crmatacado exp",
  // Declarado aqui (e não por src/app/favicon.ico, que entra em toda página) para a
  // vitrine da loja poder trocar pelo ícone da própria loja (B16-08).
  icons: { icon: "/favicon.ico" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // B36-01: o servidor já manda o <html> no tema escolhido (cookie gravado no login e
  // na troca de tema), para a tela não piscar o outro tema antes.
  const tema = temaValido((await cookies()).get(COOKIE_TEMA)?.value);
  const classes = ["h-full antialiased", plexSans.variable, plexMono.variable, tema === "escuro" ? "dark" : ""];

  return (
    <html lang="pt-BR" className={classes.filter(Boolean).join(" ")} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

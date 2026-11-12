"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { COOKIE_TEMA, temaValido, type Tema } from "@/lib/tema";
import "./globals.css";

// B55: último recurso quando o próprio layout raiz quebra. Precisa desenhar <html> e
// <body> sozinho, por isso não usa os componentes do app.
// B56: segue o tema da pessoa, pelo mesmo cookie que o layout raiz lê, com as cores do
// globals.css. O servidor manda no claro; o navegador troca a classe ao montar.
function temaDoCookie(): Tema {
  if (typeof document === "undefined") return temaValido(null);
  const valor = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_TEMA}=`))
    ?.split("=")[1];
  return temaValido(valor);
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", temaDoCookie() === "escuro");
  }, []);

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="m-0 min-h-screen bg-background font-sans text-foreground antialiased">
        <main className="flex min-h-screen items-center justify-center px-4 text-center">
          <div className="max-w-[420px]">
            <p className="text-sm text-muted-foreground">Algo deu errado</p>
            <h1 className="my-2 text-[26px] font-semibold leading-tight">Não foi possível abrir esta página</h1>
            <p className="text-sm text-muted-foreground">O erro já foi registrado. Tente de novo em instantes.</p>
            <button
              type="button"
              onClick={reset}
              className="mt-4 h-10 cursor-pointer rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Tentar de novo
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}

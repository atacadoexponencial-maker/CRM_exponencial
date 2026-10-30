"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// B55: último recurso quando o próprio layout raiz quebra. Precisa desenhar <html> e
// <body> sozinho, por isso não usa os componentes do app.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 16px",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <p style={{ fontSize: 14, color: "#6b7280" }}>Algo deu errado</p>
            <h1 style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.2, margin: "8px 0" }}>
              Não foi possível abrir esta página
            </h1>
            <p style={{ fontSize: 14, color: "#6b7280" }}>
              O erro já foi registrado. Tente de novo em instantes.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                marginTop: 16,
                height: 40,
                padding: "0 16px",
                borderRadius: 8,
                border: 0,
                background: "#111827",
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Tentar de novo
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}

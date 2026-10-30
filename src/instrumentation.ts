import * as Sentry from "@sentry/nextjs";

// B55: o Next chama register() uma vez por runtime ao subir o servidor.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Todo erro não tratado de requisição no servidor vai para o Sentry.
export const onRequestError = Sentry.captureRequestError;

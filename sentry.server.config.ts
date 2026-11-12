import * as Sentry from "@sentry/nextjs";

// B55: Sentry no servidor Node (Server Actions, rotas de API, webhooks, crons).
Sentry.init({
  dsn: process.env.SENTRY_DSN,

  environment: process.env.VERCEL_ENV ?? "development",

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Valores das variáveis locais em cada quadro da pilha.
  includeLocalVariables: true,
});

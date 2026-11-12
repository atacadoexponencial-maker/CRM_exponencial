import * as Sentry from "@sentry/nextjs";

// B55: Sentry no navegador. Erros, tracing e session replay (só em sessão com erro,
// e com texto e mídia mascarados por padrão).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",

  // 100% em desenvolvimento, 10% em produção.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  // Replay: nenhuma sessão comum, 100% das sessões com erro.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [Sentry.replayIntegration()],
});

// Navegações do App Router viram spans.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

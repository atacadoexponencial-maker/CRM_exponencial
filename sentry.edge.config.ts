import * as Sentry from "@sentry/nextjs";

// B55: Sentry no runtime Edge (o porteiro em src/middleware.ts).
Sentry.init({
  dsn: process.env.SENTRY_DSN,

  environment: process.env.VERCEL_ENV ?? "development",

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});

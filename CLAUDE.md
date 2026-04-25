# CLAUDE.md

## Commands

```bash
npm run dev          # Dev server na porta 3000
npm run build        # Build de produção
npm run lint         # ESLint
npm run test         # Rodar testes uma vez (Vitest)
npm run test:watch   # Rodar testes em watch mode
```

Para rodar um único arquivo de teste:
```bash
npx vitest run src/test/example.test.ts
```

E2E usa Playwright (`playwright.config.ts`).

## Architecture

**crm-exponencial** is a web application built with Next.js 15 (App Router), TypeScript, and Supabase.

### Routing & Layout

`src/app/` defines all routes via Next.js App Router. Unauthenticated users are redirected to `/login` by the middleware. Protected routes live inside `src/app/(auth)/`.

### State Management

- **Server state**: TanStack React Query for all Supabase data fetching, caching, and mutations.
- **UI state**: Local `useState` only — no global state library.

### Backend (Supabase)

- **Database**: PostgreSQL with RLS policies.
- **Auth**: Supabase Auth managed via SSR cookies (middleware handles redirect).
- **Types**: `src/integrations/supabase/types.ts` is auto-generated — do not edit manually.
- **Migrations**: `supabase/migrations/` — add new `.sql` files for schema changes.

### Key Directories

- `src/app/` — Next.js routes (App Router)
- `src/components/ui/` — shadcn/ui primitives (do not modify generated components)
- `src/components/shared/` — reusable app components
- `src/hooks/` — custom React hooks
- `src/lib/` — shared utilities and constants
- `src/integrations/supabase/` — Supabase clients and auto-generated types

### UI

Components use **shadcn/ui** (Radix UI + Tailwind CSS). Icons use **Lucide React**. Forms use **React Hook Form + Zod**.

The UI is in **Portuguese (pt-BR)**.

## Workflow

Use always in this order: `/spec` → `/break` → `/plan` → `/execute`

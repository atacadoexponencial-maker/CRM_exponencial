# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**CRM Exponencial** é um CRM para atacadistas voltado ao método de vendas exponencial. O sistema é projetado para empresas que vendem via WhatsApp, com times separados de **Entrada** (prospecção de clientes novos) e **Recompra** (cliente que já comprou). É uma aplicação **multi-tenant**: cada empresa (workspace) tem seus próprios usuários, times e números de WhatsApp isolados por RLS.

### Módulos previstos

- **Módulo 0 — Fundação** ✅ *concluído*: multi-tenant, papéis (Admin/Gerente/Atendente), times, números WhatsApp
- **Módulo 1 — Chat** ✅ *concluído*: Chat WhatsApp (API Oficial Meta), caixa de entrada, envio de mídia, etiquetas, mensagens rápidas
- **Módulo 2 — Pipeline** ✅ *concluído*: funis Entrada e Recompra
- **Módulo 3 — Contatos** ✅ *concluído*
- **Módulo 5 — Dashboard** ✅ *concluído*
- **Automações** ✅ *concluído*: fluxo de blocos, com gatilho, condições com saídas sim e não, e ações (`/configuracoes/automacoes`). É a v2, série B11, no ar desde 08/10/2026 (spec em `docs/specs-arquivadas/spec-automacoes-v2.md`). A v1 (gatilho → ação, estilo Kommo) foi substituída por ela.
- **Módulo 4 — Agenda e alertas** ✅ *concluído*: agenda do vendedor e central de alertas. As sequências automáticas saíram na B28-06: o que elas faziam, a automação faz com o bloco "esperar" e a ação "criar lembrete na Agenda"
- **Módulo 7 — Campanhas** ✅ *concluído*: disparos em massa segmentados com relatório de entrega
- **Módulo 6 — Grupos** ❌ *bloqueado*: a API oficial da Meta não suporta grupos de WhatsApp (ver `pre-desenvolvimento/bloqueado/avaliacao-modulo-6-grupos.md`)

### Status atual

O app está em **produção no Vercel** em `https://crmatacadoexp.com` (domínio próprio desde 29/10/2026; o DNS fica na HostGator e o `www` redireciona para ele). O endereço antigo, `https://crm-exponencial.vercel.app`, continua no ar: a análise do app da Meta e os números já conectados ao gateway ainda usam ele. O schema Supabase está criado e todas as queries/mutations são reais. Os módulos 0, 1 e 2 estão completamente implementados com backend real.

### Deploy e variáveis de ambiente

O app está deployado no Vercel. **Todas as variáveis de ambiente já estão configuradas no Vercel** — não é necessário perguntar ou configurar novamente:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase
- `NEXT_PUBLIC_META_APP_ID` / `NEXT_PUBLIC_META_CONFIG_ID` / `META_APP_SECRET` — Meta WhatsApp API
- `WHATSAPP_VERIFY_TOKEN` — validação do webhook Meta
- `META_TEST_ACCESS_TOKEN` — token temporário do número de teste Meta (expira em 24h)
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_AUTH_TOKEN` — Sentry (B55): erros e tracing; o token sobe os source maps no build

### Bancos de dados

São dois projetos Supabase separados (B46, desde 28/10/2026):

| Banco | Projeto | Quem usa |
|---|---|---|
| **Produção** | `lvlypfvqnfgahihxdosn` (us-west-2) | o site no ar, os clientes, os testes com chip e os roteiros que mandam mensagem de verdade (B11-05 e B11-07) |
| **Teste** | `cxqdiqhcvdecujlxthmd` (us-east-1, plano grátis, organização "crm-exponencial-teste") | o preview da Vercel de qualquer branch, os testes do Vitest e os roteiros de tela de `e2e/preview/` |

- **Arquivos de ambiente:** o `.env.local` aponta para a produção (o `npm run dev`
  local também). O `.env.teste.local` guarda o banco de teste. Os dois ficam fora
  do git; quem não tiver o `.env.teste.local` deve pedir à Marcelle ou ao Luan.
- **Vitest:** põe o Supabase do `.env.teste.local` por cima do `.env.local` e se
  recusa a rodar contra a produção ("os testes de integração só rodam no banco
  de teste"). Sem o `.env.teste.local`, nenhum teste roda.
- **Migration nova:** primeiro `npm run db:teste:push` (aplica no banco de
  teste) e os testes da série; só depois `npx supabase db push --linked`
  (produção).
- **Banco de teste acordado:** o plano grátis pausa o projeto depois de 7 dias
  sem uso. O GitHub Actions ("Banco de teste acordado") entra nele uma vez por
  dia. Se ele aparecer pausado, reative no painel do Supabase.

### Empresa de teste

Existe uma empresa só para testes: **"[TESTE] Automações B11"**. Ela existe nos
dois bancos: no de teste, para o preview e os roteiros de tela, recriável pelo
`criar-empresa-teste.cjs` e pelo `resetar-empresa-teste.cjs`; na produção, só
para os testes com chip e os roteiros de envio. A da produção fica de vez: não
apague.

- **Login:** `B11_TESTE_EMAIL`, `B11_TESTE_SENHA` e `B11_TESTE_WORKSPACE_ID`, no
  `.env.teste.local` (banco de teste) e no `.env.local` (produção), fora do git.
  Quem não tiver deve pedir à Marcelle ou ao Luan.
- **Dados:** contatos com telefone falso, nenhum número de WhatsApp conectado.
- **Roteiros:** os testes automáticos pela tela ficam em `e2e/preview/` e só
  gravam em empresa cujo nome começa com `[TESTE]`. `resetar-empresa-teste.cjs`
  volta a empresa ao estado inicial. Como usar, o que ela tem e como testar
  envio de verdade: `e2e/preview/README.md`.

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

Aplicação Next.js 15 (App Router), TypeScript, Supabase.

### Routing & Layout

`src/app/` define todas as rotas. Usuários não autenticados são redirecionados para `/login` pelo middleware. Rotas protegidas ficam em `src/app/(auth)/`.

Rotas existentes:
- `/login` — login com Supabase Auth
- `/cadastro` — cadastro de empresa (cria workspace, admin e times padrão)
- `/politica-de-privacidade` — página pública
- `/termos-de-servico` — página pública
- `/(auth)/dashboard` — dashboard de métricas (todos os papéis; atendente vê só as próprias)
- `/(auth)/dashboard/performance` — performance por vendedor (Admin/Gerente)
- `/(auth)/chat` — caixa de entrada + conversa WhatsApp (tempo real)
- `/(auth)/pipeline` — funil Entrada
- `/(auth)/pipeline/recompra` — funil Recompra (`/pipeline/retencao` redireciona para cá)
- `/(auth)/agenda` — agenda do vendedor (lembretes de automação + follow-ups)
- `/(auth)/agenda/equipe` — agenda da equipe (Admin/Gerente)
- `/(auth)/alertas` — central de alertas com limiares configuráveis
- `/(auth)/campanhas` — lista de campanhas (Admin/Gerente)
- `/(auth)/campanhas/[id]` — editor de campanha em 3 etapas (`nova` para criar)
- `/(auth)/campanhas/[id]/relatorio` — relatório de entrega da campanha
- `/(auth)/contatos` — listagem de contatos
- `/(auth)/contatos/[id]` — perfil do contato
- `/(auth)/perfil` — perfil do usuário logado
- `/(auth)/configuracoes/usuarios` — gestão de usuários
- `/(auth)/configuracoes/times` — gestão de times
- `/(auth)/configuracoes/whatsapp` — conexão WhatsApp (Embedded Signup Meta)
- `/(auth)/configuracoes/etiquetas` — gestão de etiquetas
- `/(auth)/configuracoes/mensagens-rapidas` — gestão de mensagens rápidas
- `/(auth)/configuracoes/templates` — templates de mensagem da Meta
- `/(auth)/configuracoes/automacoes` — automações em fluxo: lista, editor em `[id]` (`nova` para criar) e histórico em `historico`

### Domain Model

| Entidade | Descrição |
|----------|-----------|
| `workspaces` | Empresa cadastrada (isolamento multi-tenant) |
| `users` | Usuários com papel: Admin, Gerente ou Atendente |
| `teams` | Times da empresa: Entrada e Recompra (padrão) + customizados |
| `user_teams` | Associação N:N entre usuários e times |
| `whatsapp_connections` | Números WhatsApp conectados |

### State Management

- **Server state**: TanStack React Query para fetching, cache e mutations.
- **UI state**: `useState` local — sem biblioteca global.

### Backend (Supabase)

- **Database**: PostgreSQL com RLS (Row Level Security) para isolamento por workspace.
- **Auth**: Supabase Auth via SSR cookies — o middleware gerencia o redirecionamento.
- **Types**: `src/integrations/supabase/types.ts` é auto-gerado (`supabase gen types typescript --linked`) — não editar.
- **Migrations**: adicionar novos `.sql` em `supabase/migrations/`. Aplique primeiro no banco de teste (`npm run db:teste:push`) e só depois na produção (`npx supabase db push --linked`); veja "Bancos de dados".
- **Server Actions**: lógica backend fica em arquivos `actions.ts` co-localizados com a rota. Ex: `src/app/cadastro/actions.ts`.

### Key Directories

- `src/app/` — rotas (App Router)
- `src/components/ui/` — primitivos UI (não modificar componentes gerados pelo shadcn)
- `src/components/shared/` — componentes reutilizáveis da aplicação
- `src/hooks/` — hooks customizados
- `src/lib/` — utilitários e constantes compartilhadas
- `src/integrations/supabase/` — clients Supabase e tipos auto-gerados
- `pre-desenvolvimento/` — trabalho pendente e referência do produto (leia o `README.md` de lá); specs concluídas vão para `docs/specs-arquivadas/`

### UI

Componentes usam **Base UI** (`@base-ui/react`) — não Radix UI — com **Tailwind CSS 4** e **CVA** (class-variance-authority) para variantes. Ícones: **Lucide React**. Formulários: **React Hook Form + Zod**. A UI é em **português (pt-BR)**.

## Regras e fluxo

As regras sempre ativas, a arquitetura, o fluxo (`/triagem` → `/spec` → `/break` → `/plan`
→ `/execute` → testes → `/revisildo`), a regra "pronto é veredito do auditor" e as regras
de git ficam em `AGENTS.md`, a página de princípios lida por qualquer agente e por
qualquer pessoa. O conteúdo dele é importado aqui:

@AGENTS.md

Os comandos e skills do fluxo são versionados em `.claude/commands/` e `.claude/skills/`;
quem clona o projeto já os tem. A atualização de card no ClickUp é opcional: só roda se
existir `scripts/clickup-issue-status.ps1` e `CLICKUP_API_KEY` no `.env.local`.

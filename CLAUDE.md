# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**CRM Exponencial** é um CRM para atacadistas voltado ao método de vendas exponencial. O sistema é projetado para empresas que vendem via WhatsApp, com times separados de **Expansão** (prospecção) e **Retenção** (recompra). É uma aplicação **multi-tenant**: cada empresa (workspace) tem seus próprios usuários, times e números de WhatsApp isolados por RLS.

### Módulos previstos

- **Módulo 0 — Fundação** ✅ *concluído*: multi-tenant, papéis (Admin/Gerente/Atendente), times, números WhatsApp
- **Módulo 1 — Chat** ✅ *concluído*: Chat WhatsApp (API Oficial Meta), caixa de entrada, envio de mídia, etiquetas, mensagens rápidas
- **Módulo 2 — Pipeline** ✅ *concluído*: funil Expansão e Retenção
- **Módulo 3 — Contatos** ✅ *concluído*
- **Módulo 5 — Dashboard** ✅ *concluído*
- **Automações** ✅ *concluído*: gatilho → ação estilo Kommo (`/configuracoes/automacoes`)
- **Módulo 4 — Sequências** ✅ *concluído*: sequências automáticas, agenda do vendedor, central de alertas
- **Módulo 7 — Campanhas** ✅ *concluído*: disparos em massa segmentados com relatório de entrega
- **Módulo 6 — Grupos** ❌ *bloqueado*: a API oficial da Meta não suporta grupos de WhatsApp (ver `pre-desenvolvimento/avaliacao-modulo-6-grupos.md`)

### Status atual

O app está em **produção no Vercel** em `https://crm-exponencial.vercel.app`. O schema Supabase está criado e todas as queries/mutations são reais. Os módulos 0, 1 e 2 estão completamente implementados com backend real.

### Deploy e variáveis de ambiente

O app está deployado no Vercel. **Todas as variáveis de ambiente já estão configuradas no Vercel** — não é necessário perguntar ou configurar novamente:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase
- `NEXT_PUBLIC_META_APP_ID` / `NEXT_PUBLIC_META_CONFIG_ID` / `META_APP_SECRET` — Meta WhatsApp API
- `WHATSAPP_VERIFY_TOKEN` — validação do webhook Meta
- `META_TEST_ACCESS_TOKEN` — token temporário do número de teste Meta (expira em 24h)

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
- `/(auth)/pipeline` — funil Expansão
- `/(auth)/pipeline/retencao` — funil Retenção
- `/(auth)/agenda` — agenda do vendedor (lembretes de sequência + follow-ups)
- `/(auth)/agenda/equipe` — agenda da equipe (Admin/Gerente)
- `/(auth)/alertas` — central de alertas com limiares configuráveis
- `/(auth)/sequencias` — biblioteca de sequências (Admin/Gerente)
- `/(auth)/sequencias/[id]` — editor de sequência (Admin; `nova` para criar)
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
- `/(auth)/configuracoes/automacoes` — automações (gatilho → ação, estilo Kommo)

### Domain Model

| Entidade | Descrição |
|----------|-----------|
| `workspaces` | Empresa cadastrada (isolamento multi-tenant) |
| `users` | Usuários com papel: Admin, Gerente ou Atendente |
| `teams` | Times da empresa: Expansão e Retenção (padrão) + customizados |
| `user_teams` | Associação N:N entre usuários e times |
| `whatsapp_connections` | Números WhatsApp conectados |

### State Management

- **Server state**: TanStack React Query para fetching, cache e mutations.
- **UI state**: `useState` local — sem biblioteca global.

### Backend (Supabase)

- **Database**: PostgreSQL com RLS (Row Level Security) para isolamento por workspace.
- **Auth**: Supabase Auth via SSR cookies — o middleware gerencia o redirecionamento.
- **Types**: `src/integrations/supabase/types.ts` é auto-gerado (`supabase gen types typescript --linked`) — não editar.
- **Migrations**: adicionar novos `.sql` em `supabase/migrations/`.
- **Server Actions**: lógica backend fica em arquivos `actions.ts` co-localizados com a rota. Ex: `src/app/cadastro/actions.ts`.

### Key Directories

- `src/app/` — rotas (App Router)
- `src/components/ui/` — primitivos UI (não modificar componentes gerados pelo shadcn)
- `src/components/shared/` — componentes reutilizáveis da aplicação
- `src/hooks/` — hooks customizados
- `src/lib/` — utilitários e constantes compartilhadas
- `src/integrations/supabase/` — clients Supabase e tipos auto-gerados
- `pre-desenvolvimento/` — specs e documentação do produto

### UI

Componentes usam **Base UI** (`@base-ui/react`) — não Radix UI — com **Tailwind CSS 4** e **CVA** (class-variance-authority) para variantes. Ícones: **Lucide React**. Formulários: **React Hook Form + Zod**. A UI é em **português (pt-BR)**.

## Regras Sempre Ativas

1. Nunca mexa em arquivos que não foram explicitamente listados na tarefa atual
2. Nunca adicione funcionalidades além do que foi pedido
3. Reutilize código existente — pesquise antes de criar algo novo
4. Lógica de negócio sempre no backend, nunca no frontend
5. Nunca exponha chaves de API ou secrets no frontend

### Thin Client, Fat Server
O frontend apenas captura intenções do usuário e exibe respostas. Toda lógica, validação e autorização ficam no backend.

### Isolamento por Comportamento
Organize o código por comportamento, não por tipo de arquivo. Cada funcionalidade em sua própria pasta — mexer em uma não afeta outra.

### Segurança
- Nunca coloque API keys, secrets ou tokens no frontend
- Nunca coloque regras de autorização no frontend
- Secrets ficam em variáveis de ambiente no backend (`.env.local` nunca commitado)

### Reuso de Código
Antes de criar algo novo: pesquise na base de código com grep por nomes similares, verifique componentes e utilitários existentes, importe o que já existe.

### Padrões Documentados
Para dependências externas: verifique a documentação oficial antes de implementar, siga o padrão documentado, não reinvente a roda.

## Workflow (Anti-Vibe Coding)

Use sempre nesta ordem: `/spec` → `/break` → `/plan` → `/execute` → testes → `/revisildo`

Os comandos e skills do fluxo são versionados no repo, em `.claude/commands/` e `.claude/skills/` — quem clona o projeto já os tem.

| Etapa | O que faz | Onde grava |
|-------|-----------|------------|
| `/spec <descrição>` | Transforma uma descrição em spec com páginas, componentes e comportamentos (o QUE, não o COMO) | `spec.md` na raiz ou `pre-desenvolvimento/spec-*.md` |
| `/break <spec>` | Divide a spec em issues pequenas: uma de protótipo por página, uma de implementação por comportamento | `pre-desenvolvimento/issues/` |
| `/plan <issue>` | Pesquisa código reutilizável e enriquece a issue com cenários, banco, arquivos exatos e checklist | o próprio arquivo da issue |
| `/execute <issue>` | Implementa **só** o que a issue lista, marcando o checklist | código |
| `testes <issue>` | Implementa os testes mapeados em `pre-desenvolvimento/testes/plano-testes-modulo-X.md` | `src/test/`, `e2e/` |
| `/revisildo <issue>` | Audita escopo, checklist, spec e arquitetura; só fala se houver problema | — |

### Uma issue por vez

No dia a dia, use `/issue <identificador>` — ex.: `/issue 08` ou `/issue B1-01`. Ele roda `/plan` → `/execute` → testes → `/revisildo` em sequência e, se a revisão passar, move a issue para `pre-desenvolvimento/issues/concluidas_*/`.

- Se o `/execute` encontrar algo fora do que a issue lista, ele **para e pergunta** — não expanda o escopo por conta própria.
- Só commite depois do `/revisildo` responder "✅ Tudo certo".
- A atualização de card no ClickUp é opcional: só roda se existir `scripts/clickup-issue-status.ps1` e `CLICKUP_API_KEY` no `.env.local`.

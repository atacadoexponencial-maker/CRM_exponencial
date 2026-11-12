<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Princípios do crmatacado exp

Esta é a página de princípios do projeto. Todo agente (Claude Code, Codex, Cursor,
Copilot) e toda pessoa leem esta página antes de qualquer tarefa. Os comandos do fluxo
(`/triagem`, `/spec`, `/break`, `/plan`, `/execute`, testes, `/revisildo`) a leem no
início. O que é descrição do projeto (módulos, rotas, bancos, comandos npm) está no
`CLAUDE.md`; aqui ficam só as regras.

## 1. Regras sempre ativas

1. Nunca mexa em arquivos que não foram explicitamente listados na tarefa atual.
2. Nunca adicione funcionalidades além do que foi pedido.
3. Reutilize código existente: pesquise com grep por nomes parecidos antes de criar.
4. Lógica de negócio sempre no backend, nunca no frontend.
5. Nunca exponha chaves de API, secrets ou tokens no frontend.

## 2. Arquitetura

- **Thin client, fat server.** O frontend captura intenção e exibe resposta. Validação,
  regra de negócio e autorização ficam em Server Actions (`actions.ts` ao lado da rota)
  ou em `src/lib`. Autorização só no cliente é defeito.
- **Isolamento por empresa.** Toda tabela tem RLS por `workspace_id`. A chave de serviço
  (`createServiceClient`) ignora o RLS: use só em webhook, cron, fluxo sem login e
  quando a issue disser; sempre filtrando pelo workspace.
- **Isolamento por comportamento.** Código organizado por funcionalidade, cada uma na
  própria pasta. Mexer em uma não afeta outra.
- **Segurança.** Secrets em variáveis de ambiente no servidor. `.env.local` e
  `.env.teste.local` nunca entram no git. `src/integrations/supabase/types.ts` é gerado:
  não editar à mão.
- **Padrões documentados.** Para biblioteca ou serviço externo, siga a documentação
  oficial. Não reinvente.
- **UI.** Base UI (não Radix), Tailwind 4, CVA, Lucide, React Hook Form + Zod. Texto da
  interface em português do Brasil.

## 3. Fluxo: comece sempre por `/triagem`

A triagem classifica a tarefa em uma de três marchas e diz a classificação em voz alta:

| Marcha | Quando | O que acontece |
|---|---|---|
| **Sonda** | pergunta de viabilidade | investiga e responde; nada fica |
| **Delimitada** | mudança em fluxo que já existe | desenha no chat, espera o sim, implementa; sem spec nem issue |
| **Arquitetural** | subsistema novo ou mudança de interface | `/spec` → `/break` → `/plan` → `/execute` → testes → `/revisildo` |

Na dúvida, a marcha mais pesada. A catraca é de mão única: complexidade que aparece no
meio sobe a marcha, nunca desce. Toda marcha termina em aprovação antes de implementar.

| Etapa | O que faz | Onde grava |
|---|---|---|
| `/spec <descrição>` | reserva a série e escreve a spec da mudança: comportamentos, critérios de aceite com código (`CA-<série>-<nn>`), suposições, perguntas | `pre-desenvolvimento/spec-*.md` |
| `/break <spec>` | divide em issues, uma por entrega que dá para ver funcionando | `pre-desenvolvimento/issues/` |
| `/plan <issue>` | pesquisa reuso, cenários, tabela Prova, arquivos exatos, checklist | a própria issue |
| `/execute <issue>` | implementa só o que a issue lista | código |
| testes `<issue>` | testes da tabela Prova, com o código do critério no nome | `src/test/` |
| `/revisildo <issue>` | roda o auditor; um revisor independente lê o que script não vê | — |

No dia a dia: `/issue <id>` roda `/plan` → `/execute` → testes → `/revisildo` em
sequência. Se o `/execute` encontrar algo fora da issue, ele para e pergunta.

## 4. Pronto é veredito do auditor

O auditor (`.claude/skills/auditor/`) é um script. Ele confere se cada critério de
aceite tem teste com o código dele e se o teste passou, se não há suposição ou pergunta
em aberto, se só os arquivos da issue foram mexidos e se as regras por script foram
respeitadas. Ninguém declara uma issue pronta por leitura.

```bash
node .claude/skills/auditor/scripts/auditor.mjs issue <id>     # esta issue está alinhada?
node .claude/skills/auditor/scripts/auditor.mjs serie <série>  # a série pode ser arquivada?
node .claude/skills/auditor/scripts/auditor.mjs suposicoes     # o que estamos assumindo?
node .claude/skills/auditor/scripts/auditor.mjs regras         # o que cada regra acha hoje?
node .claude/skills/auditor/scripts/auditor.mjs licao listar   # lições a aplicar
```

- Teste manual (chip real, aprovação visual) é critério de prova `manual`. Pendente, não
  trava commit nem deploy, mas a issue fica aberta e a spec não é arquivada.
- Exceção ao auditor só escrita na issue, com motivo, quem aprovou (Marcelle ou Luan) e
  o dia.
- Lições (`pre-desenvolvimento/licoes.md`) nascem só de falha real, são escritas pelo
  auditor e lidas pelo `/spec` e pelo `/plan`. Não edite o arquivo à mão.
- Spec de mudança que entrou no ar vai para `docs/specs-arquivadas/`. Spec velha na raiz
  é ficção com cara de documentação.

## 5. Git e publicação

- O `master` é **protegido** (desde 31/10/2026): push direto é recusado, para todo
  mundo. Cada série tem um branch `bNN-nome` (ou worktree) e entra por **pull request**.
- O botão de merge só libera com os quatro checks verdes e o branch atualizado com o
  master: **Lint e tipos**, **Testes sem banco** e **Build** (GitHub Actions,
  `.github/workflows/ci.yml`) e **Vercel** (deploy de prévia). Merge no master publica
  na produção. Não afrouxe o CI para ficar verde: corrija a causa.
- O CI roda lint, `tsc`, os testes sem banco (`*.integration.test.*` ficam de fora) e o
  `next build`. Os testes de integração continuam sendo rodados na máquina de quem
  desenvolve, com o banco de teste.
- Outra pessoa pode estar na mesma pasta: `git status` e `git fetch` antes de commitar;
  `git add` arquivo por arquivo, nunca `-A`. Antes de dar push, confira também o que
  está à frente do remoto (`git log origin/master..HEAD`): não leve commit de outra
  pessoa sem saber.
- Só commite depois do `/revisildo` responder "✅ Tudo certo".
- Erro em produção chega ao **Sentry** (projeto `crmatacado-exp`, organização
  `atacado-exponencial`). Depois de um merge, olhe o painel no dia seguinte.
- Migration nova: primeiro `npm run db:teste:push` (banco de teste) e os testes da
  série; só depois `npx supabase db push --linked` (produção).
- Antes de dar uma issue por pronta, rode `npx tsc --noEmit`: o Vitest não confere tipos.
- Depois de subir o `next dev`, desfaça o que ele reescrever no `AGENTS.md` antes de
  rodar o auditor.

## 6. Bancos e empresa de teste

- Dois projetos Supabase: **produção** (o site, os clientes, os testes com chip) e
  **teste** (preview da Vercel, Vitest, roteiros de `e2e/preview/`). O Vitest recusa
  rodar contra a produção.
- A empresa **"[TESTE] Automações B11"** existe nos dois bancos e é a única em que os
  roteiros automáticos gravam. A da produção nunca é apagada.
- Credenciais e chaves: pedir à Marcelle ou ao Luan. Detalhes em `CLAUDE.md` e em
  `e2e/preview/README.md`.

## 7. Ao falar com a pessoa

- Português do Brasil, com acentos. Horários em Brasília.
- Antes de agir no número de WhatsApp dela ou em produção, pergunte.
- Não há usuários reais ainda: não pergunte sobre migração de dado existente; escolha o
  simples.

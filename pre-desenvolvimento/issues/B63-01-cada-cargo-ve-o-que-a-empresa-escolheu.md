# B63-01: Cada cargo vê o que a empresa escolheu

**Tipo:** Implementação
**Página:** Chat, Contatos e Pipeline (e o que segue o dono do contato)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-permissoes-por-cargo.md`

## Descrição

A visibilidade de conversas, contatos e cards deixa de ser fixa e passa a seguir a
escolha guardada para cada cargo da empresa (Atendente e Gerente): "Só os atribuídos a
ele", "Os dele e os sem dono" ou "Todos da empresa". O Admin vê tudo. Toda empresa,
nova ou existente, fica com Atendente em "Só os atribuídos a ele" e Gerente em "Todos
da empresa". Ver dá direito a atender, mas não a atribuir.

## Pronto quando

Uma atendente com o padrão novo abre o Chat, Contatos e o Pipeline e vê só o que é
dela; nada dos outros nem dos sem dono aparece por endereço, busca, filtro, contagem ou
lixeira. Mudando a escolha guardada no banco, o que ela vê muda junto.

## Critérios de aceite

- **CA-B63-07** (automática) — Em "Só os atribuídos a ele", o atendente não vê o que é sem dono nem dos outros. Dado o Atendente em "Só os atribuídos a ele", uma atendente Ana dona da conversa X, um colega dono da Y e a Z sem dono (as três conferidas como existentes com a chave de serviço), quando a Ana abre o Chat, Contatos e o Pipeline, então ela vê a conversa, o contato e o card de X, e não vê nada de Y nem de Z.
- **CA-B63-08** (automática) — Em "Os dele e os sem dono", o atendente vê também a fila aberta. Dado o Atendente em "Os dele e os sem dono" e as mesmas X, Y e Z, quando a Ana abre o Chat, Contatos e o Pipeline, então ela vê X e Z, e não vê Y.
- **CA-B63-09** (automática) — Em "Todos da empresa", o atendente vê tudo mas não atribui. Dado o Atendente em "Todos da empresa" e as mesmas X, Y e Z, quando a Ana abre o Chat e tenta atribuir a Y a si mesma, então ela vê X, Y e Z, e a atribuição é recusada.
- **CA-B63-10** (automática) — O Gerente segue a opção do cargo dele. Dado o Gerente em "Só os atribuídos a ele" e as mesmas X, Y e Z, com nenhuma delas do gerente, quando o Gerente abre o Chat, Contatos e o Pipeline, então ele não vê X, Y nem Z.
- **CA-B63-11** (automática) — O Admin vê tudo, qualquer que seja a escolha. Dado Atendente e Gerente em "Só os atribuídos a ele", quando o Admin abre o Chat, Contatos e o Pipeline, então ele vê X, Y e Z.
- **CA-B63-12** (automática) — O que não se vê também não vaza pelos lados. Dado o Atendente em "Só os atribuídos a ele" e a conversa Z sem dono, com etiqueta, compra e nota gravadas (conferidas com a chave de serviço), quando a Ana tenta abrir a Z pelo endereço direto, buscar o contato pelo nome, filtrar Contatos pela etiqueta e ler as compras, as notas e a lixeira, então nada da Z aparece, e as contagens da tela e do Dashboard dela não incluem a Z.
- **CA-B63-13** (automática) — Atribuir a conversa tira da tela de quem perdeu. Dado o Atendente em "Só os atribuídos a ele" e a Ana dona da conversa X, quando o Admin atribui a X ao colega, então a Ana, ao recarregar o Chat, não vê mais a X, nem o contato e o card dela.
- **CA-B63-19** (manual) — Na D'Rô, a Vivianne deixa de ver o que não é dela. Dado a D'Rô em produção, depois do merge, com o Atendente em "Só os atribuídos a ele", quando a Vivianne abre o Chat, então ela vê só as conversas atribuídas a ela, e a Nathália segue vendo todas.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B63-01 | A permissão é por cargo, não por pessoa. | confirmada | Luan, 19/11/2026 |
| SUP-B63-02 | Uma escolha só vale para conversas, contatos e cards. | confirmada | Luan, 19/11/2026 |
| SUP-B63-04 | O Admin sempre vê tudo da empresa; a tela não deixa restringir o Admin. | confirmada | Luan, 19/11/2026 |
| SUP-B63-05 | As empresas que já existem passam, no dia do merge, para o padrão novo: Atendente em "Só os atribuídos a ele" e Gerente em "Todos da empresa". Na D'Rô, a Vivianne deixa de ver as 4 conversas sem dono. | confirmada | Luan, 19/11/2026 |
| SUP-B63-06 | Ver dá direito a atender (responder, mover o card), mas não a atribuir: o Atendente em "Todos da empresa" responde a conversa de um colega sem virar dono dela. | confirmada | Luan, 19/11/2026 |
| SUP-B63-07 | A troca da fila aberta como padrão substitui a decisão da Marcelle de 27/10/2026 (PER-B45-04); a fila aberta fica como opção na tela. | confirmada | Luan, 19/11/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. A empresa guarda o alcance de cada cargo (`workspaces.alcance_atendente`, `workspaces.alcance_gerente`), com padrão "atribuidos" e "todos".
2. Uma função do banco diz o alcance de quem está logado (Admin é sempre "todos") e outra diz se ele vê um dono (`pode_ver_dono`).
3. As funções `pode_ver_contato` e `pode_ver_conversa` e as políticas de conversas, cards e contatos passam a usar essa regra; tudo que já usava as duas funções (etiquetas, compras, notas, campos, edições, mensagens) acompanha.
4. O tempo real segue o alcance: "todos" ouve o tópico da gestão; "atribuidos_e_sem_dono" ouve o tópico dos sem responsável; todo mundo ouve o pessoal.
5. A caixa de entrada filtra pelo alcance, não pelo cargo; a lixeira mostra tudo para "todos" e só os dele para os outros dois.

### Edge Cases
- Gerente em "Só os atribuídos a ele" deixa de ver o que não é dele, inclusive pela política de contatos, que hoje libera o Gerente pelo cargo.
- Atendente em "Todos da empresa" vê e move o card do colega (SUP-B63-06), mas atribuir continua recusado pelo cargo e pelos gatilhos de campos protegidos.
- Conta desativada: alcance nulo, não vê nada (como hoje).
- Empresas existentes recebem o padrão pela coluna nova (SUP-B63-05); nenhuma conversa muda de dono.

### Cenário de Erro
- Valor fora das três opções é recusado pelo banco (check).
- Sem perfil ativo, as funções devolvem falso; listas vêm vazias, sem erro na tela.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B63-07 | automática | `src/test/permissoes-por-cargo.integration.test.ts` | atendente em "atribuidos" vê X e não Y nem Z no Chat, Contatos e Pipeline |
| CA-B63-08 | automática | `src/test/permissoes-por-cargo.integration.test.ts` | em "atribuidos_e_sem_dono" vê X e Z, não Y |
| CA-B63-09 | automática | `src/test/permissoes-por-cargo.integration.test.ts` | em "todos" vê X, Y e Z e atribuir a Y é recusado, sem mudar o dono |
| CA-B63-10 | automática | `src/test/permissoes-por-cargo.integration.test.ts` | gerente em "atribuidos" não vê X, Y nem Z |
| CA-B63-11 | automática | `src/test/permissoes-por-cargo.integration.test.ts` | admin vê X, Y e Z com os dois cargos em "atribuidos" |
| CA-B63-12 | automática | `src/test/permissoes-por-cargo.integration.test.ts` | Z (com etiqueta, compra e nota conferidas pela chave de serviço) não aparece por perfil, busca, filtro por etiqueta, compras, notas, lixeira nem nas contagens do Dashboard |
| CA-B63-13 | automática | `src/test/permissoes-por-cargo.integration.test.ts` | depois de o admin atribuir X ao colega, a Ana não vê mais a conversa, o contato e o card |
| CA-B63-19 | manual | roteiro abaixo | a Vivianne vê só as dela na D'Rô |

### Roteiro manual — CA-B63-19
1. Depois do merge e da migration na produção, entrar como Vivianne na D'Rô Moda Evangélica.
2. Abrir o Chat: aparecem só as conversas atribuídas a ela (eram 4 em 19/11/2026); as 4 sem dono não aparecem.
3. Abrir Contatos e o Pipeline: só os contatos e cards dela.
4. Entrar como Nathália: o Chat mostra todas as conversas da empresa.

## Banco de Dados

- Tabela: `workspaces`
  - `alcance_atendente` (text, not null, padrão `'atribuidos'`, check em `atribuidos`, `atribuidos_e_sem_dono`, `todos`) — o que o Atendente vê
  - `alcance_gerente` (text, not null, padrão `'todos'`, mesmo check) — o que o Gerente vê
- Funções: `alcance_do_usuario()` e `pode_ver_dono(uuid)` novas; `pode_ver_contato` e `pode_ver_conversa` reescritas
- Políticas: `contacts` (select), `conversations` (select e update), `pipeline_cards` (select e update), `realtime.messages` (gestão e sem responsável)

## Arquivos

- **Criar:** `supabase/migrations/20261119000001_permissoes_por_cargo.sql` — colunas, funções e políticas acima
- **Criar:** `src/lib/alcance.ts` — tipo `Alcance` e `alcanceDaSessao()`, que lê o alcance de quem está logado pelo banco
- **Criar:** `src/test/permissoes-por-cargo.integration.test.ts` — CA-B63-07 a 13
- **Modificar:** `src/integrations/supabase/types.ts` — gerado de novo, com as colunas e funções novas
- **Modificar:** `src/app/(auth)/chat/conversas.ts` — filtro pela alcance em vez do cargo
- **Modificar:** `src/app/(auth)/chat/page.tsx` — calcula o alcance e passa à lista e à tela
- **Modificar:** `src/app/(auth)/chat/actions.ts` — as duas chamadas de `listarConversas` passam o alcance
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — canais do tempo real pelo alcance
- **Modificar:** `src/app/(auth)/contatos/lixeira/actions.ts` — lixeira pelo alcance
- **Modificar:** `src/test/atendente-ve-os-dele.integration.test.ts` — a empresa do teste passa a "atribuidos_e_sem_dono", o cenário da fila aberta que ele confere
- **Modificar:** `src/test/chat-tempo-real-credencial.test.tsx` — os canais seguem o alcance: gestão para "todos", só o pessoal para "atribuidos", pessoal e sem responsável para a fila aberta
- **Modificar:** `src/test/chat-ficha-no-meio.test.tsx` — passa o alcance novo da tela do Chat
- **Modificar:** `src/test/chat-uma-coluna-no-celular.test.tsx` — passa o alcance novo da tela do Chat
- **Modificar:** `src/test/atendente-conversas-seguranca.integration.test.ts` — a empresa do teste nasce em "atribuidos_e_sem_dono", a fila aberta que eles conferem (incluídos com o Luan, 19/11/2026)
- **Modificar:** `src/test/contatos-lista.integration.test.ts` — a empresa do teste nasce em "atribuidos_e_sem_dono", a fila aberta que eles conferem (incluídos com o Luan, 19/11/2026)
- **Modificar:** `src/test/conversa-nova-ao-vivo.integration.test.ts` — a empresa do teste nasce em "atribuidos_e_sem_dono", a fila aberta que eles conferem (incluídos com o Luan, 19/11/2026)
- **Modificar:** `src/test/dashboard-blocos.integration.test.ts` — a empresa do teste nasce em "atribuidos_e_sem_dono", a fila aberta que eles conferem (incluídos com o Luan, 19/11/2026)
- **Modificar:** `src/test/funis-card-parado.integration.test.ts` — a empresa do teste nasce em "atribuidos_e_sem_dono", a fila aberta que eles conferem (incluídos com o Luan, 19/11/2026)
- **Modificar:** `src/test/funis-personalizados.integration.test.ts` — a empresa do teste nasce em "atribuidos_e_sem_dono", a fila aberta que eles conferem (incluídos com o Luan, 19/11/2026)
- **Modificar:** `src/test/usuario-desativado-seguranca.integration.test.ts` — a empresa do teste nasce em "atribuidos_e_sem_dono", a fila aberta que eles conferem (incluídos com o Luan, 19/11/2026)
- **Modificar:** `src/test/chat-caderno.integration.test.ts` — o contato do teste ganha o mesmo dono da conversa ou do card (dono único da B45-02; incluídos com o Luan, 19/11/2026)
- **Modificar:** `src/test/catalogo-pedidos-crm.integration.test.ts` — o contato do teste ganha o mesmo dono da conversa ou do card (dono único da B45-02; incluídos com o Luan, 19/11/2026)

## Checklist

- [x] Conferir a lista de migrations do banco de teste antes de numerar
- [x] Migration com colunas, funções, políticas e grants
- [x] Aplicar no banco de teste (`npm run db:teste:push`) e gerar os tipos
- [x] `src/lib/alcance.ts`
- [x] Caixa de entrada, página e actions do Chat pelo alcance
- [x] Tempo real do Chat pelo alcance
- [x] Lixeira pelo alcance
- [x] Teste novo e ajuste do teste da B45-03
- [x] Rodar os testes de integração que entram como atendente ou gerente
- [x] `npx tsc --noEmit` e lint

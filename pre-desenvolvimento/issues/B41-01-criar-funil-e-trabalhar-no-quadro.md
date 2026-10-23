# B41-01: Criar funil e trabalhar nele no quadro

**Tipo:** Implementação
**Página:** Configurações → Funis e Pipeline (abas dos funis novos)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-funis-personalizados.md`

## Descrição

Admin e Gerente criam funis com etapas (nome e cor) na tela nova de funis, e cada funil ganha uma aba no Pipeline com colunas, cards, adicionar contato, arrastar, painel do card, busca e filtro de atendente. Entrada e Recompra aparecem como fixos.

## Pronto quando

Dá para criar um funil com etapas coloridas, abrir a aba dele no Pipeline, adicionar contatos e mover os cards entre as etapas.

## Critérios de aceite

- **CA-B41-01** (automática) — Admin cria um funil com etapas. Dado um Admin na tela de funis, quando ele cria o funil "Feira de Março" com as etapas "Convidado", "Confirmou" e "Visitou o estande", nessa ordem, então o funil aparece na lista com 3 etapas e 0 cards, e o Pipeline ganha a aba "Feira de Março" com essas três colunas, nessa ordem
- **CA-B41-02** (automática) — Gerente também cria e edita funis. Dado um Gerente, quando ele cria um funil, renomeia o funil e acrescenta uma etapa, então as três mudanças ficam gravadas, como acontece para o Admin
- **CA-B41-03** (automática) — Atendente não gerencia funis. Dado um Atendente, quando ele tenta abrir a tela de funis, ou criar, renomear ou apagar um funil ou uma etapa por qualquer caminho (inclusive direto no servidor), então ele não vê a tela nem o botão "Gerenciar funis", e o servidor recusa toda tentativa sem mudar nada
- **CA-B41-04** (automática) — O nome do funil é obrigatório e não repete. Dado a tela de funis, quando alguém tenta salvar um funil sem nome, ou com o nome de outro funil da empresa, ou com o nome "Entrada" ou "Recompra" (com qualquer variação de maiúscula e minúscula, ou espaço sobrando), então a tela avisa o motivo e nada é criado
- **CA-B41-05** (automática) — O funil precisa de ao menos uma etapa, com nome. Dado o editor do funil, quando alguém tenta salvar um funil sem etapas, ou com uma etapa sem nome, ou com duas etapas de mesmo nome no mesmo funil, então a tela avisa o motivo e nada é gravado. Também não dá para apagar a última etapa de um funil.
- **CA-B41-08** (automática) — Cor da etapa aparece na coluna. Dado uma etapa de funil novo, quando o Admin escolhe para ela uma das cores prontas (a paleta de colunas que já existe), ou uma cor própria em "outra cor", então a coluna dessa etapa no quadro aparece com essa cor. Uma cor que não é válida (texto que não é cor) é recusada.
- **CA-B41-42** (automática) — O texto da coluna continua legível com qualquer cor. Dado etapas com cores próprias muito claras (como amarelo-claro) e muito escuras (como azul-marinho), quando o quadro aparece no tema claro e no tema escuro, então o nome da etapa e a contagem de cards ficam com contraste de pelo menos 4,5:1 sobre a cor da coluna, nos dois temas (o sistema escolhe texto claro ou escuro sozinho)
- **CA-B41-13** (automática) — Entrada e Recompra não mudam. Dado a tela de funis, quando alguém olha Entrada e Recompra, ou tenta renomear, apagar ou mudar as etapas deles por qualquer caminho, então eles aparecem como "fixo", sem os botões de editar, e o servidor recusa toda tentativa. As etapas e as regras desses dois funis continuam iguais às de hoje.
- **CA-B41-14** (automática) — Cada empresa só vê os próprios funis. Dado a empresa A com o funil "Feira de Março", quando alguém da empresa B abre a tela de funis, o Pipeline, o filtro de contatos ou as automações, ou consulta direto o banco, então o funil da empresa A não aparece, e nenhuma tentativa de ler, mudar ou usar esse funil funciona
- **CA-B41-15** (automática) — Adicionar contato cria o card na primeira etapa. Dado um Gerente no quadro "Feira de Março" e um contato que não está nesse funil, quando ele adiciona o contato, então o card aparece na primeira etapa do funil, sem atendente, com "Card criado no funil Feira de Março" no histórico. Os cards que o contato tem em Entrada ou Recompra não mudam.
- **CA-B41-16** (automática) — O contato não entra duas vezes no mesmo funil. Dado um contato que já tem card em "Feira de Março", quando alguém tenta adicioná-lo de novo, pela tela ou direto no servidor, então a tela avisa que ele já está nesse funil e nenhum card novo é criado. Adicioná-lo a outro funil da empresa continua possível.
- **CA-B41-17** (automática) — Atendente não adiciona contato ao funil. Dado um Atendente no quadro de um funil novo, quando ele olha o cabeçalho, ou tenta criar o card direto no servidor, então o botão "Adicionar contato" não aparece, e o servidor recusa
- **CA-B41-18** (automática) — Arrastar e mover o card só entre etapas do mesmo funil. Dado um card em "Convidado" no funil "Feira de Março", quando alguém arrasta o card para "Confirmou", ou escolhe a etapa em "mover para etapa" no painel, então o card fica em "Confirmou", com a mudança no histórico. O painel só oferece as etapas desse funil, e o servidor recusa mover o card para uma etapa de outro funil.
- **CA-B41-19** (automática) — Atendente vê só os próprios cards no funil novo. Dado um funil novo com cards de dois atendentes e cards sem atendente, quando um dos atendentes abre o quadro, então ele vê só os cards em que é o atendente, como acontece em Entrada e Recompra. O Admin e o Gerente veem todos.
- **CA-B41-20** (automática) — Atribuir e excluir card no funil novo. Dado um card de funil novo, quando o Gerente atribui o card a um atendente e depois exclui o card, então o atendente passa a ver o card enquanto ele existe. Excluído, o card some só desse funil, e o contato e os outros cards dele continuam.
- **CA-B41-21** (automática) — Busca e filtro de atendente no funil novo. Dado um funil novo com cards de vários contatos e atendentes, quando o Admin busca por parte do nome ou do telefone, ou escolhe um atendente, então o quadro mostra só os cards que batem com a busca ou com o atendente escolhido
- **CA-B41-23** (automática) — Funil sem nenhum card. Dado um funil recém-criado, quando alguém abre a aba dele, então as colunas aparecem vazias, com o mesmo aviso de coluna vazia de Entrada, e o Admin ou o Gerente vê o botão "Adicionar contato"
- **CA-B41-24** (manual) — O quadro do funil novo fica bem arrumado. Dado o preview publicado, com um funil de 3 etapas e outro de 8 etapas, cada um com cards, quando a Marcelle abre as abas no computador e no celular, então as abas cabem no cabeçalho (ou rolam, sem quebrar o layout), as colunas e os cards seguem o tema Caderno com as cores escolhidas, e nada fica desalinhado

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B41-01 | A tela de funis fica em Configurações → Funis, com atalho "Gerenciar funis" no cabeçalho do Pipeline, e o Gerente tem acesso a ela, mesmo que outras telas de Configurações sejam só do Admin | confirmada | Marcelle, 23/10/2026 |
| SUP-B41-02 | Cada empresa tem no máximo 20 funis próprios, cada funil tem no máximo 20 etapas, e os nomes de funil e de etapa vão até 40 caracteres | confirmada | Marcelle, 23/10/2026 |
| SUP-B41-03 | As abas dos funis novos aparecem depois de Entrada e Recompra, por ordem de criação (sem ordenar as abas à mão) | confirmada | Marcelle, 23/10/2026 |
| SUP-B41-05 | Ao ser criado, o card de funil novo fica sem atendente; quem cria pode atribuir depois pelo painel | confirmada | Marcelle, 23/10/2026 |
| SUP-B41-07 | A cor da etapa vem da mesma paleta de cores de coluna que Entrada e Recompra já usam, sem cor livre | invalidada | Marcelle, 23/10/2026: paleta pronta mais "outra cor" livre, com o texto da coluna ajustado sozinho para ficar legível nos dois temas (CA-B41-08 e CA-B41-42) |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B41-01 | Quem pode criar funis? | respondida | Marcelle, 23/10/2026: Admin e Gerente |
| PER-B41-02 | As etapas dos funis novos são próprias e editáveis? | respondida | Marcelle, 23/10/2026: próprias e editáveis |
| PER-B41-03 | Entrada e Recompra continuam fixos? | respondida | Marcelle, 23/10/2026: sim, ficam fixos |
| PER-B41-04 | O contato pode estar em vários funis? | respondida | Marcelle, 23/10/2026: um card por funil, como hoje; vários funis, uma vez em cada |
| PER-B41-05 | Os painéis incluem os funis novos, e como? | respondida | Marcelle, 23/10/2026: aprovou o desenho (seletor no gráfico do Dashboard, abas no Pipeline, filtro, automações e alertas; relatórios de compras sem mudança) |
| PER-B41-06 | Como o contato entra num funil novo? | respondida | Marcelle, 23/10/2026: botão "Adicionar contato" no quadro (Admin e Gerente) e ação "Mover card" das automações |

## Cenários

### Happy Path
1. O Admin ou o Gerente abre Configurações → Funis, ou clica em "Gerenciar funis" no cabeçalho do Pipeline. A lista mostra Entrada e Recompra como "fixo" e os funis da empresa com as etapas e os cards de cada um.
2. Em "Novo funil", ele digita o nome e as etapas e salva. Cada etapa tem nome e cor: uma cor pronta da paleta de colunas ou "outra cor", com seletor livre. O servidor confere tudo e grava o funil e as etapas de uma vez, pela função `criar_funil`, que respeita a RLS.
3. No editor, ele renomeia o funil, acrescenta etapa e muda o nome ou a cor de uma etapa.
4. O cabeçalho do Pipeline mostra as abas Entrada, Recompra e os funis da empresa, por ordem de criação. Cada funil novo abre em `/pipeline/funil/<id>`.
5. No quadro do funil novo, as colunas seguem a ordem e a cor das etapas. O Admin e o Gerente usam "Adicionar contato": buscam um contato da empresa por nome ou telefone, e o card nasce na primeira etapa, sem atendente.
6. Arrastar o card, ou usar "mover para etapa" no painel, muda a etapa. O histórico do painel mostra os nomes das etapas do funil novo. O painel também atribui atendente e tem "Tirar do funil", que apaga só aquele card.
7. A busca e o filtro de atendente funcionam como em Entrada.

### Edge Cases
- Os nomes são comparados sem diferença de maiúscula e minúscula e sem espaço sobrando. "Entrada" e "Recompra" são reservados.
- Limites: 20 funis por empresa, 20 etapas por funil e 40 caracteres por nome. O servidor confere, e o banco também barra, por regras e gatilho.
- Contato que está na lixeira não aparece na busca de "Adicionar contato".
- Se duas pessoas adicionam o mesmo contato ao mesmo tempo, o índice único `pipeline_cards_um_por_funil` barra o segundo card e a tela mostra "já está neste funil".
- No funil novo, o card guarda o id do funil em `funil` e o id da etapa em `etapa`. Por isso, renomear não mexe nos cards.
- A classificação do contato não muda com card de funil novo: ela só olha Entrada e Recompra, no código e no banco.
- Com muitas abas, o cabeçalho rola na horizontal sem quebrar o layout.
- As abas de Entrada e Recompra continuam iguais; o cabeçalho só ganha as abas novas e o atalho.

### Cenário de Erro
- Nome vazio, repetido, reservado ou longo demais, etapa sem nome, etapa repetida, funil sem etapa, cor inválida ou limite passado: a tela mostra o motivo e nada é gravado.
- Atendente que abre a tela de funis vai para `/perfil?motivo=sem-permissao`. Se ele chamar uma ação do servidor, ela recusa com "Sem permissão" e nada muda.
- Tentar mudar "entrada" ou "recompra" pelas ações: a ação recusa com "Funil fixo não pode ser mudado".
- Card movido para etapa de outro funil, ou criado num funil de outra empresa: o banco recusa, pelo gatilho `validar_funil_e_etapa`, e a tela mostra o erro de mover que já existe.
- `/pipeline/funil/<id>` de um funil que não existe ou é de outra empresa: a página mostra "não encontrado" (`notFound`).

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B41-01 | automática | `src/test/funis-personalizados.integration.test.ts` | O Admin cria "Feira de Março" com 3 etapas: a lista traz o funil com 3 etapas e 0 cards, e os funis da empresa trazem as etapas na ordem |
| CA-B41-02 | automática | `src/test/funis-personalizados.integration.test.ts` | O Gerente cria, renomeia e acrescenta etapa, e tudo fica gravado |
| CA-B41-03 | automática | `src/test/funis-personalizados.integration.test.ts` | As ações chamadas pelo Atendente são recusadas, e o insert direto dele em `funis` e `funil_etapas` falha |
| CA-B41-04 | automática | `src/test/funis-personalizados.integration.test.ts` | Nome vazio, repetido, "entrada" e " RECOMPRA " são recusados com o motivo, e nada é criado |
| CA-B41-05 | automática | `src/test/funis-personalizados.integration.test.ts` | Funil sem etapas, etapa sem nome e etapa repetida são recusados, e nada é gravado |
| CA-B41-08 | automática | `src/test/funis-personalizados-tela.test.tsx` | A coluna mostra a cor pronta (traço da paleta) e a cor própria (fundo com a cor escolhida); o servidor recusa cor inválida |
| CA-B41-42 | automática | `src/test/funis-personalizados-tela.test.tsx` | Com amarelo-claro e azul-marinho, nos temas claro e escuro, o título e a contagem ficam com contraste de pelo menos 4,5:1 sobre a cor da coluna |
| CA-B41-13 | automática | `src/test/funis-personalizados.integration.test.ts` | A lista traz Entrada e Recompra como fixos; renomear ou acrescentar etapa neles é recusado; card de Entrada com etapa que não é dele continua recusado pelo banco |
| CA-B41-14 | automática | `src/test/funis-personalizados.integration.test.ts` | A empresa B não lê o funil da empresa A, não o muda e não cria card nele |
| CA-B41-15 | automática | `src/test/funis-personalizados.integration.test.ts` | Adicionar contato cria o card na primeira etapa, sem atendente e com o histórico de criação, e o card de Entrada do contato fica igual |
| CA-B41-16 | automática | `src/test/funis-personalizados.integration.test.ts` | Adicionar o mesmo contato de novo dá "já está neste funil" e não cria card; adicionar a outro funil funciona |
| CA-B41-17 | automática | `src/test/funis-personalizados-tela.test.tsx` | O Atendente não vê "Adicionar contato"; a ação dele é recusada pelo servidor, o que o teste de integração também confere |
| CA-B41-18 | automática | `src/test/funis-personalizados.integration.test.ts` | Mover para "Confirmou" grava a etapa e o histórico com o nome; etapa de outro funil é recusada; o painel só oferece as etapas do funil |
| CA-B41-19 | automática | `src/test/funis-personalizados.integration.test.ts` | O Atendente lista só os próprios cards do funil novo, e o Admin lista todos |
| CA-B41-20 | automática | `src/test/funis-personalizados.integration.test.ts` | Depois de atribuído, o atendente vê o card; ao tirar do funil, o card some, e o contato e o card de Entrada dele continuam |
| CA-B41-21 | automática | `src/test/funis-personalizados-tela.test.tsx` | A busca por parte do nome ou do telefone e o filtro de atendente mostram só os cards que batem |
| CA-B41-23 | automática | `src/test/funis-personalizados-tela.test.tsx` | O funil vazio mostra as colunas com "Nenhum lead nesta etapa", e o Admin vê "Adicionar contato" |
| CA-B41-24 | manual | roteiro abaixo | As abas cabem ou rolam, as colunas e os cards seguem o Caderno com as cores escolhidas, e nada fica desalinhado |

### Roteiro manual — CA-B41-24
1. No preview, entre com o login da empresa [TESTE] Automações B11.
2. Em Configurações → Funis, crie um funil de 3 etapas com cores prontas e outro de 8 etapas com algumas cores próprias, uma bem clara e outra bem escura.
3. Em cada funil, adicione dois ou três contatos e arraste os cards entre as etapas.
4. No computador e no celular, nos temas claro e escuro, confira:
   - as abas cabem no cabeçalho ou rolam para o lado;
   - o nome de cada etapa fica legível sobre a cor;
   - os cards ficam alinhados e não sobra espaço vazio.

## Banco de Dados

Migration nova: `supabase/migrations/20261023000001_funis_personalizados.sql`.

- Tabela `funis` (com RLS):
  - `id` (uuid);
  - `workspace_id` (uuid, a empresa);
  - `nome` (text, de 1 a 40 caracteres, nunca "entrada" nem "recompra");
  - `created_at` (timestamptz).
  - Índice único em `(workspace_id, lower(btrim(nome)))`.
- Tabela `funil_etapas` (com RLS):
  - `id` (uuid);
  - `funil_id` (uuid, apagado junto com o funil);
  - `workspace_id` (uuid);
  - `nome` (text, de 1 a 40 caracteres);
  - `cor` (text, pode ficar vazia; um dos nomes da paleta `verde`, `amarelo`, `cinza`, `laranja` e `vermelho`, ou `#rrggbb`);
  - `ordem` (int);
  - `created_at`.
  - Índice único em `(funil_id, lower(btrim(nome)))`.
- RLS das duas tabelas: todos da empresa leem; só o Admin e o Gerente da empresa inserem, mudam e apagam.
- Gatilho de limite: no máximo 20 funis por empresa e 20 etapas por funil.
- Função `criar_funil(p_nome text, p_etapas jsonb) returns uuid`, `security invoker`: grava o funil e as etapas de uma vez. `grant execute` para `authenticated`.
- `pipeline_cards`:
  - saem as regras `pipeline_cards_funil_check` e `pipeline_cards_etapa_check`;
  - entra o gatilho `validar_funil_e_etapa`, antes de insert e de update de funil e de etapa: `entrada` e `recompra` continuam com as listas de etapas de hoje; qualquer outro funil precisa ser um `funis.id` da mesma empresa, e a etapa um `funil_etapas.id` desse funil;
  - entra uma regra de apagar: o Admin e o Gerente da empresa apagam cards de funil que não é `entrada` nem `recompra`.
- Depois: rodar `npx supabase db push --linked` e gerar de novo `src/integrations/supabase/types.ts`.

## Arquivos

- **Criar:** `supabase/migrations/20261023000001_funis_personalizados.sql` — tabelas, RLS, limites, função `criar_funil`, validação de funil e etapa nos cards e regra de apagar card.
- **Criar:** `src/lib/funis.ts` — limites, nomes reservados, paleta pronta, `corDaEtapaValida` e `estiloDaCorPropria` (fundo e texto legível), usando `razaoContraste` e `corTextoSobre` de `src/app/loja/components/tema.ts`.
- **Criar:** `src/app/(auth)/configuracoes/funis/page.tsx` — página só para o Admin e o Gerente.
- **Criar:** `src/app/(auth)/configuracoes/funis/actions.ts` — `listarFunisParaGerenciar`, `criarFunil`, `renomearFunil`, `adicionarEtapa` e `editarEtapa`, com as conferências.
- **Criar:** `src/app/(auth)/configuracoes/funis/funis-client.tsx` — lista, editor do funil e escolha de cor.
- **Criar:** `src/app/(auth)/pipeline/funil/[id]/page.tsx` — quadro do funil novo.
- **Criar:** `src/app/(auth)/pipeline/components/funil-personalizado.tsx` — quadro com colunas, busca, filtro de atendente e "Adicionar contato".
- **Criar:** `src/app/(auth)/pipeline/components/modal-adicionar-contato.tsx` — busca o contato da empresa e cria o card.
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — `listarFunisDaEmpresa`, `listarCardsDoFunil`, `buscarContatosParaFunil`, `adicionarContatoAoFunil` e `removerCardDoFunil`; histórico do painel com os nomes das etapas dos funis novos.
- **Modificar:** `src/app/(auth)/pipeline/mock-pipeline.ts` — tipos `FunilDaEmpresa`, `EtapaDoFunil` e `CardDoFunil`.
- **Modificar:** `src/app/(auth)/pipeline/page.tsx` — carregar os funis da empresa para as abas.
- **Modificar:** `src/app/(auth)/pipeline/recompra/page.tsx` — carregar os funis da empresa para as abas.
- **Modificar:** `src/app/(auth)/pipeline/components/funil-entrada.tsx` — passar os funis e o papel ao cabeçalho.
- **Modificar:** `src/app/(auth)/pipeline/components/funil-recompra.tsx` — passar os funis e o papel ao cabeçalho.
- **Modificar:** `src/app/(auth)/pipeline/components/cabecalho-do-pipeline.tsx` — abas dos funis novos, rolagem e atalho "Gerenciar funis" para o Admin e o Gerente.
- **Modificar:** `src/app/(auth)/pipeline/components/coluna-kanban.tsx` — cor própria: fundo da cor, com texto legível.
- **Modificar:** `src/app/(auth)/pipeline/components/card-lead.tsx` — aceitar o card do funil novo.
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — etapas e nome do funil por props, e "Tirar do funil" no funil novo.
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — histórico do contato com "Card criado no funil <nome>" e o nome da etapa do funil novo (CA-B41-15).
- **Modificar:** `src/components/shared/sidebar-nav.tsx` — item "Funis" em Configurações, para o Admin e o Gerente.
- **Modificar:** `src/integrations/supabase/types.ts` — gerado de novo depois da migration.
- **Modificar:** `src/test/menu-lateral.test.tsx` — o menu esperado ganha "Funis" em Configurações, para o Admin e o Gerente.
- **Criar:** `src/test/funis-personalizados.integration.test.ts` — testes no banco de verdade.
- **Criar:** `src/test/funis-personalizados-tela.test.tsx` — testes da tela.

## Checklist

- [x] Escrever e aplicar a migration, e gerar os tipos
- [x] `src/lib/funis.ts` (limites, paleta, cor própria legível)
- [x] Ações e página de Configurações → Funis
- [x] Item "Funis" no menu e atalho "Gerenciar funis" no cabeçalho do Pipeline
- [x] Abas dos funis novos em Entrada, Recompra e no funil novo
- [x] Quadro do funil novo com "Adicionar contato", mover, painel e "Tirar do funil"
- [x] Coluna com cor própria
- [x] Testes da tabela Prova
- [x] `npx tsc --noEmit`, lint e testes passando

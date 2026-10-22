# B39-01: Filtros novos e período personalizado na tela Pedidos

**Tipo:** Implementação
**Página:** Pedidos (`/catalogo/pedidos`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-pedidos-exportar-e-filtrar.md`

## Descrição

Acrescentar à tela Pedidos os filtros de valor, produto (inclusive apagado), cliente nova ou antiga e atendente da cliente, e o período Personalizado com calendário, todos aplicados no servidor sobre todos os pedidos da empresa.

## Pronto quando

Na tela Pedidos, a pessoa combina busca, situação, período (atalhos ou de/até no calendário), valor mínimo e máximo, produto, cliente nova ou antiga e atendente da cliente; a lista e a contagem "N pedidos" valem para todos os pedidos da empresa, e "Limpar filtros" volta ao padrão.

## Critérios de aceite

- **CA-B39-01** (automática) — Período personalizado pelo calendário. Dado pedidos feitos em 01/10, 10/10 e 20/10, quando a pessoa escolhe "Personalizado" e marca de 05/10 até 15/10, então só aparece o pedido de 10/10; os dias de início e fim contam inteiros, no horário de Brasília.
- **CA-B39-02** (automática) — Dia final antes do inicial é recusado. Dado o período Personalizado aberto, quando a pessoa marca o dia final antes do dia inicial, então a tela avisa "O dia final precisa ser depois do inicial" e a lista não muda.
- **CA-B39-03** (automática) — Os atalhos de período continuam. Dado pedidos de hoje, de 5 dias atrás e de 20 dias atrás, quando a pessoa escolhe "Hoje", depois "Últimos 7 dias", então aparece só o de hoje, e depois o de hoje e o de 5 dias atrás.
- **CA-B39-04** (automática) — Filtrar pelo valor do pedido. Dado pedidos de R$ 300, R$ 800 e R$ 1.500, quando a pessoa informa mínimo R$ 500, depois máximo R$ 1.000 junto, então aparecem primeiro os de R$ 800 e R$ 1.500, e depois só o de R$ 800 (o valor é o que a cliente paga, já com desconto).
- **CA-B39-05** (automática) — Filtrar pelo produto no pedido. Dado um pedido com a "Blusa Lisa" e outro sem ela, quando a pessoa escolhe o produto "Blusa Lisa", então só aparece o pedido que tem a Blusa Lisa.
- **CA-B39-19** (automática) — Produto apagado do catálogo continua no filtro. Dado um pedido antigo com a "Saia Antiga", produto que já foi apagado do catálogo, quando a pessoa abre a escolha de produto e escolhe "Saia Antiga", então o produto aparece na lista (marcado como apagado) e o pedido antigo aparece no resultado.
- **CA-B39-06** (automática) — Filtrar cliente nova ou antiga. Dado uma cliente que já tinha compra antes do pedido e outra que nunca tinha comprado, quando a pessoa escolhe "Nova", depois "Antiga", então "Nova" mostra só o pedido da que nunca tinha comprado; "Antiga", só o da que já tinha.
- **CA-B39-07** (automática) — Filtrar pelo atendente da cliente. Dado uma cliente da carteira da Ana, outra da carteira do Bruno e outra sem atendente, quando a pessoa escolhe "Ana", depois "Sem atendente", então aparece só o pedido da cliente da Ana, e depois só o da cliente sem atendente.
- **CA-B39-08** (automática) — Os filtros valem juntos. Dado pedidos variados, quando a pessoa combina situação "Fechado", mínimo R$ 500 e cliente "Nova", então só aparecem os pedidos fechados, de R$ 500 ou mais, de clientes novas.
- **CA-B39-09** (automática) — Os filtros olham todos os pedidos. Dado uma empresa com mais de 500 pedidos, e o pedido procurado é o mais antigo, quando a pessoa filtra por um valor que só ele tem, então ele aparece, e a contagem mostra "1 pedido".
- **CA-B39-10** (automática) — Limpar filtros volta ao padrão. Dado vários filtros ligados, quando a pessoa clica em "Limpar filtros", então todos voltam ao padrão (situação Todas, período Últimos 30 dias, campos vazios) e a lista mostra os pedidos desse padrão.
- **CA-B39-11** (manual) — Filtros cabem no celular. Dado a tela Pedidos aberta no celular, quando a pessoa abre o período Personalizado e preenche os filtros novos, então tudo cabe sem rolar para o lado, o calendário abre e fecha bem, e o visual segue o estilo Caderno.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B39-01 | O padrão da tela continua "Últimos 30 dias" e situação "Todas", como hoje. | confirmada | Marcelle, 22/10/2026. |
| SUP-B39-02 | "Atendente da cliente" é o atendente do contato da cliente (a carteira da série B35), não quem mexeu no pedido. | confirmada | Marcelle, 22/10/2026. |
| SUP-B39-03 | O produto do filtro é escolhido entre os produtos que existem hoje no catálogo; pedido de produto já apagado do catálogo não aparece nesse filtro. | invalidada | A lista do filtro também traz os produtos apagados que aparecem em pedidos antigos (CA-B39-19). Marcelle, 22/10/2026. |
| SUP-B39-04 | Pedido sem contato ligado (cliente que ainda não virou contato) conta como cliente nova e como "Sem atendente". | confirmada | Marcelle, 22/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B39-01 | Quais filtros novos entram? | respondida | Valor do pedido, produto no pedido, cliente nova ou antiga e atendente da cliente. Marcelle, 22/10/2026. |
| PER-B39-05 | O que é "cliente nova"? | respondida | Antes deste pedido ela não tinha nenhum pedido fechado nem compra registrada; "antiga" já tinha. Marcelle, 22/10/2026. |
| PER-B39-06 | Como fica o período? | respondida | Continuam os atalhos (Hoje, 7 dias, 30 dias, Tudo) e entra "Personalizado" com calendário de/até. Marcelle, 22/10/2026. |

## Cenários

### Happy Path
1. A tela Pedidos abre com o padrão (situação Todas, Últimos 30 dias). A primeira página e a contagem "N pedidos" vêm do servidor, sobre todos os pedidos da empresa.
2. A pessoa muda qualquer filtro (busca, situação, período, valor mínimo/máximo, produto, cliente nova/antiga, atendente da cliente). Depois de uma pausa curta, a lista e a contagem são pedidas de novo ao servidor, com todos os filtros juntos.
3. Em "Personalizado", aparecem dois campos de data (calendário do navegador): de e até. A lista muda quando os dois estão preenchidos e válidos.
4. Mais de 500 resultados: "Carregar mais" traz a próxima página do mesmo filtro.
5. "Limpar filtros" volta tudo ao padrão.

### Edge Cases
- Períodos contados em dias no horário de Brasília: "Hoje" é o dia de hoje; "Últimos 7 dias" é hoje e os 6 anteriores; "Últimos 30 dias", hoje e os 29 anteriores; o Personalizado inclui o dia inicial e o final inteiros.
- Dia final antes do inicial: aviso "O dia final precisa ser depois do inicial" e nada é pedido ao servidor (o servidor também recusa).
- Personalizado com só um dos dias: a lista não muda até o outro ser preenchido.
- Valor: mínimo maior que o máximo traz lista vazia (não é erro); vale o total que a cliente paga, já com desconto.
- Produto apagado do catálogo: aparece na escolha como "Nome (apagado)", e o filtro procura os itens com aquele nome e sem produto ligado (SUP-B39-03).
- Cliente nova: pedido sem contato ligado conta como nova; com contato, é nova se não havia compra registrada (de outro pedido) antes do dia do pedido nem compra no mesmo dia registrada antes da hora do pedido, nem pedido fechado anterior (PER-B39-05, SUP-B39-04).
- Atendente da cliente: o atendente do contato (carteira, SUP-B39-02); "Sem atendente" pega pedido sem contato e contato sem atendente.
- O Atendente (papel) vê e filtra todos os pedidos da empresa, como hoje; os filtros de cliente e atendente olham a carteira inteira da empresa, não só os contatos dele (a função lê com a permissão do banco e confere a empresa de quem chama).
- Trocar filtro descarta as páginas carregadas; resposta atrasada de um pedido antigo é ignorada.
- Mudar a situação de um pedido aberto continua atualizando a linha dele na lista.

### Cenário de Erro
- Filtro inválido vindo da tela (data malformada, valor negativo, situação desconhecida): o servidor recusa e a tela mostra "Não foi possível aplicar os filtros.", mantendo a lista anterior.
- Falha de rede ou banco: mesma mensagem; a lista anterior continua.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B39-01 | automática | `src/test/pedidos-filtros.integration.test.ts` | Personalizado de 05/10 a 15/10 traz só o pedido de 10/10; pedido às 23h de 15/10 em Brasília entra e às 00h30 de 16/10 não |
| CA-B39-02 | automática | `src/test/pedidos-filtros-tela.test.tsx` | Dia final antes do inicial mostra o aviso e não pede nada ao servidor |
| CA-B39-03 | automática | `src/test/pedidos-filtros.integration.test.ts` | "Hoje" traz só o de hoje; "Últimos 7 dias" traz o de hoje e o de 5 dias atrás, sem o de 20 dias |
| CA-B39-04 | automática | `src/test/pedidos-filtros.integration.test.ts` | Mínimo 500 traz 800 e 1.500; com máximo 1.000, só 800 |
| CA-B39-05 | automática | `src/test/pedidos-filtros.integration.test.ts` | Produto "Blusa Lisa" traz só o pedido que tem ela |
| CA-B39-19 | automática | `src/test/pedidos-filtros.integration.test.ts` | O produto apagado aparece nas opções marcado como apagado e o filtro por ele traz o pedido antigo |
| CA-B39-06 | automática | `src/test/pedidos-filtros.integration.test.ts` | "Nova" traz só o pedido da cliente sem compra anterior; "Antiga", só o da que já tinha |
| CA-B39-07 | automática | `src/test/pedidos-filtros.integration.test.ts` | "Ana" traz só o pedido da cliente da Ana; "Sem atendente", só o da cliente sem atendente |
| CA-B39-08 | automática | `src/test/pedidos-filtros.integration.test.ts` | Fechado + mínimo 500 + Nova traz só os que satisfazem os três |
| CA-B39-09 | automática | `src/test/pedidos-filtros.integration.test.ts` | Com 501 pedidos, o mais antigo é achado pelo valor só dele, e o total é 1 |
| CA-B39-10 | automática | `src/test/pedidos-filtros-tela.test.tsx` | "Limpar filtros" volta os campos ao padrão e pede a lista com Todas e Últimos 30 dias |
| CA-B39-11 | manual | roteiro abaixo | Filtros e calendário cabem no celular, no estilo Caderno |

### Roteiro manual — CA-B39-11
1. No celular (ou no navegador com 390 px de largura), entre no preview com o login da empresa de teste e abra Pedidos.
2. Escolha o período "Personalizado" e marque de/até no calendário.
3. Preencha valor mínimo e máximo, escolha um produto, "Cliente nova" e um atendente.
4. Confira: nada exige rolar para o lado, o calendário abre e fecha bem, "Limpar filtros" funciona e o visual segue o estilo Caderno, no claro e no escuro.

## Banco de Dados

- Função nova `public.filtrar_pedidos(p_filtros jsonb, p_limite int, p_offset int)`: `security definer`, `set search_path = public`. Confere a empresa de quem chama (perfil ativo) e só lê pedidos dela. Filtros: busca (nome ou dígitos do WhatsApp), situação, período (`hoje`, `7`, `30`, `tudo`, ou `personalizado` com `de`/`ate`, em dias de Brasília), valor mínimo/máximo, produto (`id` do produto, ou `nome` de produto apagado), cliente (`nova`/`antiga`), atendente (id ou `sem`). Devolve as colunas do resumo de hoje e `total bigint` (`count(*) over ()`), do mais novo para o mais antigo.
- Função nova `public.produtos_dos_pedidos()`: `security definer`; produtos do catálogo da empresa mais os nomes de itens de pedido sem produto ligado (apagados), com a marca `apagado`.
- Migration `supabase/migrations/20261022000004_filtrar_pedidos.sql`, aplicada com `npx supabase db push --linked`; tipos regenerados.
- Nenhuma tabela nem coluna nova.

## Arquivos

- **Criar:** `supabase/migrations/20261022000004_filtrar_pedidos.sql` — as duas funções.
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado depois da migration.
- **Criar:** `src/lib/catalogo/filtros-pedidos.ts` — tipo `FiltrosPedidos`, `FILTROS_PADRAO`, esquema Zod, validação do período personalizado (`erroDoPeriodo`) e se os filtros estão prontos para pedir.
- **Modificar:** `src/app/(auth)/catalogo/pedidos/actions.ts` — `filtrarPedidos(filtros, offset)` (valida e chama a função; devolve `{ pedidos, total }` ou `{ erro }`) e `opcoesDosFiltros()` (produtos com apagados e atendentes ativos, reusando `listarAtendentesAtivos` de `src/app/(auth)/contatos/actions.ts`).
- **Modificar:** `src/app/(auth)/catalogo/pedidos/page.tsx` — primeira página com o padrão, total e opções dos filtros.
- **Modificar:** `src/app/(auth)/catalogo/pedidos/pedidos-client.tsx` — guarda os filtros e as páginas, pede ao servidor quando os filtros mudam, "Carregar mais".
- **Criar:** `src/app/(auth)/catalogo/components/filtros-pedidos.tsx` — a barra de filtros (busca, situação, período com de/até, valor, produto, cliente, atendente, "Limpar filtros", aviso do período).
- **Modificar:** `src/app/(auth)/catalogo/components/lista-pedidos.tsx` — sai a filtragem local; mostra a contagem e as linhas recebidas.
- **Criar:** `src/test/pedidos-filtros.integration.test.ts` — CA-B39-01, 03, 04, 05, 19, 06, 07, 08 e 09.
- **Criar:** `src/test/pedidos-filtros-tela.test.tsx` — CA-B39-02 e 10.

## Checklist

- [x] Migration com `filtrar_pedidos` e `produtos_dos_pedidos`, aplicada e com os tipos regenerados
- [x] `src/lib/catalogo/filtros-pedidos.ts` com padrão, esquema e validação do período
- [x] Actions `filtrarPedidos` e `opcoesDosFiltros`
- [x] `page.tsx` e `pedidos-client.tsx` pedindo ao servidor, com "Carregar mais"
- [x] `filtros-pedidos.tsx` com todos os filtros e o aviso do período
- [x] `lista-pedidos.tsx` sem filtragem local, com a contagem
- [x] Testes da tabela Prova escritos e passando
- [x] `tsc --noEmit`, lint, build e os testes antigos de pedidos passando

# B37-01: Filtro avançado de contatos pelos dados do cadastro

**Tipo:** Implementação
**Página:** Contatos (`/contatos`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-filtro-de-contatos.md`

## Descrição

Criar o botão "Filtrar" na lista de contatos, com o painel de grupos e condições combinados por E/OU sobre os campos do cadastro, aplicado no servidor sobre a base inteira, com contagem e carregamento por páginas do resultado.

## Pronto quando

Na lista de contatos, qualquer papel abre "Filtrar", monta grupos de condições sobre os campos do cadastro (nome, telefone, classificação, tipo, nicho, cidade, UF, perfil de cliente, atendente, observações, data de cadastro), vê "N contatos encontrados" contando a base inteira e rola para carregar mais do resultado. O atendente só filtra os próprios contatos e a lixeira fica de fora.

## Critérios de aceite

- **CA-B37-01** (automática) — O botão "Filtrar" abre o painel do filtro. Dado a lista de contatos aberta, sem filtro, quando a pessoa clica em "Filtrar", então o painel abre com um grupo vazio e a opção de acrescentar condição.
- **CA-B37-04** (automática) — Campo novo do contato entra no filtro sozinho. Dado que o contato ganhou um campo novo no sistema, quando os testes rodam, então um teste falha se esse campo não estiver na lista de campos do filtro ou não estiver explicitamente marcado como "fora do filtro" (ex.: dados internos como a foto).
- **CA-B37-05** (automática) — Condições do mesmo grupo com E. Dado contatos de Fortaleza lojistas, de Fortaleza revendedores e de Recife lojistas, quando o grupo tem "Cidade é igual a Fortaleza" E "Tipo é Lojista", então só aparecem os de Fortaleza lojistas.
- **CA-B37-06** (automática) — Condições do mesmo grupo com OU. Dado os mesmos contatos, quando o grupo tem "Cidade é igual a Fortaleza" OU "Cidade é igual a Recife", então aparecem os três contatos.
- **CA-B37-07** (automática) — Grupos combinados entre si. Dado os mesmos contatos, quando o filtro é (Cidade = Fortaleza OU Cidade = Recife) E (Tipo é Lojista), então aparecem os de Fortaleza lojistas e os de Recife lojistas, e não aparecem os revendedores.
- **CA-B37-08** (automática) — O filtro acha contatos que ainda não estavam na tela. Dado uma empresa com mais de 50 contatos, e um contato que satisfaz o filtro está além dos 50 primeiros da lista, quando a pessoa aplica o filtro, então esse contato aparece no resultado e a contagem conta ele.
- **CA-B37-09** (automática) — A contagem mostra o total do resultado. Dado um filtro que satisfaz 120 contatos, quando o filtro é aplicado, então a tela mostra "120 contatos encontrados", mesmo exibindo só os 50 primeiros.
- **CA-B37-10** (automática) — Rolar a lista carrega mais resultados do filtro. Dado um filtro com 120 contatos no resultado, quando a pessoa chega ao fim da lista, então carregam os próximos contatos do resultado, nunca contatos fora do filtro.
- **CA-B37-11** (automática) — Remover uma condição atualiza o resultado. Dado um filtro com duas condições, quando a pessoa remove uma delas, então o resultado passa a obedecer só à que ficou.
- **CA-B37-12** (automática) — Limpar o filtro volta à lista completa. Dado um filtro aplicado, quando a pessoa clica em "Limpar filtro", então a lista volta a mostrar todos os contatos que ela enxerga e o botão volta a "Filtrar" sem número.
- **CA-B37-13** (automática) — Condição incompleta não filtra. Dado uma condição com campo escolhido e valor em branco (numa comparação que pede valor), quando o filtro é aplicado, então essa condição fica marcada como incompleta e não muda o resultado.
- **CA-B37-14** (automática) — Busca por nome e filtro valem juntos. Dado um filtro "Tipo é Lojista" aplicado, quando a pessoa digita "Maria" na busca, então aparecem só os lojistas com "Maria" no nome ou telefone.
- **CA-B37-15** (automática) — A ordenação vale sobre o resultado filtrado. Dado um filtro aplicado, quando a pessoa escolhe outra ordenação, então o resultado continua o mesmo conjunto, na ordem escolhida.
- **CA-B37-16** (automática) — Atendente filtra só dentro dos próprios contatos. Dado um atendente e um contato de outro atendente que satisfaz o filtro, quando o atendente aplica o filtro, então esse contato não aparece e não entra na contagem (a regra é conferida no servidor).
- **CA-B37-17** (automática) — Contato na lixeira nunca aparece no filtro. Dado um contato na lixeira que satisfaz o filtro, quando o filtro é aplicado, então ele não aparece e não entra na contagem.
- **CA-B37-21** (automática) — Filtrar por data de cadastro. Dado contatos cadastrados há 5 e há 40 dias, quando o filtro é "Data de cadastro nos últimos 30 dias", então só aparece o cadastrado há 5 dias.
- **CA-B37-36** (automática) — "Está vazio" só em campo que não é obrigatório. Dado o painel aberto, quando a pessoa escolhe Cidade, depois Telefone, então Cidade oferece "está vazio" e "não está vazio"; Telefone não oferece.
- **CA-B37-37** (automática) — Comparação negativa não traz quem tem o campo vazio. Dado contatos de Fortaleza, de Recife e sem cidade, quando o filtro é "Cidade não é Fortaleza", depois "Cidade está vazio", então o primeiro traz só o de Recife; o segundo traz só o sem cidade.
- **CA-B37-22** (manual) — Painel do filtro no celular. Dado a lista de contatos aberta no celular, quando a pessoa abre "Filtrar" e monta dois grupos com condições, então o painel ocupa a tela, dá para montar e aplicar sem rolar para o lado, e o visual segue o estilo Caderno.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B37-01 | As comparações negativas ("não é", "não contém", "não tem", "não está na etapa") trazem também os contatos com o campo vazio. Ex.: "Cidade não é Fortaleza" traz quem não tem cidade. | invalidada | Não trazem. Todo campo que não é obrigatório ganha "está vazio" e "não está vazio" (CA-B37-36, CA-B37-37). Marcelle, 22/10/2026. |
| SUP-B37-03 | Filtro montado e não salvo some ao sair da tela de Contatos. | confirmada | Marcelle, 22/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B37-01 | "Campos que vierem a existir" são os que o sistema ganhar ou os que a empresa criar? | respondida | Ambos. Os do sistema entram nesta série; os criados pela empresa viram a série B38. Marcelle, 22/10/2026. |
| PER-B37-03 | Como as condições se combinam? | respondida | Grupos que se combinam, com E ou OU dentro e entre os grupos. Marcelle, 22/10/2026. |
| PER-B37-05 | Quem pode montar filtros? | respondida | Todos os papéis; o atendente só dentro dos próprios contatos. Marcelle, 22/10/2026. |
| PER-B37-07 | Ao montar o filtro, a lista atualiza na hora ou num botão "Aplicar"? | respondida | Botão "Aplicar": a lista só muda ao aplicar; "Limpar filtro" aplica na hora. Marcelle, 22/10/2026. |
| PER-B37-08 | Em texto, a comparação ignora maiúscula e acento? | respondida | Ignora os dois ("sao paulo" acha "São Paulo"), e a busca por nome passa a ignorar acento também. Marcelle, 22/10/2026. |

## Cenários

### Happy Path
1. A pessoa abre `/contatos`. A página traz a primeira página (50) e o total de contatos que ela enxerga.
2. Clica em "Filtrar". Abre o painel com um grupo vazio e "Acrescentar condição".
3. Escolhe campo (lista agrupada por assunto; nesta issue só "Cadastro"), comparação (as do tipo do campo) e valor.
4. Acrescenta outra condição ou outro grupo; troca E/OU dentro do grupo e entre os grupos.
5. Clica em "Aplicar". O servidor filtra a base inteira (a RLS vale: atendente só os dele; lixeira fora), devolve a primeira página e o total. A tela mostra "N contatos encontrados" e o botão vira "Filtrar · K" (K = condições completas aplicadas).
6. "Carregar mais" traz a página seguinte do mesmo filtro, na mesma ordem.
7. Busca por nome/telefone, ordenação e botões fixos (classificação, tipo, nicho, atendente) valem junto com o filtro, todos no servidor.
8. "Limpar filtro" zera o filtro e aplica na hora.

### Edge Cases
- Condição incompleta (sem valor numa comparação que pede valor): marcada "incompleta" no painel e não vai para o servidor (o servidor também a descarta).
- Grupo sem condição completa: ignorado.
- Comparação negativa ("não é", "não contém") não traz campo vazio; "está vazio" pega nulo e texto vazio.
- Campo obrigatório (Telefone, Classificação, Data de cadastro) não oferece "está vazio"/"não está vazio".
- Texto ignora maiúscula e acento ("sao paulo" acha "São Paulo"); `%` e `_` digitados são literais.
- Datas no fuso de Brasília (`FUSO_DA_OPERACAO`): "nos últimos 30 dias" conta a partir de agora; "antes de 10/10" = antes de 10/10 00:00 em Brasília.
- Nicho e atendente: os valores vêm do servidor (todos os da empresa), não só dos 50 carregados.
- Trocar filtro, busca ou ordem descarta as páginas carregadas e recomeça do zero; resposta atrasada de um pedido antigo é ignorada.
- Contato excluído na tela continua sumindo na hora (B13-02) e sai da contagem.

### Cenário de Erro
- Filtro inválido vindo do cliente (campo ou comparação fora do catálogo, valor de tipo errado): o servidor recusa com `{ erro }` e a tela mostra "Não foi possível aplicar o filtro.", mantendo a lista anterior.
- Falha de rede ou banco ao aplicar ou carregar mais: mantém o que está na tela e mostra a mensagem; dá para tentar de novo.
- Sem sessão: a action devolve lista vazia, como `listarContatos` hoje.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B37-01 | automática | `src/test/filtro-contatos-tela.test.tsx` | Clicar em "Filtrar" abre o painel com um grupo vazio e o botão de acrescentar condição |
| CA-B37-04 | automática | `src/test/filtro-contatos.test.ts` | Toda coluna de `contacts` no tipo gerado está no catálogo do filtro ou na lista "fora do filtro"; coluna nova sem decisão faz o teste falhar |
| CA-B37-05 | automática | `src/test/filtro-contatos.integration.test.ts` | Grupo com Cidade = Fortaleza E Tipo = Lojista traz só o de Fortaleza lojista |
| CA-B37-06 | automática | `src/test/filtro-contatos.integration.test.ts` | Grupo com Cidade = Fortaleza OU Cidade = Recife traz os três |
| CA-B37-07 | automática | `src/test/filtro-contatos.integration.test.ts` | (Fortaleza OU Recife) E (Lojista) traz os dois lojistas e não o revendedor |
| CA-B37-08 | automática | `src/test/filtro-contatos.integration.test.ts` | Com 55 contatos, o que satisfaz o filtro e é o mais antigo (fora dos 50 primeiros) aparece e entra no total |
| CA-B37-09 | automática | `src/test/filtro-contatos-tela.test.tsx` | Com total 120 vindo do servidor e 50 linhas, a tela mostra "120 contatos encontrados" |
| CA-B37-10 | automática | `src/test/filtro-contatos-tela.test.tsx` | "Carregar mais" pede a página seguinte (offset 50) com o mesmo filtro aplicado |
| CA-B37-11 | automática | `src/test/filtro-contatos-tela.test.tsx` | Remover uma de duas condições e aplicar envia ao servidor só a que ficou |
| CA-B37-12 | automática | `src/test/filtro-contatos-tela.test.tsx` | "Limpar filtro" envia filtro vazio na hora e o botão volta a "Filtrar" sem número |
| CA-B37-13 | automática | `src/test/filtro-contatos-tela.test.tsx` | Condição sem valor aparece como incompleta e não vai no filtro enviado |
| CA-B37-14 | automática | `src/test/filtro-contatos.integration.test.ts` | Filtro Tipo = Lojista com busca "Maria" traz só lojistas com Maria no nome |
| CA-B37-15 | automática | `src/test/filtro-contatos.integration.test.ts` | Mesmo filtro em ordem "recente" e "nome" traz o mesmo conjunto, cada um na sua ordem |
| CA-B37-16 | automática | `src/test/filtro-contatos.integration.test.ts` | Atendente aplicando filtro não recebe contato de colega que satisfaz o filtro, nem no total |
| CA-B37-17 | automática | `src/test/filtro-contatos.integration.test.ts` | Contato na lixeira que satisfaz o filtro não volta nem conta |
| CA-B37-21 | automática | `src/test/filtro-contatos.integration.test.ts` | "Data de cadastro nos últimos 30 dias" traz o de 5 dias e não o de 40 |
| CA-B37-36 | automática | `src/test/filtro-contatos-tela.test.tsx` | Cidade oferece "está vazio"/"não está vazio"; Telefone não |
| CA-B37-37 | automática | `src/test/filtro-contatos.integration.test.ts` | "Cidade não é Fortaleza" traz só Recife; "Cidade está vazio" traz só o sem cidade |
| CA-B37-22 | manual | roteiro abaixo | Painel usável no celular, sem rolagem lateral, no estilo Caderno |

### Roteiro manual — CA-B37-22
1. No celular (ou no navegador com 390 px de largura), entre no preview com o login da empresa de teste e abra Contatos.
2. Toque em "Filtrar": o painel ocupa a tela inteira.
3. Monte o grupo 1 com "Cidade é igual a Fortaleza" OU "Cidade é igual a Recife"; acrescente o grupo 2 com "Tipo é Lojista"; deixe "E" entre os grupos.
4. Toque em "Aplicar": o painel fecha, a lista mostra "N contatos encontrados" e o botão mostra "Filtrar · 3".
5. Confira: nada exige rolar para o lado; textos, bordas e botões seguem o estilo Caderno, no claro e no escuro.

## Banco de Dados

- Extensão `unaccent` (schema `extensions`), para comparar texto sem acento.
- Função nova `public.filtrar_contatos(p_filtro jsonb, p_busca text, p_ordem text, p_limite int, p_offset int)`: `security invoker` (vale a RLS de `contacts`: atendente só os dele, B21-02), `set search_path = public, extensions`. Monta o `where` a partir do JSON com lista fechada de campos e comparações (desconhecido → `raise exception`), valores sempre por `format('%L')`, nunca concatenados; `excluido_em is null` sempre. Devolve as colunas de `CONTACT_SELECT`, `atendente_nome` e `total bigint` (`count(*) over ()`). Ordem: `recente` (created_at desc), `nome` (coalesce(name, phone_number)), `classificacao` (a mesma ordem de `ORDEM_CLASSIFICACAO`), sempre com `id` de desempate. Limite entre 1 e 200.
- Migration: `supabase/migrations/20261022000001_filtrar_contatos.sql`; aplicar com `npx supabase db push --linked` (só acrescenta função e extensão).
- Nenhuma tabela nem coluna nova.

## Arquivos

- **Criar:** `src/lib/filtro-contatos.ts` — tipos do filtro (`Filtro`, `Grupo`, `Condicao`), catálogo de campos (`CAMPOS_DO_FILTRO`, com assunto, tipo, obrigatório e opções; `COLUNAS_FORA_DO_FILTRO`), comparações por tipo (`comparacoesDoCampo`), `condicaoCompleta`, `limparFiltro` (tira incompletas e grupos vazios), `contarCondicoes` e o esquema Zod `esquemaFiltro` que o servidor usa. Reusa `CLASSIFICACAO_LABEL`, `TIPO_LABEL`, `ICP_LABEL` (`src/app/(auth)/contatos/mock-contatos.ts`) e `UFS` (`src/lib/uf.ts`).
- **Criar:** `supabase/migrations/20261022000001_filtrar_contatos.sql` — extensão e função acima.
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado com `npx supabase gen types typescript --linked` depois da migration (entram só as duas funções novas).
- **Criar:** `src/app/(auth)/contatos/components/painel-filtro.tsx` — painel (Dialog de `@/components/ui/dialog`, tela cheia no celular) com grupos, condições, E/OU, marca de incompleta, "Aplicar" e "Limpar filtro".
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — action nova `filtrarContatos({ filtro, busca, ordem, rapidos, limite, offset })`: valida com `esquemaFiltro`, junta os botões fixos como condições E, chama a RPC e devolve `{ contatos, total }` ou `{ erro }`; action nova `valoresDoFiltro()` com os nichos da empresa e os atendentes ativos (mesma consulta de `listarAtendentesAtivos`). `listarContatos` fica como está (outros testes usam).
- **Modificar:** `src/app/(auth)/contatos/page.tsx` — primeira página e total por `filtrarContatos` com filtro vazio.
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — botão "Filtrar · K", filtro aplicado, busca/ordem/botões fixos/carregar mais pelo servidor (saem o filtro e a ordenação no cliente), "N contatos encontrados", nichos e atendentes vindos de `valoresDoFiltro`.
- **Criar:** `src/test/filtro-contatos.test.ts` — CA-B37-04.
- **Criar:** `src/test/filtro-contatos-tela.test.tsx` — CA-B37-01, 09, 10, 11, 12, 13 e 36 (actions mockadas).
- **Criar:** `src/test/filtro-contatos.integration.test.ts` — CA-B37-05, 06, 07, 08, 14, 15, 16, 17, 21 e 37 (Supabase real, no molde de `src/test/contatos-lista.integration.test.ts`).

## Checklist

- [x] Migration com `unaccent` e `filtrar_contatos`, aplicada com `npx supabase db push --linked`
- [x] `src/lib/filtro-contatos.ts` com catálogo, comparações, limpeza e esquema Zod
- [x] Actions `filtrarContatos` e `valoresDoFiltro` em `contatos/actions.ts`
- [x] `page.tsx` usando `filtrarContatos` para a primeira página e o total
- [x] `painel-filtro.tsx` com grupos, condições, E/OU, incompleta, Aplicar e Limpar
- [x] `lista-contatos.tsx` com tudo no servidor, contagem e botão "Filtrar · K"
- [x] Testes da tabela Prova escritos e passando
- [x] `tsc --noEmit`, lint e teste de cores fixas do tema passando

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B37-22 | Marcelle | 22/10/2026 |

# B43-01: Perfil RFV no contato, na lista e no chat

**Tipo:** Implementação
**Página:** Contatos (lista e perfil) e Chat (painel do contato)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-automacao-por-perfil-rfv.md`

## Descrição

Mostrar o perfil RFV da hora (mesma regra de Relatórios, base da empresa inteira) na coluna nova "Perfil RFV" da lista de contatos, no perfil do contato e no painel do contato no chat; quem nunca comprou aparece como "Sem compras".

## Pronto quando

Abrindo Contatos, o perfil de um contato ou uma conversa no chat, a pessoa vê o perfil RFV de cada contato, igual ao de Relatórios, já atualizado depois de uma compra registrada.

## Critérios de aceite

- **CA-B43-01** (automática) — A lista de contatos mostra o perfil RFV de cada contato. Dado uma empresa com contatos que compraram e o perfil de cada um em Relatórios → RFV, quando a pessoa abre Contatos, então a coluna "Perfil RFV" mostra, para cada contato, o mesmo perfil de Relatórios, com o ícone e o nome dele.
- **CA-B43-02** (automática) — Contato sem compras aparece como "Sem compras". Dado um contato que nunca comprou, quando a pessoa olha a lista de contatos, o perfil do contato ou o painel do chat, então o perfil RFV aparece como "Sem compras".
- **CA-B43-03** (automática) — O perfil do contato mostra o perfil RFV. Dado um contato no perfil Clientes Fiéis, quando a pessoa abre o perfil desse contato, então aparece o selo "💎 Clientes Fiéis".
- **CA-B43-04** (automática) — O painel do contato no chat mostra o perfil RFV. Dado uma conversa com um contato no perfil Em Risco, quando a pessoa abre a conversa e o painel do contato, então aparece o selo "🔥 Em Risco".
- **CA-B43-05** (automática) — O perfil mostrado é o da hora. Dado um contato no perfil Em Risco, quando alguém registra uma compra para ele hoje e abre o perfil do contato, então o selo já mostra o perfil novo, o mesmo que Relatórios mostra naquele momento.
- **CA-B43-06** (automática) — O Atendente vê o mesmo perfil que o Admin. Dado um Atendente com contatos na carteira e uma empresa com clientes de vários atendentes, quando o Atendente abre a lista de contatos, então cada contato dele mostra o mesmo perfil que o Admin vê (calculado sobre a base da empresa inteira), e ele não vê contato que não é dele.
- **CA-B43-07** (manual) — Visual do perfil aprovado. Dado a empresa de teste com contatos em vários perfis, quando a Marcelle olha a lista de contatos, o perfil do contato e o painel do chat, no computador e no celular, nos temas claro e escuro, então o perfil fica legível, alinhado e sem cortes.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B43-06 | A coluna "Perfil RFV" da lista de contatos aparece para todos os papéis. | confirmada | Marcelle, 24/10/2026 (aprovação da spec). |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B43-02 | O perfil mostrado no contato, na lista e no chat, e usado na condição, é o da hora ou o da conferência do dia? | respondida | Sempre o da hora, igual a Relatórios. Marcelle, 24/10/2026. |

## Cenários

### Happy Path
1. A pessoa abre Contatos. `filtrarContatos` traz a página e, numa chamada só, os perfis desses contatos (`perfis_rfv_da_empresa`, da B42-01, filtrada pelos ids da página). A coluna "Perfil RFV" mostra ícone e nome na cor do perfil.
2. "Carregar mais" e filtros passam pela mesma `filtrarContatos`, então as páginas seguintes também vêm com perfil.
3. Abrindo o perfil do contato, `buscarDadosContato` traz o perfil e o cabeçalho mostra o selo ao lado da classificação.
4. No chat, `buscarInfoContato` traz o perfil no cadastro e o painel mostra "Perfil RFV" logo abaixo de "Classificação".

### Edge Cases
- Contato sem compra: a função não devolve linha para ele → "Sem compras".
- Compra registrada agora: o cálculo é feito no momento da leitura, então a próxima abertura já mostra o perfil novo (não há valor guardado).
- Atendente: a função calcula sobre a empresa inteira e só devolve contato que ele pode ver; a lista dele já é só a carteira dele.
- Contato na lixeira não aparece na lista nem tem perfil (a função ignora).

### Cenário de Erro
- Se a leitura dos perfis falhar, a lista, o perfil e o chat abrem normalmente, sem o perfil ("—"), em vez de quebrar a tela.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B43-01 | automática | `src/test/perfil-rfv-no-contato.integration.test.ts` | cada contato de `filtrarContatos` vem com o mesmo perfil que `buscarRfv` lista para ele |
| CA-B43-01 | automática | `src/test/perfil-rfv-no-contato-tela.test.tsx` | a lista mostra a coluna "Perfil RFV" com ícone e nome do perfil de cada contato |
| CA-B43-02 | automática | `src/test/perfil-rfv-no-contato-tela.test.tsx` | sem perfil, a lista, o perfil e o painel do chat mostram "Sem compras" |
| CA-B43-03 | automática | `src/test/perfil-rfv-no-contato.integration.test.ts` | `buscarDadosContato` traz Clientes Fiéis para o contato fiel |
| CA-B43-03 | automática | `src/test/perfil-rfv-no-contato-tela.test.tsx` | o perfil do contato mostra "💎 Clientes Fiéis" |
| CA-B43-04 | automática | `src/test/perfil-rfv-no-contato.integration.test.ts` | `buscarInfoContato` traz Em Risco no cadastro do contato da conversa |
| CA-B43-04 | automática | `src/test/perfil-rfv-no-contato-tela.test.tsx` | o painel do contato no chat mostra "🔥 Em Risco" |
| CA-B43-05 | automática | `src/test/perfil-rfv-no-contato.integration.test.ts` | depois de `registrarCompra` hoje, `buscarDadosContato` traz o perfil novo, igual ao de `buscarRfv` |
| CA-B43-06 | automática | `src/test/perfil-rfv-no-contato.integration.test.ts` | o Atendente vê o mesmo perfil que o Admin nos contatos dele e não recebe contato de outra carteira |
| CA-B43-07 | manual | roteiro abaixo | visual legível e alinhado |

### Roteiro manual — CA-B43-07
1. No preview, entre na "[TESTE] Automações B11" (ela tem vendas de 25 meses).
2. Abra Contatos: a coluna "Perfil RFV" mostra ícone e nome coloridos; quem não comprou mostra "Sem compras".
3. Abra o perfil de um contato com compras: o selo do perfil fica ao lado da classificação.
4. Abra no Chat a conversa de um contato com compras e o painel do contato: "Perfil RFV" aparece abaixo de "Classificação".
5. Repita no celular e nos temas claro e escuro. Aprove se nada ficar desalinhado, cortado ou ilegível.

## Banco de Dados

Nada muda: usa `public.perfis_rfv_da_empresa()` (B42-01), filtrada por `contact_id`.

## Arquivos

- **Criar:** `src/lib/perfil-rfv-do-contato.ts` — `perfisRfvDosContatos(supabase, ids)`: lê os perfis dos contatos pedidos; falha vira mapa vazio
- **Criar:** `src/components/shared/selo-perfil-rfv.tsx` — selo com ícone, nome e cor do perfil, ou "Sem compras"
- **Modificar:** `src/app/(auth)/contatos/mock-contatos.ts` — `Contato.perfilRfv` (opcional)
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `filtrarContatos` e `buscarDadosContato` trazem o perfil
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — coluna "Perfil RFV"
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — selo no cabeçalho
- **Modificar:** `src/app/(auth)/chat/actions.ts` — `CadastroDoContato.perfilRfv` em `buscarInfoContato`
- **Modificar:** `src/app/(auth)/chat/components/painel-contato.tsx` — linha "Perfil RFV" no cadastro
- **Criar:** `src/test/perfil-rfv-no-contato.integration.test.ts` — dados no banco de verdade
- **Criar:** `src/test/perfil-rfv-no-contato-tela.test.tsx` — o que as três telas mostram
- **Modificar:** `src/test/remover-nicho-contato.test.tsx` — o CA-B40-06 confere a lista exata de colunas; ganha "Perfil RFV" depois de Classificação

Reuso: `PERFIL_POR_ID`/`PerfilRfv` de `src/lib/relatorios/rfv.ts`; padrão de selo de `relatorios/components/lista-clientes-rfv.tsx`; montagem do teste de `src/test/filtro-contatos-rfv.integration.test.ts`.

## Checklist

- [x] `perfisRfvDosContatos` em `src/lib/perfil-rfv-do-contato.ts`
- [x] `SeloPerfilRfv` em `src/components/shared/selo-perfil-rfv.tsx`
- [x] `perfilRfv` no tipo `Contato`, em `filtrarContatos` e em `buscarDadosContato`
- [x] Coluna "Perfil RFV" na lista de contatos
- [x] Selo no perfil do contato
- [x] `perfilRfv` no cadastro do chat e linha no painel do contato
- [x] Testes da tabela Prova passando; tsc e lint limpos; testes que renderizam as três telas rodados

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B43-07 | Marcelle | 29/10/2026 |

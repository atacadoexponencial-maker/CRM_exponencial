# B41-06: Funis novos no Dashboard e no filtro de contatos

**Tipo:** Implementação
**Página:** Dashboard e Contatos (filtro)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-funis-personalizados.md`

## Descrição

O gráfico de funil do Dashboard ganha a escolha de funil (abre em Entrada), e o filtro de contatos ganha um campo por funil novo, com as comparações de etapa. Depende da B41-01.

## Pronto quando

No Dashboard dá para ver os cards por etapa de um funil novo, e na lista de contatos dá para filtrar quem está em cada etapa dele.

## Critérios de aceite

- **CA-B41-37** (automática) — Gráfico de funil escolhe o funil. Dado o Dashboard de uma empresa com o funil "Feira de Março", quando a pessoa abre o Dashboard e depois escolhe "Feira de Março" no gráfico de funil, então o gráfico abre em Entrada, com os mesmos números de hoje. Escolhido "Feira de Março", ele mostra quantos cards há em cada etapa desse funil, na ordem dele. O filtro de atendente continua valendo, e o Atendente vê só os próprios cards.
- **CA-B41-38** (automática) — As outras métricas do Dashboard não mudam. Dado uma empresa com cards em funis novos, quando o Dashboard calcula conversão, leads ativos, recompras, em risco, inativos e perdidos, então os números são os mesmos que seriam sem os funis novos (só Entrada e Recompra contam)
- **CA-B41-39** (automática) — Filtro pela etapa do funil novo. Dado contatos em várias etapas de "Feira de Março" e contatos fora dele, quando alguém filtra "Feira de Março" com as comparações "na etapa Confirmou", "fora da etapa Confirmou", "está no funil" e "não está no funil", então cada filtro traz exatamente os contatos que batem, e a contagem bate com a lista. O campo aparece com o nome atual do funil e as etapas atuais dele.
- **CA-B41-40** (automática) — Filtro salvo com funil ou etapa apagada avisa. Dado um filtro salvo que usa uma etapa, ou um funil, que depois foi apagado, quando alguém abre esse filtro, então a condição aparece marcada como "valor que não existe mais", do mesmo jeito que já acontece com etiqueta apagada, e o filtro não quebra a lista

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B41-05 | Os painéis incluem os funis novos, e como? | respondida | Marcelle, 23/10/2026: aprovou o desenho (seletor no gráfico do Dashboard, abas no Pipeline, filtro, automações e alertas; relatórios de compras sem mudança) |

## Cenários

### Happy Path
1. Dashboard: o gráfico de funil por etapa ganha um seletor. Ele abre em "Funil de Entrada", com os mesmos números de hoje, e lista também os funis da empresa. Escolhido um funil da empresa, mostra quantos cards há em cada etapa dele, na ordem do funil, e o link "Abrir pipeline" leva ao quadro daquele funil.
2. O filtro de atendente do Dashboard vale para todos os funis, e o Atendente vê só os próprios cards, porque a contagem sai da mesma leitura de cards de hoje.
3. As outras métricas do Dashboard não mudam: elas só contam Entrada e Recompra.
4. Filtro de contatos: o assunto "Funil" ganha um campo para cada funil da empresa, chamado "Etapa no funil <nome>", com as comparações de hoje ("está na etapa", "não está na etapa", "está no funil", "não está no funil") e as etapas do funil como opções.
5. Filtro salvo com funil ou etapa apagada: a condição aparece com "Valor não existe mais". No servidor ela vira "nunca vale", e a lista não quebra.

### Edge Cases
- O campo de funil da empresa tem o id `funil:<id do funil>`. O limite do id do campo sobe de 40 para 60 caracteres.
- Sem a lista de funis (quem só confere o formato da condição), o campo é genérico, sem opções fixas. Quem confere se o funil ou a etapa ainda existem é o servidor, com os funis da empresa (`ValoresDaEmpresa.funis`).
- A função do banco aceita `funil:<id>` e procura os cards desse funil. O contato só tem card da própria empresa, pela trava da B41-01.

### Cenário de Erro
- Campo `funil:` com algo que não é id: o banco recusa como campo desconhecido, como hoje.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B41-37 | automática | `src/test/funis-dashboard-filtro.integration.test.ts` | O painel traz o funil de Entrada como antes e o funil da empresa com a contagem por etapa, na ordem; o Atendente conta só os próprios; na tela (`src/test/funis-dashboard-filtro-tela.test.tsx`), o gráfico abre em Entrada e troca para o funil escolhido |
| CA-B41-38 | automática | `src/test/funis-dashboard-filtro.integration.test.ts` | Conversão, leads ativos, recompras, em risco, inativos e perdidos dão os mesmos números com e sem os cards do funil da empresa |
| CA-B41-39 | automática | `src/test/funis-dashboard-filtro.integration.test.ts` | As quatro comparações trazem exatamente os contatos certos, a contagem bate e o campo tem o nome e as etapas atuais |
| CA-B41-40 | automática | `src/test/funis-dashboard-filtro.integration.test.ts` | Filtro com etapa ou funil apagado não traz ninguém e não dá erro; na tela, a condição mostra "Valor não existe mais" |

## Banco de Dados

- Migration nova: `supabase/migrations/20261023000004_filtro_funis_da_empresa.sql`.
- `condicao_de_contato_sql` igual à da B40-02, aceitando também `funil:<uuid>`.

## Arquivos

- **Criar:** `supabase/migrations/20261023000004_filtro_funis_da_empresa.sql` — campo de funil da empresa na função do filtro.
- **Modificar:** `src/lib/filtro-contatos.ts` — campo por funil da empresa, `campoDoFiltro` e `valorSumiu` com os funis da empresa, e o limite do id do campo.
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `valoresDoFiltro` traz os funis da empresa; o filtro confere funil e etapa apagados.
- **Modificar:** `src/app/(auth)/contatos/page.tsx` — passa os funis à lista.
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — passa os funis ao painel.
- **Modificar:** `src/app/(auth)/contatos/components/painel-filtro.tsx` — os campos dos funis da empresa no assunto "Funil".
- **Modificar:** `src/app/(auth)/dashboard/actions.ts` — os funis da empresa com a contagem por etapa.
- **Modificar:** `src/app/(auth)/dashboard/components/blocos-do-dia.tsx` — o gráfico de funil com o seletor.
- **Modificar:** `src/app/(auth)/dashboard/components/dashboard-client.tsx` — passa os funis ao gráfico.
- **Criar:** `src/test/funis-dashboard-filtro.integration.test.ts` — painel e filtro no banco de verdade.
- **Criar:** `src/test/funis-dashboard-filtro-tela.test.tsx` — seletor do gráfico e aviso do filtro na tela.

## Checklist

- [x] Migration aplicada
- [x] Filtro de contatos com os funis da empresa
- [x] Dashboard com o seletor de funil
- [x] Testes da tabela Prova
- [x] `npx tsc --noEmit`, lint e testes passando

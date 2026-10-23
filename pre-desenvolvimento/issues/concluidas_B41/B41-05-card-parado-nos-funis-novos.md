# B41-05: Card parado nos funis novos

**Tipo:** Implementação
**Página:** Configurações → Funis, Pipeline e Central de Alertas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-funis-personalizados.md`

## Descrição

Cada etapa de funil novo pode ter prazo de parado (1 a 365 dias); o card que passa do prazo fica vermelho no quadro e aparece na Central de Alertas. Depende da B41-01.

## Pronto quando

Com prazo numa etapa, o card esquecido nela aparece como parado no quadro e na Central de Alertas.

## Critérios de aceite

- **CA-B41-35** (automática) — Prazo da etapa é opcional e tem limite. Dado o editor do funil, quando alguém deixa o prazo vazio, coloca 1, coloca 365, ou tenta 0, 366 ou um texto, então vazio fica sem aviso, 1 e 365 são gravados, e 0, 366 e o texto são recusados com aviso
- **CA-B41-22** (automática) — Card parado segue o prazo da etapa. Dado a etapa "Confirmou" com prazo de 3 dias e a etapa "Convidado" sem prazo, quando um card fica 4 dias em cada uma delas, então o card em "Confirmou" aparece como parado (em vermelho, como em Entrada), e o card em "Convidado" nunca fica parado
- **CA-B41-36** (automática) — Central de Alertas lista o card parado do funil novo. Dado um card parado há 5 dias numa etapa de funil novo com prazo de 3 dias, quando o Admin abre a Central de Alertas, então o card aparece como parado, com o nome do funil, da etapa e os dias parado. Um Atendente só vê esse alerta se o card for dele.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B41-04 | O prazo de "parado" de cada etapa é definido no editor do funil, pelo Admin e pelo Gerente, e não na tela de Alertas, que continua com os quatro prazos de Entrada e Recompra e só para o Admin | confirmada | Marcelle, 23/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B41-05 | Os painéis incluem os funis novos, e como? | respondida | Marcelle, 23/10/2026: aprovou o desenho (seletor no gráfico do Dashboard, abas no Pipeline, filtro, automações e alertas; relatórios de compras sem mudança) |

## Cenários

### Happy Path
1. No editor do funil (Configurações → Funis → Editar), cada etapa tem o campo "Avisar parado depois de [N] dias". Vazio quer dizer sem aviso. O valor é salvo quando o campo perde o foco.
2. No quadro do funil novo, o card que está na etapa há mais dias que o prazo aparece como parado (vermelho, "parado N dias"), como em Entrada e Recompra. Uma etapa sem prazo nunca deixa o card parado.
3. Na Central de Alertas, o card parado de funil novo aparece com o tipo "Card parado", o nome do funil e da etapa, e os dias parado. Pode ser dispensado como os outros alertas.

### Edge Cases
- O prazo vale como "passa do prazo": com 3 dias, o card fica parado no 4º dia (dias > prazo), como os alertas de Recompra.
- O Atendente só vê na Central os alertas dos próprios cards, pela regra de leitura de cards de hoje.
- Os prazos de Entrada e Recompra continuam na tela de Alertas, só para o Admin (SUP-B41-04).
- Funil novo não entra no alerta de "lead sem resposta", que continua só de Entrada.

### Cenário de Erro
- Prazo 0, 366, número quebrado ou texto: o servidor recusa com "O prazo vai de 1 a 365 dias.", e o banco também barra.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B41-35 | automática | `src/test/funis-card-parado.integration.test.ts` | Vazio fica sem aviso; 1 e 365 são gravados; 0, 366, 2,5 e texto são recusados com aviso |
| CA-B41-22 | automática | `src/test/funis-card-parado.integration.test.ts` | Com 4 dias, o card em "Confirmou" (prazo 3) sai parado do quadro e o card em "Convidado" (sem prazo) nunca; na tela (`src/test/funis-card-parado.test.ts`), a situação do card diz "parado 4 dias" |
| CA-B41-36 | automática | `src/test/funis-card-parado.integration.test.ts` | O Admin vê o alerta "Card parado" com o funil, a etapa e 5 dias; o Atendente só vê se o card for dele |

## Banco de Dados

- Migration nova: `supabase/migrations/20261023000003_prazo_de_parado.sql`.
- `funil_etapas.parado_dias` (int, pode ficar vazio, de 1 a 365): depois de quantos dias o card fica parado na etapa.

## Arquivos

- **Criar:** `supabase/migrations/20261023000003_prazo_de_parado.sql` — coluna `parado_dias`.
- **Modificar:** `src/integrations/supabase/types.ts` — gerado de novo.
- **Modificar:** `src/lib/card-parado.ts` — `limiteDeParado` com o prazo da etapa do funil novo.
- **Modificar:** `src/lib/alertas.ts` — tipo "card_parado" e o cálculo dele.
- **Modificar:** `src/app/(auth)/alertas/actions.ts` — os cards dos funis novos com o prazo e os nomes.
- **Modificar:** `src/app/(auth)/alertas/alertas-client.tsx` — o tipo novo no filtro e na cor.
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — o quadro do funil novo usa o prazo da etapa.
- **Modificar:** `src/app/(auth)/pipeline/mock-pipeline.ts` — `EtapaDoFunil` com o prazo.
- **Modificar:** `src/app/(auth)/configuracoes/funis/actions.ts` — `editarEtapa` aceita o prazo; a lista traz o prazo.
- **Modificar:** `src/app/(auth)/configuracoes/funis/funis-client.tsx` — o campo do prazo em cada etapa.
- **Modificar:** `src/test/funis-editar-apagar-tela.test.tsx` — mock de `automacoesQueUsam`, que a B41-04 passou a chamar no aviso de apagar e o teste da B41-02 não tinha.
- **Criar:** `src/test/funis-card-parado.test.ts` — limite e situação do card, e o cálculo do alerta.
- **Criar:** `src/test/funis-card-parado.integration.test.ts` — prazo, quadro e Central de Alertas no banco de verdade.

## Checklist

- [x] Migration aplicada e tipos gerados de novo
- [x] Prazo no editor do funil, com as conferências
- [x] Quadro: card parado pelo prazo da etapa
- [x] Central de Alertas: tipo "Card parado"
- [x] Testes da tabela Prova
- [x] `npx tsc --noEmit`, lint e testes passando

# B37-02: Filtrar contatos por etiquetas, compras e etapa do funil

**Tipo:** Implementação
**Página:** Contatos (`/contatos`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-filtro-de-contatos.md`

## Descrição

Acrescentar ao filtro avançado os campos de Etiquetas, Compras (total já comprado, quantidade, data da última compra) e Funil (etapa em Entrada e em Recompra), com as comparações de cada tipo.

## Pronto quando

No painel do filtro aparecem os quatro assuntos (Cadastro, Etiquetas, Compras, Funil) com todos os campos da spec, e dá para achar, por exemplo, quem tem a etiqueta VIP, quem comprou mais de R$ 5.000 ou quem está na etapa Negociação.

## Critérios de aceite

- **CA-B37-02** (automática) — Cada campo mostra só as comparações do seu tipo. Dado o painel aberto, quando a pessoa escolhe um campo de cada tipo (texto, lista, número, data, etiqueta, funil), então a lista de comparações mostra exatamente as da tabela "Comparações por tipo de campo".
- **CA-B37-03** (automática) — Todos os campos da tabela aparecem para escolher. Dado o painel aberto, quando a pessoa abre a lista de campos, então aparecem todos os campos da tabela "Campos disponíveis", agrupados por assunto.
- **CA-B37-18** (automática) — Filtrar por etiqueta. Dado contatos com a etiqueta "VIP", com "VIP" e "Atacado", e sem etiqueta, quando o filtro é "Etiqueta tem VIP", depois "não tem VIP", depois "tem todas de VIP, Atacado", então o resultado é, nessa ordem: os dois primeiros; só o sem etiqueta; só o segundo.
- **CA-B37-19** (automática) — Filtrar por compras. Dado um contato que comprou R$ 6.000 em 3 compras, a última há 70 dias, e outro que nunca comprou, quando o filtro é "Total já comprado maior que 5.000", depois "Quantidade de compras igual a 3", depois "Data da última compra há mais de 60 dias", depois "Data da última compra está vazia", então os três primeiros acham só o primeiro contato e o último acha só o que nunca comprou.
- **CA-B37-20** (automática) — Filtrar por etapa do funil. Dado um contato na etapa "Negociação" do funil de Entrada e outro sem card em funil nenhum, quando o filtro é "Etapa no funil de Entrada está na etapa Negociação", depois "não está no funil", então o primeiro acha só o contato em Negociação e o segundo acha só o que não tem card.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B37-04 | "Total já comprado", "Quantidade de compras" e "Data da última compra" usam as mesmas compras que o card do funil e os Relatórios já contam (compras registradas e pedidos do catálogo fechados). | confirmada | Marcelle, 22/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B37-02 | Além do cadastro, o filtro usa etiquetas, compras e etapa do funil? | respondida | Sim, os três. Marcelle, 22/10/2026. |

# B38-07: Filtro por campo personalizado nos Relatórios e no Dashboard

**Tipo:** Implementação
**Página:** Relatórios (todas as abas); Dashboard
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-campos-personalizados.md`

## Descrição

Ao lado do filtro de atendente, os Relatórios e o Dashboard ganham o filtro por um campo personalizado, que deixa nos números só os clientes com os valores escolhidos; no RFV o perfil continua calculado com a empresa toda.

## Pronto quando

Com "Porte: Grande", a Visão Geral, o RFV, a Recompra por coorte, o Funil de clientes, as Carteiras e o Dashboard contam só os clientes de Porte Grande, inclusive junto com o filtro de atendente.

## Critérios de aceite

- **CA-B38-50** (automática) — Filtro por campo nos Relatórios. Dado clientes com Porte "Grande" e "Pequeno", com compras no mês, quando o Admin abre a Visão Geral e filtra "Porte: Grande", então os cartões, os gráficos e a lista de vendas contam só as compras dos clientes com Porte Grande; o mesmo filtro vale nas abas RFV, Recompra por coorte, Funil de clientes e Carteiras
- **CA-B38-51** (automática) — Filtro por campo no RFV não muda o perfil. Dado um cliente com Porte "Grande" e o perfil "Campeões" na aba RFV sem filtro, quando o Admin filtra o RFV por "Porte: Grande", então o cliente aparece com o mesmo perfil e as mesmas notas R, F e V, e a matriz conta só os clientes com Porte Grande
- **CA-B38-52** (automática) — Filtro por campo no Dashboard. Dado o Dashboard com clientes de Porte "Grande" e "Pequeno", quando o Admin filtra "Porte: Grande", então os números do Dashboard contam só os contatos com Porte Grande
- **CA-B38-53** (automática) — Filtro por campo junto com o de atendente. Dado o Atendente Teste com clientes de Porte "Grande" e "Pequeno", quando o Admin filtra pelo Atendente Teste e por "Porte: Grande", ou o próprio atendente filtra por "Porte: Grande", então a tela conta só os clientes da carteira dele com Porte Grande

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B38-13 | O filtro por campo nos Relatórios e no Dashboard escolhe um campo por vez. Campos de texto, número e data filtram com uma comparação simples (é, entre); Lista, Múltipla escolha e Sim/não escolhem os valores. | confirmada | Marcelle, 26/10/2026. |
| SUP-B38-15 | O filtro por campo no RFV segue a regra da B33-04: o perfil é sempre calculado com a empresa toda e o filtro só escolhe quem aparece (CA-B38-51). | confirmada | Marcelle, 26/10/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B38-11 | O que os campos fazem nos Relatórios e no Dashboard? | respondida | Filtro por campo, tabela de vendas por valor do campo e colunas nos Excel que listam clientes ou vendas. Marcelle, 26/10/2026. |

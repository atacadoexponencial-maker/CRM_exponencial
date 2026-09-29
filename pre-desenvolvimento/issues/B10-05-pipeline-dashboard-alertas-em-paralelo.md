# B10-05: Pipeline, Dashboard e Alertas sem fila de consultas

**Tipo:** Implementação
**Página:** Pipeline (Expansão e Retenção); Dashboard e Performance; Alertas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-navegacao-fluida.md`
**Depende de:** B10-03

## Descrição

Nas três páginas, usar a identidade única e disparar em paralelo o que não
depende entre si: no Pipeline, atendentes e cards, com as conversas dos cards
numa consulta só; no Dashboard e Performance, métricas do período e histórico;
em Alertas, configuração de limiares, cards e conversas. Cards e alertas
passam a ter limite de linhas.

Cobre os comportamentos de "Pipeline", "Dashboard e Performance" e "Alertas".

## Pronto quando

No CRM publicado, as três páginas mostram os mesmos números e cards de antes
para admin, gerente e atendente, o log do servidor mostra uma busca de usuário
e uma de perfil por requisição, e o tempo de resposta do servidor cai em
relação a antes.

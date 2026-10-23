# B41-02: Editar e apagar funis e etapas

**Tipo:** Implementação
**Página:** Configurações → Funis
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-funis-personalizados.md`

## Descrição

Renomear funil, reordenar etapas, apagar etapa (vazia ou com cards, escolhendo o destino) e apagar funil com os cards, depois de confirmar. Depende da B41-01.

## Pronto quando

Na tela de funis dá para mudar a ordem das etapas, apagar etapa levando os cards para outra e apagar um funil inteiro, e o quadro reflete cada mudança.

## Critérios de aceite

- **CA-B41-07** (automática) — Mudar a ordem das etapas muda a ordem das colunas. Dado um funil com as etapas A, B e C, quando o Gerente sobe a etapa C para o topo, então o quadro mostra as colunas na ordem C, A, B, e os cards continuam nas etapas em que estavam
- **CA-B41-09** (automática) — Apagar etapa com cards pede o destino. Dado uma etapa com 4 cards, num funil que tem outras etapas, quando o Admin apaga a etapa e escolhe a etapa de destino, então os 4 cards passam para a etapa de destino, cada um com a mudança registrada no histórico do card, e a etapa some do funil. Se ele desiste na confirmação, nada muda.
- **CA-B41-10** (automática) — Apagar etapa vazia não pede destino. Dado uma etapa sem cards, quando o Admin apaga a etapa, então ela some do funil sem nenhuma pergunta além da confirmação
- **CA-B41-12** (automática) — Apagar funil leva os cards junto, depois de confirmar. Dado um funil com 7 cards, quando o Admin pede para apagar, então a confirmação diz que 7 cards vão sair. Confirmado, o funil some da lista e do Pipeline, e os 7 cards saem com ele. Os contatos continuam existindo, e os cards que eles têm em outros funis ficam como estavam.

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B41-07 | Ao apagar etapa com cards, o que acontece? | respondida | Marcelle, 23/10/2026: pede a etapa de destino |
| PER-B41-08 | Ao apagar funil, o que acontece? | respondida | Marcelle, 23/10/2026: confirma com o número de cards, e os cards saem junto; a trava por automação foi trocada pelo aviso e pelo desligamento (ver SUP-B41-06) |

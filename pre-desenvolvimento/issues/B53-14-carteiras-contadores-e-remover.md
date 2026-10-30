# B53-14: Carteiras: total do atendente e "Remover da carteira" sem diálogo preso

**Tipo:** Implementação
**Página:** Relatórios — Carteiras
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

O atendente vê só o total da carteira; "Remover da carteira" não aparece para quem tem 0 e o diálogo fecha depois de remover.

## Pronto quando

O atendente vê "N na carteira" sem selo confuso e remover fecha o diálogo.

## Critérios de aceite

- **CA-B53-27** (automática) — Atendente vê só o total da carteira. Dado um atendente com 2 contatos na carteira, quando ele abre a aba Carteiras, então vê "2 na carteira" e nenhum selo "Minha carteira 1".
- **CA-B53-28** (automática) — Remover só com contatos na carteira. Dado um vendedor com 0 contatos na carteira, quando o Admin vê a linha dele, então "Remover da carteira" não está disponível.
- **CA-B53-29** (automática) — Remover fecha o diálogo. Dado um vendedor com 3 contatos, quando o Admin confirma "Remover da carteira", então o diálogo fecha e a linha mostra 0.

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B53-02 | O "Remover da carteira" que ficou aberto mostrando 0 era a segunda abertura do diálogo, já com 0 contatos? O código atual fecha o diálogo depois de remover. | aberta | — |

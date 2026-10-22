# B28-07: Remover as tabelas de sequência do banco (depois do merge)

**Tipo:** Implementação
**Página:** Banco
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-espera-e-fim-das-sequencias.md`

## Descrição

Com o branch no ar e o código sem ler as sequências, uma migration apaga as tabelas de
sequência e a ligação do lembrete com elas. Fica para depois do merge porque o banco é um
só para produção e preview: apagar antes quebraria a produção, que ainda roda o código
antigo. É o mesmo caminho da B11-13.

## Pronto quando

A migration foi aplicada com o ok do Luan, e a suíte, o build e os roteiros passam de novo.

## Critérios de aceite

- **CA-B28-36** (manual) — As tabelas de sequência saem do banco depois do merge. Dado o branch no ar há pelo menos um dia, sem erro, quando o Luan aprova, então a migration apaga as tabelas de sequência, e a suíte, o build e os roteiros passam de novo.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

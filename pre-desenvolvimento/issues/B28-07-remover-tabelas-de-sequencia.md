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

## Deixado pela B28-06 (25/10/2026)

O código ainda lê as tabelas de sequência em dois lugares, e eles saem junto com elas:

- `src/app/(auth)/configuracoes/automacoes/opcoes-editor.ts` carrega `sequences` para a frase do bloco antigo de "iniciar sequência" (o campo `sequencias` de `OpcoesEditor`, que vários testes de tela preenchem com `[]`).
- `src/app/(auth)/configuracoes/automacoes/actions.ts` conta `sequences` em `conferirReferencias`, para o `sequencia_id` desses blocos.
- `src/app/(auth)/agenda/origem-do-lembrete.tsx` ainda rotula a origem `sequencia` dos lembretes antigos (hoje são zero).
- Os testes de integração `atendente-contatos-seguranca` e `cadastro-*` gravam ou limpam `sequences` e `sequence_runs`.

# B28-04: Regra desativada, excluída ou editada com contatos esperando

**Tipo:** Implementação
**Página:** Automações (lista e editor)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-espera-e-fim-das-sequencias.md`

## Descrição

Desativar ou excluir a regra cancela as esperas dela; editar mantém quem espera num bloco
que continua no fluxo e cancela quem espera num bloco apagado. Antes de cada uma dessas
mudanças, o admin vê quantos contatos estão esperando e confirma.

## Pronto quando

No preview, com contatos esperando numa regra, desativar, excluir ou apagar o bloco de
espera mostra o aviso com o número de contatos e, confirmado, deixa as execuções canceladas
no histórico com o motivo; trocar a ação depois do bloco mantém a espera, e a ação nova
roda quando ela acaba.

## Critérios de aceite

- **CA-B28-18** (automática) — Desativar ou excluir cancela as esperas, depois de confirmar. Dado uma regra com 2 contatos esperando, quando o admin desativa ou exclui a regra e confirma o aviso "2 contatos estão esperando nesta regra", então as duas execuções ficam canceladas no histórico ("regra desativada" ou "regra excluída") e nenhuma ação delas roda depois.
- **CA-B28-19** (automática) — Editar mantém quem espera num bloco que continua. Dado um contato esperando num bloco "esperar" de uma regra, quando o admin troca a ação depois do bloco e salva, então o contato continua esperando e, quando a espera acaba, roda a ação nova.
- **CA-B28-20** (automática) — Editar cancela quem espera num bloco apagado. Dado um contato esperando num bloco "esperar", quando o admin apaga esse bloco, confirma o aviso e salva, então a execução fica cancelada no histórico ("o bloco de espera saiu da regra").

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B28-06 | O que acontece com quem espera quando a regra muda? | respondida | Desativar e excluir cancelam; editar mantém quem espera num bloco que continua (Luan, 20/10/2026). |

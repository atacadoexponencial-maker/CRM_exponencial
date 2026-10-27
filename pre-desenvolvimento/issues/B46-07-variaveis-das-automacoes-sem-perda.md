# B46-07: Variáveis das automações sem perda e em linguagem simples

**Tipo:** Correção
**Página:** Configurações → Automações → editor
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **M-10**, **M-11**, **B-16** e **B-19**
**Gravidade:** Médio

## Descrição

O exemplo do campo ensina a digitar `{{primeiro_nome}}`, que dá erro de "texto reserva". Clicar numa variável e salvar sem "Inserir" descarta a variável em silêncio. Os erros vêm juntos numa frase, meio cobertos pelo painel, e um texto diz "regra".

## Pronto quando

O exemplo não tem chaves, a variável pendente não some ao salvar, os erros aparecem um por linha e o texto diz "automação".

## Critérios de aceite

- **CA-B46-16** (automática) — Exemplo sem chaves. Dado o campo de texto do lembrete e o da mensagem no editor, quando estão vazios, então o exemplo não tem `{{` e diz para clicar no botão do nome
- **CA-B46-17** (automática) — Variável pendente não some ao salvar. Dado o campo do lembrete com "Ligar para " e a caixa do "Primeiro nome" aberta, sem "Inserir", quando se clica em Salvar, então a variável é inserida com o texto reserva da caixa (ou "cliente", se vazio) antes de salvar, e o lembrete fica "Ligar para {primeiro nome}"
- **CA-B46-18** (automática) — Erros do editor um por linha. Dado uma automação sem nome, com um bloco incompleto e sem ação ligada, quando se clica em Salvar, então os três problemas aparecem em três linhas, numa área que o painel lateral não cobre

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B46-03 | A variável pendente é inserida ao salvar, em vez de bloquear o Salvar (CA-B46-17) | aberta | |

## Perguntas em aberto

Nenhuma.

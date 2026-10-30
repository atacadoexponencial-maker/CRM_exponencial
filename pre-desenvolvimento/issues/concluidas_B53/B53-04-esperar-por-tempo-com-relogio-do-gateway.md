# B53-04: "Esperar 1 minuto" segue sozinho com o relógio do gateway

**Tipo:** Implementação
**Página:** Automações — esperar por tempo
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-roteiro-luan.md`

## Descrição

Nada muda no CRM: acompanha a publicação da A11-01 (relógio das automações) no gateway e a configuração da variável na VPS, e confere o resultado.

## Pronto quando

Com o gateway publicado, uma espera de 1 minuto segue sozinha.

## Critérios de aceite

- **CA-B53-07** (manual) — "Esperar 1 minuto" segue sozinho. Dado o gateway publicado com o relógio (A11-01) e a variável configurada, e uma regra com "esperar 1 minuto" entre duas mensagens, quando o gatilho dispara, então a segunda mensagem sai entre 1 minuto e 1 minuto e 30 segundos depois da primeira e o Histórico deixa de mostrar "Esperando".

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B53-03 | Quando o Luan publica a A11-01 (relógio das automações) no gateway? O commit 2a71e2d não está no repositório do gateway, e a VPS não tem nem o código nem a variável (conferido em 30/10/2026). | respondida | Publicada em 30/10/2026: merge no `master` do gateway (b21564b), imagem nova na VPS e `CRM_RELOGIO_URL` configurada. Falta o teste manual do CA-B53-07. |

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B53-07 | Marcelle | 30/10/2026 |

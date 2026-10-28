# B47-03: Resposta citada só da própria empresa

**Tipo:** Implementação
**Página:** Mensagem enviada e recebida pelo canal direto
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-5.md`

## Descrição

Procurar a mensagem citada numa resposta só na empresa do número por onde o evento do
canal direto chegou.

## Pronto quando

Uma resposta que cita mensagem de outra empresa fica sem citação ligada, e citar mensagem
da própria empresa continua ligando as duas.

## Critérios de aceite

- **CA-B47-08** (automática) — resposta não cita mensagem de outra empresa. Dado um evento do canal direto que cita o identificador de uma mensagem de outra empresa, quando a mensagem é gravada, então ela fica sem mensagem citada ligada, e citar uma mensagem da própria empresa continua ligando as duas.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

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

## Cenários

### Happy Path
1. `acharMensagemPorWamid` passa a receber a empresa e procura a mensagem citada só nela (`workspace_id`), como a reação e o aviso de editada/apagada já fazem desde a B44-03.
2. A mensagem recebida (`registrarMensagemRecebida`) e a enviada pelo celular (`registrarEnviadaPeloCelular`) passam a empresa do número por onde o evento chegou.

### Edge Cases
- **Citação de mensagem que o CRM não tem:** fica só a prévia, como hoje.
- **Mesmo identificador em duas empresas:** liga só à da empresa do evento.

### Cenário de Erro
- Nenhum novo: a busca que não acha devolve "sem citação", como hoje.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B47-08 | automática | `src/test/resposta-citada-da-empresa.integration.test.ts` | no banco de teste, uma mensagem recebida e uma enviada pelo celular que citam o identificador de uma mensagem de outra empresa são gravadas sem citação ligada; citando uma mensagem da própria empresa, ficam ligadas a ela |

## Banco de Dados

Nenhuma mudança.

## Arquivos

- **Modificar:** `src/lib/whatsapp/recebimento.ts` — a mensagem citada é procurada na empresa do evento
- **Modificar:** `src/lib/whatsapp/enviada-pelo-celular.ts` — passa a empresa na busca da mensagem citada
- **Criar:** `src/test/resposta-citada-da-empresa.integration.test.ts` — teste do CA-B47-08

## Checklist

- [x] Procurar a mensagem citada só na empresa do evento
- [x] Rodar os testes do canal direto (lição L-05)
- [x] Rodar o `tsc` no projeto inteiro

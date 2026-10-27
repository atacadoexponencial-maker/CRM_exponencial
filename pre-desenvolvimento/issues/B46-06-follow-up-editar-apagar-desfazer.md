# B46-06: Follow-up com editar, apagar e desfazer o Feito

**Tipo:** Correção
**Página:** Agenda
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **M-09**, **B-14** e **C-25**
**Gravidade:** Alto

## Descrição

Na Agenda, o follow-up só tem Adiar e Feito. Errou a nota ou o contato, não tem como corrigir, e o Feito some sem desfazer. O Agendar fica cinza sem dizer o que falta.

## Pronto quando

Dá para editar e apagar um follow-up, desfazer um Feito por alguns segundos, e o Agendar diz o que falta. O nome do contato leva à ficha.

## Critérios de aceite

- **CA-B46-11** (automática) — Editar follow-up. Dado o follow-up de amanhã para a Ana com a nota "Ligar", quando o dono do follow-up muda a data para depois de amanhã e a nota para "Ligar às 10h", então o follow-up fica com a data e a nota novas, e a data no passado continua recusada
- **CA-B46-12** (automática) — Apagar follow-up. Dado o follow-up da Ana, quando o dono confirma Apagar, então o follow-up sai da Agenda e do banco
- **CA-B46-13** (automática) — Desfazer o Feito. Dado o follow-up da Ana marcado como Feito, quando se clica em Desfazer, então o follow-up volta para a Agenda como pendente, com a mesma data
- **CA-B46-14** (automática) — Qualquer usuário da empresa mexe no follow-up, e só da empresa. Dado o follow-up de um atendente da empresa, quando outro Atendente da mesma empresa edita ou apaga, e um usuário de outra empresa tenta o mesmo, então o da mesma empresa consegue, e o de outra empresa é recusado sem mudar nada
- **CA-B46-15** (automática) — Agendar diz o que falta. Dado o formulário de Novo follow-up sem contato escolhido, quando se clica em Agendar, então aparece "Escolha o contato", e nada é criado

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B46-02 | O follow-up pode ser editado e apagado por quem o criou, pelo atendente dele e por Admin e Gerente, como já é no adiar | invalidada | Por enquanto, todo usuário da empresa edita e apaga qualquer follow-up da empresa (CA-B46-14 reescrito). Luan, 27/10/2026 |

## Perguntas em aberto

Nenhuma.

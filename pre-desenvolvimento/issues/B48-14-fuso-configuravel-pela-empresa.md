# B48-14: Fuso do CRM configurável pela empresa

**Tipo:** Correção
**Página:** Configurações (empresa) e todas as telas com data
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, pedido do Luan ao responder a SUP-B48-01
**Gravidade:** Médio

## Descrição

Depois da B48-01, o CRM mostra tudo no horário de Brasília. O Luan pediu que a empresa possa trocar o fuso. Só o Admin troca, e vale para todos da empresa. Precisa de uma coluna nova em `workspaces` (migration só acrescenta).

## Pronto quando

O Admin escolhe o fuso em Configurações e todas as telas da empresa passam a mostrar as horas nele; empresa sem escolha fica em Brasília.

## Critérios de aceite

- **CA-B48-35** (automática) — Empresa nova começa no horário de Brasília. Dado uma empresa sem fuso escolhido, quando uma tela formata a hora de um movimento feito às 18:00 UTC, então aparece "15:00"
- **CA-B48-36** (automática) — Admin troca o fuso e as telas seguem. Dado a empresa no horário de Brasília, quando o Admin escolhe "Manaus (UTC−4)" e salva, então o mesmo movimento aparece com "14:00" para todos os usuários da empresa
- **CA-B48-37** (automática) — Só o Admin troca o fuso. Dado um Gerente ou um Atendente da empresa, quando tenta salvar outro fuso, então o servidor recusa ("Sem permissão") e o fuso continua o mesmo

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B48-04 | O fuso é da empresa e só o Admin troca (B48-14). Era a recomendação, aceita junto com as outras | confirmada | Luan, 27/10/2026 ("pode levar em consideração as recomendações") |

## Perguntas em aberto

Nenhuma.

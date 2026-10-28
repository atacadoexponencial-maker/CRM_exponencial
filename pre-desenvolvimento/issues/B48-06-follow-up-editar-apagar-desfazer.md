# B48-06: Follow-up com editar, apagar e desfazer o Feito

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

- **CA-B48-11** (automática) — Editar follow-up. Dado o follow-up de amanhã para a Ana com a nota "Ligar", quando o dono do follow-up muda a data para depois de amanhã e a nota para "Ligar às 10h", então o follow-up fica com a data e a nota novas, e a data no passado continua recusada
- **CA-B48-12** (automática) — Apagar follow-up. Dado o follow-up da Ana, quando o dono confirma Apagar, então o follow-up sai da Agenda e do banco
- **CA-B48-13** (automática) — Desfazer o Feito. Dado o follow-up da Ana marcado como Feito, quando se clica em Desfazer, então o follow-up volta para a Agenda como pendente, com a mesma data
- **CA-B48-14** (automática) — Quem vê o follow-up mexe nele, e só da empresa. Dado o follow-up que a automação criou para a Ana, quando a Ana e o Gerente editam ou apagam, e o Admin de outra empresa tenta o mesmo, então a Ana e o Gerente conseguem, e o de outra empresa é recusado sem mudar nada
- **CA-B48-15** (automática) — Agendar diz o que falta. Dado o formulário de Novo follow-up sem contato escolhido, quando se clica em Agendar, então aparece "Escolha o contato", e nada é criado

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B48-02 | O follow-up pode ser editado e apagado por quem o criou, pelo atendente dele e por Admin e Gerente, como já é no adiar | invalidada | Por enquanto, todo usuário da empresa edita e apaga qualquer follow-up da empresa (CA-B48-14 reescrito). Luan, 27/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. Na Minha Agenda, o menu "⋯" de cada lembrete tem **Editar** e **Apagar**.
2. Editar abre o mesmo formulário do Novo follow-up, preenchido (contato, data e hora de Brasília, nota), com o botão "Salvar".
3. Apagar pede confirmação com o nome do contato em negrito e tira o lembrete da Agenda e do banco.
4. Feito tira o lembrete e mostra "Feito. Desfazer" por 6 segundos; Desfazer volta o lembrete para pendente, com a mesma data.
5. O nome do contato no lembrete leva à ficha dele.

### Edge Cases
- Lembrete de automação também se edita e se apaga (o Luan pediu edição geral).
- Data no passado ao editar: recusada com "A data do follow-up já passou.", como ao criar.
- Agendar ou Salvar sem contato, data ou nota: o botão não fica cinza; o clique diz o que falta ("Escolha o contato", "Escolha a data", "Escreva uma nota para o follow-up").
- A Agenda da equipe (Admin e Gerente) continua com Adiar, Feito e Reatribuir; o Editar e o Apagar ficam na Minha Agenda.

### Cenário de Erro
- Lembrete apagado em outra aba, ou de quem não pode mexer: "Este lembrete não existe mais ou não é seu."
- Falha ao desfazer: "Não foi possível desfazer", e o lembrete continua feito.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B48-11 | automática | `src/test/agenda-editar-apagar.integration.test.ts` | A nota e a data novas ficam gravadas; data no passado é recusada e nada muda |
| CA-B48-12 | automática | `src/test/agenda-editar-apagar.integration.test.ts` | Depois de apagar, a linha não existe mais no banco |
| CA-B48-13 | automática | `src/test/agenda-editar-apagar.integration.test.ts` | Desfazer volta o status para pendente, sem `done_at`, com o mesmo vencimento |
| CA-B48-14 | automática | `src/test/agenda-editar-apagar.integration.test.ts` | A Ana edita o lembrete dela criado pela automação, o Gerente edita e apaga o da Ana, e o Admin de outra empresa é recusado sem mudar nada |
| CA-B48-15 | automática | `src/test/agenda-editar-apagar.test.tsx` | Agendar sem contato mostra "Escolha o contato" e não chama `criarFollowUp` |

## Banco de Dados

- Tabela: `reminders` — política nova "Exclusão de lembretes por papel" (`for delete`), com a mesma regra da atualização: Admin e Gerente na empresa toda, o atendente nos dele, fora o contato na lixeira. Migration `20261027000020_apagar_lembrete.sql`, que só acrescenta.

## Arquivos

- **Criar:** `supabase/migrations/20261027000020_apagar_lembrete.sql` — política de exclusão em `reminders`.
- **Modificar:** `src/app/(auth)/agenda/actions.ts` — `editarLembrete`, `apagarLembrete`, `desfazerFeito`, e `lerVencimento` e `contatoDaEmpresa` usados também pelo `criarFollowUp`.
- **Modificar:** `src/app/(auth)/agenda/agenda-client.tsx` — menu Editar/Apagar, formulário que edita, confirmação de apagar, "Feito. Desfazer", Agendar que diz o que falta, nome com link para a ficha.
- **Modificar:** `src/lib/datas.ts` — `paraCamposDoFormulario`, data e hora de Brasília para o formulário.
- **Criar:** `src/test/agenda-editar-apagar.integration.test.ts` — CA-B48-11 a CA-B48-14 no banco.
- **Criar:** `src/test/agenda-editar-apagar.test.tsx` — CA-B48-15 e a tela de editar, apagar e desfazer.

## Checklist

- [x] Migration da política de exclusão
- [x] Actions de editar, apagar e desfazer
- [x] Tela da Agenda com Editar, Apagar, Desfazer e o Agendar que diz o que falta
- [ ] Migration aplicada no banco (`supabase db push`), com o ok do Luan
- [ ] Testes do CA-B48-11 a CA-B48-15 passando
- [x] Testes que renderizam a Agenda passando (L-05), tsc (L-07) e lint

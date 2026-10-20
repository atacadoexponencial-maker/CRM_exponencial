# B28-01: Ação "criar lembrete na Agenda" e teste da Agenda

**Tipo:** Implementação
**Página:** Automações (editor e motor) e Agenda
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-espera-e-fim-das-sequencias.md`

## Descrição

A automação ganha a ação "Criar lembrete na Agenda", que substitui a etapa de lembrete das
sequências: texto com variáveis, para quem (o responsável pela conversa, que é o padrão, ou
uma pessoa escolhida) e vencimento (na hora, ou depois de N horas ou dias). Junto, um
roteiro do preview passa pela Agenda inteira, que é o teste da "área de tarefas" que o Luan
pediu.

## Pronto quando

No preview, uma regra com a ação cria o lembrete na Agenda do responsável, marcado como
"Lembrete de automação" com o nome da regra; ele se marca, adia e reatribui como os
avulsos. O roteiro da Agenda passa inteiro.

## Critérios de aceite

- **CA-B28-27** (automática) — A ação cria o lembrete na Agenda do responsável. Dado um contato com conversa atribuída à Ana, e uma regra com "criar lembrete na Agenda" (texto "Ligar para {{nome_contato}}", para o responsável, vence em 2 dias), quando a regra roda, então a Agenda da Ana mostra "Ligar para Bruno", vencendo daqui a 2 dias, marcado como "Lembrete de automação".
- **CA-B28-28** (automática) — Sem responsável, o lembrete vai para o primeiro admin ativo. Dado um contato sem conversa atribuída, quando a regra com "para o responsável" roda, então o lembrete vai para o primeiro admin ativo da empresa.
- **CA-B28-29** (automática) — Pessoa escolhida desativada faz a ação falhar com o motivo. Dado uma regra com o lembrete para uma pessoa que foi desativada, quando a regra roda, então a ação falha e o histórico diz "a pessoa escolhida está desativada".
- **CA-B28-30** (automática) — O lembrete de automação se marca, adia e reatribui como os outros. Dado um lembrete criado por automação na Agenda, quando a pessoa marca feito, adia 1 dia ou o gerente reatribui, então a Agenda mostra o mesmo resultado que mostra para um lembrete avulso.
- **CA-B28-37** (automática) — Roteiro do preview passa pela Agenda inteira. Dado a empresa de teste no preview do branch, quando o roteiro roda, então passam: criar follow-up, vê-lo na Minha Agenda, marcar feito, adiar, atrasado com o selo no menu, Agenda da equipe com filtro por pessoa, reatribuir, e o lembrete criado pela automação.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B28-04 | A ação "criar lembrete na Agenda" tem as opções: texto com variáveis, para quem (responsável pela conversa ou pessoa escolhida) e vencimento (na hora, ou depois de N horas ou dias). Sem responsável, vai para o primeiro admin ativo, como a sequência fazia. | confirmada | Luan, 20/10/2026: o padrão do bloco é o responsável pela conversa, e dá para escolher outra pessoa. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B28-04 | O que é a "área de tarefas"? | respondida | A Agenda; a automação ganha "criar lembrete na Agenda" para substituir a etapa de lembrete das sequências (Luan, 20/10/2026). |

## Cenários

### Happy Path
1. O admin põe a ação "Criar lembrete na Agenda", escreve o texto (com variáveis), deixa "Responsável pela conversa" e escolhe "vence em 2 dias".
2. A regra roda: o motor acha o responsável pela conversa do contato, troca as variáveis do texto e grava o lembrete (`origem = 'automacao'`, com o nome da regra), vencendo daqui a 2 dias.
3. A Agenda do responsável mostra o lembrete com o ícone de automação e "Automação: <nome da regra>". Feito, adiar e reatribuir são os mesmos dos avulsos.

### Edge Cases
- Contato sem conversa aberta, ou conversa sem responsável: vai para o primeiro admin ativo (o mais antigo), como a sequência fazia.
- Pessoa escolhida no bloco desativada, ou que saiu da empresa: a ação falha com o motivo; o Salvar também recusa, como no "atribuir atendente" (B22-02).
- Vencimento vazio ou 0: vence na hora. Fora de 0–365 dias ou 0–8760 horas, ou com fração: o Salvar recusa.
- Texto vazio: o Salvar recusa ("Complete a configuração da ação"). Até 500 caracteres.

### Cenário de Erro
- Erro ao gravar: a ação falha com "Erro ao gravar no banco" e o caminho segue, como nas outras ações.
- Empresa sem admin ativo e sem responsável: a ação falha com "Ninguém para receber o lembrete".

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B28-27 | automática | `src/test/automacoes-acoes.test.ts` | lembrete gravado para o responsável da conversa, com o texto com variáveis trocadas, vencimento em 2 dias e origem automação |
| CA-B28-28 | automática | `src/test/automacoes-acoes.test.ts` | sem responsável, o lembrete vai para o primeiro admin ativo |
| CA-B28-29 | automática | `src/test/automacoes-acoes.test.ts` | pessoa escolhida desativada: a ação falha com "A pessoa escolhida está desativada" e nada é gravado |
| CA-B28-30 | automática | `src/test/agenda-lembrete-automacao.test.tsx` | o lembrete de automação aparece como "Lembrete de automação", com a regra, e Feito e Adiar chamam as mesmas ações dos avulsos |
| CA-B28-37 | automática | `e2e/preview/roteiro-b28-agenda.cjs` | o roteiro passa por follow-up, feito, adiar, atrasado, selo, equipe com filtro, reatribuir e o lembrete da automação, no preview |

## Banco de Dados

- Migration `supabase/migrations/20261020000006_lembrete_de_automacao.sql` (só acrescenta):
  - `reminders.origem` passa a aceitar `'automacao'` (a regra antiga continua valendo para `'sequencia'` e `'avulso'`).
  - `reminders.automacao_nome` (text, nulo) — cópia do nome da regra que criou o lembrete, como o histórico guarda.

## Arquivos

- **Criar:** `supabase/migrations/20261020000006_lembrete_de_automacao.sql` — origem `automacao` e coluna `automacao_nome`
- **Criar:** `src/lib/automacoes/lembrete.ts` — a ação: quem recebe, vencimento e gravação
- **Criar:** `src/test/agenda-lembrete-automacao.test.tsx` — CA-B28-30
- **Criar:** `e2e/preview/roteiro-b28-agenda.cjs` — CA-B28-37
- **Modificar:** `src/lib/fluxo-automacao.ts` — `criar_lembrete` (tipo, obrigatórios, disponível, validação do vencimento e do texto)
- **Modificar:** `src/lib/automacoes/acoes.ts` — chama `criarLembrete`
- **Modificar:** `src/lib/automacoes/contexto.ts` — a regra que está rodando vai no contexto (nome do lembrete)
- **Modificar:** `src/lib/automacoes/index.ts` — passa a regra no contexto
- **Modificar:** `src/lib/automacoes/envio.ts` — exporta `preencherVariaveis`
- **Modificar:** `src/lib/automacoes/referencias.ts` — `responsavel_id` conferido como atendente ativo
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/catalogo.ts` — a ação no menu (grupo "Agenda") e o campo de vencimento
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/painel-bloco.tsx` — campo de vencimento (número + horas/dias)
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/frases-fluxo.ts` — frase do bloco
- **Modificar:** `src/app/(auth)/agenda/actions.ts` — `origem` e `automacao_nome` no item
- **Modificar:** `src/app/(auth)/agenda/agenda-client.tsx` e `src/app/(auth)/agenda/equipe/agenda-equipe-client.tsx` — ícone e "Automação: <regra>"
- **Modificar:** `src/integrations/supabase/types.ts` — regerado depois da migration
- **Modificar:** `src/test/automacoes-acoes.test.ts` — CA-B28-27 a 29

## Checklist

- [ ] Migration criada e aplicada (só acrescenta)
- [ ] Tipos regerados
- [ ] `criar_lembrete` no formato do fluxo, com validação
- [ ] Ação no motor (`lembrete.ts`)
- [ ] Editor: menu, painel com vencimento, frase
- [ ] Referências: responsável conferido no Salvar
- [ ] Agenda mostra o lembrete de automação
- [ ] Testes CA-B28-27 a 30
- [ ] Roteiro CA-B28-37 no preview

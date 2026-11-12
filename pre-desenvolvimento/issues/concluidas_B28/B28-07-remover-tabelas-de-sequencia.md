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

## Cenários

### Happy Path

Com o código deste branch no ar, a migration roda na produção: as três tabelas, a função
`salvar_sequencia` e a coluna `reminders.sequence_run_id` saem. O editor de automações
abre e salva sem ler `sequences`; a Agenda mostra os lembretes avulsos e de automação.

### Edge Cases

- Regra gravada antes com "iniciar sequência": continua marcada como ação removida no
  editor e no Salvar, e falha no motor com o motivo (B28-06). Na produção, em 10/11/2026,
  nenhuma regra tem esse bloco.
- Lembrete com origem `sequencia`: zero na produção em 10/11/2026; a origem sai da regra
  da tabela e do rótulo da Agenda.

### Cenário de Erro

Migration na produção antes do deploy: o editor de automações em produção leria
`sequences` e quebraria. Por isso a ordem é merge, deploy conferido e só depois o
`db push --linked`.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B28-36 | manual | roteiro abaixo | depois do merge e do deploy, com o ok do Luan, a migration roda na produção; as tabelas saem, e a suíte, o build e o editor de automações seguem funcionando |

### Roteiro manual — CA-B28-36

1. Merge do PR e deploy da Vercel conferido.
2. Com o ok do Luan: `npx supabase db push --linked`.
3. Conferir na produção que `sequences`, `sequence_steps` e `sequence_runs` não existem
   mais e que `reminders` não tem `sequence_run_id`.
4. Abrir uma automação no editor e a Agenda na produção, e olhar o Sentry no dia seguinte.

No banco de teste (10/11/2026): `npm run db:teste:push` aplicou a migration; `tsc`, lint,
build, os 1535 testes sem banco e os 14 arquivos de integração de automações, Agenda,
cadastro e segurança (90 testes) passaram depois dela.

## Banco de Dados

Migration `supabase/migrations/20261110000001_remover_tabelas_de_sequencia.sql`: o gatilho
de mesma empresa dos lembretes volta a olhar só atendente e contato; sai
`reminders.sequence_run_id`; a regra de `reminders.origem` fica `avulso` ou `automacao`;
saem `salvar_sequencia`, `sequence_runs`, `sequence_steps` e `sequences`. Na produção,
em 10/11/2026: 44 sequências (as 4 prontas de 11 empresas, nenhuma criada por alguém),
99 passos, 2 execuções canceladas, nenhum lembrete ligado. Nada é copiado.

## Arquivos

- **Criar:** `supabase/migrations/20261110000001_remover_tabelas_de_sequencia.sql` — a migration
- **Modificar:** `src/integrations/supabase/types.ts` — gerado de novo do banco de teste, sem as tabelas
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/opcoes-editor.ts` — não carrega mais `sequences`
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/actions.ts` — `conferirReferencias` não conta mais `sequences`
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/catalogo.ts` — sai `sequencias` de `OpcoesEditor` e das fontes; o bloco removido fica sem campo
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/frases-fluxo.ts` — o bloco removido mostra só o rótulo
- **Modificar:** `src/lib/automacoes/referencias.ts` — não junta mais `sequencia_id`
- **Modificar:** `src/app/(auth)/agenda/actions.ts` — origem sem `sequencia`
- **Modificar:** `src/app/(auth)/agenda/origem-do-lembrete.tsx` — sai o rótulo "Lembrete de sequência"
- **Modificar:** `src/test/atendente-contatos-seguranca.integration.test.ts` — sem a sequência e a execução
- **Modificar:** `src/test/referencias-entre-empresas-seguranca.integration.test.ts` — sem a sequência e o caso de `sequence_runs`
- **Modificar:** `src/test/cadastro-empresa.integration.test.ts` — limpeza sem `sequences`
- **Modificar:** `src/test/cadastro-seguranca.integration.test.ts` — limpeza sem `sequences`
- **Modificar:** `src/test/automacoes-fluxo-recebido.test.ts` — o bloco removido não cita sequência para conferir
- **Modificar:** `src/test/automacao-condicao-perfil-rfv-tela.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `src/test/automacao-entrou-perfil-rfv-tela.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `src/test/automacao-perfil-rfv-historico-tela.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `src/test/automacao-salvar-e-ativar.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `src/test/automacoes-anotacao.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `src/test/automacoes-arquivo-grande.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `src/test/automacoes-espera-editor.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `src/test/automacoes-historico-tela.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `src/test/automacoes-lista-interruptor.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `src/test/automacoes-modelos.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `src/test/automacoes-orientacao-painel.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `src/test/automacoes-referencias-apagadas.test.ts` — opções do editor sem `sequencias`
- **Modificar:** `src/test/automacoes-regra-com-esperas.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `src/test/automacoes-salvar-uma-vez.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `src/test/campos-personalizados-automacoes-tela.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `src/test/campos-personalizados-variaveis-tela.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `src/test/fim-das-sequencias.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `src/test/funis-nas-automacoes.test.ts` — opções do editor sem `sequencias`
- **Modificar:** `src/test/remover-nicho-campanhas-automacoes.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `src/test/variaveis-sem-perda.test.tsx` — opções do editor sem `sequencias`
- **Modificar:** `e2e/modulo-0.spec.ts` — limpeza sem `sequences`
- **Modificar:** `e2e/preview/limpar-banco.cjs` — sem `sequence_runs`
- **Modificar:** `e2e/preview/resetar-empresa-teste.cjs` — sem `sequence_runs` e `sequences`
- **Modificar:** `e2e/preview/popular-empresa-teste-b36.cjs` — não cria mais sequência
- **Modificar:** `e2e/preview/fotos-das-telas.cjs` — sai `/sequencias`, que só redireciona
- **Modificar:** `e2e/preview/README.md` — sai o roteiro da B11-08
- **Apagar:** `e2e/preview/roteiro-b11-08.cjs` — montava "iniciar sequência", que saiu na B28-06

## Checklist

- [x] Migration escrita e aplicada no banco de teste
- [x] `types.ts` gerado de novo do banco de teste
- [x] Código sem leitura de `sequences` (editor, Salvar, Agenda)
- [x] Testes e roteiros sem as tabelas

Fica para depois do merge, como teste manual: o `db push --linked` na produção, com o ok do Luan (CA-B28-36).

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B28-36 | Luan | 10/11/2026 |

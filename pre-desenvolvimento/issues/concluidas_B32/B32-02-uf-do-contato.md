# B32-02: UF do contato

**Tipo:** Implementação
**Página:** Novo contato (`/contatos`), perfil do contato (`/contatos/[id]`) e painel do contato no chat (`/chat`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-relatorios-visao-geral.md`

## Descrição

O contato ganha o campo UF, com a lista fixa das 27 siglas, ao lado da cidade nos três lugares onde a cidade já é editada ou mostrada. O servidor só aceita sigla válida ou vazio. Contatos antigos ficam sem UF.

## Pronto quando

Na empresa de teste, abrir o perfil de um contato, escolher "PE" e salvar mostra "Recife · PE" no perfil e no painel do chat. Criar um contato novo já com UF funciona. Um salvamento forçado com "XX" é recusado.

## Critérios de aceite

- **CA-B32-25** (automática) — Salvar a UF do contato. Dado o perfil de um contato sem UF, quando o usuário escolhe "PE" e salva, então o perfil mostra "PE" ao lado da cidade e o valor fica gravado no contato.
- **CA-B32-26** (automática) — UF só aceita sigla válida. Dado um pedido de salvar contato com UF "XX", quando o servidor valida, então recusa com a mensagem "UF inválida" e nada é gravado.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B32-09 | A UF entra só onde a cidade já é editada ou mostrada (novo contato, perfil, painel do chat) e no relatório. Campanhas, automações, lista de contatos e importação ficam para depois. | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. Admin abre o perfil de um contato, clica em Editar, escolhe "PE" na lista de UF ao lado da cidade e salva.
2. O servidor (`atualizarDadosContato`) confere que a UF está na lista das 27 e grava `contacts.uf = 'PE'`.
3. O perfil mostra a linha "UF: PE"; o painel do contato no chat mostra "UF" editável com a mesma lista; o diálogo de novo contato já tem o campo.

### Edge Cases
- UF vazia ("") vira nulo, tanto ao criar quanto ao editar.
- Contatos antigos ficam com UF nula e mostram "—".
- O gatilho de automação "dado do contato alterado" continua olhando só tipo, nicho e cidade (SUP-B32-09).

### Cenário de Erro
- UF fora da lista (ex.: "XX") é recusada pelo servidor com "UF inválida" e nada é gravado; o banco também recusa (check constraint).
- Atendente continua sem permissão para criar ou editar contato.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B32-25 | automática | `src/test/contato-uf.integration.test.ts` | Admin salva "PE" via `atualizarDadosContato`; `buscarDadosContato` devolve `uf = "PE"` e o banco tem o valor; `criarContato` com UF também grava |
| CA-B32-26 | automática | `src/test/contato-uf.integration.test.ts` | `atualizarDadosContato` e `criarContato` com "XX" devolvem `erro = "UF inválida"` e o contato continua sem UF |

## Banco de Dados

- Tabela: `contacts`
  - `uf` (char(2), nula) — sigla do estado do contato; check na lista das 27 UFs.

## Arquivos

- **Criar:** `supabase/migrations/20261021000007_uf_do_contato.sql` — coluna `uf` com check.
- **Criar:** `src/lib/uf.ts` — lista fixa das 27 UFs (sigla e nome) e `ufValida()`.
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado pela CLI após a migration.
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `criarContato` e `atualizarDadosContato` recebem `uf`, validam e gravam; `PERFIL_SELECT` e o perfil devolvem `uf`.
- **Modificar:** `src/app/(auth)/contatos/mock-contatos.ts` — tipo `Contato` ganha `uf`.
- **Modificar:** `src/app/(auth)/contatos/components/novo-contato-dialog.tsx` — select de UF ao lado da cidade.
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — select de UF na edição e linha "UF" na leitura.
- **Modificar:** `src/app/(auth)/chat/actions.ts` — `CadastroDoContato` e `buscarInfoContato` com `uf`.
- **Modificar:** `src/app/(auth)/chat/components/painel-contato.tsx` — "UF" editável com a lista; `salvarCampo` manda `uf`.
- **Criar:** `src/test/contato-uf.integration.test.ts` — testes da tabela Prova.

## Dependências Externas

Nenhuma.

## Checklist

- [x] Migration criada e aplicada (`npx supabase db push --linked`), tipos regenerados
- [x] `src/lib/uf.ts` com as 27 UFs e `ufValida`
- [x] Ações de criar e atualizar contato validam e gravam a UF
- [x] Perfil, novo contato e painel do chat mostram e editam a UF
- [x] Testes CA-B32-25 e CA-B32-26 passando

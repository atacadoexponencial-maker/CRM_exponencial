# B53-10: Timeline do contato registra "Dados editados"

**Tipo:** Implementação
**Página:** Contatos — perfil
**Repositório:** `crm-exponencial`
**Spec:** `docs/specs-arquivadas/spec-correcoes-qa-roteiro-luan.md`

## Descrição

Editar os dados do contato passa a gravar um evento na timeline com quem editou e os nomes dos campos alterados.

## Pronto quando

Editar cidade e tipo de um contato aparece na timeline.

## Critérios de aceite

- **CA-B53-22** (automática) — Edição aparece na timeline. Dado um contato com cidade "Santos", quando a Marcelle muda a cidade e o tipo e salva, então a timeline mostra "Dados editados" por Marcelle, com "Cidade, Tipo".
- **CA-B53-23** (automática) — Salvar sem mudança não grava evento. Dado um contato, quando a pessoa salva sem alterar nada, então nenhum evento "Dados editados" é gravado.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B53-04 | Os campos que contam como "Dados editados" são os do formulário de edição do contato (nome, tipo, cidade, UF, ICP, observações e campos personalizados); etiquetas e dono do contato já têm registro próprio ou ficam fora. O telefone não entra: não é editável em nenhuma tela. | confirmada | Marcelle aprovou a spec sem mudança, 30/10/2026; telefone tirado (não é editável) com o ok dela no mesmo dia. |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. A Marcelle edita o contato (nome, tipo, cidade, UF, ICP) e salva: `atualizarDadosContato` compara com o que estava gravado e grava uma linha em `contato_edicoes` com ela como autora e os nomes dos campos que mudaram, em ordem alfabética ("Cidade, Tipo").
2. Observações (`atualizarObservacoesContato`) e campos personalizados (`salvarCamposDoContato`) são salvos por funções separadas: cada uma grava o próprio evento com os nomes do que mudou ("Observações"; o nome do campo personalizado).
3. A timeline do perfil (`buscarDadosContato`) mostra "Dados editados", com quem editou e a lista de campos.

### Edge Cases
- Salvar sem mudar nada não grava evento, em nenhuma das três funções.
- Vazio e nulo contam como o mesmo valor (cidade apagada que já era vazia não é mudança).
- Um Salvar que muda dados e campos personalizados grava dois eventos (um por função), cada um com os seus campos.
- Os valores antigos nunca são guardados.

### Cenário de Erro
- Se a gravação do evento falhar, a edição continua salva (o evento é registro, não trava) e o erro vai para o log do servidor.
- O RLS só deixa gravar evento em nome próprio, em contato que a pessoa vê, e só deixa ler os eventos de contato visível.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B53-22 | automática | `src/test/contato-dados-editados.integration.test.ts` | Contato de Santos, a Marcelle muda cidade e tipo: a timeline traz "Dados editados" por Marcelle com "Cidade, Tipo"; observações e campo personalizado também viram evento com o nome deles |
| CA-B53-23 | automática | `src/test/contato-dados-editados.integration.test.ts` | Salvar dados, observações e campos sem mudança não grava linha em `contato_edicoes` |

## Banco de Dados

- Tabela nova `contato_edicoes` (migration `supabase/migrations/20261030000010_contato_edicoes.sql`), com RLS por empresa e por `pode_ver_contato`:
  - `id` (uuid) — chave
  - `workspace_id` (uuid) — empresa
  - `contact_id` (uuid) — contato editado
  - `autor_id` (uuid, profiles) — quem editou
  - `campos` (text[]) — nomes dos campos que mudaram
  - `created_at` (timestamptz) — quando
- Sem update nem delete pela sessão. Aplicada só no banco de teste (`npm run db:teste:push`); a produção fica para a Marcelle.

## Arquivos

- **Criar:** `supabase/migrations/20261030000010_contato_edicoes.sql` — tabela, trava de empresa e RLS.
- **Modificar:** `src/integrations/supabase/types.ts` — tipo da tabela nova, no formato gerado.
- **Criar:** `src/app/(auth)/contatos/edicoes.ts` — `camposQueMudaram` e `registrarEdicao`, usados pelas actions.
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `atualizarDadosContato` e `atualizarObservacoesContato` gravam o evento; `buscarDadosContato` põe os eventos na timeline.
- **Modificar:** `src/app/(auth)/contatos/campos-personalizados.ts` — `salvarCamposDoContato` grava o evento com os nomes dos campos mudados.
- **Criar:** `src/test/contato-dados-editados.integration.test.ts` — CA-B53-22 e CA-B53-23.

## Checklist

- [x] Migration `contato_edicoes` aplicada no banco de teste
- [x] Tipo da tabela em `types.ts`
- [x] `edicoes.ts` com `camposQueMudaram` e `registrarEdicao`
- [x] Evento em `atualizarDadosContato`, `atualizarObservacoesContato` e `salvarCamposDoContato`, só com mudança
- [x] Eventos na timeline de `buscarDadosContato`
- [x] Testes da tabela Prova

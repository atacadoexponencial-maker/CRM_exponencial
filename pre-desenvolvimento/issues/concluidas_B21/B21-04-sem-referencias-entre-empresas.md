# B21-04: Nenhum registro aponta para outra empresa

**Tipo:** Implementação
**Página:** Todo o CRM (times, automações, sequências, chat, funil, etiquetas)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-3.md` — módulo 3

## Descrição

O banco passa a recusar qualquer registro que ligue empresas diferentes (usuário em time,
automação com etiqueta/atendente/time/sequência/número, sequência para contato ou conversa,
mensagens, etiquetas, notas, histórico). Antes de fechar, uma verificação procura registros
antigos que já apontem para outra empresa e os lista para a Marcelle decidir.

## Pronto quando

A verificação dos dados atuais foi rodada e o resultado mostrado à Marcelle (vazio, ou com
a decisão dela aplicada); o CRM segue funcionando como hoje; e há um teste automatizado por
tipo de ligação provando que gravar referência para algo de outra empresa é recusado.

## Cenários

> Levantamento de 08/10: 36 ligações entre tabelas de empresa (chaves estrangeiras de 24
> tabelas) só conferem que o registro apontado existe, não que é da mesma empresa.
> **Verificação dos dados atuais: nenhum registro aponta para outra empresa** — nada para
> a Marcelle decidir. As automações guardam etiqueta/atendente/time/sequência/número dentro
> do fluxo (JSON): o `salvarRegra` já confere tudo contra a empresa (`conferirReferencias`,
> B11), e o motor filtra sequência, membros de time e mensagem rápida pela empresa; o que
> sobra (etiqueta, atendente) é barrado pelas triggers desta issue na execução.

### Happy Path
Toda gravação dentro da própria empresa segue igual (CRM, webhook, gateway, automações,
sequências, campanhas, loja).

### Edge Cases
- Tabelas sem `workspace_id` (`user_teams`, `conversation_labels`, `pipeline_card_labels`,
  `pipeline_card_history`, `catalog_order_items`, `catalog_order_events`): os dois registros
  apontados têm de ser da mesma empresa.
- Coluna nula ou registro inexistente: a trigger não decide (a chave estrangeira decide).
- Vale também para a service role: é regra do dado, não de papel.

### Cenário de Erro
Gravação que aponta para outra empresa: erro `Registro de outra empresa em <tabela>.<coluna>`
(código 42501); nada é gravado.

## Banco de Dados

- Função `public.garantir_mesma_empresa()` (trigger genérica; argumentos `coluna:tabela`).
- Trigger `garantir_mesma_empresa` (`before insert or update of <colunas>`) nas 24 tabelas.

## Arquivos

- **Criar:** `supabase/migrations/20261008000005_sem_referencias_entre_empresas.sql` — função e triggers.
- **Criar:** `src/test/referencias-entre-empresas-seguranca.integration.test.ts` — 14 tipos de ligação recusados entre empresas e aceitos dentro da empresa, mais troca de responsável.

## Checklist

- [x] Verificação dos dados atuais (36 ligações, nenhuma entre empresas)
- [x] Migration com função e triggers
- [x] Teste novo passando (29)
- [x] Todos os testes de integração (28 arquivos) passando com as triggers
- [x] Migration aplicada (não depende de código)

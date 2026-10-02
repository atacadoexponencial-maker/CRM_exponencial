# B12-03: Times padrão se chamam Entrada e Recompra

**Tipo:** Implementação
**Página:** Configurações › Times, Cadastro de empresa
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-renomear-funis.md` — seção "Times e Cadastro de empresa"

## Descrição

Renomear os dois times padrão (`is_default = true`) de todas as empresas: "Expansão" →
"Entrada" e "Retenção" → "Recompra", mantendo id e membros. Empresas novas já nascem com
os nomes novos (`src/app/cadastro/actions.ts:71-72`). Times customizados (`is_default =
false`) não são tocados, mesmo que tenham um desses nomes. Testes que conferem os nomes
dos times padrão (cadastro, times, usuários, E2E de cadastro) passam a esperar os nomes
novos.

Hoje (02/10) são 4 empresas com os dois times padrão.

## Pronto quando

No CRM publicado, Configurações › Times de qualquer empresa existente mostra os times
padrão como "Entrada" e "Recompra", com os mesmos membros de antes, ainda bloqueados para
editar e excluir; e uma empresa cadastrada agora nasce com "Entrada" e "Recompra".

## Cenários

### Happy Path
1. A migration renomeia, em todas as empresas, os times padrão: "Expansão" → "Entrada",
   "Retenção" → "Recompra". Mesmo `id`, mesmos membros (`user_teams` não muda).
2. Configurações › Times mostra "Entrada" e "Recompra", ainda com o cadeado de time
   padrão (editar/excluir bloqueados pela regra `is_default` que já existe em
   `configuracoes/times/actions.ts`).
3. Cadastro de empresa nova cria os dois times já com os nomes novos.

### Edge Cases
- Time customizado (`is_default = false`) chamado "Expansão" ou "Retenção": não muda.
  O `update` filtra por `is_default = true` **e** pelo nome antigo.
- Empresa sem os times padrão (ex.: workspaces vazios "Marcelle Teste" e o "Atacado
  Exponencial" sem usuário): nada a fazer, o `update` não acha linha.
- Ordem de deploy indiferente: a migration só mexe em dados existentes e o código só
  afeta empresas novas — qualquer um dos dois pode entrar primeiro.
- Rodar a migration duas vezes não muda nada (o filtro pelo nome antigo não acha mais
  linha).

### Cenário de Erro
- Cadastro: se a criação dos times falhar, continua o erro que já existe ("Erro ao
  criar times padrão").
- Volta atrás: `update teams set name = 'Expansão' where is_default and name =
  'Entrada'` (e o mesmo para Recompra → Retenção), registrado em comentário na migration.

## Banco de Dados

- Tabela: `teams` (sem mudança de schema)
  - `name` (text) — dois `update` de dados, só em `is_default = true`.
- Hoje (02/10): 4 empresas × 2 times padrão.
- Lembrete (memória do projeto): criar o `.sql` não aplica nada; rodar
  `npx supabase db push --linked` depois.

## Arquivos

- **Criar:** `supabase/migrations/20261002000001_times_padrao_entrada_recompra.sql` —
  os dois `update` e o comentário de volta atrás.
- **Modificar:** `src/app/cadastro/actions.ts` — nomes dos times padrão (l. 71–72).
- **Modificar:** `src/test/cadastro-empresa.integration.test.ts` — teste "times …
  criados automaticamente" espera "Entrada" e "Recompra" (l. 194–202).
- **Modificar:** `src/test/times.integration.test.ts` — fixtures dos times padrão, nomes
  de variável e títulos dos testes (`timeExpansao*` → `timeEntrada*`, etc.).
- **Modificar:** `src/test/usuarios.integration.test.ts` — idem (l. 323–391).
- **Modificar:** `e2e/modulo-0.spec.ts` — o cadastro confere "Entrada" e "Recompra"
  (l. 28–29).

Fora daqui: `src/test/gateway-alertas-de-numero.test.ts:292` usa "Expansão" como nome
de exibição de um número de WhatsApp, não de time — entra na varredura da B12-04.

## Dependências Externas

Nenhuma.

## Checklist

- [x] Migration criada com os dois `update` (filtro `is_default` + nome antigo) e a volta atrás comentada
- [x] `src/app/cadastro/actions.ts` cria "Entrada" e "Recompra"
- [x] Testes de integração de cadastro, times e usuários com os nomes novos
- [x] E2E de cadastro com os nomes novos (editado; não executado — o E2E não limpa o que cria e voltaria a sujar o banco)
- [x] `npx supabase db push --linked` aplicado
- [x] Conferir no banco: 4 Entrada + 4 Recompra, nenhum nome antigo; membros 0 antes e depois
- [x] `npx vitest run` nos três arquivos de integração passando (43/43, 02/10)
- [x] Testes: não há plano de testes da série B12; os testes existentes de times foram atualizados
- [x] `npx tsc --noEmit` e `npm run lint` sem erro novo

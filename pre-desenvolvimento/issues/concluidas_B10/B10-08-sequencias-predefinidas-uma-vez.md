# B10-08: Sequências predefinidas conferidas uma vez por empresa

**Tipo:** Implementação
**Página:** Sequências
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-navegacao-fluida.md`
**Depende de:** B10-03

## Descrição

Registrar na empresa que as sequências predefinidas já foram criadas, de modo
que abrir a biblioteca de Sequências não faça mais essa conferência a cada
visita. Empresas antigas que já têm as predefinidas ganham o registro na
migração; empresas novas ganham no cadastro.

Cobre: "Abrir Sequências não recria nem confere sequências predefinidas a cada
visita".

## Pronto quando

No CRM publicado, abrir Sequências não gera consulta de contagem de
predefinidas no log; uma empresa cadastrada do zero continua vendo as
sequências predefinidas na primeira visita.

## Cenários

### Happy Path
1. Empresa nova se cadastra: logo após criar workspace, admin e times, o
   cadastro semeia as 4 sequências do método (`garantirSequenciasPredefinidas`).
2. Admin abre Sequências: a página lista o que existe; não conta nem cria
   predefinidas.

### Edge Cases
- Empresas já cadastradas sem predefinidas: um script único, rodado uma vez
  agora com a service role, chama `garantirSequenciasPredefinidas` para cada
  workspace. Não precisa de coluna nem migração: a função já é idempotente
  (só semeia quando não há predefinida).
- Falha na semeadura durante o cadastro: silenciosa, como a função já é; o
  admin cria sequências manualmente. Não bloqueia o cadastro.

### Cenário de Erro
- Nenhum novo.

## Banco de Dados
Não se aplica (decisão: sem coluna de registro; a semeadura muda de lugar).

## Arquivos

- **Modificar:** `src/app/(auth)/sequencias/page.tsx` — remove a chamada a
  `garantirSequenciasPredefinidas` e o import.
- **Modificar:** `src/app/cadastro/actions.ts` — chama
  `garantirSequenciasPredefinidas(workspaceId)` depois de criar os times.
- **Operacional (fora do repo):** script único semeando as empresas existentes.

## Dependências Externas
Nenhuma.

## Checklist

- [x] Página de Sequências sem a conferência por visita
- [x] Cadastro semeando as predefinidas
- [x] Empresas existentes semeadas (script único executado)
- [x] `npm run lint`, `npm run build` e testes passando
- [x] Conferido no build local: Sequências lista as 4 do método

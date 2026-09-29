# B10-03: Usuário e perfil resolvidos uma vez por requisição

**Tipo:** Implementação
**Página:** Servidor por trás de todas as páginas; Sequências, Campanhas e Configurações
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-navegacao-fluida.md`
**Depende de:** nada (mas B10-04 a B10-08 se apoiam nela)

## Descrição

Criar um único ponto que resolve quem é o usuário logado e qual o seu perfil
(papel, nome, empresa), compartilhado por tudo que roda na mesma requisição, e
substituir por ele as buscas repetidas espalhadas pelo menu lateral e pelas
páginas mais simples: Perfil, Sequências, Campanhas e todas as Configurações
(incluindo WhatsApp, cujos três blocos passam a carregar em paralelo com a
identidade resolvida uma vez só). As quatro cópias locais de "perfil atual"
passam a usar esse ponto.

Cobre: identidade e perfil buscados no máximo uma vez por requisição; consultas
independentes ao mesmo tempo; menu lateral reaproveita a identidade; página de
WhatsApp em paralelo.

## Pronto quando

Abrindo Perfil, Sequências, Campanhas ou qualquer Configuração no CRM
publicado, o log do servidor mostra uma única busca de usuário e uma única de
perfil por requisição, e as páginas se comportam exatamente como antes para
admin, gerente e atendente.

## Cenários

### Happy Path
1. Admin abre Configurações → Usuários. A página chama `sessaoAtual()`
   (usuário + perfil, memoizada por requisição com `React.cache`) e passa a
   lista de times; `listarUsuarios()` chama `sessaoAtual()` de novo e recebe o
   mesmo resultado sem nova ida ao Supabase. O menu lateral, no layout, também
   reaproveita.
2. Admin abre WhatsApp: os três helpers de leitura rodam em `Promise.all`,
   todos sobre a mesma sessão já resolvida.

### Edge Cases
- Sem sessão: `sessaoAtual()` devolve `user: null, perfil: null`; cada página
  mantém seu `redirect("/login")` e cada action mantém seu retorno vazio.
- Perfil ausente (usuário sem linha em `profiles`): `perfil: null`; as
  checagens de papel existentes continuam recusando.
- Mutations (criar, editar, excluir) rodam em requisições próprias; ficam como
  estão. Só leituras de carga de página entram nesta issue.

### Cenário de Erro
- Falha no Auth ou no banco: mesmo comportamento de hoje (sem usuário →
  login; sem perfil → recusa).

## Banco de Dados
Não se aplica.

## Arquivos

- **Criar:** `src/lib/sessao.ts` — `sessaoAtual()` com `cache` do React:
  devolve `{ supabase, user, perfil }`, perfil com `id, role, name,
  workspace_id`.
- **Modificar:** `src/app/(auth)/layout.tsx` — usa `sessaoAtual()`.
- **Modificar:** páginas `perfil`, `sequencias`, `campanhas`,
  `configuracoes/usuarios`, `configuracoes/times`, `configuracoes/etiquetas`,
  `configuracoes/templates`, `configuracoes/automacoes`,
  `configuracoes/whatsapp` (`page.tsx` de cada) — trocam getUser + profiles
  por `sessaoAtual()`.
- **Modificar:** `sequencias/actions.ts`, `agenda/actions.ts`,
  `alertas/actions.ts`, `configuracoes/whatsapp/[id]/saude/actions.ts` — a
  cópia local `perfilAtual` delega para `sessaoAtual()`.
- **Modificar:** `campanhas/actions.ts` (`perfilGestor`),
  `configuracoes/automacoes/actions.ts` (`perfilAdmin`),
  `configuracoes/templates/actions.ts` (`obterConexao`),
  `configuracoes/etiquetas/actions.ts` (`listarEtiquetas`),
  `configuracoes/usuarios/actions.ts` (`listarUsuarios`),
  `configuracoes/times/actions.ts` (`listarTimes`, `listarUsuariosDoWorkspace`),
  `configuracoes/whatsapp/actions.ts` (`listarConexaoWhatsApp`,
  `listarConexoesWhatsApp`, `termoDoCanalDiretoAceito`) — idem.

## Dependências Externas
Nenhuma (`cache` vem do React 19).

## Checklist

- [x] `src/lib/sessao.ts` criado
- [x] Layout e as 9 páginas usando `sessaoAtual()`
- [x] 4 cópias locais de `perfilAtual` delegando
- [x] Helpers de leitura das actions listadas delegando
- [x] `npm run lint` e `npm run build` passando; testes existentes passando
- [x] Páginas conferidas no build local: perfil, usuários, whatsapp, sequências

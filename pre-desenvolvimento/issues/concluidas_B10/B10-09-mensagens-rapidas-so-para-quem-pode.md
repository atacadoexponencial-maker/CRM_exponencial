# B10-09: Mensagens Rápidas só no menu de quem pode abrir

**Tipo:** Implementação
**Página:** Menu lateral — Mensagens Rápidas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-navegacao-fluida.md`

## Descrição

Mostrar o item Mensagens Rápidas no menu apenas para admin, e corrigir a
consulta de perfil da página para buscar o perfil do usuário logado (hoje
busca "um perfil qualquer" e falha quando o admin enxerga mais de um).

Cobre os dois comportamentos de "Menu lateral — Mensagens Rápidas".

## Pronto quando

No CRM publicado, gerente e atendente não veem Mensagens Rápidas no menu; um
admin numa empresa com dois ou mais usuários abre a página normalmente e vê a
lista.

## Cenários

### Happy Path
1. Gerente ou atendente abre o menu: "Mensagens Rápidas" não aparece.
2. Admin numa empresa com vários usuários abre Mensagens Rápidas: a action
   resolve o perfil pelo usuário logado (`sessaoAtual()`), não por
   `.single()` sobre todos os perfis visíveis, e lista as mensagens.

### Edge Cases
- Não-admin acessando a URL direto: a action continua redirecionando para
  `/perfil`; a regra fica no servidor, o menu só deixa de anunciar.
- As mutations (criar, editar, excluir) tinham o mesmo `.single()` frágil;
  passam a usar `sessaoAtual()` também, porque falhariam do mesmo jeito.

### Cenário de Erro
- Sem sessão: `redirect("/perfil")` na listagem, `Sem permissão` nas
  mutations, como hoje.

## Banco de Dados
Não se aplica.

## Arquivos

- **Modificar:** `src/components/shared/sidebar-nav.tsx` — item Mensagens
  Rápidas com `papeis: ["admin"]`.
- **Modificar:** `src/app/(auth)/configuracoes/mensagens-rapidas/actions.ts`
  — as quatro funções usam `sessaoAtual()`.

## Dependências Externas
Nenhuma.

## Checklist

- [x] Menu só mostra Mensagens Rápidas para admin
- [x] Actions resolvem o perfil do usuário logado
- [x] `npm run lint`, `npm run build` e testes passando
- [x] Conferido no build local: gerente de teste não vê o item; página abre para admin

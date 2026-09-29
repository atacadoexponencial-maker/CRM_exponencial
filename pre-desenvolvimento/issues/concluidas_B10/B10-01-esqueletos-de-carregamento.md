# B10-01: Clique no menu responde na hora com esqueleto da página

**Tipo:** Implementação
**Página:** Área logada (todas as páginas do menu)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-navegacao-fluida.md`

## Descrição

Dar a cada rota da área logada um estado de carregamento: um esqueleto genérico
para a área toda e esqueletos próprios para Chat, Pipeline (Expansão e
Retenção), Dashboard, Alertas, Contatos e Agenda, com o mesmo título e a mesma
estrutura de blocos da página real. O menu lateral continua visível e marca o
item destino como ativo no clique.

Cobre os comportamentos de "Área logada": trocar a tela imediatamente para o
esqueleto, menu visível e clicável durante a carga, item ativo no clique,
substituição sem piscar, preparo ao passar o mouse, clique duplo sem dois
carregamentos, F5 e Voltar com a mesma resposta, esqueleto até o conteúdo
chegar, e ir ao login uma única vez quando a sessão expirou.

## Pronto quando

No CRM publicado, clicar em qualquer item do menu troca a tela na hora para um
esqueleto com o título certo, o item do menu já aparece marcado, e o conteúdo
real entra no lugar sem salto de layout. Nenhuma página fica congelada na tela
antiga enquanto carrega.

## Cenários

### Happy Path
1. Usuário logado clica em "Contatos" no menu lateral.
2. O App Router troca a tela imediatamente para `contatos/loading.tsx`: título
   "Contatos" e uma tabela com linhas cinza pulsando. O menu permanece, e o
   item "Contatos" já aparece ativo (o `usePathname` do menu muda no mesmo
   instante em que o loading entra).
3. O servidor termina `page.tsx`; o conteúdo real substitui o esqueleto no
   mesmo contêiner (`max-w-6xl mx-auto px-4 py-8`), sem salto.
4. Passar o mouse sobre um item do menu dispara o prefetch padrão do
   `next/link`; com loading boundary, o Next 16 já entrega o esqueleto
   pré-carregado no clique.

### Edge Cases
- Rotas filhas herdam o loading do pai: `/pipeline/retencao` usa
  `pipeline/loading.tsx`; `/dashboard/performance` usa `dashboard/loading.tsx`;
  `/agenda/equipe` usa `agenda/loading.tsx`. `/contatos/[id]` ganha um
  loading genérico próprio para não mostrar tabela no perfil do contato.
- Clique duplo no mesmo link: o roteador deduplica a navegação; nada a fazer.
- F5 e Voltar: o `loading.tsx` é um Suspense de rota, vale para carga inicial
  e para o histórico.
- Sessão expirada: o middleware redireciona para `/login` antes de qualquer
  render, então o esqueleto não aparece.

### Cenário de Erro
- Se o servidor falhar, o comportamento atual (erro do Next) permanece. Esta
  issue não adiciona `error.tsx`.

## Banco de Dados
Não se aplica.

## Arquivos

- **Criar:** `src/components/shared/esqueleto.tsx` — primitivo `Esqueleto`
  (`div` com `rounded bg-muted animate-pulse`, aceita `className`) e
  `EsqueletoPagina` (contêiner `max-w-4xl mx-auto px-4 py-8`, barra de título e
  N blocos), reutilizado por todos os loadings.
- **Criar:** `src/app/(auth)/loading.tsx` — esqueleto genérico da área logada
  (`EsqueletoPagina`).
- **Criar:** `src/app/(auth)/chat/loading.tsx` — aside `w-80 border-r` com
  título "Caixa de Entrada" e 8 linhas de conversa; main vazio com barra de
  digitação na base. Mesma altura do `chat-layout` (`calc(100vh - 57px)`).
- **Criar:** `src/app/(auth)/pipeline/loading.tsx` — barra superior
  `px-6 py-4 border-b` e 5 colunas com 3 cards cada, em `flex gap-3 p-4`.
- **Criar:** `src/app/(auth)/dashboard/loading.tsx` — `max-w-5xl`, título
  "Dashboard", 4 cartões de métrica e um bloco de gráfico.
- **Criar:** `src/app/(auth)/alertas/loading.tsx` — `max-w-4xl`, título
  "Central de Alertas", 6 cartões de alerta.
- **Criar:** `src/app/(auth)/contatos/loading.tsx` — `max-w-6xl`, título
  "Contatos", linha de filtros e tabela com 10 linhas.
- **Criar:** `src/app/(auth)/contatos/[id]/loading.tsx` — `EsqueletoPagina`
  genérico.
- **Criar:** `src/app/(auth)/agenda/loading.tsx` — `max-w-4xl`, título
  "Minha Agenda", 2 grupos de dia com 3 lembretes cada.

Reutilizar: `cn` de `@/lib/utils`. Nada muda no `sidebar-nav.tsx`: o link já é
`next/link` com prefetch padrão e o estado ativo vem de `usePathname`.

## Dependências Externas
Nenhuma.

## Checklist

- [x] Criar `Esqueleto` e `EsqueletoPagina` em `src/components/shared/esqueleto.tsx`
- [x] Criar `loading.tsx` genérico em `src/app/(auth)/`
- [x] Criar `loading.tsx` de Chat, Pipeline, Dashboard, Alertas, Contatos, Contatos/[id] e Agenda
- [x] `npm run lint` e `npm run build` passando
- [x] Conferir no dev server que o clique no menu mostra o esqueleto e o item ativo antes do conteúdo

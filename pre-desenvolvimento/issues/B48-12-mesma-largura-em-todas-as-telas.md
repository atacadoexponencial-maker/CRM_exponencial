# B48-12: Mesma margem e largura em todas as telas

**Tipo:** Correção
**Página:** Todas as telas de `src/app/(auth)`
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-correcoes-qa-ux.md`
**Origem:** `pre-desenvolvimento/analise-qa/qa-ux-2026-10-27.md`, achados **M-13**, **B-10** e **B-22**
**Gravidade:** Médio

## Descrição

Cada tela começa o conteúdo num ponto diferente (de 260 a 476 px) e algumas deixam metade da tela vazia. O título pula ao navegar.

## Pronto quando

Todas as telas usam o mesmo contêiner de página, na largura normal ou na larga.

## Critérios de aceite

- **CA-B48-29** (automática) — Um contêiner de página só. Dado as páginas de `src/app/(auth)`, quando se confere o contêiner da página, então nenhuma monta o próprio contêiner centralizado, e todas usam o mesmo contêiner de página (`CLASSE_DA_PAGINA`), com a mesma largura e as mesmas margens; Chat, Pipeline e editor de automação ocupam a tela inteira
- **CA-B48-30** (manual) — Título no mesmo lugar ao navegar. Dado o desktop a 1440 px, quando se passa por Catálogo, Contatos, Automações, Funis, Agenda e Nova campanha, então o título começa no mesmo ponto em todas, e Times, Catálogo e Agenda não deixam metade da tela vazia

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. Todas as telas de lista, configuração, relatório, catálogo, agenda, alertas, campanhas e perfil (e os carregamentos delas) usam o mesmo contêiner: `max-w-6xl`, centralizado, com as mesmas margens.
2. Ao navegar entre elas, o título começa no mesmo ponto.

### Edge Cases
- O editor de campanha e a ficha do contato eram estreitos (`max-w-3xl`): o contêiner é o mesmo, e o conteúdo estreita por dentro (`*:max-w-3xl`), alinhado à esquerda com o título das outras telas.
- Agenda e Alertas eram `max-w-4xl`: ficam na largura das outras, sem margem enorme dos lados em tela larga.
- Chat, Pipeline e o editor de automação ocupam a tela inteira, como antes.
- O espaço vazio dentro de Times e das Configurações do catálogo (B-10, B-22) é do conteúdo da tela; fica para a conferência visual do CA-B48-30.

### Cenário de Erro
- Sem mudança de servidor.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B48-29 | automática | `src/test/mesma-largura-em-todas-as-telas.test.ts` | Nenhum arquivo de `src/app/(auth)` tem contêiner centralizado com largura própria, e 36 usam o `CLASSE_DA_PAGINA` |
| CA-B48-30 | manual | roteiro abaixo | O título começa no mesmo ponto em todas, sem metade da tela vazia |

### Roteiro manual — CA-B48-30
1. No preview do branch, com a janela em 1440 px, passe por Catálogo, Contatos, Automações, Funis, Agenda e Nova campanha.
2. Confira que o título de cada uma começa no mesmo ponto, e que Times, Catálogo e Agenda não deixam metade da tela vazia.

## Arquivos

- **Criar:** `src/lib/pagina.ts` — `CLASSE_DA_PAGINA`.
- **Modificar:** `src/app/(auth)/agenda/equipe/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/agenda/loading.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/agenda/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/alertas/loading.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/alertas/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/campanhas/[id]/page.tsx` — contêiner da página, conteúdo estreito por dentro.
- **Modificar:** `src/app/(auth)/campanhas/[id]/relatorio/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/campanhas/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/catalogo/aparencia/aparencia-client.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/catalogo/configuracoes/configuracoes-client.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/catalogo/importar/importar-client.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/catalogo/pedidos/pedidos-client.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/catalogo/produtos-client.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/catalogo/produtos/[id]/editor-client.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/historico/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/configuracoes/campos/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/configuracoes/etiquetas/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/configuracoes/funis/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/configuracoes/mensagens-rapidas/mensagens-rapidas-client.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/configuracoes/templates/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/configuracoes/times/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/ritmo/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/saude/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — contêiner da página, conteúdo estreito por dentro.
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/contatos/lixeira/lixeira-client.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/contatos/loading.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/dashboard/loading.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/dashboard/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/dashboard/performance/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/perfil/page.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/relatorios/loading.tsx` — contêiner da página.
- **Modificar:** `src/app/(auth)/relatorios/page.tsx` — contêiner da página.
- **Criar:** `src/test/mesma-largura-em-todas-as-telas.test.ts` — teste do CA-B48-29.

## Checklist

- [x] `CLASSE_DA_PAGINA` criada
- [x] As 36 telas e carregamentos com o contêiner
- [x] Teste do CA-B48-29 e a suíte unitária inteira (as 10 falhas que sobram já existem na master: tema, foto de perfil, miniatura de documento, planilha e esqueleto), tsc e lint

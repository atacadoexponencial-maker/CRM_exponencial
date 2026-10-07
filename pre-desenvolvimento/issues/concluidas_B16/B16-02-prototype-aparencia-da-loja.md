# B16-02: Protótipo — Aparência da loja

**Tipo:** Protótipo
**Página:** Aparência da loja (`/catalogo/aparencia`)
**Spec:** `pre-desenvolvimento/spec-catalogo.md` — seção "Aparência da loja"

## Descrição

Tela de personalização com prévia ao vivo, com dados de exemplo e sem gravar: logo,
banner, nome, texto de boas-vindas, cores com aviso de contraste, lista curada de fontes
e os três modelos de layout (Grade, Lista, Destaque) em celular e computador.

## Pronto quando

No CRM publicado, a Marcelle troca cores, fonte e layout e vê a prévia mudar na hora nas
duas larguras, e escolhe a lista de fontes e o desenho dos três layouts.

## Cenários

### Happy Path
1. Na aba **Aparência** (`/catalogo/prototipo/aparencia`), Admin/Gerente vê à esquerda os
   controles e à direita a **prévia ao vivo** da vitrine com os produtos de exemplo da
   B16-01.
2. Controles: logo (escolher arquivo, trocar, remover), banner de capa (escolher, trocar,
   remover), nome da loja, texto de boas-vindas, cor principal e cor de fundo (seletor +
   código hex), fonte (lista curada com amostra do nome da loja em cada uma) e modelo de
   layout (Grade, Lista, Destaque, cada um com miniatura).
3. Cada mudança aparece na prévia na hora. Botão **Celular / Computador** troca a largura
   da prévia.
4. **Salvar** mostra "Salvo no protótipo"; **Descartar alterações** volta ao último estado
   salvo. Com mudança não salva, os dois botões ficam ativos e aparece "Alterações não
   salvas".
5. A prévia é o **mesmo componente** da vitrine pública (B16-03/B16-07): nada de cópia
   só para a prévia. Ela reage à largura do próprio quadro (container queries), não à da
   janela.

### Edge Cases
- **Contraste**: a cor do texto sobre o fundo e sobre os botões é escolhida
  automaticamente (preto ou branco, o que contrastar mais). Aviso quando a cor
  principal e o fundo ficam parecidos demais (razão de contraste < 3:1, regra WCAG para
  elementos gráficos e texto grande): preços e botões ficariam difíceis de ver.
- **Sem logo**: a vitrine mostra o nome da loja no lugar. **Sem banner**: o topo fica só
  com nome e boas-vindas.
- **Logo/banner**: PNG, JPG, SVG ou WebP; logo até 2 MB, banner até 5 MB; outro formato
  ou tamanho mostra erro sem trocar a imagem.
- **Layout Destaque sem produto em destaque**: mostra só as categorias, sem faixa vazia.
- **Fontes**: carregadas pelo `next/font/google` (baixadas no build e servidas pelo
  próprio CRM — a vitrine não chama o Google em tempo real).
- **Tema do CRM sempre escuro**: a prévia tem o fundo escolhido pela loja, isolado do
  tema do CRM (cores definidas no próprio quadro).
- Atendente: sem acesso (redireciona, como a B16-01).

### Cenário de Erro
- Sem banco: nada pode falhar ao gravar; recarregar volta ao tema de exemplo.

## Arquivos

- **Criar:** `src/app/loja/components/tema.ts` — tipo `TemaLoja`, tema padrão, cálculo de contraste (luminância WCAG) e cor de texto automática
- **Criar:** `src/app/loja/components/fontes.ts` — as 8 fontes curadas via `next/font/google` (id, nome, estilo)
- **Criar:** `src/app/loja/components/vitrine.tsx` — vitrine apresentacional: cabeçalho (logo/nome, carrinho), banner, boas-vindas, categorias e produtos nos 3 layouts, com container queries (reaproveitada na B16-03 e B16-07)
- **Criar:** `src/app/(auth)/catalogo/components/editor-aparencia.tsx` — controles, aviso de contraste, prévia celular/computador, salvar/descartar (apresentacional; base da B16-08)
- **Criar:** `src/app/(auth)/catalogo/prototipo/aparencia/page.tsx` + `prototipo-aparencia-client.tsx` — rota temporária (sai na B16-08)
- **Modificar:** `src/app/(auth)/catalogo/prototipo/dados-exemplo.ts` — tema e logo de exemplo
- **Modificar:** `src/app/(auth)/catalogo/prototipo/prototipo-produtos-client.tsx` — aba Aparência ativa nos `HREFS_PROTOTIPO`; a faixa deixa de citar só a B16-01

> Reuso: `AbasCatalogo`, `FaixaPrototipo`, `formatarPreco` e os produtos de exemplo da
> B16-01; `Button`, `Input`, `Label` de `src/components/ui`.

## Checklist

- [x] `tema.ts` com contraste e cor de texto automática
- [x] `fontes.ts` com as 8 fontes
- [x] `vitrine.tsx` nos 3 layouts, com e sem logo/banner, reagindo à largura do quadro
- [x] Editor de aparência com todos os controles, aviso de contraste, prévia celular/computador, salvar/descartar
- [x] Aba Aparência ligada no protótipo
- [x] `npm run build` e `npm run lint` passam
- [x] Conferência visual: `next start` + Playwright — capturas dos 3 layouts em celular e computador e do aviso de contraste (03/10: 15 verificações; corrigidos no caminho — títulos herdam a fonte da loja, que o CSS global do CRM fixava, e a prévia Computador desenha a 1280 px e reduz)
- [x] Commit + push (`e0d83a5`); deploy Ready; link para a Marcelle (03/10) — aprovado (a Marcelle autorizou seguir a série até o fim sem perguntar, 03/10)

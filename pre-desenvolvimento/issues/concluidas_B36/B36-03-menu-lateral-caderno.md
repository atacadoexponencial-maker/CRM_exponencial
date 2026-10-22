# B36-03: Menu lateral no estilo Caderno

**Tipo:** Implementação
**Página:** Menu lateral (todas as telas internas)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Redesenhar o menu lateral como no quadro: marca no topo, grupos com título, item ativo destacado, crachás e o usuário no pé com o menu do usuário.

## Pronto quando

O menu de qualquer tela interna segue o quadro, aberto, recolhido e no celular, com os mesmos itens e permissões de hoje.

## Critérios de aceite

- **CA-B36-13** (automática) — Menu com os mesmos itens e permissões de hoje. Dado um Admin, um Gerente e um Atendente, quando cada um vê o menu, então cada um vê exatamente os itens que vê hoje, nos mesmos grupos, com os mesmos crachás, e o item da tela atual destacado.
- **CA-B36-14** (manual) — Menu aprovado visualmente. Dado o preview com a empresa de teste, quando a Marcelle olha o menu aberto, recolhido e no celular, nos dois temas, então ela aprova que ele segue o quadro (linha A, cor Grafite).

## Suposições

Nenhuma.

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B36-03 | Onde a pessoa troca o tema? | respondida | No menu do usuário (Marcelle, 21/10/2026) |

## Cenários

### Happy Path
O menu lateral ganha o fundo do menu (#EFECE4 no claro), a marca no topo, os grupos com título discreto, o item ativo com fundo e negrito e os crachás de pendência no tom de aviso. O usuário (iniciais, nome e papel) vai para o pé do menu e abre o menu do usuário (perfil, tema, sair). A barra de cima do computador sai.

### Edge Cases
- Menu recolhido: só ícones; o crachá vira um ponto; o usuário vira a bolinha das iniciais.
- Celular: barra do topo com a logo, a bolinha do usuário e o botão do menu, que abre a gaveta com o mesmo conteúdo.
- O Chat descontava a altura da barra de cima: no computador passa a usar a altura toda da tela; no celular continua descontando a barra do menu.

### Cenário de Erro
- Nenhum novo: o menu não grava nada além do que já gravava (menu recolhido).

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B36-13 | automática | `src/test/menu-lateral.test.tsx` | Admin, Gerente e Atendente veem exatamente os itens e grupos de antes, os crachás de Agenda e Pedidos e só a tela atual destacada |
| CA-B36-14 | manual | roteiro abaixo | o menu segue o quadro, aberto, recolhido e no celular, nos dois temas |

### Roteiro manual — CA-B36-14
1. Abra o preview e entre com a empresa de teste.
2. Confira o menu aberto: marca no topo, grupos Rotina, Automação e Configurações, item da tela atual com fundo e negrito, você no pé do menu.
3. Clique no seu nome no pé do menu e troque para Escuro; confira o menu escuro e volte para Claro.
4. Recolha o menu pelo botão ao lado da logo: só ícones e a bolinha com suas iniciais.
5. No celular (ou com a janela estreita), abra o menu pelo botão do topo.
6. Aprove se seguir o quadro (linha A, cor Grafite).

## Arquivos

- **Modificar:** `src/components/shared/sidebar-nav.tsx` — desenho Caderno, item ativo com `aria-current`, crachá no tom de aviso, usuário no pé
- **Modificar:** `src/components/shared/menu-do-usuario.tsx` — variante em linha (iniciais, nome e papel) para o pé do menu
- **Modificar:** `src/app/(auth)/layout.tsx` — sai a barra de cima do computador
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — altura da tela inteira no computador, sem a barra de cima
- **Modificar:** `src/app/(auth)/chat/loading.tsx` — mesma altura do Chat
- **Criar:** `src/test/menu-lateral.test.tsx` — itens, grupos, crachás e item ativo por papel

## Checklist

- [x] Fundo, marca, grupos e itens no estilo Caderno
- [x] Crachás no tom de aviso, em fonte de número
- [x] Usuário no pé do menu (aberto e recolhido)
- [x] Barra de cima do computador removida e altura do Chat ajustada
- [x] Teste dos itens por papel

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B36-14 | Marcelle | 22/10/2026 |

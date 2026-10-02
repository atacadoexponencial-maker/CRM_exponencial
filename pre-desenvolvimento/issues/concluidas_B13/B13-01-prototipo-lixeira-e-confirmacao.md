# B13-01: Protótipo da lixeira e do diálogo de exclusão

**Tipo:** Protótipo
**Página:** Lixeira (`/contatos/lixeira`) e o diálogo de confirmação (painel do card, lista e perfil do contato)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-lixeira-contatos.md`

## Descrição

Montar com dados de exemplo, sem banco: a página da Lixeira (lista com nome, telefone,
funis que foram junto, quem excluiu, quando e "apaga em N dias"; Restaurar; Apagar de
vez; estado vazio; aviso dos 30 dias) e o diálogo "Excluir <nome>?" nas variações: só um
card, dois cards, com conversas e mensagens. Mostrar também o botão "Excluir" no painel
do card, na lista e no perfil, e o aviso "Este contato está na lixeira" do perfil.

## Pronto quando

A Marcelle abre o protótipo publicado, vê a lixeira com exemplos (inclusive vazia) e o
diálogo nas três variações, e aprova a forma antes da implementação.

## Cenários

### Happy Path
1. Marcelle abre `/contatos/lixeira/prototipo` (fora do menu, qualquer usuário logado).
2. Seção **Lixeira**: lista de exemplo com 4 contatos — um com card em Entrada, um com
   cards nos dois funis, um sem card, um com "apaga hoje" — mostrando nome, telefone,
   funis, quem excluiu, quando, "apaga em N dias", botões "Restaurar" e "Apagar de vez",
   o aviso fixo dos 30 dias e o link de volta "Contatos". Um seletor "com itens / vazia"
   mostra o estado vazio ("A lixeira está vazia").
3. "Apagar de vez" abre a confirmação "Esta ação não pode ser desfeita".
4. Seção **Diálogo de exclusão**: três botões abrem o diálogo "Excluir <nome>?" nas
   variações (a) só um card, (b) dois cards — avisando que o card do outro funil vai
   junto, (c) com 3 conversas e 48 mensagens. Todas avisam que fica 30 dias na lixeira.
5. Seção **Onde fica o botão**: reprodução estática do topo do painel do card com
   "Excluir" (cor de perigo, separado das ações comuns), de uma linha da lista de contatos
   com a ação "Excluir", do topo do perfil com "Excluir contato", e do aviso do perfil
   "Este contato está na lixeira" com "Restaurar" e "Ir para a lixeira".

### Edge Cases
- Nenhum botão grava nada: Restaurar, Apagar de vez e Confirmar só fecham o diálogo.
- Nome de contato longo e contato sem nome (mostra o telefone) estão nos exemplos.
- O link "Lixeira (N)" da lista de contatos aparece na reprodução da lista.

### Cenário de Erro
- O diálogo de exclusão tem a variação (d) com a mensagem de erro "Não foi possível
  excluir. Tente de novo." visível, para aprovar o texto e o lugar.

## Banco de Dados

Não se aplica (dados fixos).

## Arquivos

- **Criar:** `src/app/(auth)/contatos/components/dialogo-excluir-contato.tsx` — diálogo de
  confirmação apresentacional (props: nome, funis dos cards, conversas, mensagens, erro,
  aberto, ao confirmar, ao fechar). Reaproveitado na B13-02 nos três lugares.
- **Criar:** `src/app/(auth)/contatos/lixeira/components/lista-lixeira.tsx` — lista
  apresentacional da lixeira (itens por props, estado vazio, confirmação de "Apagar de
  vez"). Reaproveitada na B13-04 com dados reais.
- **Criar:** `src/app/(auth)/contatos/lixeira/prototipo/page.tsx` — rota temporária; monta
  as seções com os exemplos. Sai na B13-04.
- **Criar:** `src/app/(auth)/contatos/lixeira/prototipo/dados-exemplo.ts` — os contatos de
  exemplo. Sai na B13-04.

Reaproveita: `Dialog`, `DialogPopup`, `DialogTitle`, `DialogDescription`, `DialogClose` de
`src/components/ui/dialog.tsx`; `Button` (variantes `destructive` e `outline`) de
`src/components/ui/button.tsx`; `Badge` de `src/components/ui/badge.tsx`; ícones Lucide
(`Trash2`, `RotateCcw`). Padrão de protótipo da B9-01 (`45a8ea3`): rota temporária fora
do menu, dados fixos, cabeçalho explicando que sai depois. Tema sempre escuro (memória:
nada de `dark:` e nada de fundo claro sem cor de texto).

## Dependências Externas

Nenhuma.

## Checklist

- [x] `dialogo-excluir-contato.tsx` com as variações (um card, dois cards, conversas, erro)
- [x] `lista-lixeira.tsx` com itens, estado vazio e confirmação de "Apagar de vez"
- [x] Rota `/contatos/lixeira/prototipo` com as quatro seções e os dados de exemplo
- [x] Nenhuma gravação, nenhum item novo no menu
- [x] `npx tsc --noEmit`, `npm run lint` e `npm run build` sem erro novo
- [x] Conferência visual (build local + Playwright, workspace temporário apagado) — página, vazia, diálogo nas variações e "Apagar de vez" (02/10)
- [x] Publicado (`222a72c`) e aprovado pela Marcelle em 02/10/2026

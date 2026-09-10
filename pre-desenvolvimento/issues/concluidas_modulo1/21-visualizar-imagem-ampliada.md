# 21: Visualizar Imagem Recebida em Tamanho Ampliado

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar o lightbox ao clicar em uma imagem recebida no chat: a imagem é exibida em tamanho ampliado sobre a tela, com opção de fechar.

## Cenários

### Happy Path
1. Usuário clica em uma imagem (recebida ou enviada) que possui URL (`http` ou `blob:`)
2. Backdrop escuro cobre a tela inteira
3. Imagem é exibida centralizada em tamanho ampliado (`max-w-[90vw] max-h-[90vh] object-contain`)
4. Botão X aparece no canto superior direito do popup
5. Usuário clica no X — dialog fecha
6. Usuário clica no backdrop — dialog fecha
7. Usuário pressiona Escape — dialog fecha (comportamento padrão do Base UI Dialog)

### Edge Cases
- Imagem sem URL (placeholder estático com nome de arquivo) — não abre lightbox, não tem cursor pointer
- Imagem muito pequena — exibe no tamanho real sem esticar (object-contain)
- Imagem muito larga — limitada a 90vw/90vh via CSS

### Cenário de Erro
- Imagem falha ao carregar dentro do lightbox — o elemento `<img>` simplesmente não renderiza (comportamento nativo do browser)

## Arquivos

- **Modificar:** `src/app/(auth)/chat/components/balao-mensagem.tsx` — adicionar lightbox ao case `imagem` usando Dialog do Base UI

## Checklist

- [x] Importar `Dialog`, `DialogTrigger`, `DialogPopup`, `DialogClose` de `@/components/ui/dialog`
- [x] Importar `X` de `lucide-react`
- [x] No case `imagem`, quando `conteudo` for URL, envolver `<img>` com `Dialog` + `DialogTrigger`
- [x] Adicionar `DialogPopup` customizado: backdrop escuro (`bg-black/80`), imagem centralizada com `max-w-[90vw] max-h-[90vh] object-contain`
- [x] Adicionar botão `DialogClose` com ícone `X` posicionado no canto superior direito do popup
- [x] Adicionar `cursor-pointer` na imagem miniatura para indicar interatividade
- [x] Placeholder estático (sem URL) permanece sem lightbox e sem cursor pointer

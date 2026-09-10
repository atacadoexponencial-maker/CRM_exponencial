# 23: Reproduzir Áudio Recebido no Chat

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar o player de áudio inline para mensagens de áudio recebidas: o usuário pode dar play, pausar e ver o progresso da reprodução diretamente no balão da mensagem.

## Observação de Pesquisa

O `case "audio"` em `balao-mensagem.tsx` atualmente renderiza `<audio controls>` nativo para URLs (adicionado na issue 20). Esta issue substitui esse elemento pelo player customizado que segue o design do projeto (Tailwind + Lucide Icons). O placeholder estático (duração sem URL) permanece inalterado.

## Cenários

### Happy Path
1. Mensagem de áudio com URL aparece no balão com botão Play circular
2. Usuário clica em Play — áudio começa a tocar, ícone muda para Pause, barra de progresso avança
3. Usuário clica em Pause — áudio pausa, ícone volta para Play
4. Usuário clica na barra de progresso — reprodução salta para a posição clicada
5. Áudio termina — ícone volta para Play, barra de progresso reseta para 0

### Edge Cases
- Áudio sem URL (mock com string de duração como `"0:28"`) — exibe placeholder estático (sem player)
- Metadados não carregados ainda — duração exibe `0:00` até `loadedmetadata`
- Múltiplos players na tela — cada um tem seu próprio estado independente

### Cenário de Erro
- Arquivo de áudio indisponível na URL — evento `error` do `<audio>` resulta em player com botão Play mas sem resposta ao click (comportamento nativo)

## Arquivos

- **Modificar:** `src/app/(auth)/chat/components/balao-mensagem.tsx` — substituir `<audio controls>` por componente `PlayerAudio` customizado

## Checklist

- [x] Importar `Pause` de `lucide-react`
- [x] Criar componente `PlayerAudio({ src }: { src: string })` em `balao-mensagem.tsx` com `audioRef`, estados `tocando`, `tempoAtual`, `duracao`
- [x] Implementar `handleToggle` (play/pause via `audioRef.current`), `handleTimeUpdate`, `handleLoadedMetadata`, `handleEnded`
- [x] Renderizar: `<audio ref>` oculto + botão Play/Pause circular + barra de progresso clicável + contador `M:SS`
- [x] Barra de progresso: `<div>` clicável com div interna de preenchimento proporcional (`width: X%`)
- [x] Função `formatarTempo(segundos: number): string` para converter segundos em `M:SS`
- [x] No `case "audio"`, substituir `<audio src controls>` por `<PlayerAudio src={mensagem.conteudo} />`
- [x] Manter placeholder estático para áudio sem URL

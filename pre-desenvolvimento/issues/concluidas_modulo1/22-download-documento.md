# 22: Fazer Download de Documento Recebido

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar o botão de download em documentos recebidos no chat: ao clicar, o arquivo é baixado para o dispositivo do usuário.

## Observação de Pesquisa

A funcionalidade de download já está implementada em `src/app/(auth)/chat/components/balao-mensagem.tsx` como efeito colateral da issue 18 (enviar documento). O `case "documento"` já renderiza um `<a href download>` com ícone `Download` para qualquer documento com URL (`http` ou `blob:`). Documentos recebidos do WhatsApp serão armazenados com sua URL pública, portanto o mesmo código os cobre.

O que falta: o placeholder para documentos **sem URL** (somente nome de arquivo, como nas mensagens mock recebidas) não tem botão de download — isso é comportamento correto, pois não há URL para baixar.

## Cenários

### Happy Path
1. Usuário clica no balão de documento recebido (com URL)
2. Browser inicia o download do arquivo (via `<a download>`)
3. Arquivo é salvo no dispositivo com o nome original

### Edge Cases
- Documento sem URL (apenas nome de arquivo no mock) — exibe placeholder sem link de download (correto por design)
- URL cross-origin (WhatsApp CDN) — browser pode abrir em nova aba em vez de baixar, dependendo dos headers do servidor (comportamento nativo do browser, fora do escopo)

### Cenário de Erro
- Arquivo não disponível na URL — comportamento nativo do browser (404 ou erro de rede)

## Arquivos

- **Modificar:** `src/app/(auth)/chat/components/balao-mensagem.tsx` — o `case "documento"` já possui `<a download>`, mas o `cursor-pointer` está ausente explicitamente (embora `<a>` já tenha cursor pointer por padrão do browser); adicionar `title` de acessibilidade ao link de download

## Checklist

- [x] Verificar que o `case "documento"` em `balao-mensagem.tsx` cobre tanto mensagens enviadas quanto recebidas com URL
- [x] Adicionar atributo `title="Baixar documento"` ao `<a>` de download para acessibilidade

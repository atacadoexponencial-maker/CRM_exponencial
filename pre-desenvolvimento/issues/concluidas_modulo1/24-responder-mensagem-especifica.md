# 24: Responder Mensagem Específica (Reply)

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar o reply de mensagem: ao passar o mouse sobre uma mensagem e clicar em "Responder", o campo de texto é pré-configurado com o contexto do reply, e a mensagem enviada exibe um trecho da mensagem original acima do texto da resposta.

## Cenários

### Happy Path
1. Usuário passa o mouse sobre uma mensagem — aparece botão "Responder" (ícone de reply)
2. Usuário clica em "Responder" — acima da barra de input aparece um banner com trecho da mensagem original e botão X para cancelar
3. Usuário digita o texto e envia — a mensagem enviada exibe o banner de reply acima do conteúdo (já renderizado pelo `BalaoMensagem` via `replyDe`)
4. Após envio, o estado de reply é limpo automaticamente

### Edge Cases
- Botão aparece apenas em mensagens de texto (tipo "texto") — áudios, imagens, vídeos e documentos não exibem o botão reply (o `replyDe.texto` precisa fazer sentido como trecho legível)
- Notas internas (`nota_interna`) não exibem o botão reply
- Texto truncado no banner de reply se for muito longo (max 1 linha, `truncate`)
- Cancelar reply (X no banner) limpa o estado e foca o textarea

### Cenário de Erro
- Nenhum cenário de erro específico — é uma operação puramente local de UI

## Banco de Dados

Não aplicável — operação de UI com mock data. O campo `replyDe` já existe no tipo `Mensagem`.

## Arquivos

- **Modificar:** `src/app/(auth)/chat/components/balao-mensagem.tsx` — adicionar prop `onResponder`, hover state com botão de reply visível apenas para mensagens de tipo "texto"
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — adicionar estado `replyPara`, banner de reply acima do input, passar `onResponder` ao `BalaoMensagem`, incluir `replyDe` ao criar nova mensagem

## Checklist

- [x] `BalaoMensagem` aceita prop `onResponder?: (mensagem: Mensagem) => void`
- [x] Hover no balão exibe botão de reply (ícone `Reply` do lucide-react) apenas para tipo "texto" e direções "enviada"/"recebida" (não para "nota_interna")
- [x] `PainelConversa` tem estado `replyPara: Mensagem | null`
- [x] Banner de reply exibido acima do textarea quando `replyPara` não é null (trecho truncado + botão X para cancelar)
- [x] Ao enviar, `nova` mensagem inclui `replyDe: { id: replyPara.id, texto: replyPara.conteudo }` e estado é limpo
- [x] Cancelar reply limpa o estado e foca o textarea

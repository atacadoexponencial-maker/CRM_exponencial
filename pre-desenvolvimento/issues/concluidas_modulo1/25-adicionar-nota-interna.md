# 25: Adicionar Nota Interna

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar o envio de nota interna: ao clicar no botão de nota interna, o campo de texto muda de modo e a mensagem é salva como nota (não enviada ao cliente), exibida no histórico com cor diferente e visível apenas para a equipe.

> **Nota de planejamento:** toda a funcionalidade já está implementada no protótipo (`painel-conversa.tsx` + `balao-mensagem.tsx`). Esta issue consiste em verificar que a implementação está correta e completa conforme a spec.

## Cenários

### Happy Path
1. Usuário clica no botão StickyNote — `modoNota` é ativado, input fica com fundo âmbar e label "Nota interna — não enviada ao cliente" aparece acima
2. Usuário digita e envia — mensagem criada com `tipo: "nota_interna"`, sem `status`, sem chamada à API
3. Balão exibido no chat com fundo âmbar e label "Nota interna" visível
4. Clicar novamente no botão cancela o modo nota (toggle)

### Edge Cases
- Ao trocar de conversa, `modoNota` é resetado para `false`
- Nota interna não exibe botão de reply (comportamento correto no `balao-mensagem.tsx`)
- Nota interna aparece nos resultados de busca interna (`termoBusca`) como mensagens de texto
- `replyPara` é ignorado quando `modoNota = true` (spread condicional na linha 108)

### Cenário de Erro
- Nenhum cenário de erro — operação puramente local de UI com mock

## Banco de Dados

Não aplicável — mock data. Tipo `"nota_interna"` já existe em `TipoMensagem`.

## Arquivos

Nenhum arquivo precisa ser criado ou modificado — implementação já completa em:
- `src/app/(auth)/chat/components/painel-conversa.tsx` — estado, toggle, envio
- `src/app/(auth)/chat/components/balao-mensagem.tsx` — renderização âmbar

## Checklist

- [x] Botão StickyNote ativa/desativa `modoNota` com toggle
- [x] Input exibe fundo âmbar e label "Nota interna — não enviada ao cliente" quando `modoNota = true`
- [x] Mensagem criada com `tipo: "nota_interna"` e sem `status`
- [x] API não é chamada para notas internas (retorno antecipado na função `enviar`)
- [x] Balão exibido com estilo âmbar e label "Nota interna"
- [x] `modoNota` resetado ao trocar de conversa

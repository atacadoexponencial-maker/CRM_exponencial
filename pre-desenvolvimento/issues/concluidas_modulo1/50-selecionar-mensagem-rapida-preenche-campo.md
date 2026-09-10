# 50: Selecionar Mensagem Rápida Preenche o Campo de Texto

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar a seleção de mensagem rápida no seletor: ao clicar em uma mensagem, o seletor fecha e o conteúdo preenche o campo de texto, permitindo que o usuário edite antes de enviar.

## Cenários

### Happy Path
1. Usuário clica em uma mensagem rápida no seletor
2. Seletor fecha (`setSeletorMRAberto(false)`)
3. Campo de texto recebe o conteúdo da mensagem (`setTexto(mr.conteudo)`)
4. Foco retorna ao campo de texto para edição antes de enviar

### Edge Cases
- N/A

### Cenário de Erro
- N/A — operação local sem chamada ao servidor

## Arquivos

> Nenhum arquivo precisa ser modificado. O comportamento de seleção já foi implementado no protótipo UI em `painel-conversa.tsx`: `onClick` de cada item executa `setTexto(mr.conteudo)`, `setSeletorMRAberto(false)`, `setTermoBuscaMR("")` e `setTimeout(() => inputRef.current?.focus(), 0)`.

## Checklist

- [x] Clicar em mensagem rápida preenche o campo de texto, fecha o seletor e devolve o foco — já implementado em `painel-conversa.tsx` (issue 48)

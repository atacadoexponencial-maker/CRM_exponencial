# 49: Buscar Mensagem Rápida por Título no Seletor

**Tipo:** Implementação
**Página:** Conversa

## Descrição

Implementar o campo de busca dentro do seletor de mensagens rápidas: conforme o usuário digita, a lista é filtrada em tempo real pelo título da mensagem rápida.

## Cenários

### Happy Path
1. Usuário abre o seletor (ícone Zap)
2. Digita no campo de busca
3. Lista filtra em tempo real por título (e conteúdo) das mensagens rápidas

### Edge Cases
- Nenhum resultado encontrado: exibe "Nenhuma mensagem encontrada"
- Campo vazio: exibe todas as mensagens

### Cenário de Erro
- N/A — filtro é local, sem chamada ao servidor

## Arquivos

> Nenhum arquivo precisa ser modificado. A funcionalidade de busca já foi implementada como parte do protótipo UI em `painel-conversa.tsx` (estado `termoBuscaMR`, filtro por `titulo` e `conteudo`, campo de busca com autoFocus). O seletor foi conectado aos dados reais na issue 48.

## Checklist

- [x] Campo de busca com `termoBuscaMR` filtra em tempo real por título e conteúdo — já implementado em `painel-conversa.tsx` (issue 48)

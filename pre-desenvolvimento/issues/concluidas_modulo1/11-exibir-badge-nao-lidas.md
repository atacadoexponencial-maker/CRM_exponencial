# 11: Exibir Badge de Mensagens Não Lidas

**Tipo:** Implementação
**Página:** Caixa de Entrada

## Descrição

Implementar o badge numérico em cada item da lista de conversas que exibe a contagem de mensagens não lidas, somando apenas as mensagens recebidas após a última leitura do usuário.

## Cenários

### Happy Path
1. Conversa com `naoLidas > 0`: badge circular com o número aparece à direita da última mensagem
2. Nome do contato fica em `font-semibold` quando há mensagens não lidas
3. Conversa com `naoLidas === 0`: badge não é exibido, nome fica em `font-medium`

### Edge Cases
- `naoLidas` com valor alto (ex.: 99+): badge exibe o número completo sem truncar (padding lateral `px-1` e `min-w-5` acomodam)
- Conversas sem nome (`nome === null`): usa telefone como `nomeExibido` — badge funciona normalmente

### Cenário de Erro
- Não aplicável — valor `naoLidas` vem do mock local, sem chamada de rede

## Banco de Dados

Não aplicável — implementação usa mock data local (`mock-conversas.ts`), campo `naoLidas: number`.

## Arquivos

> **Nota:** Esta feature já está implementada no protótipo (issue #01). Nenhum arquivo novo precisa ser criado ou modificado.

- **Verificar:** `src/app/(auth)/chat/components/item-conversa.tsx` — confirmar badge, estilo do nome e lógica `temNaoLidas`

## Checklist

- [x] Confirmar que badge aparece quando `naoLidas > 0`
- [x] Confirmar que badge não aparece quando `naoLidas === 0`
- [x] Confirmar que o número exibido no badge corresponde ao valor de `naoLidas`
- [x] Confirmar que o nome do contato fica `font-semibold` quando há não lidas e `font-medium` quando não há

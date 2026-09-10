# 05: Buscar Contato

**Tipo:** Implementação
**Página:** Lista de Contatos

## Descrição

Usuário digita nome parcial ou número de WhatsApp no campo de busca e a lista filtra os contatos correspondentes em tempo real. A filtragem é client-side sobre os dados já carregados por `listarContatos()`. Cada linha da lista deve ser um link navegável para o perfil do contato (`/contatos/[id]`), completando o fluxo buscar → encontrar → abrir.

> **Nota de implementação:** a lógica de filtro por `busca` já existe em `lista-contatos.tsx` (do protótipo) e funciona corretamente com dados reais. O trabalho desta issue é: (1) adicionar o `Link` nas linhas da tabela e (2) adicionar os testes de busca.

## Cenários

### Happy Path
1. Usuário digita "padaria" no campo de busca
2. Lista filtra em tempo real e exibe apenas os contatos cujo nome contém "padaria" (case-insensitive)
3. Usuário digita "+55 11 990" — lista exibe contatos cujo número contém essa substring
4. Usuário clica numa linha — navega para `/contatos/[id]` do contato correspondente
5. Usuário limpa o campo de busca — lista volta a mostrar todos os contatos

### Edge Cases
- Busca sem resultado: lista exibe "Nenhum contato encontrado"
- Busca com espaços extras: `"  padaria  "` deve tratar como `"padaria"` (trim já aplicado no filtro)
- Contato com `nome` sendo o número de WhatsApp (quando `name` é null no banco): busca por número ainda funciona pois `nome = telefone`

### Cenário de Erro
- Erro de navegação: se o `id` do contato não existir no mock/banco, a página `/contatos/[id]` exibe "Contato não encontrado" (já implementado na issue 02)

## Banco de Dados (se aplicável)

Não aplicável — filtragem é client-side; nenhuma query nova.

## Arquivos

- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — substituir o `<tr>` de cada contato por um `<Link>` (usando `display: contents` ou wrapper adequado) que navega para `/contatos/[id]`
- **Modificar:** `src/test/contatos-lista.integration.test.ts` — adicionar `describe` de busca com casos: nome parcial, número de WhatsApp e busca sem resultado

## Checklist

- [x] Modificar `lista-contatos.tsx`: cada linha da tabela deve ser clicável e navegar para `/contatos/[id]` via `Link` do Next.js
- [x] Adicionar testes de busca em `contatos-lista.integration.test.ts`: busca por nome parcial, por número de WhatsApp e busca sem resultado

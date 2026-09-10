# 38: Exibir Número Desconhecido como Telefone até ser Nomeado

**Tipo:** Implementação
**Página:** Contato Básico

## Descrição

Implementar o fallback de nome: contatos sem nome cadastrado são exibidos pelo número de telefone em todos os lugares (lista de conversas, cabeçalho, painel de contato) até que o usuário edite e salve um nome.

## Cenários

### Happy Path
1. Contato sem nome chega via WhatsApp
2. Na lista de conversas, o item exibe o telefone como nome — já implementado via `nome ?? telefone`
3. No cabeçalho da conversa, o telefone aparece como nome — já implementado
4. No painel de contato, o telefone aparece como nome, sem repetição abaixo — **este é o item a corrigir**
5. Após o usuário editar e salvar o nome, a linha secundária com o telefone volta a aparecer normalmente

### Edge Cases
- Contato com nome salvo: exibe nome como título e telefone como subtítulo (comportamento atual correto)
- Contato sem nome: exibe telefone apenas uma vez (como título), sem subtítulo duplicado

### Cenário de Erro
Sem alterações de lógica backend — nenhum cenário de erro novo.

## Banco de Dados (se aplicável)

Nenhuma alteração necessária.

## Arquivos

- **Modificar:** `src/app/(auth)/chat/components/painel-contato.tsx` — ocultar subtítulo de telefone quando não há nome cadastrado (evita duplicação)

## Checklist

- [x] Em `painel-contato.tsx`, exibir `conversa.contato.telefone` como subtítulo apenas quando `nomeLocal !== null`

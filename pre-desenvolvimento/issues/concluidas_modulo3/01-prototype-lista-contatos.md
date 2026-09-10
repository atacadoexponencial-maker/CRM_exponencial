# 01: Protótipo — Lista de Contatos

**Tipo:** Protótipo
**Página:** Lista de Contatos

## Descrição

Criar a UI estática da página principal do módulo de Contatos, com campo de busca, filtros (classificação, tipo, nicho, atendente), seletor de ordenação, listagem de contatos com badge de classificação e botão "Novo contato".

## Cenários

### Happy Path
1. Usuário acessa `/contatos`
2. Lista exibe todos os contatos mockados com nome, número, badge de classificação, tipo, nicho, cidade e atendente
3. Usuário digita no campo de busca — lista filtra em tempo real por nome ou número
4. Usuário clica num filtro de classificação — lista exibe apenas contatos daquela classificação
5. Usuário seleciona ordenação — lista reordena
6. Indicador mostra o total de contatos correspondendo aos filtros ativos

### Edge Cases
- Nenhum contato corresponde aos filtros: exibe mensagem "Nenhum contato encontrado"
- Filtros combinados: busca + classificação + tipo funcionam juntos
- Atendente com papel "atendente" não vê o filtro por atendente responsável

### Cenário de Erro
- (Protótipo — sem chamadas reais, sem erros de rede)

## Banco de Dados (se aplicável)

Não aplicável — protótipo com mock data.

## Arquivos

- **Criar:** `src/app/(auth)/contatos/mock-contatos.ts` — tipos e dados mockados de contatos
- **Criar:** `src/app/(auth)/contatos/page.tsx` — Server Component que lê o perfil do usuário e renderiza o client component
- **Criar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — Client Component com busca, filtros, ordenação e listagem
- **Modificar:** `src/app/(auth)/layout.tsx` — adicionar link "Contatos" na navegação

## Checklist

- [x] Criar `mock-contatos.ts` com tipos (`ClassificacaoContato`, `TipoContato`, `Contato`) e array `MOCK_CONTATOS` com ~10 contatos variados
- [x] Criar `page.tsx` como Server Component lendo `role` do perfil e passando para `ListaContatos`
- [x] Criar `lista-contatos.tsx` com busca por nome/número, filtros por classificação/tipo/nicho/atendente (este último oculto para atendente), seletor de ordenação, listagem em tabela e indicador de total
- [x] Adicionar link "Contatos" no `layout.tsx`

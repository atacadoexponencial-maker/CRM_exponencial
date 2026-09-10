# 01: Protótipo — Caixa de Entrada

**Tipo:** Protótipo
**Página:** Caixa de Entrada

## Descrição

Criar a tela principal do sistema com a lista de conversas, filtros de status, visibilidade e etiqueta, campo de busca e indicadores de não lidas — tudo com dados mock, sem integração backend.

---

## Cenários

### Happy Path
1. Usuário acessa `/chat`
2. Vê a lista de conversas com avatar, nome, preview da última mensagem, horário e badge de não lidas
3. Conversas com mensagens não lidas aparecem em negrito
4. Filtros de status (Todas / Em espera / Em atendimento / Resolvidas) atualizam a lista ao clicar
5. Filtro de visibilidade (Minhas / Meu time / Todas) atualiza a lista ao clicar
6. Campo de busca filtra a lista por nome conforme o usuário digita
7. Etiquetas aparecm como pills coloridos em cada item da lista

### Edge Cases
- Lista vazia após aplicar filtro → mensagem "Nenhuma conversa encontrada"
- Contato sem nome → exibe o número de telefone no lugar do nome
- Conversa sem etiquetas → nenhum pill exibido (sem espaço vazio)
- Preview de mensagem muito longa → truncada com `…`

### Cenário de Erro
Neste protótipo não há integração backend — não há cenários de erro de rede.

---

## Banco de Dados

Não aplicável — dados mock.

---

## Arquivos

- **Modificar:** `src/app/(auth)/layout.tsx` — remover `max-w-5xl mx-auto px-4 py-8` do `<main>` para que o chat use largura total; o container passa a ser responsabilidade de cada página filha
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/page.tsx` — adicionar `<div className="max-w-5xl mx-auto px-4 py-8">` para compensar a remoção do layout
- **Modificar:** `src/app/(auth)/configuracoes/times/page.tsx` — idem
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/page.tsx` — idem
- **Modificar:** `src/app/(auth)/perfil/page.tsx` — idem
- **Criar:** `src/app/(auth)/chat/mock-conversas.ts` — array de conversas mock tipado (20 itens com variação de status, etiquetas e não lidas)
- **Criar:** `src/app/(auth)/chat/components/item-conversa.tsx` — Client Component: avatar com iniciais, nome (bold se não lidas), preview truncado, horário, badge numérico de não lidas, pills de etiquetas
- **Criar:** `src/app/(auth)/chat/components/filtros-caixa.tsx` — Client Component: barra com filtros de status (tabs), filtro de visibilidade (tabs) e campo de busca; gerencia estado local com `useState`
- **Criar:** `src/app/(auth)/chat/page.tsx` — Server Component: importa mock data e renderiza `<FiltrosCaixa>` + lista de `<ItemConversa>`; layout full-height com sidebar fixa de 320px à esquerda e área direita vazia (placeholder para issue 02)

---

## Checklist

- [x] Remover container do `(auth)/layout.tsx` e compensar nas 4 páginas filhas existentes
- [x] Criar `mock-conversas.ts` com 20 conversas mock (mix de status, etiquetas, não lidas)
- [x] Criar `item-conversa.tsx` com avatar de iniciais, nome em bold se não lidas, preview truncado, badge e pills de etiquetas
- [x] Criar `filtros-caixa.tsx` com filtros de status, visibilidade e campo de busca usando `useState`
- [x] Criar `page.tsx` com layout split-view (sidebar 320px + área direita placeholder)
- [x] Adicionar link "Chat" na nav do `(auth)/layout.tsx` apontando para `/chat`
- [x] Verificar visualmente que as páginas de configurações ainda têm o espaçamento correto após a refatoração do layout

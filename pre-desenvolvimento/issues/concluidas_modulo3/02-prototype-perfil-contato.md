# 02: Protótipo — Perfil do Contato

**Tipo:** Protótipo
**Página:** Perfil do Contato

## Descrição

Criar a UI estática da página de detalhe do contato, com cabeçalho (nome, número, classificação, botão "Abrir conversa"), seções de dados cadastrais, tags, observações, pipeline e histórico de compras com botão "Registrar compra".

## Cenários

### Happy Path
1. Usuário acessa `/contatos/c1`
2. Cabeçalho exibe nome, número de WhatsApp, badge de classificação colorido e botão "Abrir conversa"
3. Seção "Dados do contato" exibe todos os campos (nome, WhatsApp, tipo, nicho, cidade, ICP)
4. Seção "Tags" exibe as tags do contato
5. Seção "Observações" exibe o texto de observações
6. Seção "Pipeline" exibe o funil e etapa atual do contato
7. Seção "Histórico de compras" exibe registros com data e valor, total e ticket médio
8. Admin/Gerente vê botão "Registrar compra"

### Edge Cases
- Contato sem tags: seção "Tags" exibe mensagem "Nenhuma tag"
- Contato sem histórico de compras: exibe "Nenhuma compra registrada" e total R$ 0
- Contato sem pipeline associado: seção "Pipeline" exibe "Sem card no pipeline"
- ID de contato inexistente: exibe mensagem "Contato não encontrado"
- Atendente não vê botão "Registrar compra"

### Cenário de Erro
- (Protótipo — sem chamadas reais)

## Banco de Dados (se aplicável)

Não aplicável — protótipo com mock data.

## Arquivos

- **Modificar:** `src/app/(auth)/contatos/mock-contatos.ts` — adicionar tipos `Compra`, `CardPipelineMock`, `ContatoPerfil` e dicionário `MOCK_PERFIS_CONTATO` com dados ricos para alguns contatos
- **Criar:** `src/app/(auth)/contatos/[id]/page.tsx` — Server Component que lê o perfil do usuário e busca o contato no mock pelo `id` da rota
- **Criar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — Client Component com todo o layout do perfil: cabeçalho, dados, tags, observações, pipeline e histórico de compras

## Checklist

- [x] Estender `mock-contatos.ts` com `Compra`, `CardPipelineMock`, `ContatoPerfil` e `MOCK_PERFIS_CONTATO` com dados para pelo menos 3 contatos (com variações: com/sem tags, com/sem compras, com/sem pipeline)
- [x] Criar `[id]/page.tsx` como Server Component lendo `role` do perfil e buscando `MOCK_PERFIS_CONTATO[params.id]`
- [x] Criar `[id]/components/perfil-contato.tsx` com cabeçalho, seções de dados, tags, observações, pipeline e histórico de compras — exibindo botão "Registrar compra" apenas para admin/gerente

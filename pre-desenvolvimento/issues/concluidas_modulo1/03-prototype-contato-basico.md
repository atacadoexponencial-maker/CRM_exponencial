# 03: Protótipo — Contato Básico

**Tipo:** Protótipo
**Página:** Contato Básico

## Descrição

Criar o painel lateral de informações do contato com nome editável, número de WhatsApp, data do primeiro contato, etiquetas e lista de conversas anteriores — tudo com dados mock, sem integração backend.

## Cenários

### Happy Path
1. Usuário abre uma conversa na caixa de entrada
2. Clica no nome do contato no cabeçalho
3. O painel lateral abre mostrando: avatar com iniciais, nome, telefone, data do primeiro contato, etiquetas e conversas anteriores
4. Usuário clica no ícone de edição ao lado do nome
5. Um input de texto aparece com o nome atual
6. Usuário digita o novo nome e pressiona Enter (ou clica em confirmar)
7. O painel volta para o modo visualização exibindo o nome atualizado
8. Usuário clica em `X` / seta para fechar o painel

### Edge Cases
- Contato sem nome cadastrado (nome = null): exibe o telefone como nome exibido; campo de edição começa vazio para o usuário nomear
- Contato sem etiquetas: seção de etiquetas não é renderizada
- Contato sem conversas anteriores além da atual: exibe mensagem "Nenhuma conversa anterior"
- Nome em edição com campo vazio ao confirmar: não salva (mantém nome anterior)

### Cenário de Erro
- Protótipo sem backend: nenhum cenário de erro de rede. A edição de nome é salva apenas em estado local (não persiste ao recarregar a página).

## Banco de Dados (se aplicável)

Não aplicável — protótipo com mock data.

## Arquivos

- **Criar:** `src/app/(auth)/chat/components/painel-contato.tsx` — componente do painel lateral de informações do contato
- **Modificar:** `src/app/(auth)/chat/mock-conversas.ts` — adicionar campo `dataPrimeiroContato: string` ao tipo `Conversa` e aos 20 mocks
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — substituir o `aside` placeholder (linhas 274-301) pelo componente `<PainelContato>`

## Dependências Externas

Nenhuma nova dependência. Usar:
- `lucide-react` (já instalado) — ícones `Pencil`, `Check`, `X`, `ChevronRight`, `Tag`, `MessageSquare`
- `cn` de `@/lib/utils` (já em uso no módulo)
- Tipos `Conversa` de `../mock-conversas`

## Checklist

- [x] Adicionar `dataPrimeiroContato: string` ao tipo `Conversa` em `mock-conversas.ts`
- [x] Adicionar valor de `dataPrimeiroContato` nos 20 objetos mock de `MOCK_CONVERSAS`
- [x] Criar `painel-contato.tsx` com: avatar, nome editável, telefone, data do primeiro contato, etiquetas e lista de conversas anteriores
- [x] Lógica de edição de nome: estado local `nomeLocal` + modo `editando`; não salvar se campo vazio
- [x] Derivar "conversas anteriores" a partir do mesmo `telefone` dentro do `MOCK_CONVERSAS` recebido como prop (excluindo a conversa atual)
- [x] Substituir o `aside` placeholder em `painel-conversa.tsx` pelo `<PainelContato>`, passando `conversa` e `todasConversas`

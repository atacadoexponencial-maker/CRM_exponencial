# 04: Protótipo — Etiquetas

**Tipo:** Protótipo
**Página:** Etiquetas

## Descrição

Criar a página de configuração de etiquetas com lista (nome, cor, contagem), botão de criar, e ações de editar e excluir por etiqueta — tudo com dados mock, sem integração backend.

## Cenários

### Happy Path
1. Admin acessa `/configuracoes/etiquetas` pelo link na nav
2. Vê a lista com 3 etiquetas iniciais: "Novo cliente", "Recompra", "VIP" — cada uma com swatch de cor, nome e contagem de conversas
3. Clica em "Nova etiqueta", preenche o nome e seleciona uma cor nos swatches
4. Confirma — a etiqueta aparece ao final da lista
5. Clica no menu `⋯` de uma etiqueta, escolhe "Editar" — abre dialog com nome e cor preenchidos
6. Altera nome/cor e salva — a lista atualiza
7. Clica em "Excluir" — abre dialog de confirmação
8. Confirma exclusão — a etiqueta some da lista

### Edge Cases
- Tentar salvar etiqueta com nome vazio: botão "Salvar" fica desabilitado (ou exibe erro inline)
- Criar etiqueta sem selecionar cor: botão "Salvar" fica desabilitado até cor ser escolhida
- Lista vazia (todas excluídas): exibe mensagem "Nenhuma etiqueta cadastrada"

### Cenário de Erro
- Protótipo sem backend: sem erros de rede. Toda a mutação é local em `useState`. Dados não persistem ao recarregar.

## Banco de Dados (se aplicável)

Não aplicável — protótipo com mock data.

## Arquivos

- **Criar:** `src/app/(auth)/configuracoes/etiquetas/page.tsx` — página cliente completa: mock data, lista, dialogs de criar/editar/excluir
- **Modificar:** `src/app/(auth)/layout.tsx` — adicionar link "Etiquetas" na nav entre "Times" e "WhatsApp"

## Dependências Externas

Nenhuma nova. Reutilizar:
- `Dialog`, `DialogPopup`, `DialogTitle`, `DialogClose` de `@/components/ui/dialog`
- `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` de `@/components/ui/dropdown-menu`
- `Button` de `@/components/ui/button`
- `Input` de `@/components/ui/input`
- `Label` de `@/components/ui/label`
- `cn` de `@/lib/utils`
- Ícones `MoreHorizontal`, `Plus`, `Tag` de `lucide-react`

## Checklist

- [x] Criar `src/app/(auth)/configuracoes/etiquetas/page.tsx` como Client Component (`"use client"`)
- [x] Mock data inicial: `[{ id, nome, cor, conversas }]` com "Novo cliente" (5), "Recompra" (7), "VIP" (5) e suas cores existentes
- [x] Seletor de cor: grid de 10 swatches de cores pré-definidas; cor selecionada recebe borda/ring de destaque
- [x] Dialog "Nova etiqueta": campo nome + seletor de cor; salvar desabilitado se nome vazio ou cor não selecionada
- [x] Dialog "Editar": pré-preenche nome e cor atual; mesma validação
- [x] Dialog "Excluir": confirmação com nome da etiqueta; ao confirmar remove do estado local
- [x] Lista vazia: exibir mensagem "Nenhuma etiqueta cadastrada"
- [x] Adicionar link "Etiquetas" em `layout.tsx` entre "Times" e "WhatsApp"

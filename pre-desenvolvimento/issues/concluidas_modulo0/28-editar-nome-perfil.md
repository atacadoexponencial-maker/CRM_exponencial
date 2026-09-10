# 28: Editar nome no perfil

**Tipo:** Implementação
**Página:** Perfil do Usuário

## Descrição

Usuário edita o próprio nome e salva. O e-mail é exibido como somente leitura e não pode ser alterado.

## Cenários

### Happy Path

1. Usuário acessa `/perfil`
2. A página carrega com o nome real do usuário no campo "Nome" e o e-mail real no campo "E-mail" (somente leitura)
3. Usuário altera o nome e clica em "Salvar"
4. Server Action atualiza `profiles.name` onde `id = user.id`
5. `revalidatePath` dispara e a página recarrega com o novo nome

### Edge Cases

- Nome com espaços nas bordas deve ser salvo com `.trim()`
- Campo nome não pode ser vazio — formulário HTML `required` impede o envio

### Cenário de Erro

- Se a Server Action retornar `erro`, exibe mensagem abaixo do botão "Salvar"
- Mensagem de erro genérica: "Não foi possível salvar. Tente novamente."

## Banco de Dados (se aplicável)

- Tabela: `profiles`
  - `name` (text) — atualizado com o novo nome do usuário

## Arquivos

- **Criar:** `src/app/(auth)/perfil/actions.ts` — Server Action `editarNomePerfil(nome)` que atualiza `profiles.name` do usuário autenticado
- **Criar:** `src/app/(auth)/perfil/form-perfil.tsx` — componente Client com o formulário de nome + e-mail somente leitura, gerencia estado de salvando/erro
- **Modificar:** `src/app/(auth)/perfil/page.tsx` — converter para Server Component: busca nome e e-mail reais do Supabase e passa para `<FormPerfil>`

## Checklist

- [x] Criar `actions.ts` com `editarNomePerfil(nome: string): Promise<{ erro?: string }>` — atualiza `profiles.name` do usuário autenticado, aplica `.trim()`, verifica autenticação
- [x] Criar `form-perfil.tsx` — Client Component com input de nome (editável), input de e-mail (readOnly), botão "Salvar", estado de salvando e mensagem de erro
- [x] Modificar `page.tsx` para buscar `name` e `email` reais do usuário via Supabase e renderizar `<FormPerfil nome={...} email={...} />`

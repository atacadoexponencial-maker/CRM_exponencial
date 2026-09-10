# 27: Desconectar e reconectar número de WhatsApp

**Tipo:** Implementação
**Página:** Gestão de Números de WhatsApp

## Descrição

Admin desconecta o número de WhatsApp ativo ou reconecta um número previamente desconectado. O status do número deve ser atualizado em tempo real na tela.

## Cenários

### Happy Path

**Desconectar:**
1. Admin está na página `/configuracoes/whatsapp` com um número com status `connected`
2. Clica no botão "Desconectar"
3. Um dialog de confirmação abre: "Tem certeza que deseja desconectar o número?"
4. Admin confirma
5. Server Action atualiza o status para `disconnected` na tabela `whatsapp_connections`
6. `revalidatePath` dispara e a página recarrega com o badge mostrando "Desconectado" (vermelho/cinza) e o botão "Reconectar" habilitado, "Desconectar" desabilitado

**Reconectar:**
1. Admin está na página com um número com status `disconnected`
2. Clica no botão "Reconectar"
3. Um dialog de confirmação abre: "Tem certeza que deseja reconectar o número?"
4. Admin confirma
5. Server Action atualiza o status para `connected` na tabela `whatsapp_connections`
6. `revalidatePath` dispara e a página recarrega com o badge "Conectado" (verde) e botões no estado original

### Edge Cases

- Botão "Desconectar" desabilitado quando status já é `disconnected`
- Botão "Reconectar" desabilitado quando status já é `connected`
- Botão "Conectar número" no header só aparece quando não há nenhum registro (comportamento existente, não muda)

### Cenário de Erro

- Se a Server Action retornar `erro`, exibe a mensagem dentro do dialog de confirmação (mesmo padrão do `acoes-usuario.tsx`)
- Mensagem de erro genérica: "Não foi possível atualizar o número. Tente novamente."

## Banco de Dados (se aplicável)

- Tabela: `whatsapp_connections`
  - `status` (text) — atualizado para `"disconnected"` ao desconectar e `"connected"` ao reconectar

## Arquivos

- **Criar:** `src/app/(auth)/configuracoes/whatsapp/acoes-whatsapp.tsx` — componente Client com os botões Desconectar/Reconectar e seus dialogs de confirmação
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/actions.ts` — adicionar Server Actions `desconectarWhatsApp(id)` e `reconectarWhatsApp(id)`
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/page.tsx` — substituir os botões estáticos pelo componente `<AcoesWhatsApp>`; passar `conexao.id` e `conexao.status`

## Checklist

- [x] Adicionar `desconectarWhatsApp(id)` em `actions.ts` — atualiza status para `"disconnected"`, verifica role admin e workspace
- [x] Adicionar `reconectarWhatsApp(id)` em `actions.ts` — atualiza status para `"connected"`, verifica role admin e workspace
- [x] Criar `acoes-whatsapp.tsx` com botões Desconectar/Reconectar e dialogs de confirmação (seguir padrão de `acoes-usuario.tsx`)
- [x] Badge na `page.tsx` reflete o status: verde `Conectado` quando `connected`, cinza `Desconectado` quando `disconnected`
- [x] Substituir botões estáticos em `page.tsx` pelo componente `<AcoesWhatsApp conexaoId={conexao.id} status={conexao.status} />`

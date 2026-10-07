# B11-12: Tags do contato no painel do card

**Tipo:** Implementação
**Página:** Funil (painel do card)
**Repositório:** `crm-exponencial`, branch `b11-automacoes-v2`
**Depende de:** nada

> Não é automação. Foi feita no branch da B11 porque o Luan precisava dela para
> testar as condições de tag no preview (07/10/2026). Chega à produção no merge
> do branch.

## Descrição

O painel que abre ao clicar num card do funil não mostrava as tags do contato,
nem deixava adicionar ou remover. Só dava pela tela do contato, ou por
automação. O painel ganha uma seção "Tags", abaixo das etiquetas da conversa,
para ver, adicionar e remover.

## Pronto quando

No preview, ao abrir o card de um contato, as tags dele aparecem. Uma tag
adicionada ali aparece no perfil do contato e vale para a condição "tag do
contato" das automações.

## Plano e execução (07/10/2026)

- **Reaproveitado:** `adicionarTagContato` e `removerTagContato`
  (`src/app/(auth)/contatos/actions.ts`), as mesmas do perfil do contato. Elas
  conferem as regras da tag (sem espaço, até 50 caracteres), e a RLS de
  `contact_tags` limita à empresa de quem está logado.
- **Criar:** `src/app/(auth)/pipeline/components/tags-do-contato.tsx`: a seção,
  que carrega as tags ao abrir o painel.
- **Modificar:** `src/app/(auth)/contatos/actions.ts`: `listarTagsContato`, só
  as tags, sem carregar o perfil inteiro.
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx`: mostra a
  seção quando o card tem contato.
- **Descartado:** acrescentar as tags a `buscarDadosPainel`. Funcionaria, mas
  mexeria na consulta do histórico e das notas, que é do funil, para algo do
  contato.

**Verificação:** tipos e lint limpos, build com código de saída 0. Playwright
numa rota temporária, apagada antes do commit: a seção apareceu abaixo das
etiquetas, com o campo "Nova tag", sem erro no console. Adicionar e remover de
verdade dependem de sessão e ficam para o teste no preview.

- [x] Seção de tags no painel do card
- [x] Adicionar e remover usando as actions do perfil do contato

## Teste no preview (07/10/2026): passou

No preview `crm-exponencial-gsp333zcs (commit b8a28a6)`, com a empresa "[TESTE] Automações B11": a tag `vip`
adicionada pelo painel do card da Carla foi gravada e apareceu no perfil do
contato. Removida pelo painel, saiu do banco. Nenhum erro no console.
